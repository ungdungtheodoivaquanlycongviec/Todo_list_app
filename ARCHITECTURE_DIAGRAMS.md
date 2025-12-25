# Biểu đồ Kiến trúc Hệ thống

## 1. Kiến trúc Tổng thể (High-Level Architecture)

```mermaid
graph TB
    subgraph "Client Applications"
        WEB[Web Application<br/>Next.js 15<br/>Port: 3000]
        MOBILE[Mobile Application<br/>React Native<br/>iOS & Android]
    end
    
    subgraph "API Gateway & Load Balancer"
        LB[Load Balancer<br/>Nginx/Cloudflare]
    end
    
    subgraph "Backend Services"
        API1[Backend API Server 1<br/>Express.js<br/>Port: 8080]
        API2[Backend API Server 2<br/>Express.js<br/>Port: 8080]
        API3[Backend API Server N<br/>Express.js<br/>Port: 8080]
    end
    
    subgraph "Real-time Services"
        WS1[Socket.IO Server 1<br/>WebSocket]
        WS2[Socket.IO Server 2<br/>WebSocket]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB Cluster<br/>Primary + Replicas)]
        REDIS[(Redis Cluster<br/>Cache & Pub/Sub)]
    end
    
    subgraph "External Services"
        CLOUDINARY[Cloudinary<br/>File Storage & CDN]
        FIREBASE[Firebase<br/>Push Notifications]
        CHATBOT[Chatbot Service<br/>Flask/Python<br/>Port: 5000]
    end
    
    WEB --> LB
    MOBILE --> LB
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> WS1
    API2 --> WS2
    
    API1 --> MONGO
    API2 --> MONGO
    API3 --> MONGO
    
    WS1 --> REDIS
    WS2 --> REDIS
    API1 --> REDIS
    
    API1 --> CLOUDINARY
    API2 --> CLOUDINARY
    
    API1 --> FIREBASE
    API1 --> CHATBOT
    API2 --> CHATBOT
```

## 2. Luồng Request/Response

```mermaid
sequenceDiagram
    participant C as Client<br/>(Web/Mobile)
    participant LB as Load Balancer
    participant API as API Server
    participant MW as Middleware Layer
    participant CTRL as Controller
    participant SVC as Service Layer
    participant DB as MongoDB
    participant WS as WebSocket Server
    
    C->>LB: HTTP Request
    LB->>API: Forward Request
    API->>MW: CORS, Helmet, Body Parser
    MW->>MW: JWT Authentication
    MW->>MW: Authorization Check
    MW->>MW: Rate Limiting
    MW->>CTRL: Route Handler
    CTRL->>SVC: Business Logic
    SVC->>DB: Query/Update
    DB-->>SVC: Data
    SVC->>WS: Emit Real-time Event
    SVC-->>CTRL: Processed Data
    CTRL-->>API: JSON Response
    API-->>LB: HTTP Response
    LB-->>C: Response
    WS-->>C: Real-time Update
```

## 3. Kiến trúc Backend (Layered Architecture)

```mermaid
graph TB
    subgraph "Presentation Layer"
        ROUTES[Routes<br/>9 route files]
        CTRL[Controllers<br/>10 controllers]
    end
    
    subgraph "Business Logic Layer"
        SVC[Services<br/>22 services]
        VALID[Validation<br/>Helpers]
    end
    
    subgraph "Data Access Layer"
        MODELS[Models<br/>12 Mongoose models]
        DB[(MongoDB)]
    end
    
    subgraph "Infrastructure Layer"
        MIDDLEWARE[Middlewares<br/>Auth, Rate Limit, etc.]
        CONFIG[Configuration<br/>DB, Env, Constants]
        UTILS[Utilities<br/>Helpers, Init scripts]
    end
    
    subgraph "Real-time Layer"
        SOCKET[Socket.IO Server]
        PRESENCE[Presence Service]
        REDIS_RT[(Redis<br/>Pub/Sub)]
    end
    
    ROUTES --> CTRL
    CTRL --> MIDDLEWARE
    MIDDLEWARE --> SVC
    SVC --> VALID
    SVC --> MODELS
    MODELS --> DB
    SVC --> SOCKET
    SOCKET --> PRESENCE
    PRESENCE --> REDIS_RT
    CTRL --> CONFIG
    SVC --> UTILS
```

## 4. Database Schema Relationships

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string email UK
        string password
        string name
        string role
        ObjectId currentGroupId FK
        object preferences
    }
    
    GROUP {
        ObjectId _id PK
        string name
        boolean isPersonalWorkspace
        ObjectId createdBy FK
        array members
    }
    
    TASK {
        ObjectId _id PK
        string title
        string status
        string priority
        ObjectId createdBy FK
        ObjectId groupId FK
        ObjectId folderId FK
        array assignedTo
    }
    
    FOLDER {
        ObjectId _id PK
        string name
        ObjectId groupId FK
        ObjectId createdBy FK
    }
    
    NOTE {
        ObjectId _id PK
        string title
        ObjectId groupId FK
        ObjectId createdBy FK
    }
    
    NOTIFICATION {
        ObjectId _id PK
        string title
        ObjectId recipient FK
        ObjectId groupId FK
        boolean read
    }
    
    GROUP_MESSAGE {
        ObjectId _id PK
        ObjectId groupId FK
        ObjectId senderId FK
        string content
    }
    
    DIRECT_CONVERSATION {
        ObjectId _id PK
        array participants
    }
    
    DIRECT_MESSAGE {
        ObjectId _id PK
        ObjectId conversationId FK
        ObjectId senderId FK
        string content
    }
    
    LOGIN_HISTORY {
        ObjectId _id PK
        ObjectId userId FK
        string status
        string ipAddress
    }
    
    ADMIN_ACTION_LOG {
        ObjectId _id PK
        ObjectId adminId FK
        string action
        object changes
    }
    
    USER ||--o{ TASK : "creates"
    USER ||--o{ GROUP : "creates"
    USER ||--o{ NOTE : "creates"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ LOGIN_HISTORY : "has"
    USER ||--o{ ADMIN_ACTION_LOG : "performs"
    USER }o--|| GROUP : "currentGroupId"
    
    GROUP ||--o{ TASK : "contains"
    GROUP ||--o{ FOLDER : "contains"
    GROUP ||--o{ NOTE : "contains"
    GROUP ||--o{ GROUP_MESSAGE : "has"
    GROUP ||--o{ NOTIFICATION : "triggers"
    GROUP }o--o{ USER : "members"
    
    FOLDER ||--o{ TASK : "organizes"
    FOLDER }o--|| GROUP : "belongs_to"
    
    GROUP_MESSAGE }o--|| GROUP : "sent_to"
    GROUP_MESSAGE }o--|| USER : "sent_by"
    
    DIRECT_CONVERSATION ||--o{ DIRECT_MESSAGE : "contains"
    DIRECT_CONVERSATION }o--o{ USER : "participants"
    
    DIRECT_MESSAGE }o--|| DIRECT_CONVERSATION : "belongs_to"
    DIRECT_MESSAGE }o--|| USER : "sent_by"
```

## 5. Real-time Communication Flow

```mermaid
sequenceDiagram
    participant U1 as User 1
    participant F1 as Frontend 1
    participant API as Backend API
    participant DB as MongoDB
    participant SVC as Service Layer
    participant WS as Socket.IO Server
    participant REDIS as Redis Pub/Sub
    participant WS2 as Socket.IO Server 2
    participant F2 as Frontend 2
    participant U2 as User 2
    
    U1->>F1: Action (Create Task)
    F1->>API: POST /api/tasks
    API->>SVC: createTask()
    SVC->>DB: Save Task
    DB-->>SVC: Task Document
    SVC->>REDIS: Publish task:created
    REDIS->>WS: Broadcast Event
    REDIS->>WS2: Broadcast Event
    WS->>F1: Emit tasks:created
    WS2->>F2: Emit tasks:created
    F1->>U1: Update UI
    F2->>U2: Update UI
    SVC-->>API: Response
    API-->>F1: 201 Created
```

## 6. Authentication & Authorization Flow

```mermaid
graph TD
    A[Client Request] --> B{Has JWT Token?}
    B -->|No| C[Return 401 Unauthorized]
    B -->|Yes| D[Verify Token Signature]
    D -->|Invalid| E[Return 401 Unauthorized]
    D -->|Expired| F[Check Refresh Token]
    F -->|Valid| G[Issue New Access Token]
    F -->|Invalid| C
    D -->|Valid| H{Admin Route?}
    H -->|Yes| I{Is Admin/Super Admin?}
    I -->|No| J[Return 403 Forbidden]
    I -->|Yes| K[Process Request]
    H -->|No| L{Group Route?}
    L -->|Yes| M{Is Group Member?}
    M -->|No| J
    M -->|Yes| N{Has Required Permission?}
    N -->|No| J
    N -->|Yes| K
    L -->|No| K
    G --> K
```

## 7. Frontend Component Architecture

```mermaid
graph TB
    subgraph "Root Layout"
        ROOT[RootLayout]
        PROVIDERS[Context Providers]
    end
    
    subgraph "Main Interface"
        APP[AppInterface]
        SIDEBAR[Sidebar]
        HEADER[Header]
        TOOLS[ToolsSidebar]
        MAIN[Main Content Area]
    end
    
    subgraph "Views"
        TASKS[TasksView]
        NOTES[NotesView]
        CHAT[ChatView]
        DASHBOARD[Dashboard]
    end
    
    subgraph "Common Components"
        MODAL[Modal]
        BUTTON[Button]
        INPUT[Input]
        DROPDOWN[Dropdown]
        CHATBOT[ChatbotWidget]
    end
    
    subgraph "Services"
        API_SVC[API Services]
        SOCKET_SVC[Socket Service]
    end
    
    ROOT --> PROVIDERS
    PROVIDERS --> APP
    APP --> SIDEBAR
    APP --> HEADER
    APP --> TOOLS
    APP --> MAIN
    APP --> CHATBOT
    
    MAIN --> TASKS
    MAIN --> NOTES
    MAIN --> CHAT
    MAIN --> DASHBOARD
    
    TASKS --> MODAL
    TASKS --> BUTTON
    NOTES --> MODAL
    CHAT --> MODAL
    
    TASKS --> API_SVC
    NOTES --> API_SVC
    CHAT --> API_SVC
    CHAT --> SOCKET_SVC
```

## 8. Mobile App Architecture

```mermaid
graph TB
    subgraph "Navigation"
        NAV[App Navigator<br/>React Navigation]
        STACK[Stack Navigator]
        TABS[Bottom Tabs]
    end
    
    subgraph "Screens"
        LOGIN[Login Screen]
        REGISTER[Register Screen]
        TASKS[Tasks Screen]
        NOTES[Notes Screen]
        CHAT[Chat Screen]
        PROFILE[Profile Screen]
    end
    
    subgraph "Components"
        TASK_LIST[Task List]
        TASK_ITEM[Task Item]
        NOTE_EDITOR[Note Editor]
        CHAT_BUBBLE[Chat Bubble]
    end
    
    subgraph "State Management"
        AUTH_CTX[Auth Context]
        TASK_CTX[Task Context]
        CHAT_CTX[Chat Context]
    end
    
    subgraph "Services"
        API[API Service]
        STORAGE[AsyncStorage]
        SOCKET[Socket Service]
    end
    
    NAV --> STACK
    STACK --> LOGIN
    STACK --> REGISTER
    STACK --> TABS
    TABS --> TASKS
    TABS --> NOTES
    TABS --> CHAT
    TABS --> PROFILE
    
    TASKS --> TASK_LIST
    TASK_LIST --> TASK_ITEM
    NOTES --> NOTE_EDITOR
    CHAT --> CHAT_BUBBLE
    
    TASKS --> TASK_CTX
    CHAT --> CHAT_CTX
    LOGIN --> AUTH_CTX
    
    TASK_CTX --> API
    CHAT_CTX --> API
    CHAT_CTX --> SOCKET
    AUTH_CTX --> STORAGE
```

## 9. Chatbot Integration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant CB as Chatbot Service<br/>(Flask)
    participant API as Backend API
    participant MODEL as AI Model<br/>(PyTorch)
    participant DB as MongoDB
    
    U->>F: Type message
    F->>CB: POST /predict<br/>{message, token}
    CB->>API: GET /api/chatbot/context<br/>Authorization: Bearer token
    API->>DB: Query user & tasks
    DB-->>API: User context
    API-->>CB: Context data
    CB->>MODEL: Predict intent<br/>+ context
    MODEL-->>CB: Response text
    CB->>CB: Replace placeholders<br/>with context
    CB-->>F: JSON response<br/>{answer, context}
    F-->>U: Display response
```

## 10. Notification System Flow

```mermaid
graph TB
    A[Event Triggered] --> B{Event Type}
    B -->|Task Created| C[Task Service]
    B -->|Message Sent| D[Chat Service]
    B -->|Admin Action| E[Admin Service]
    
    C --> F[Notification Producer]
    D --> F
    E --> F
    
    F --> G[Create Notification]
    G --> H[Save to MongoDB]
    H --> I[Publish to Redis]
    
    I --> J[Notification Consumer]
    J --> K[Socket.IO Server]
    K --> L[Emit to User Room]
    
    L --> M[Web Client]
    L --> N[Mobile Client]
    
    M --> O[Show Notification]
    N --> O
    
    F --> P[Firebase Push]
    P --> Q[Mobile Push Notification]
```

## 11. File Upload Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Backend API
    participant MULTER as Multer Middleware
    participant CLOUDINARY as Cloudinary
    participant DB as MongoDB
    
    C->>API: POST /api/tasks/:id/attachments<br/>multipart/form-data
    API->>MULTER: Validate file
    MULTER->>MULTER: Check file type
    MULTER->>MULTER: Check file size
    MULTER-->>API: File buffer
    API->>CLOUDINARY: Upload file
    CLOUDINARY-->>API: {url, publicId, etc.}
    API->>DB: Update task with attachment
    DB-->>API: Updated task
    API-->>C: 200 OK with attachment info
```

## 12. Group Management Flow

```mermaid
graph TD
    A[User Creates Group] --> B[Create Group Document]
    B --> C[Add Creator as Member]
    C --> D[Set Creator as Admin]
    D --> E[Create Default Folder]
    E --> F[Update User currentGroupId]
    F --> G[Emit Real-time Event]
    G --> H[Notify Group Members]
    
    I[User Joins Group] --> J{Has Invitation?}
    J -->|Yes| K[Add User to Members]
    J -->|No| L[Return Error]
    K --> M[Emit Real-time Event]
    M --> N[Notify Existing Members]
    
    O[User Leaves Group] --> P{Is Creator?}
    P -->|Yes| Q[Transfer Ownership or Delete]
    P -->|No| R[Remove from Members]
    Q --> S[Emit Real-time Event]
    R --> S
    S --> T[Notify Group Members]
```

## 13. Task Timer Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as Backend API
    participant SVC as Task Service
    participant DB as MongoDB
    participant WS as WebSocket
    
    U->>F: Start Timer
    F->>API: POST /api/tasks/:id/timer/start
    API->>SVC: startTimer(taskId, userId)
    SVC->>DB: Update task timer
    DB-->>SVC: Updated task
    SVC->>WS: Emit timer:started
    WS-->>F: Real-time update
    SVC-->>API: Task with timer
    API-->>F: 200 OK
    F->>F: Update UI with timer
    
    Note over F: Timer runs locally
    
    U->>F: Stop Timer
    F->>API: POST /api/tasks/:id/timer/stop
    API->>SVC: stopTimer(taskId, userId)
    SVC->>DB: Calculate duration & update
    DB-->>SVC: Updated task
    SVC->>WS: Emit timer:stopped
    WS-->>F: Real-time update
    SVC-->>API: Task with timer data
    API-->>F: 200 OK
    F->>F: Update UI
```

## 14. Scalability Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Clients]
        MOBILE[Mobile Clients]
    end
    
    subgraph "CDN & Load Balancing"
        CDN[CDN<br/>Static Assets]
        LB[Load Balancer<br/>Round Robin]
    end
    
    subgraph "Application Tier"
        APP1[App Server 1]
        APP2[App Server 2]
        APP3[App Server N]
    end
    
    subgraph "Real-time Tier"
        WS1[WS Server 1]
        WS2[WS Server 2]
        WS3[WS Server N]
    end
    
    subgraph "Data Tier"
        MONGO_PRIMARY[(MongoDB<br/>Primary)]
        MONGO_SEC1[(MongoDB<br/>Secondary 1)]
        MONGO_SEC2[(MongoDB<br/>Secondary 2)]
        REDIS_MASTER[(Redis<br/>Master)]
        REDIS_SLAVE[(Redis<br/>Slave)]
    end
    
    subgraph "Storage Tier"
        CLOUDINARY[Cloudinary<br/>CDN]
    end
    
    WEB --> CDN
    MOBILE --> LB
    CDN --> LB
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> WS1
    APP2 --> WS2
    APP3 --> WS3
    
    APP1 --> MONGO_PRIMARY
    APP2 --> MONGO_PRIMARY
    APP3 --> MONGO_PRIMARY
    
    MONGO_PRIMARY --> MONGO_SEC1
    MONGO_PRIMARY --> MONGO_SEC2
    
    WS1 --> REDIS_MASTER
    WS2 --> REDIS_MASTER
    WS3 --> REDIS_MASTER
    
    REDIS_MASTER --> REDIS_SLAVE
    
    APP1 --> CLOUDINARY
    APP2 --> CLOUDINARY
```

---

**Lưu ý**: Các biểu đồ này sử dụng Mermaid syntax và có thể được render trong các công cụ hỗ trợ Mermaid như GitHub, GitLab, hoặc các Markdown viewers.

