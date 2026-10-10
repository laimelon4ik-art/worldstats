# CaseGuessr

A GeoGuessr-inspired location game with CS2-style case rewards. Explore a Street View panorama, place a guess on the map, and earn points based on how close you are.

## Play

Open `index.html` in a modern browser, or serve the repository as a static website. An internet connection is required for the map tiles, Street View, and multiplayer library.

To publish it with GitHub Pages, open the repository's **Settings → Pages**, choose the `main` branch and `/ (root)` as the source, then open the Pages URL it provides.

## Multiplayer

The game uses PeerJS/WebRTC for room connections. Both players should use the same HTTPS game URL, and the host must keep the room page open. WebRTC connectivity depends on the players' networks and browser policies; some networks block peer-to-peer connections.
