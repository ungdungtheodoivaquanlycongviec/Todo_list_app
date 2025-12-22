# Tài liệu Tham khảo Nhanh - Kiến trúc Hệ thống

## 📊 Tổng quan

| Thành phần | Công nghệ | Port | Mô tả |
|------------|-----------|------|-------|
| **Backend API** | Node.js + Express.js | 8080 | RESTful API server |
| **Frontend Web** | Next.js 15 + React 19 | 3000 | Web application |
| **Mobile App** | React Native 0.76 | - | iOS & Android app |
| **Chatbot** | Flask + PyTorch | 5000 | AI chatbot service |
| **Database** | MongoDB 6+ | 27017 | Primary database |
| **Cache** | Redis 7 | 6379 | Cache & Pub/Sub |
| **File Storage** | Cloudinary | - | CDN & file storage |

## 🗂️ Cấu trúc Backend

### Models (12 models)
```
User, Task, Group, Folder, Note, Notification,
GroupMessage, DirectMessage, DirectConversation,
ChatbotState, LoginHistory, AdminActionLog
```

### Controllers (10 controllers)
```
auth.controller.js      - Authentication & authorization
task.controller.js      - Task management
user.controller.js      - User management
group.controller.js     - Group management
folder.controller.js    - Folder management
note.controller.js      - Note management
notification.controller.js - Notifications
chat.controller.js      - Chat functionality
chatbot.controller.js   - Chatbot integration
admin.controller.js     - Admin operations
```

### Services (22 services)
```
Core Services:
- auth.service.js
- task.service.js
- user.service.js
- group.service.js
- folder.service.js
- note.service.js
- notification.service.js
- chat.service.js
- directChat.service.js
- admin.service.js
- file.service.js

Real-time Services:
- realtime.gateway.js
- realtime.server.js
- task.realtime.gateway.js
- chat.realtime.gateway.js
- folder.realtime.gateway.js
- group.realtime.gateway.js
- chat.socket.js
- meeting.socket.js
- notification.consumer.js
- notification.producer.js
- notification.events.js
- presence.service.js
```

### Routes (9 route files)
```
/api/auth          - Authentication routes
/api/users         - User management routes
/api/tasks         - Task management routes
/api/groups        - Group management routes
/api/folders       - Folder management routes
/api/notes         - Note management routes
/api/notifications - Notification routes
/api/chat          - Chat routes
/api/chatbot       - Chatbot routes
/api/admin         - Admin routes
```

## 🌐 API Endpoints Chính

### Authentication
```
POST   /api/auth/register    - Đăng ký
POST   /api/auth/login       - Đăng nhập
POST   /api/auth/logout      - Đăng xuất
POST   /api/auth/refresh     - Refresh token
GET    /api/auth/me          - Thông tin user hiện tại
```

### Tasks
```
GET    /api/tasks            - Danh sách tasks
POST   /api/tasks            - Tạo task mới
GET    /api/tasks/:id        - Chi tiết task
PUT    /api/tasks/:id        - Cập nhật task
DELETE /api/tasks/:id        - Xóa task
PATCH  /api/tasks/:id/status - Cập nhật trạng thái
POST   /api/tasks/:id/timer/start - Bắt đầu timer
POST   /api/tasks/:id/timer/stop  - Dừng timer
```

### Groups
```
GET    /api/groups           - Danh sách groups
POST   /api/groups           - Tạo group mới
GET    /api/groups/:id       - Chi tiết group
PUT    /api/groups/:id       - Cập nhật group
DELETE /api/groups/:id       - Xóa group
POST   /api/groups/:id/members - Thêm member
DELETE /api/groups/:id/members/:userId - Xóa member
```

### Chat
```
GET    /api/chat/groups/:groupId/messages - Group messages
POST   /api/chat/groups/:groupId/messages - Gửi group message
GET    /api/chat/direct/conversations    - Direct conversations
GET    /api/chat/direct/conversations/:id/messages - Direct messages
POST   /api/chat/direct/conversations/:id/messages - Gửi direct message
```

### Admin
```
GET    /api/admin/dashboard/stats - Thống kê dashboard
GET    /api/admin/users          - Quản lý users
POST   /api/admin/users          - Tạo user
PUT    /api/admin/users/:id      - Cập nhật user
PATCH  /api/admin/users/:id/lock - Khóa user
POST   /api/admin/notifications/send - Gửi notification
GET    /api/admin/login-history  - Lịch sử đăng nhập
```

## 🔌 Socket.IO Events

### Client → Server
```javascript
// Presence
socket.emit('presence:heartbeat')

// Chat
socket.emit('chat:join', { groupId })
socket.emit('chat:leave', { groupId })
socket.emit('chat:typing', { groupId, isTyping })
socket.emit('direct:join', { conversationId })
socket.emit('direct:typing', { conversationId, isTyping })

// Meeting
socket.emit('meeting:join', { groupId })
socket.emit('meeting:leave', { groupId })
```

### Server → Client
```javascript
// Notifications
socket.on('notifications:ready')
socket.on('notifications:new', { eventKey, notification })

// Tasks
socket.on('tasks:created', { eventKey, payload })
socket.on('tasks:updated', { eventKey, payload })
socket.on('tasks:deleted', { eventKey, payload })
socket.on('tasks:statusChanged', { eventKey, payload })

// Chat
socket.on('chat:message', { type, message })
socket.on('chat:reaction', { type, messageId, emoji, userId })
socket.on('direct:message', { type, conversationId, message })
socket.on('direct:reaction', { type, conversationId, messageId, emoji })

// Folders & Groups
socket.on('folders:update', { eventKey, folder, groupId })
socket.on('groups:update', { eventKey, group, groupId })

// Presence
socket.on('presence:update', { userId, status, metadata })
```

## 🗄️ Database Schema Tóm tắt

### User
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  avatar: String,
  role: ['user', 'admin', 'super_admin'],
  groupRole: String,
  isLeader: Boolean,
  currentGroupId: ObjectId,
  preferences: {
    theme: String,
    language: String,
    regionalPreferences: Object
  }
}
```

### Task
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  status: ['todo', 'in_progress', 'completed', 'incomplete', 'archived'],
  priority: ['low', 'medium', 'high', 'critical', 'urgent'],
  dueDate: Date,
  completedAt: Date,
  createdBy: ObjectId (ref: User),
  assignedTo: [{ userId: ObjectId, assignedAt: Date }],
  tags: [String],
  category: String,
  type: ['Operational', 'Strategic', 'Financial', 'Technical', 'Other'],
  groupId: ObjectId (ref: Group),
  folderId: ObjectId (ref: Folder),
  attachments: [Object],
  timer: {
    isRunning: Boolean,
    startTime: Date,
    totalDuration: Number
  }
}
```

### Group
```javascript
{
  _id: ObjectId,
  name: String,
  isPersonalWorkspace: Boolean,
  description: String,
  createdBy: ObjectId (ref: User),
  members: [{
    userId: ObjectId (ref: User),
    role: String,
    joinedAt: Date
  }],
  metadata: {
    color: String,
    icon: String
  },
  defaultFolderId: ObjectId (ref: Folder)
}
```

## 🔐 Authentication Flow

```
1. User đăng nhập → POST /api/auth/login
2. Server verify credentials
3. Generate JWT access token (7 days)
4. Generate JWT refresh token (30 days)
5. Save refresh token to database
6. Return tokens to client
7. Client stores tokens (localStorage)
8. Client includes token in Authorization header
9. Server validates token on each request
10. If expired, use refresh token to get new access token
```

## 🎯 Middleware Stack

```
1. CORS - Cross-Origin Resource Sharing
2. Helmet - Security headers
3. Morgan - Request logging
4. Body Parser - Parse JSON/URL-encoded
5. Cookie Parser - Parse cookies
6. Authentication Middleware - JWT validation
7. Authorization Middleware - Role/permission check
8. Rate Limiter - Request throttling
9. Validator - Input validation
10. Error Handler - Global error handling
```

## 📱 Frontend Structure

### Context Providers (8 contexts)
```
AuthContext          - Authentication state
FolderContext        - Folder management
LanguageContext      - i18n
RegionalContext      - Timezone & date format
UIStateContext       - UI state management
TimerContext         - Task timers
ToastContext         - Toast notifications
ConfirmContext       - Confirmation dialogs
```

### Services (15 services)
```
api.client.ts        - Axios client configuration
auth.service.ts      - Authentication API calls
task.service.ts      - Task API calls
user.service.ts      - User API calls
group.service.ts     - Group API calls
folder.service.ts    - Folder API calls
note.service.ts      - Note API calls
notification.service.ts - Notification API calls
chat.service.ts      - Chat API calls
admin.service.ts     - Admin API calls
meeting.service.ts   - Meeting API calls
```

### Views (14 views)
```
TasksView            - Task management view
NotesView            - Note management view
ChatView             - Chat interface
Dashboard            - Dashboard view
GroupManagementView  - Group management
FolderManagementView - Folder management
AdminView            - Admin panel
```

## 🔄 Real-time Features

### Supported Real-time Events
- ✅ Task creation/update/deletion
- ✅ Task status changes
- ✅ Task assignments
- ✅ Notification delivery
- ✅ Group chat messages
- ✅ Direct messages
- ✅ Folder updates
- ✅ Group updates
- ✅ User presence
- ✅ Typing indicators

### Room Types
```
user:${userId}           - User-specific room
group:${groupId}        - Group room
direct:${conversationId} - Direct conversation room
```

## 🚀 Deployment Checklist

### Backend
- [ ] MongoDB cluster setup
- [ ] Redis cluster setup
- [ ] Environment variables configured
- [ ] Cloudinary account setup
- [ ] Firebase project setup
- [ ] SSL certificates
- [ ] PM2 or similar process manager
- [ ] Logging setup
- [ ] Monitoring setup

### Frontend
- [ ] Environment variables configured
- [ ] Build optimization
- [ ] CDN setup for static assets
- [ ] Next.js production build
- [ ] Error tracking (Sentry, etc.)

### Mobile
- [ ] iOS certificates & provisioning
- [ ] Android keystore
- [ ] App Store Connect setup
- [ ] Google Play Console setup
- [ ] Push notification certificates

### Chatbot
- [ ] Python environment setup
- [ ] Model file (data.pth)
- [ ] Flask production server (Gunicorn)
- [ ] NLTK data download

## 📈 Performance Metrics

### API Response Times (Target)
- Authentication: < 200ms
- Task CRUD: < 300ms
- Group operations: < 400ms
- Chat messages: < 150ms
- File uploads: < 2s (depends on file size)

### Real-time Latency (Target)
- Message delivery: < 100ms
- Presence updates: < 50ms
- Notification delivery: < 200ms

## 🔧 Environment Variables

### Backend (.env)
```env
PORT=8080
NODE_ENV=production
MONGODB_URI=mongodb://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
REDIS_URL=redis://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FIREBASE_PROJECT_ID=...
SOCKET_ALLOWED_ORIGINS=https://...
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api...
NEXT_PUBLIC_SOCKET_URL=https://api...
NEXT_PUBLIC_CHATBOT_URL=https://chatbot...
```

## 📚 Tài liệu Tham khảo

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - Tài liệu kiến trúc chi tiết
- [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) - Biểu đồ kiến trúc
- [ADMIN_SYSTEM_SUMMARY.md](./ADMIN_SYSTEM_SUMMARY.md) - Hệ thống admin
- [GROUP_MANAGEMENT_GUIDE.md](./GROUP_MANAGEMENT_GUIDE.md) - Quản lý groups
- [CHATBOT_INTEGRATION_SUMMARY.md](./CHATBOT_INTEGRATION_SUMMARY.md) - Chatbot
- [TASK_IMPROVEMENTS_SUMMARY.md](./TASK_IMPROVEMENTS_SUMMARY.md) - Cải tiến tasks

---

**Cập nhật lần cuối**: 2024

