# Changelog

## 1.4.0

- Unified the map detail zoom gate so routes, route payload glow, packet canvas effects, nodes, observer icons, observer labels, and message bubbles enter and exit together.
- Reworked low-zoom clusters into role-split cluster visuals with payload-colored activity glow.
- Removed persistent ordinary node labels to stop label flicker; node names and last-heard age now live in hover/detail panels, while observer names remain persistent without age text.
- Added stale node styling: nodes grey after 30 minutes without mesh activity and darken after 60 minutes.
- Subdued idle route lines and kept packet payload glow active only on current comet routes.
- Replaced loud repeated observer rings with a sustained lower-pressure observer aura.
- Added PacketTV, a floating in-app chase-camera panel that prioritizes long live public routed packets.
- Vendored a curated asset subset for project branding, role icons, observer marker, packet dots, and legend polish.

## 1.3.5

- Improved route rendering performance for slower computers.
- Removed the unused invisible route hit layer now that routes are not directly clickable on the map.
- Moved live route payload glows to a small active-route-only GeoJSON source instead of evaluating every public route with feature-state updates.
- Added route render signatures so live packet counter changes do not force full route source rebuilds when geometry, frequency bucket, and focus state are unchanged.
- Slightly reduced passive route stroke cost while preserving selected node, phonebook path, plotted route, and packet comet visibility.
- Paced websocket event application by backend `displayAt` timestamps so bursty packet traffic ticks through the UI instead of landing in one frame.
- Replayed fresh snapshot route pulses after reconnect/poll recovery so packet comets do not disappear during websocket recovery.
- Made `/healthz` prefer cached public state so Docker health checks do not add SQLite pressure during live ingest.

## 1.3.1

- Changed phonebook defaults from max-hop-first to best useful routes first.
- Added phonebook search across node names, public node IDs, regions/IATAs, path labels, roles, and 3-byte route prefixes.
- Added phonebook sort controls for best route, shortest, busiest, nearest, and most recent.
- Added a distance filter so mobile users can narrow route-copy candidates before choosing a verified path.
- Removed direct map route-line click and hover selection so dense route areas do not steal node clicks.

## 1.3.0

- Added MeshCore 3-byte route copy support from selected phonebook paths.
- Added a Plot routes control for selecting two node endpoints and highlighting the shortest valid public route path.
- Added map-square route lookup by selecting two map corners, with matching routes highlighted and listed.
- Added decoded chatter history on selected node panels using sanitized public message text from the current live window.
- Documented the new route-copy privacy boundary: full public keys remain private, but six-character 3-byte route prefixes are public for verified path copy.

## 1.2.0

- Added node connectivity focus for repeaters, observers, rooms, companions, and sensors.
- Highlighted directly served routes and directly connected nodes when a node is selected.
- Added a reachable-node phonebook grouped by hop count, with path summaries and row-level path highlighting.
- Added close buttons, Escape dismissal, and empty-map-click dismissal for node and route panels.
- Kept the public HTTP and WebSocket API unchanged from 1.1.

## 1.1.0

- Added the MC-CartoLive project bar with MeshCore Canada, GitHub, version, and build links.
- Added a compact red Live Follow control that smoothly follows fresh packet movement.
- Stabilized the status bar so changing counters do not shift the toolbar.
- Improved mobile layout by hiding secondary panels and toasts, moving controls to the bottom, and keeping the map and packet motion as the focus.
- Kept the public API unchanged from 1.0.

## 1.0.0

- Initial public release of MeshCore MQTT Live Map, also known as MC-CartoLive.
- Added Docker Compose deployment, fixture replay mode, privacy-safe public APIs, route animation, cluster activity, observer bursts, message bubbles, and production documentation.
