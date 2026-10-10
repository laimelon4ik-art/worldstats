# WorldStats

A GeoGuessr-inspired location game with CS2-style case rewards. Explore a Street View panorama, place a guess on the map, and earn points based on accuracy, speed, precision, and streaks.

## Play

Open `index.html` in a modern browser, or serve the repository as a static website. An internet connection is required for the map tiles, Street View, and multiplayer library.

To publish it with GitHub Pages, open the repository's **Settings → Pages**, choose the `main` branch and `/ (root)` as the source, then open the Pages URL it provides.

## Multiplayer

Multiplayer game messages are relayed through a Cloudflare Durable Object over HTTPS WebSockets. Unlike a direct device-to-device WebRTC connection, this works across phone hotspots, carrier NAT, and different networks; both players only need internet access. The host still needs to keep the room tab open.

The host chooses 5–25 rounds and a 30–120 second timer before starting. All players get the same Street View location and initial view direction. Pan and move with the Street View controls inside the map; this avoids reloading the map between moves. Each player can open their own case on every other round; rewards and hints are private. Case drops are Rare (continent, green), Super Rare (country zone, blue), Epic (city, purple), Mythical (street-level area, red), Legendary (exact coordinates, yellow), and Ultra (exact coordinates, white, plus a temporary blindfold for the other players). The case reveal builds anticipation as the crate charges, shakes, and bursts open to the reel reward. Ultra hides the other players' Street View for half of the round timer, capped at the round end. Region, city, and street highlights are approximate map zones. Round scoring awards up to 5,000 accuracy points, up to 1,000 speed points, precision bonuses, and streak bonuses. After each round, a scorecard shows round points, total score, distance, scoring breakdown, and standings over a blurred map. At the end of a game, each player sees a match summary with final standings, their total score, streak, and per-round scoring breakdown.

### One-time relay setup

1. Install Node.js if needed, then run `npx wrangler login` and sign in to Cloudflare.
2. From the repository folder, run `npx wrangler deploy`. The included `wrangler.jsonc` provisions the room Durable Object and restricts access to the GitHub Pages site origin.
3. Cloudflare prints the deployed Worker URL, similar to `https://caseguessr-room-relay.<account>.workers.dev`.
4. Set `roomRelayEndpoint` near the start of the script in `index.html` to that URL, then publish the updated file to GitHub Pages.
5. Open the refreshed HTTPS game link on both devices. The host creates a room and shares its code; friends enter the code and join.

The relay forwards only small game messages and does not need a Metered account, TURN credentials, or direct access to either device. If the hotspot blocks WebSockets entirely, that network will still need to allow HTTPS/WebSocket traffic.
