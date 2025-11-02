# Phase 11 Messaging Reference (Archived)

The original Phase 11 scope introduced a standalone conversation stack (`Conversation`/`Message` models, REST endpoints under `/api/conversations`, and dedicated services/middleware). As of November 2025 this implementation has been retired in favour of the proven `/api/chat` group messaging flow.

## Historical Context

- Removed modules: `Conversation.model.js`, `Message.model.js`, `conversation.service.js`, `message.service.js`, related controllers/routes, and `chatUpload` middleware.
- Legacy Postman suite: `tests/postman/Phase11_Messaging.postman_collection.json` now serves as a historical artifact only.
- Socket events: only group chat (`chat:*`) events remain active; conversation-specific listeners were never finalized and have been deleted.

## Current Direction

1. Consolidate messaging around `chat.service` and augment it with clearly exported limits (`CHAT_LIMITS`) and environment knobs.
2. Produce fresh test coverage (REST + realtime) that exercises `/api/chat` exclusively.
3. Draft a new direct-messaging design before reintroducing user-to-user conversations, including data model, ACL rules, and realtime fan-out strategy.

> This document is preserved for historical tracing only. Do not treat any references above as active code paths.
