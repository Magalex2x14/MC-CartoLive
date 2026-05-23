import type { CSSProperties } from 'react';
import { normalizePayloadType, payloadLegendVisuals } from '../payloadVisuals';
import { routeAssetIcons, routePacketDots } from '../assets/routes/assets';

export default function Legend() {
  const payloads = payloadLegendVisuals();
  return (
    <section className="legend-panel" aria-label="Map legend">
      <div className="legend-group">
        <span className="legend-title">Devices</span>
        <span><img className="legend-role-icon" src={routeAssetIcons.repeater} alt="" aria-hidden="true" />Repeater</span>
        <span><img className="legend-role-icon" src={routeAssetIcons.companion} alt="" aria-hidden="true" />Companion</span>
        <span><img className="legend-role-icon" src={routeAssetIcons.room} alt="" aria-hidden="true" />Room</span>
        <span><img className="legend-role-icon observer" src={routeAssetIcons.observer} alt="" aria-hidden="true" />Observer</span>
      </div>
      <div className="legend-group">
        <span className="legend-title">Routes</span>
        <span className="frequency-ramp" />
        <span className="legend-scale"><b>Quiet</b><b>Busy</b></span>
      </div>
      <div className="legend-group packet-key">
        <span className="legend-title">Packets</span>
        <div className="payload-key">
          {payloads.map((payload) => (
            <span className="payload-chip legend-payload" style={{ '--payload-color': payload.color } as CSSProperties} title={payload.description} key={payload.className}>
              <img src={routePacketDots[normalizePayloadType(payload.label)] ?? routePacketDots.OTHER} alt="" aria-hidden="true" />
              {payload.shortLabel}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
