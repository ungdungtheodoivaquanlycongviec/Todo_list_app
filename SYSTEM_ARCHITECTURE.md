# Kiến trúc Hệ thống - My Todo List App

## 📋 Mục lục
1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Kiến trúc tổng thể](#kiến-trúc-tổng-thể)
3. [Các thành phần chính](#các-thành-phần-chính)
4. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
5. [Kiến trúc Backend](#kiến-trúc-backend)
6. [Kiến trúc Frontend](#kiến-trúc-frontend)
7. [Kiến trúc Mobile](#kiến-trúc-mobile)
8. [Kiến trúc Chatbot](#kiến-trúc-chatbot)
9. [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
10. [Hệ thống Real-time](#hệ-thống-real-time)
11. [Luồng dữ liệu](#luồng-dữ-liệu)
12. [Bảo mật](#bảo-mật)
13. [Triển khai](#triển-khai)

---

## Tổng quan hệ thống

Hệ thống **My Todo List App** là một ứng dụng quản lý công việc đa nền tảng với các tính năng:
- ✅ Quản lý tasks (công việc) với nhiều trạng thái và độ ưu tiên
- 👥 Quản lý nhóm (Groups) và phân quyền
- 📁 Quản lý thư mục (Folders) để tổ chức tasks
- 📝 Quản lý ghi chú (Notes)
- 💬 Chat trực tiếp và nhóm
- 🤖 Chatbot hỗ trợ thông minh
- 🔔 Hệ thống thông báo real-time
- 👤 Quản lý người dùng và admin
- 📱 Ứng dụng mobile (React Native)

---

## Kiến trúc tổng thể

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Next.js 15]
        MOBILE[Mobile App<br/>React Native]
    end
    
    subgraph "API Gateway Layer"
        API[Backend API<br/>Express.js]
    end
    
    subgraph "Real-time Layer"
        WS[WebSocket Server<br/>Socket.IO]
        REDIS[Redis<br/>Pub/Sub & Presence]
    end
    
    subgraph "Business Logic Layer"
        AUTH[Auth Service]
        TASK[Task Service]
        GROUP[Group Service]
        CHAT[Chat Service]
        NOTIF[Notification Service]
        ADMIN[Admin Service]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB<br/>Primary Database)]
        CLOUD[Cloudinary<br/>File Storage]
    end
    
    subgraph "External Services"
        CHATBOT[Chatbot Service<br/>Flask/Python]
        FIREBASE[Firebase<br/>Push Notifications]
    end
    
    WEB --> API
    MOBILE --> API
    WEB --> WS
    MOBILE --> WS
    
    API --> AUTH
    API --> TASK
    API --> GROUP
    API --> CHAT
    API --> NOTIF
    API --> ADMIN
    
    WS --> REDIS
    WS --> NOTIF
    WS --> CHAT
    
    AUTH --> MONGO
    TASK --> MONGO
    GROUP --> MONGO
    CHAT --> MONGO
    NOTIF --> MONGO
    ADMIN --> MONGO
    
    TASK --> CLOUD
    CHAT --> CLOUD
    
    API --> CHATBOT
    NOTIF --> FIREBASE
```

---

## Các thành phần chính

### 1. Backend (Node.js/Express)
- **Vai trò**: API server chính, xử lý business logic
- **Port**: 8080 (mặc định)
- **Framework**: Express.js 5.x
- **Database**: MongoDB với Mongoose ODM

### 2. Frontend Web (Next.js)
- **Vai trò**: Giao diện web cho người dùng
- **Port**: 3000 (mặc định)
- **Framework**: Next.js 15 với React 19
- **Styling**: Tailwind CSS 4

### 3. Mobile App (React Native)
- **Vai trò**: Ứng dụng di động cho iOS và Android
- **Framework**: React Native 0.76
- **Navigation**: React Navigation 7

### 4. Chatbot Service (Flask/Python)
- **Vai trò**: Xử lý câu hỏi và hỗ trợ người dùng
- **Framework**: Flask
- **AI**: Neural Network với PyTorch

### 5. Real-time Server (Socket.IO)
- **Vai trò**: Xử lý kết nối WebSocket cho real-time features
- **Namespace**: `/ws/app`
- **Adapter**: Redis (tùy chọn, cho scaling)

---

## Công nghệ sử dụng

### Backend Stack
```
Runtime: Node.js (v18+)
Framework: Express.js 5.1.0
Database: MongoDB 6+ với Mongoose 8.18.3
Authentication: JWT (jsonwebtoken 9.0.2)
Real-time: Socket.IO 4.8.1
Cache/Pub-Sub: Redis (ioredis 5.4.2)
File Storage: Cloudinary 2.7.0
Security: Helmet, CORS, express-rate-limit
Validation: validator.js
```

### Frontend Stack
```
Framework: Next.js 15.5.4
UI Library: React 19.1.0
Styling: Tailwind CSS 4
Language: TypeScript 5
Real-time: Socket.IO Client 4.8.1
State Management: React Context API
```

### Mobile Stack
```
Framework: React Native 0.76.0
Navigation: React Navigation 7
Storage: AsyncStorage
HTTP Client: Axios
Real-time: Socket.IO Client 4.8.1
```

### Chatbot Stack
```
Framework: Flask (Python)
AI: PyTorch
NLP: NLTK
```

### Infrastructure
```
Database: MongoDB
Cache: Redis
File Storage: Cloudinary
Push Notifications: Firebase Admin SDK
```

---

## Kiến trúc Backend

### Cấu trúc thư mục

```
backend/
├── server.js                 # Entry point
├── src/
│   ├── app.js               # Express app configuration
│   ├── config/              # Configuration files
│   │   ├── database.js      # MongoDB connection
│   │   ├── environment.js   # Environment variables
│   │   ├── constants.js     # Application constants
│   │   ├── cloudinary.js    # Cloudinary config
│   │   └── firebaseAdmin.js # Firebase config
│   ├── models/              # Mongoose models (12 models)
│   │   ├── User.model.js
│   │   ├── Task.model.js
│   │   ├── Group.model.js
│   │   ├── Folder.model.js
│   │   ├── Note.model.js
│   │   ├── Notification.model.js
│   │   ├── GroupMessage.model.js
│   │   ├── DirectMessage.model.js
│   │   ├── DirectConversation.model.js
│   │   ├── ChatbotState.model.js
│   │   ├── LoginHistory.model.js
│   │   └── AdminActionLog.model.js
│   ├── controllers/         # Route controllers (10 controllers)
│   │   ├── auth.controller.js
│   │   ├── task.controller.js
│   │   ├── user.controller.js
│   │   ├── group.controller.js
│   │   ├── folder.controller.js
│   │   ├── note.controller.js
│   │   ├── notification.controller.js
│   │   ├── chat.controller.js
│   │   ├── chatbot.controller.js
│   │   └── admin.controller.js
│   ├── services/            # Business logic (22 services)
│   │   ├── auth.service.js
│   │   ├── task.service.js
│   │   ├── user.service.js
│   │   ├── group.service.js
│   │   ├── folder.service.js
│   │   ├── note.service.js
│   │   ├── notification.service.js
│   │   ├── chat.service.js
│   │   ├── directChat.service.js
│   │   ├── admin.service.js
│   │   ├── file.service.js
│   │   └── [realtime services]
│   ├── routes/              # API routes (9 route files)
│   │   ├── index.js         # Main router
│   │   ├── auth.routes.js
│   │   ├── task.routes.js
│   │   ├── user.routes.js
│   │   ├── group.routes.js
│   │   ├── folder.routes.js
│   │   ├── note.routes.js
│   │   ├── notification.routes.js
│   │   ├── chat.routes.js
│   │   ├── chatbot.routes.js
│   │   └── admin.routes.js
│   ├── middlewares/         # Custom middlewares
│   │   ├── auth.js          # JWT authentication
│   │   ├── adminAuth.js     # Admin authorization
│   │   ├── groupAuth.js     # Group authorization
│   │   ├── errorHandler.js  # Error handling
│   │   ├── validator.js     # Input validation
│   │   ├── rateLimiter.js   # Rate limiting
│   │   └── upload.js        # File upload
│   ├── realtime/            # Real-time layer
│   │   ├── index.js         # Realtime initialization
│   │   ├── server.js        # Socket.IO server setup
│   │   ├── presence.service.js # Presence tracking
│   │   └── middleware/
│   │       └── authenticateSocket.js
│   └── utils/               # Helper functions
│       ├── initSuperAdmin.js
│       ├── response.js
│       ├── validationHelper.js
│       └── dateHelper.js
```

### Luồng xử lý request

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Middleware
    participant Controller
    participant Service
    participant Model
    participant Database
    
    Client->>Express: HTTP Request
    Express->>Middleware: CORS, Helmet, Body Parser
    Middleware->>Middleware: Authentication (JWT)
    Middleware->>Middleware: Authorization (Role Check)
    Middleware->>Middleware: Rate Limiting
    Middleware->>Controller: Route Handler
    Controller->>Service: Business Logic Call
    Service->>Model: Database Query
    Model->>Database: MongoDB Operation
    Database-->>Model: Result
    Model-->>Service: Data
    Service-->>Controller: Processed Data
    Controller-->>Express: JSON Response
    Express-->>Client: HTTP Response
```

### API Routes Structure

```
/api
├── /auth
│   ├── POST /register          # Đăng ký
│   ├── POST /login             # Đăng nhập
│   ├── POST /logout            # Đăng xuất
│   ├── POST /refresh           # Refresh token
│   └── GET  /me                # Thông tin user hiện tại
│
├── /users
│   ├── GET    /                # Danh sách users
│   ├── GET    /:id             # Chi tiết user
│   ├── PUT    /:id             # Cập nhật user
│   ├── PATCH  /:id/avatar      # Cập nhật avatar
│   └── GET    /:id/groups      # Groups của user
│
├── /tasks
│   ├── GET    /                # Danh sách tasks
│   ├── POST   /                # Tạo task mới
│   ├── GET    /:id             # Chi tiết task
│   ├── PUT    /:id             # Cập nhật task
│   ├── DELETE /:id             # Xóa task
│   ├── PATCH  /:id/status      # Cập nhật trạng thái
│   ├── PATCH  /:id/assign      # Gán task
│   └── POST   /:id/timer       # Timer operations
│
├── /groups
│   ├── GET    /                # Danh sách groups
│   ├── POST   /                # Tạo group mới
│   ├── GET    /:id             # Chi tiết group
│   ├── PUT    /:id             # Cập nhật group
│   ├── DELETE /:id             # Xóa group
│   ├── POST   /:id/members     # Thêm member
│   ├── DELETE /:id/members/:userId  # Xóa member
│   └── PATCH  /:id/members/:userId/role  # Cập nhật role
│
├── /folders
│   ├── GET    /                # Danh sách folders
│   ├── POST   /                # Tạo folder mới
│   ├── GET    /:id             # Chi tiết folder
│   ├── PUT    /:id             # Cập nhật folder
│   └── DELETE /:id             # Xóa folder
│
├── /notes
│   ├── GET    /                # Danh sách notes
│   ├── POST   /                # Tạo note mới
│   ├── GET    /:id             # Chi tiết note
│   ├── PUT    /:id             # Cập nhật note
│   └── DELETE /:id             # Xóa note
│
├── /notifications
│   ├── GET    /                # Danh sách notifications
│   ├── PATCH  /:id/read        # Đánh dấu đã đọc
│   └── DELETE /:id             # Xóa notification
│
├── /chat
│   ├── GET    /groups/:groupId/messages    # Group messages
│   ├── POST   /groups/:groupId/messages    # Gửi message
│   ├── GET    /direct/conversations        # Direct conversations
│   ├── GET    /direct/conversations/:id/messages  # Direct messages
│   └── POST   /direct/conversations/:id/messages  # Gửi direct message
│
├── /chatbot
│   └── GET    /context         # Lấy context cho chatbot
│
└── /admin
    ├── GET    /dashboard/stats      # Thống kê dashboard
    ├── GET    /users                # Quản lý users
    ├── POST   /users                # Tạo user
    ├── PUT    /users/:id            # Cập nhật user
    ├── PATCH  /users/:id/lock       # Khóa user
    ├── POST   /users/:id/assign-admin  # Gán admin
    ├── POST   /notifications/send   # Gửi notification
    └── GET    /login-history        # Lịch sử đăng nhập
```

---

## Kiến trúc Frontend

### Cấu trúc thư mục

```
frontend/
├── app/
│   ├── layout.tsx            # Root layout với providers
│   ├── page.tsx              # Home page
│   ├── dashboard/
│   │   └── page.tsx          # Dashboard page
│   ├── admin/
│   │   └── page.tsx          # Admin panel
│   ├── components/           # React components
│   │   ├── AppInterface.tsx  # Main app interface
│   │   ├── AuthPages.tsx     # Auth pages
│   │   ├── GroupSelector.tsx  # Group selector
│   │   ├── NotificationDropdown.tsx
│   │   ├── ProfileSettings.tsx
│   │   ├── common/           # Common components
│   │   │   ├── ChatbotWidget.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   ├── folders/          # Folder components
│   │   ├── groups/           # Group components
│   │   ├── layouts/          # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── ToolsSidebar.tsx
│   │   │   └── TaskDetailSidebar.tsx
│   │   └── views/            # View components
│   │       ├── TasksView/
│   │       ├── NotesView/
│   │       ├── ChatView/
│   │       └── ...
│   ├── contexts/             # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── FolderContext.tsx
│   │   ├── LanguageContext.tsx
│   │   ├── RegionalContext.tsx
│   │   ├── UIStateContext.tsx
│   │   ├── TimerContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── ConfirmContext.tsx
│   ├── services/             # API services
│   │   ├── api.client.ts     # Axios client
│   │   ├── auth.service.ts
│   │   ├── task.service.ts
│   │   ├── user.service.ts
│   │   ├── group.service.ts
│   │   ├── folder.service.ts
│   │   ├── note.service.ts
│   │   ├── notification.service.ts
│   │   ├── chat.service.ts
│   │   ├── admin.service.ts
│   │   └── types/            # TypeScript types
│   ├── hooks/                # Custom hooks
│   │   ├── useSocket.ts
│   │   ├── useRealtime.ts
│   │   └── useDebounce.ts
│   ├── i18n/                 # Internationalization
│   │   ├── translations.ts
│   │   └── index.ts
│   ├── utils/                # Utilities
│   │   └── groupRoleUtils.ts
│   ├── constants/            # Constants
│   │   └── groupRoles.ts
│   ├── firebase.ts           # Firebase config
│   └── globals.css           # Global styles
├── next.config.ts            # Next.js config
├── tsconfig.json             # TypeScript config
└── package.json
```

### Component Hierarchy

```mermaid
graph TD
    Root[Root Layout]
    Root --> AuthProvider[AuthProvider]
    AuthProvider --> LanguageProvider[LanguageProvider]
    LanguageProvider --> RegionalProvider[RegionalProvider]
    RegionalProvider --> FolderProvider[FolderProvider]
    FolderProvider --> TimerProvider[TimerProvider]
    TimerProvider --> UIStateProvider[UIStateProvider]
    UIStateProvider --> ToastProvider[ToastProvider]
    ToastProvider --> ConfirmProvider[ConfirmProvider]
    ConfirmProvider --> AppInterface[AppInterface]
    
    AppInterface --> Sidebar[Sidebar]
    AppInterface --> Header[Header]
    AppInterface --> ToolsSidebar[ToolsSidebar]
    AppInterface --> MainContent[Main Content]
    AppInterface --> ChatbotWidget[ChatbotWidget]
    
    MainContent --> TasksView[TasksView]
    MainContent --> NotesView[NotesView]
    MainContent --> ChatView[ChatView]
    MainContent --> Dashboard[Dashboard]
    
    Sidebar --> GroupSelector[GroupSelector]
    Header --> NotificationDropdown[NotificationDropdown]
    Header --> ProfileSettings[ProfileSettings]
```

### State Management Flow

```mermaid
graph LR
    A[User Action] --> B[Component]
    B --> C[Service Call]
    C --> D[API Request]
    D --> E[Backend]
    E --> F[Response]
    F --> G[Context Update]
    G --> H[Component Re-render]
    
    I[Socket Event] --> G
    J[Local State] --> B
```

---

## Kiến trúc Mobile

### Cấu trúc thư mục

```
mobile/
├── App.tsx                   # Root component
├── src/
│   ├── navigation/          # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── screens/             # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── NotesScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── ...
│   ├── components/          # Reusable components
│   │   ├── tasks/
│   │   ├── notes/
│   │   ├── chat/
│   │   └── common/
│   ├── context/             # Context providers
│   │   ├── AuthContext.tsx
│   │   ├── TaskContext.tsx
│   │   └── ...
│   ├── services/            # API services
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── task.service.ts
│   │   └── ...
│   ├── hooks/               # Custom hooks
│   ├── types/               # TypeScript types
│   ├── utils/               # Utilities
│   ├── i18n/                # Internationalization
│   └── config/              # Configuration
├── android/                 # Android native code
├── ios/                     # iOS native code
└── package.json
```

---

## Kiến trúc Chatbot

### Cấu trúc

```
chatbot-deployment/
├── app.py                   # Flask application
├── chat.py                   # Chat logic & model inference
├── model.py                  # Neural network model
├── train.py                  # Training script
├── nltk_utils.py            # NLP utilities
├── utils.py                 # Helper functions
├── config.py                # Configuration
├── intents.json             # Training data
├── data.pth                 # Trained model
├── requirements.txt         # Python dependencies
└── templates/               # HTML templates
```

### Luồng xử lý Chatbot

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Flask
    participant BackendAPI
    participant Model
    participant Response
    
    User->>Frontend: Gửi message
    Frontend->>Flask: POST /predict + JWT token
    Flask->>BackendAPI: GET /api/chatbot/context
    BackendAPI-->>Flask: User context & tasks
    Flask->>Model: Predict intent + context
    Model-->>Flask: Response text
    Flask->>Response: Format response
    Response-->>Frontend: JSON response
    Frontend-->>User: Hiển thị response
```

---

## Cơ sở dữ liệu

### Database Schema

```mermaid
erDiagram
    USER ||--o{ TASK : creates
    USER ||--o{ GROUP : creates
    USER ||--o{ NOTE : creates
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ LOGIN_HISTORY : has
    USER ||--o{ ADMIN_ACTION_LOG : performs
    
    GROUP ||--o{ TASK : contains
    GROUP ||--o{ FOLDER : contains
    GROUP ||--o{ GROUP_MESSAGE : has
    GROUP ||--o{ USER : "has members"
    
    FOLDER ||--o{ TASK : contains
    FOLDER }o--|| GROUP : belongs_to
    
    TASK ||--o{ NOTIFICATION : triggers
    
    GROUP_MESSAGE }o--|| GROUP : belongs_to
    GROUP_MESSAGE }o--|| USER : sent_by
    
    DIRECT_CONVERSATION ||--o{ DIRECT_MESSAGE : contains
    DIRECT_CONVERSATION }o--o{ USER : "participants"
    
    USER {
        ObjectId _id
        string email
        string password
        string name
        string avatar
        string role
        string groupRole
        boolean isLeader
        ObjectId currentGroupId
        object preferences
        date createdAt
        date updatedAt
    }
    
    TASK {
        ObjectId _id
        string title
        string description
        string status
        string priority
        date dueDate
        date completedAt
        ObjectId createdBy
        array assignedTo
        array tags
        string category
        string type
        ObjectId groupId
        ObjectId folderId
        array attachments
        object timer
        date createdAt
        date updatedAt
    }
    
    GROUP {
        ObjectId _id
        string name
        boolean isPersonalWorkspace
        string description
        ObjectId createdBy
        array members
        object metadata
        ObjectId defaultFolderId
        date createdAt
        date updatedAt
    }
    
    FOLDER {
        ObjectId _id
        string name
        string description
        ObjectId groupId
        ObjectId createdBy
        date createdAt
        date updatedAt
    }
    
    NOTE {
        ObjectId _id
        string title
        string content
        ObjectId groupId
        ObjectId createdBy
        date createdAt
        date updatedAt
    }
    
    NOTIFICATION {
        ObjectId _id
        string title
        string message
        string category
        ObjectId recipient
        ObjectId groupId
        boolean read
        date createdAt
    }
    
    GROUP_MESSAGE {
        ObjectId _id
        ObjectId groupId
        ObjectId senderId
        string content
        array attachments
        array reactions
        date createdAt
        date updatedAt
    }
    
    DIRECT_CONVERSATION {
        ObjectId _id
        array participants
        date lastMessageAt
        date createdAt
        date updatedAt
    }
    
    DIRECT_MESSAGE {
        ObjectId _id
        ObjectId conversationId
        ObjectId senderId
        string content
        array attachments
        array reactions
        date createdAt
        date updatedAt
    }
```

### Collections Overview

| Collection | Mô tả | Số lượng documents (ước tính) |
|------------|-------|-------------------------------|
| `users` | Người dùng hệ thống | ~1000+ |
| `tasks` | Công việc | ~10,000+ |
| `groups` | Nhóm làm việc | ~500+ |
| `folders` | Thư mục | ~2000+ |
| `notes` | Ghi chú | ~5000+ |
| `notifications` | Thông báo | ~50,000+ |
| `groupmessages` | Tin nhắn nhóm | ~100,000+ |
| `directmessages` | Tin nhắn trực tiếp | ~100,000+ |
| `directconversations` | Cuộc trò chuyện trực tiếp | ~5000+ |
| `loginhistories` | Lịch sử đăng nhập | ~50,000+ |
| `adminactionlogs` | Log hành động admin | ~10,000+ |
| `chatbotstates` | Trạng thái chatbot | ~1000+ |

### Indexes

```javascript
// User indexes
users: { email: 1 } (unique)
users: { currentGroupId: 1 }

// Task indexes
tasks: { groupId: 1, status: 1 }
tasks: { folderId: 1 }
tasks: { createdBy: 1 }
tasks: { assignedTo.userId: 1 }
tasks: { dueDate: 1 }

// Group indexes
groups: { createdBy: 1 }
groups: { "members.userId": 1 }

// Notification indexes
notifications: { recipient: 1, read: 1, createdAt: -1 }

// Message indexes
groupmessages: { groupId: 1, createdAt: -1 }
directmessages: { conversationId: 1, createdAt: -1 }
```

---

## Hệ thống Real-time

### Kiến trúc Socket.IO

```mermaid
graph TB
    subgraph "Client Layer"
        WEB_CLIENT[Web Client]
        MOBILE_CLIENT[Mobile Client]
    end
    
    subgraph "Socket.IO Server"
        NAMESPACE[/ws/app Namespace]
        AUTH_MW[Authentication Middleware]
        HANDLERS[Event Handlers]
    end
    
    subgraph "Redis Layer"
        PUB[Redis Pub Client]
        SUB[Redis Sub Client]
        PRESENCE[Redis Presence Client]
    end
    
    subgraph "Event Listeners"
        NOTIF_LISTENER[Notification Listener]
        TASK_LISTENER[Task Listener]
        CHAT_LISTENER[Chat Listener]
        FOLDER_LISTENER[Folder Listener]
        GROUP_LISTENER[Group Listener]
    end
    
    WEB_CLIENT -->|WebSocket| NAMESPACE
    MOBILE_CLIENT -->|WebSocket| NAMESPACE
    
    NAMESPACE --> AUTH_MW
    AUTH_MW --> HANDLERS
    
    HANDLERS --> PUB
    SUB --> HANDLERS
    
    PRESENCE --> HANDLERS
    
    NOTIF_LISTENER --> SUB
    TASK_LISTENER --> SUB
    CHAT_LISTENER --> SUB
    FOLDER_LISTENER --> SUB
    GROUP_LISTENER --> SUB
```

### Socket Events

#### Client → Server Events

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

#### Server → Client Events

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
socket.on('direct:conversation', { eventKey, conversationId, conversation })

// Folders
socket.on('folders:update', { eventKey, folder, groupId })

// Groups
socket.on('groups:update', { eventKey, group, groupId })

// Presence
socket.on('presence:update', { userId, status, metadata })
```

### Room Structure

```javascript
// User rooms
`user:${userId}`          // Personal notifications & updates

// Group rooms
`group:${groupId}`        // Group chat & updates

// Direct conversation rooms
`direct:${conversationId}` // Direct messages
```

### Presence Service

```mermaid
graph LR
    A[User Connects] --> B[Record Connection]
    B --> C[Set Redis Key]
    C --> D[TTL: 60s]
    D --> E[Heartbeat Every 25s]
    E --> F[Update TTL]
    F --> G[User Disconnects]
    G --> H[Remove Redis Key]
    
    I[Presence Query] --> J[Get All Active Users]
    J --> K[Filter by TTL]
    K --> L[Return Status]
```

---

## Luồng dữ liệu

### Luồng tạo Task

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Service
    participant Database
    participant Socket
    participant OtherUsers
    
    User->>Frontend: Tạo task mới
    Frontend->>Backend: POST /api/tasks
    Backend->>Service: createTask()
    Service->>Database: Save task
    Database-->>Service: Task document
    Service->>Socket: Emit task:created event
    Socket-->>OtherUsers: Broadcast to group members
    Service-->>Backend: Task data
    Backend-->>Frontend: 201 Created
    Frontend-->>User: Hiển thị task mới
```

### Luồng Chat Real-time

```mermaid
sequenceDiagram
    participant User1
    participant Frontend1
    participant Socket1
    participant Server
    participant Redis
    participant Socket2
    participant Frontend2
    participant User2
    
    User1->>Frontend1: Gửi message
    Frontend1->>Server: POST /api/chat/groups/:id/messages
    Server->>Server: Save message to DB
    Server->>Redis: Publish chat:messageCreated
    Redis->>Socket1: Broadcast to group room
    Redis->>Socket2: Broadcast to group room
    Socket1-->>Frontend1: Emit chat:message
    Socket2-->>Frontend2: Emit chat:message
    Frontend1-->>User1: Hiển thị message
    Frontend2-->>User2: Hiển thị message
```

### Luồng Authentication

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant JWT
    
    User->>Frontend: Đăng nhập (email/password)
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Find user by email
    Database-->>Backend: User document
    Backend->>Backend: Verify password (bcrypt)
    Backend->>JWT: Generate access token
    Backend->>JWT: Generate refresh token
    Backend->>Database: Save refresh token
    Backend->>Database: Log login history
    Backend-->>Frontend: { accessToken, refreshToken, user }
    Frontend->>Frontend: Store tokens (localStorage)
    Frontend-->>User: Redirect to dashboard
```

---

## Bảo mật

### Authentication & Authorization

```mermaid
graph TB
    A[Request] --> B{JWT Token?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[Verify Token]
    D -->|Invalid| C
    D -->|Valid| E{Admin Route?}
    E -->|Yes| F{Is Admin?}
    F -->|No| G[403 Forbidden]
    F -->|Yes| H[Process Request]
    E -->|No| I{Group Route?}
    I -->|Yes| J{Is Member?}
    J -->|No| G
    J -->|Yes| H
    I -->|No| H
```

### Security Layers

1. **Transport Layer**
   - HTTPS (production)
   - CORS configuration
   - Helmet.js security headers

2. **Authentication Layer**
   - JWT tokens (access + refresh)
   - Token expiration
   - Secure token storage

3. **Authorization Layer**
   - Role-based access control (RBAC)
   - Group membership checks
   - Resource ownership validation

4. **Input Validation**
   - Express validator
   - Mongoose schema validation
   - Sanitization (express-mongo-sanitize)

5. **Rate Limiting**
   - express-rate-limit
   - Per-route limits
   - IP-based throttling

6. **File Upload Security**
   - File type validation
   - File size limits
   - Cloudinary secure upload

---

## Triển khai

### Development Setup

```mermaid
graph LR
    A[Clone Repo] --> B[Install Dependencies]
    B --> C[Setup MongoDB]
    C --> D[Setup Redis]
    D --> E[Configure .env]
    E --> F[Start Backend]
    F --> G[Start Frontend]
    G --> H[Start Mobile]
    H --> I[Start Chatbot]
```

### Production Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx/Cloudflare]
    end
    
    subgraph "Application Servers"
        APP1[Backend Server 1]
        APP2[Backend Server 2]
        APP3[Backend Server N]
    end
    
    subgraph "Real-time Servers"
        WS1[Socket.IO Server 1]
        WS2[Socket.IO Server 2]
    end
    
    subgraph "Database Cluster"
        MONGO_PRIMARY[(MongoDB Primary)]
        MONGO_SECONDARY1[(MongoDB Secondary 1)]
        MONGO_SECONDARY2[(MongoDB Secondary 2)]
    end
    
    subgraph "Cache Layer"
        REDIS_CLUSTER[(Redis Cluster)]
    end
    
    subgraph "Storage"
        CLOUDINARY[Cloudinary CDN]
    end
    
    subgraph "External Services"
        FIREBASE[Firebase]
        CHATBOT[Chatbot Service]
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> WS1
    APP2 --> WS2
    
    APP1 --> MONGO_PRIMARY
    APP2 --> MONGO_PRIMARY
    APP3 --> MONGO_PRIMARY
    
    MONGO_PRIMARY --> MONGO_SECONDARY1
    MONGO_PRIMARY --> MONGO_SECONDARY2
    
    WS1 --> REDIS_CLUSTER
    WS2 --> REDIS_CLUSTER
    
    APP1 --> REDIS_CLUSTER
    APP2 --> REDIS_CLUSTER
    
    APP1 --> CLOUDINARY
    APP1 --> FIREBASE
    APP1 --> CHATBOT
```

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=8080
NODE_ENV=production
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://user:pass@host:27017/dbname

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Redis
REDIS_URL=redis://host:6379
ENABLE_SOCKET_REDIS_ADAPTER=true

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# CORS
SOCKET_ALLOWED_ORIGINS=https://yourdomain.com
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_CHATBOT_URL=https://chatbot.yourdomain.com
```

### Docker Deployment (Optional)

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/todolist
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
  
  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

---

## Tóm tắt

### Điểm mạnh của kiến trúc

1. ✅ **Modular**: Tách biệt rõ ràng giữa các layers
2. ✅ **Scalable**: Hỗ trợ horizontal scaling với Redis adapter
3. ✅ **Real-time**: Socket.IO với Redis pub/sub
4. ✅ **Multi-platform**: Web, Mobile, và Chatbot
5. ✅ **Secure**: JWT authentication, RBAC, input validation
6. ✅ **Maintainable**: Code structure rõ ràng, TypeScript support

### Công nghệ chính

- **Backend**: Node.js + Express.js + MongoDB + Socket.IO
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Mobile**: React Native 0.76
- **Chatbot**: Flask + PyTorch
- **Infrastructure**: Redis, Cloudinary, Firebase

### Số liệu ước tính

- **API Endpoints**: ~50+ endpoints
- **Database Models**: 12 models
- **Services**: 22 services
- **Frontend Components**: 50+ components
- **Mobile Screens**: 11 screens
- **Real-time Events**: 20+ event types

---

**Tài liệu được tạo tự động từ codebase**  
**Cập nhật lần cuối**: 2024

