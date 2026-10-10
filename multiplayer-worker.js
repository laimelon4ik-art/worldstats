const MAX_MESSAGE_LENGTH = 32_768;

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function errorPacket(socket, message, code = 4000) {
  try {
    socket.send(JSON.stringify({ type: "error", message }));
  } finally {
    socket.close(code, message.slice(0, 120));
  }
}

export class Room {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return jsonResponse({ error: "WebSocket upgrade required." }, 426);
    }

    const role = new URL(request.url).searchParams.get("role");
    if (role !== "host" && role !== "guest") {
      return jsonResponse({ error: "Invalid room role." }, 400);
    }

    const hostSocket = this.state.getWebSockets("host")[0];
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (role === "guest" && !hostSocket) {
      this.state.acceptWebSocket(server, ["rejected"]);
      errorPacket(server, "No active room uses that code.", 4003);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (role === "host" && hostSocket) {
      this.state.acceptWebSocket(server, ["rejected"]);
      errorPacket(server, "That room code is already in use.", 4001);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (role === "guest" && this.state.getWebSockets("guest").length >= 15) {
      this.state.acceptWebSocket(server, ["rejected"]);
      errorPacket(server, "This room is full. Ask the host to create another room.", 4004);
      return new Response(null, { status: 101, webSocket: client });
    }

    this.state.acceptWebSocket(server, [role]);
    server.serializeAttachment({ role });

    if (role === "host") {
      server.send(JSON.stringify({ type: "ready" }));
    } else {
      const playerId = crypto.randomUUID();
      server.serializeAttachment({ role, playerId });
      hostSocket.send(JSON.stringify({ type: "player-joined", playerId }));
      server.send(JSON.stringify({ type: "welcome", playerId }));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, rawMessage) {
    const attachment = socket.deserializeAttachment();
    const role = attachment?.role;
    if (typeof rawMessage !== "string" || rawMessage.length > MAX_MESSAGE_LENGTH) {
      errorPacket(socket, "Room message is invalid or too large.");
      return;
    }

    let packet;
    try {
      packet = JSON.parse(rawMessage);
    } catch {
      errorPacket(socket, "Room message is not valid JSON.");
      return;
    }
    if (!packet || typeof packet !== "object") {
      errorPacket(socket, "Room message has an invalid format.");
      return;
    }
    if (packet.type === "ping") {
      socket.send(JSON.stringify({ type: "pong" }));
      return;
    }
    if (role !== "host" && role !== "guest") {
      errorPacket(socket, "Room socket has an invalid role.");
      return;
    }

    const hostSocket = this.state.getWebSockets("host")[0];
    if (role === "host" && packet.type === "broadcast" && packet.message && typeof packet.message === "object") {
      const serialized = JSON.stringify({ type: "message", message: packet.message });
      if (serialized.length > MAX_MESSAGE_LENGTH) {
        errorPacket(socket, "Room message is too large.");
        return;
      }
      this.state.getWebSockets("guest").forEach((guest) => guest.send(serialized));
      return;
    }

    if (role === "guest" && packet.type === "client-message" && packet.message && typeof packet.message === "object") {
      if (!hostSocket) {
        errorPacket(socket, "The host left the room.", 4002);
        return;
      }
      const serialized = JSON.stringify({
        type: "client-message",
        playerId: attachment?.playerId,
        message: packet.message,
      });
      if (serialized.length > MAX_MESSAGE_LENGTH) {
        errorPacket(socket, "Room message is too large.");
        return;
      }
      hostSocket.send(serialized);
      return;
    }

    errorPacket(socket, "That message is not allowed for this room role.");
  }

  webSocketClose(socket) {
    const role = socket.deserializeAttachment()?.role;
    if (role === "host") {
      this.state.getWebSockets("guest").forEach((guest) => {
        try {
          guest.close(4002, "The host left the room.");
        } catch (error) {
          console.error("Could not close a guest socket after the host left.", error);
        }
      });
      return;
    }
    if (role !== "guest") return;

    const hostSocket = this.state.getWebSockets("host")[0];
    if (!hostSocket) return;
    const attachment = socket.deserializeAttachment();
    if (attachment?.playerId) {
      hostSocket.send(JSON.stringify({ type: "player-left", playerId: attachment.playerId }));
    }
  }

  webSocketError(socket) {
    this.webSocketClose(socket);
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (!origin || origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ error: "Origin is not allowed." }, 403);
    }

    const match = new URL(request.url).pathname.match(/^\/room\/([A-Z0-9]{5,12})$/);
    if (!match) return jsonResponse({ error: "Room path is invalid." }, 404);
    if (!env.ROOMS) return jsonResponse({ error: "Room relay is not configured." }, 503);

    const roomId = env.ROOMS.idFromName(match[1]);
    return env.ROOMS.get(roomId).fetch(request);
  },
};
