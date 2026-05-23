package app

import (
	"net/http"

	"meshcore-canada-live-map/backend/internal/api"
)

func (a *Application) Routes() http.Handler {
	return (&api.Server{
		Config: api.Config{
			RecentPacketLimit:    a.Config.RecentPacketLimit,
			RecentEdgeEventLimit: a.Config.RecentEdgeEventLimit,
			DefaultCenterLat:     a.Config.DefaultCenterLat,
			DefaultCenterLng:     a.Config.DefaultCenterLng,
			DefaultZoom:          a.Config.DefaultZoom,
			PublicMode:           a.Config.PublicMode,
			StrictRFOnly:         a.Config.StrictRFOnly,
			MaxUnverifiedEdgeKM:  a.Config.MaxUnverifiedEdgeKM,
		},
		Store:            a.Store,
		Hub:              a.Hub,
		PublicHub:        a.PublicHub,
		MQTTConnected:    a.MQTT.Connected,
		MQTTTotal:        a.MQTT.TotalMessages,
		PublicState:      a.PublicCache.Snapshot,
		PublicAllowsIATA: a.PublicCache.AllowsIATA,
	}).Routes()
}
