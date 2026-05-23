import { useEffect, useMemo, useRef } from 'react';
import { MonitorPlay, X } from 'lucide-react';
import { normalizePayloadType, payloadVisual } from '../payloadVisuals';
import { routePacketDots } from '../assets/routes/assets';
import { packetTvEndpointLabels, type PacketTvCandidate } from '../packetTv';

interface Props {
  candidate: PacketTvCandidate | null;
  open: boolean;
  onClose: () => void;
}

export default function PacketTV({ candidate, open, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labels = useMemo(() => (candidate ? packetTvEndpointLabels(candidate.pulse) : null), [candidate]);
  const visual = payloadVisual(candidate?.pulse.payloadTypeName);
  const packetDot = routePacketDots[normalizePayloadType(candidate?.pulse.payloadTypeName)] ?? routePacketDots.OTHER;

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let active = true;
    const render = (now: number) => {
      drawPacketTvScene(ctx, canvas, candidate, now);
      if (active) raf = window.requestAnimationFrame(render);
    };
    raf = window.requestAnimationFrame(render);
    return () => {
      active = false;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [candidate, open]);

  if (!open) return null;

  return (
    <section className="packet-tv-panel" aria-label="PacketTV live route view">
      <header>
        <span className="packet-tv-title">
          <MonitorPlay size={15} />
          PacketTV
        </span>
        <button type="button" onClick={onClose} aria-label="Close PacketTV">
          <X size={15} />
        </button>
      </header>
      <canvas ref={canvasRef} width={420} height={210} />
      <div className="packet-tv-meta">
        {candidate && labels ? (
          <>
            <span>
              <img src={packetDot} alt="" aria-hidden="true" />
              <b>{visual.shortLabel}</b>
            </span>
            <strong>{labels.sender}</strong>
            <em>{labels.destination}</em>
            <span>{candidate.hopCount} hop{candidate.hopCount === 1 ? '' : 's'} / {Math.round(candidate.distanceKm).toLocaleString()} km</span>
          </>
        ) : (
          <span className="packet-tv-empty">Waiting for a long routed packet</span>
        )}
      </div>
    </section>
  );
}

function drawPacketTvScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  candidate: PacketTvCandidate | null,
  now: number
) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#06111f');
  gradient.addColorStop(0.58, '#08131f');
  gradient.addColorStop(1, '#11091d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, width, height, now);

  if (!candidate) {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.62)';
    ctx.font = '700 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Listening for routed packets', width / 2, height / 2);
    return;
  }

  const color = payloadVisual(candidate.pulse.payloadTypeName).color;
  const points = normalizedRoutePoints(candidate.pulse.segments, width, height);
  if (points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = colorWithAlpha(color, 0.26);
  ctx.lineWidth = 9;
  drawPolyline(ctx, points);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = colorWithAlpha(color, 0.62);
  ctx.lineWidth = 2.4;
  drawPolyline(ctx, points);
  ctx.stroke();

  const progress = (now % 2800) / 2800;
  const comet = pointAlongPolyline(points, progress);
  const tail = pointAlongPolyline(points, Math.max(0, progress - 0.1));
  const sparkle = 0.7 + Math.sin(now / 74) * 0.3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  const tailGradient = ctx.createLinearGradient(tail.x, tail.y, comet.x, comet.y);
  tailGradient.addColorStop(0, colorWithAlpha(color, 0));
  tailGradient.addColorStop(1, colorWithAlpha(color, 0.96));
  ctx.strokeStyle = tailGradient;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(comet.x, comet.y);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, 4.6 + sparkle * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colorWithAlpha(color, 0.72);
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, 11 + sparkle * 7, 0, Math.PI * 2);
  ctx.fill();

  for (const point of [points[0], points.at(-1)!]) {
    ctx.shadowBlur = 16;
    ctx.strokeStyle = colorWithAlpha(color, 0.78);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8 + sparkle * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, now: number) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.16)';
  ctx.lineWidth = 1;
  const offset = (now / 42) % 24;
  for (let x = -24 + offset; x < width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 42, height);
    ctx.stroke();
  }
  for (let y = offset; y < height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function normalizedRoutePoints(segments: PacketTvCandidate['pulse']['segments'], width: number, height: number) {
  const raw = segments.flatMap((segment, index) => index === 0 ? [segment.from, segment.to] : [segment.to]);
  const lats = raw.map((point) => point.lat).filter(Number.isFinite);
  const lngs = raw.map((point) => point.lng).filter(Number.isFinite);
  if (lats.length === 0 || lngs.length === 0) return [];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 30;
  return raw.map((point) => ({
    x: pad + ((point.lng - minLng) / Math.max(0.0001, maxLng - minLng)) * (width - pad * 2),
    y: height - pad - ((point.lat - minLat) / Math.max(0.0001, maxLat - minLat)) * (height - pad * 2)
  }));
}

function drawPolyline(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
}

function pointAlongPolyline(points: Array<{ x: number; y: number }>, progress: number) {
  const distances: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    const distance = Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    distances.push(distance);
    total += distance;
  }
  let target = total * Math.max(0, Math.min(1, progress));
  for (let index = 1; index < points.length; index++) {
    const distance = distances[index - 1];
    if (target <= distance) {
      const local = distance <= 0 ? 0 : target / distance;
      return {
        x: points[index - 1].x + (points[index].x - points[index - 1].x) * local,
        y: points[index - 1].y + (points[index].y - points[index - 1].y) * local
      };
    }
    target -= distance;
  }
  return points.at(-1)!;
}

function colorWithAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
}
