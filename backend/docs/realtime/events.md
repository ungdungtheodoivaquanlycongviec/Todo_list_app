# Realtime Event Contracts

This document tracks the Socket.IO events exposed by the Phase 10 realtime transport layer. Payloads are documented using TypeScript-like notation for readability.

## Namespaces

- **`/ws/app`** – primary application namespace. All events below are scoped to this namespace.

## Outbound Events (Server ➡️ Client)

### `notifications:ready`

Signalled immediately after a socket joins the caller's personal room.

```ts
interface NotificationsReadyPayload {
  message: string; // Human-readable confirmation string
  userId: string;  // Authenticated user identifier
}
```

### `notifications:new`

Realtime delivery for notification documents. The payload mirrors the REST contract.

```ts
interface NotificationsNewPayload {
  eventKey: string;               // Logical channel (e.g. task.assigned)
  notification: NotificationDTO;  // Full notification document returned by the API
}
```

> **Note**
> `NotificationDTO` corresponds to the response object returned by `GET /api/notifications`.

### `messages:new`

Broadcast whenever a persisted message enters a conversation. Delivered to:
- `conversation:<id>` room (subscribed clients)
- `user:<id>` rooms for all participants, including sender

```ts
interface MessagesNewPayload {
  conversationId: string;
  message: MessageDTO;      // Matches REST contract
  senderId: string;
  recipients: string[];     // Participant ids receiving the broadcast
}
```

### `messages:updated`

Emitted after an author edits a previously sent message.

```ts
interface MessagesUpdatedPayload {
  conversationId: string;
  message: MessageDTO;
  senderId: string;
  recipients: string[];
}
```

### `messages:deleted`

Soft-delete notification. Payload mirrors `messages:updated`, but `message.status` equals `'deleted'` and `message.deletedAt` is populated.

```ts
interface MessagesDeletedPayload {
  conversationId: string;
  message: MessageDTO;
  senderId: string;
  recipients: string[];
}
```

### `presence:update`

Broadcast whenever a user's presence state changes (connect, heartbeat, disconnect).

```ts
interface PresenceSnapshot {
  userId: string;
  isOnline: boolean;
  lastSeen: number | null; // Unix epoch (ms)
  sockets: Array<{
    socketId: string;
    connectedAt: number | null; // Unix epoch (ms)
    lastSeen: number | null;    // Unix epoch (ms)
    userAgent: string | null;
    ip: string | null;
  }>;
}
```

The event is emitted globally (`namespace.emit`) and to the user's personal room (`namespace.to("user:<id>")`). Consumers may filter as needed.

### `error`

Emitted when a socket-level error occurs (authentication failure, adapter issue, etc.).

```ts
interface SocketErrorPayload {
  code: 'socket_error:unauthorized' | 'socket_error:token_expired' | string;
  message: string;
}
```

### `system:disconnect` *(reserved)*

Planned for Phase 10 hardening to broadcast administrative disconnects (e.g. maintenance kicks).

## Inbound Events (Client ➡️ Server)

### `presence:heartbeat`

Optional hint allowing clients to proactively refresh their presence state. The server already refreshes heartbeats on a timer, so this event is primarily for mobile/web clients that want tighter control.

```ts
// Payload is ignored; the act of emitting is sufficient.
socket.emit('presence:heartbeat');
```

### `conversations:join`

Join a conversation room to scope subsequent message broadcasts. The server validates membership before honoring the request.

```ts
socket.emit('conversations:join', { conversationId }, (ack) => {
  if (!ack?.success) {
    console.error('Join failed', ack?.message);
  }
});
```

### `conversations:leave`

Gracefully exit a conversation room when no longer needed.

```ts
socket.emit('conversations:leave', { conversationId });
```

## Room Strategy

- `user:<id>` – personal room automatically joined after successful authentication.
- `conversation:<id>` – messaging fan-out room. Clients should call `conversations:join` before expecting message broadcasts.
- `group:<id>` – reserved for future group-scope broadcasts.

## Envelope Limits

- `maxHttpBufferSize` is capped at **5 KB** by default (`SOCKET_MAX_PAYLOAD_BYTES`). Increase via environment variables if larger payloads are needed.
- Presence TTL defaults to **60 s** (`PRESENCE_TTL_SECONDS`). Extend as required for slower clients.

## Error Codes

| Code                         | Description                              |
|-----------------------------|------------------------------------------|
| `socket_error:unauthorized` | Missing or invalid authentication token. |
| `socket_error:token_expired`| Token verified but has expired.          |

## References

- Implementation: `src/realtime/server.js`
- Presence service: `src/realtime/presence.service.js`
- Authentication middleware: `src/realtime/middleware/authenticateSocket.js`
- Notification bridge: `src/services/realtime.gateway.js`
- Metrics Snapshot: Logged automatically in non-production environments; review server console for active/peak connection counts.
