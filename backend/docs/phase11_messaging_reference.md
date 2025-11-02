# Phase 11 Messaging Reference

This document captures the backend touchpoints introduced while implementing Phase 11 (messaging) so reviewers and testers can quickly navigate the new surface area.

## REST Endpoints

| Method | Path | Purpose | Controller | Service | Middleware & Validators |
|--------|------|---------|------------|---------|-------------------------|
| GET | `/api/conversations` | List conversations for the authenticated user with pagination, filtering, archived toggle, sorting. | `conversation.controller.listConversations` | `conversation.service.listConversations` | `authenticate` |
| POST | `/api/conversations` | Create a new direct or group conversation (returns existing direct thread when applicable). | `conversation.controller.createConversation` | `conversation.service.createConversation` | `authenticate`, `validateCreateConversation` |
| GET | `/api/conversations/:conversationId` | Fetch conversation metadata (participants, last message, etc.). | `conversation.controller.getConversationById` | `conversation.service.getConversation` | `authenticate` |
| PATCH | `/api/conversations/:conversationId` | Update conversation title/description/metadata. | `conversation.controller.updateConversation` | `conversation.service.updateConversation` | `authenticate`, `validateUpdateConversation` |
| PATCH | `/api/conversations/:conversationId/state` | Toggle participant state (mute/archive) and auto-refresh read timestamp when unarchiving. | `conversation.controller.updateParticipantState` | `conversation.service.updateParticipantState` | `authenticate`, `validateConversationState` |
| POST | `/api/conversations/:conversationId/read` | Mark a conversation read up to an optional message cursor; refreshes read receipts. | `conversation.controller.markConversationRead` | `conversation.service.markConversationRead` | `authenticate`, `validateMarkConversationRead` |
| GET | `/api/conversations/:conversationId/messages` | Retrieve message history with forward/backward pagination cursors. | `message.controller.listMessages` | `message.service.listMessages` | `authenticate` |
| POST | `/api/conversations/:conversationId/messages` | Send a message with optional attachments stored in Cloudinary. | `message.controller.createMessage` | `message.service.createMessage` | `authenticate`, `uploadChatAttachments`, `handleChatUploadError`, `validateSendMessage` |
| PATCH | `/api/conversations/:conversationId/messages/:messageId` | Edit message content (attachments remain untouched). | `message.controller.updateMessage` | `message.service.updateMessage` | `authenticate`, `validateUpdateMessage` |
| DELETE | `/api/conversations/:conversationId/messages/:messageId` | Soft-delete a message, purge Cloudinary attachments, emit realtime event. | `message.controller.deleteMessage` | `message.service.deleteMessage` | `authenticate` |

## Realtime Events (`/ws/app` namespace)

| Event | Direction | Payload Highlights | Source |
|-------|-----------|--------------------|--------|
| `notifications:ready` | Server ➝ Client | `{ message, userId }` handshake confirmation on connection. | `realtime/server.js`
| `messages:new` | Server ➝ Client | `{ conversationId, message, senderId, recipients }` fan-out to conversation room + participant personal rooms. | `message.service.createMessage`
| `messages:updated` | Server ➝ Client | Same structure as `messages:new` for edits. | `message.service.updateMessage`
| `messages:deleted` | Server ➝ Client | Same envelope with `message.status === 'deleted'`. | `message.service.deleteMessage`
| `conversations:join` | Client ➝ Server | `{ conversationId }` join room; server validates membership before acknowleding. | `realtime/server.js`
| `conversations:leave` | Client ➝ Server | `{ conversationId }` leave conversation room. | `realtime/server.js`
| `presence:update` | Server ➝ Client | Presence snapshots reused from Phase 10. | `presence.service`

Full payload definitions live in `docs/realtime/events.md`.

## Key Code Areas to Review

- `src/config/environment.js` / `.env.example` – chat-specific knobs (`CHAT_ATTACHMENT_FOLDER`, limits) exported via `CHAT_CONFIG`.
- `src/config/constants.js` – conversation/message enums, chat limit constants, shared status & message copy.
- `src/models/Conversation.model.js` & `src/models/Message.model.js` – participant state, last-message pointer, attachment/read receipt schema, indexes.
- `src/middlewares/chatUpload.js` – Multer memory storage wrapper enforcing chat file limits and MIME whitelist.
- `src/middlewares/validator.js` – new validators for conversation creation, state changes, messaging payloads.
- `src/controllers/*` – thin orchestration layers funneling to services and `utils/response` helpers.
- `src/services/conversation.service.js` – business rules for membership, read receipts, muting/archiving, last message bookkeeping.
- `src/services/message.service.js` – message lifecycle (create/edit/delete), Cloudinary integration via `file.service`, realtime bridge.
- `src/services/realtime.gateway.js` & `src/realtime/server.js` – bridged message events, conversation room join/leave handling, redis adapter compatibility.
- `src/routes/conversation.routes.js` – route wiring, middleware order (upload ➝ error handling ➝ validation).

## Operational Notes

- Attachments are uploaded to the Cloudinary folder defined by `CHAT_ATTACHMENT_FOLDER`; ensure credentials allow the new path.
- Message retention relies on MongoDB indexes defined on `conversationId`/`createdAt`; run `npm run lint` and existing migrations to confirm indexes sync.
- Postman collection: `tests/postman/Phase11_Messaging.postman_collection.json` (added alongside this document) exercises the core REST flows.
