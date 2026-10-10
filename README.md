# CaseGuessr

A GeoGuessr-inspired location game with CS2-style case rewards. Explore a Street View panorama, place a guess on the map, and earn points based on how close you are.

## Play

Open `index.html` in a modern browser, or serve the repository as a static website. An internet connection is required for the map tiles, Street View, and multiplayer library.

To publish it with GitHub Pages, open the repository's **Settings → Pages**, choose the `main` branch and `/ (root)` as the source, then open the Pages URL it provides.

## Multiplayer

The game uses PeerJS for room signaling and WebRTC for game data. Both players should use the same HTTPS game URL, and the host must keep the room page open.

For friends on separate networks, configure a TURN relay. Without it, school, work, mobile-carrier, or restrictive home networks can block the direct connection even while the room is active. The repository includes `turn-credentials-worker.js` as a Cloudflare Worker proxy so the TURN provider's API key is not exposed in the public game:

1. Create a free Metered Open Relay account and note its API key and `https://YOUR_APP.metered.live` service URL.
2. Deploy `turn-credentials-worker.js` as a Cloudflare Worker.
3. In the Worker settings, set `ALLOWED_ORIGIN` to the exact game origin (for GitHub Pages, `https://laimelon4ik-art.github.io`), set `METERED_API_BASE_URL` to the Metered service URL, and add `METERED_API_KEY` as a secret.
4. Copy the Worker URL into `turnCredentialsEndpoint` near the top of the script in `index.html`, for example `https://caseguessr-turn-credentials.<account>.workers.dev/`.
5. Publish the updated `index.html` to the same HTTPS site and have both players reload it.

Keep the Metered API key in the Worker secret store; do not add it to `index.html` or commit it to Git. Until the Worker is deployed and configured, multiplayer only connects when the players' networks allow a direct WebRTC connection.
