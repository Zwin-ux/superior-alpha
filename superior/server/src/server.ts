import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import {
  SuperiorRealtimeMessage,
  SuperiorSignalKind,
  SuperiorSignalEvent,
  SuperiorStatePatch,
  applySuperiorPatch,
  createInitialSuperiorState,
  createSignalEvent,
  createStatePatch,
  messageToJson,
  superiorSignalKinds
} from "@superior/core";

const defaultPort = 7357;

export function createSuperiorRealtimeServer(port = Number(process.env.SUPERIOR_SERVER_PORT ?? defaultPort)) {
  let state = applySuperiorPatch(
    createInitialSuperiorState(),
    createStatePatch({
      op: "merge",
      path: "room",
      value: {
        serverStatus: "online",
        terminalLines: ["SERVER / LOCAL BRAIN ONLINE", "BOOT / SIGNAL ROOM READY"]
      }
    })
  );

  const sockets = new Set<WebSocket>();
  const sseClients = new Set<ServerResponse>();

  const server = createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        sendJson(response, 200, {
          service: "superior-server",
          status: "ready",
          protocol: ["websocket", "sse"],
          port,
          revision: state.revision
        });
        return;
      }

      if (request.method === "GET" && request.url === "/state") {
        sendJson(response, 200, state);
        return;
      }

      if (request.method === "GET" && request.url === "/events") {
        attachSseClient(response, sseClients, { type: "hello", serverTime: new Date().toISOString(), state });
        return;
      }

      if (request.method === "POST" && request.url === "/signals") {
        const event = createSignalEvent(await readSignalInput(request));
        state = ingestSignal(state, event);
        broadcast({ type: "signal", event, state }, sockets, sseClients);
        sendJson(response, 202, { type: "signal-accepted", event, state });
        return;
      }

      if (request.method === "POST" && request.url === "/state/patch") {
        const patch = await readJson<SuperiorStatePatch>(request);
        state = applySuperiorPatch(state, patch);
        broadcast({ type: "patch", patch, state }, sockets, sseClients);
        sendJson(response, 202, { type: "patch-applied", patch, state });
        return;
      }

      sendJson(response, 404, { type: "not-found", message: "Unknown SUPERIOR server route." });
    } catch (error) {
      sendJson(response, 400, { type: "bad-request", message: error instanceof Error ? error.message : "Bad request." });
    }
  });

  const webSocketServer = new WebSocketServer({ server, path: "/socket" });
  webSocketServer.on("connection", (socket) => {
    sockets.add(socket);
    socket.send(messageToJson({ type: "hello", serverTime: new Date().toISOString(), state }));
    socket.send(messageToJson({ type: "state", state }));

    socket.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString()) as { type?: string; event?: SuperiorSignalEvent; patch?: SuperiorStatePatch };
        if (message.type === "signal" && message.event) {
          state = ingestSignal(state, message.event);
          broadcast({ type: "signal", event: message.event, state }, sockets, sseClients);
        }
        if (message.type === "patch" && message.patch) {
          state = applySuperiorPatch(state, message.patch);
          broadcast({ type: "patch", patch: message.patch, state }, sockets, sseClients);
        }
      } catch (error) {
        socket.send(messageToJson({ type: "error", code: "bad-message", message: error instanceof Error ? error.message : "Bad socket message." }));
      }
    });

    socket.on("close", () => sockets.delete(socket));
  });

  return {
    port,
    server,
    webSocketServer,
    listen() {
      return new Promise<void>((resolve) => {
        server.listen(port, "127.0.0.1", resolve);
      });
    },
    close() {
      for (const socket of sockets) {
        socket.close();
      }
      for (const response of sseClients) {
        response.end();
      }
      webSocketServer.close();
      return new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

function ingestSignal(currentState: ReturnType<typeof createInitialSuperiorState>, event: SuperiorSignalEvent) {
  return applySuperiorPatch(
    currentState,
    createStatePatch({
      op: "event",
      path: "events",
      value: event,
      createdAt: event.createdAt
    })
  );
}

async function readSignalInput(request: IncomingMessage): Promise<Parameters<typeof createSignalEvent>[0]> {
  const body = await readJson<Partial<SuperiorSignalEvent>>(request);
  const kind = superiorSignalKinds.includes(body.kind as SuperiorSignalKind) ? (body.kind as SuperiorSignalKind) : "system";

  return {
    kind,
    label: body.label ?? "Signal",
    source: body.source ?? "server",
    intensity: normalizeIntensity(body.intensity),
    ...(body.detail ? { detail: body.detail } : {})
  };
}

function normalizeIntensity(value: unknown): 0 | 1 | 2 | 3 {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : 1;
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  return rawBody ? (JSON.parse(rawBody) as T) : ({} as T);
}

function attachSseClient(response: ServerResponse, clients: Set<ServerResponse>, hello: SuperiorRealtimeMessage): void {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  clients.add(response);
  response.write(`event: hello\ndata: ${messageToJson(hello)}\n\n`);
  response.on("close", () => clients.delete(response));
}

function broadcast(message: SuperiorRealtimeMessage, sockets: Set<WebSocket>, sseClients: Set<ServerResponse>): void {
  const payload = messageToJson(message);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
  for (const response of sseClients) {
    response.write(`event: ${message.type}\ndata: ${payload}\n\n`);
  }
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
  response.end(`${JSON.stringify(value, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runtime = createSuperiorRealtimeServer();
  await runtime.listen();
  console.log(`SUPERIOR realtime server listening on http://127.0.0.1:${runtime.port}`);
  console.log(`WebSocket: ws://127.0.0.1:${runtime.port}/socket`);
}
