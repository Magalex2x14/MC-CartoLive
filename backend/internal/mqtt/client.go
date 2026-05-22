package mqtt

import (
	"context"
	"crypto/tls"
	"log/slog"
	"strings"
	"sync/atomic"
	"time"

	paho "github.com/eclipse/paho.mqtt.golang"
)

type Handler func(context.Context, NormalizedMessage)

type ClientConfig struct {
	Enabled   bool
	BrokerURL string
	Topic     string
	ClientID  string
	QueueSize int
	Auth      AuthConfig
}

type Client struct {
	cfg       ClientConfig
	log       *slog.Logger
	handler   Handler
	queue     chan NormalizedMessage
	connected atomic.Bool
	total     atomic.Int64
	dropped   atomic.Int64
	client    paho.Client
}

func NewClient(cfg ClientConfig, log *slog.Logger, handler Handler) *Client {
	if cfg.QueueSize < 1 {
		cfg.QueueSize = 4096
	}
	return &Client{cfg: cfg, log: log, handler: handler, queue: make(chan NormalizedMessage, cfg.QueueSize)}
}

func (c *Client) Start(ctx context.Context) error {
	if !c.cfg.Enabled {
		c.log.Info("mqtt disabled")
		return nil
	}
	if err := c.cfg.Auth.Validate(); err != nil {
		return err
	}
	go c.dispatch(ctx)

	opts := paho.NewClientOptions()
	opts.AddBroker(c.cfg.BrokerURL)
	opts.SetClientID(c.cfg.ClientID)
	opts.SetCleanSession(true)
	opts.SetAutoReconnect(true)
	opts.SetConnectRetry(true)
	opts.SetKeepAlive(60 * time.Second)
	opts.SetPingTimeout(10 * time.Second)
	opts.SetTLSConfig(&tls.Config{MinVersion: tls.VersionTLS12})
	if c.cfg.Auth.Mode == "subscriber" {
		opts.SetUsername(c.cfg.Auth.Username)
		opts.SetPassword(c.cfg.Auth.Password)
	} else if c.cfg.Auth.Mode == "jwt" {
		opts.SetUsername("v1_" + strings.ToUpper(c.cfg.Auth.PublicKey))
		opts.SetPassword(c.cfg.Auth.Token)
	}

	opts.SetConnectionLostHandler(func(_ paho.Client, err error) {
		c.connected.Store(false)
		c.log.Warn("mqtt connection lost", "error", err)
	})
	opts.SetOnConnectHandler(func(client paho.Client) {
		c.connected.Store(true)
		c.log.Info("mqtt connected", "broker", redactBroker(c.cfg.BrokerURL), "topic", c.cfg.Topic)
		token := client.Subscribe(c.cfg.Topic, 0, c.onMessage(ctx))
		token.Wait()
		if err := token.Error(); err != nil {
			c.log.Error("mqtt subscribe failed", "error", err)
			return
		}
		c.log.Info("mqtt subscribed", "topic", c.cfg.Topic)
	})

	c.client = paho.NewClient(opts)
	token := c.client.Connect()
	go func() {
		if !token.WaitTimeout(10 * time.Second) {
			c.log.Warn("mqtt initial connect still pending; continuing startup")
			token.Wait()
		}
		if err := token.Error(); err != nil {
			c.connected.Store(false)
			c.log.Error("mqtt connect failed", "error", err)
		}
	}()

	go func() {
		<-ctx.Done()
		c.client.Disconnect(250)
		c.connected.Store(false)
	}()

	return nil
}

func (c *Client) onMessage(ctx context.Context) paho.MessageHandler {
	return func(_ paho.Client, msg paho.Message) {
		topic := msg.Topic()
		info, err := ParseTopic(topic)
		if err != nil {
			c.log.Debug("mqtt dropped malformed topic", "topic", topic, "error", err)
			return
		}
		if info.Subtopic == "internal" {
			c.log.Warn("mqtt internal topic dropped", "iata", info.IATA)
			return
		}
		normalized, err := Normalize(topic, msg.Payload(), time.Now())
		if err != nil {
			c.log.Debug("mqtt normalize failed", "topic", topic, "error", err)
			return
		}
		c.total.Add(1)
		select {
		case c.queue <- normalized:
		default:
			dropped := c.dropped.Add(1)
			if dropped == 1 || dropped%100 == 0 {
				c.log.Warn("mqtt ingest queue full; dropping normalized message", "dropped", dropped, "queueSize", c.cfg.QueueSize)
			}
		}
	}
}

func (c *Client) dispatch(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-c.queue:
			c.handler(ctx, msg)
		}
	}
}

func (c *Client) Connected() bool {
	return c.connected.Load()
}

func (c *Client) TotalMessages() int64 {
	return c.total.Load()
}

func (c *Client) DroppedMessages() int64 {
	return c.dropped.Load()
}

func redactBroker(in string) string {
	if at := strings.LastIndex(in, "@"); at >= 0 {
		return in[:strings.Index(in, "://")+3] + "redacted@" + in[at+1:]
	}
	return in
}
