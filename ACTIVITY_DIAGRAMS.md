# Activity Diagrams - Todo List Application

Tài liệu này chứa các Activity Diagrams cho các luồng chức năng chính của ứng dụng Todo List ở mức high level.

## Mục Lục

1. [Authentication](#1-authentication)
2. [Account Settings](#2-account-settings)
3. [Task Management](#3-task-management)
4. [Group Management](#4-group-management)
5. [Admin System](#5-admin-system)
6. [Notifications](#6-notifications)
7. [Communication](#7-communication)

---

## 1. Authentication

```mermaid
flowchart TD
    subgraph User["👤 USER"]
        A([Start]) --> B{Action?}
        B -->|Register| C[Enter email, password, name]
        B -->|Login| D[Enter email & password]
        B -->|Google Login| E[Click Google Sign-In]
        B -->|Logout| F[Click Logout]
        
        C --> G[Submit registration]
        D --> H[Submit login]
        E --> I[Select Google account]
        I --> J[Get ID Token from Firebase]
        J --> K[Send ID Token to server]
        F --> L[Send logout request]
        
        G --> M{Success?}
        H --> M
        K --> M
        M -->|No| N[Show error message]
        N --> B
        M -->|Yes| O[Store tokens in LocalStorage]
        O --> P[Update user state]
        P --> Q[Navigate to Dashboard/Admin]
        Q --> R([End])
        
        L --> S[Clear tokens & state]
        S --> T[Navigate to Login page]
        T --> R
    end
    
    subgraph System["⚙️ SYSTEM"]
        G --> U[Validate input]
        U --> V{Email exists?}
        V -->|Yes| W[Return 400 error]
        V -->|No| X[Hash password & create user]
        X --> Y[Create Personal Workspace]
        Y --> Z[Generate JWT tokens]
        Z --> AA[Return tokens + user]
        
        H --> AB[Find user by email]
        AB -->|Not found| AC[Return 401 error]
        AB -->|Found| AD{Password match?}
        AD -->|No| AC
        AD -->|Yes| AE{Account active?}
        AE -->|No| AF[Return 403 error]
        AE -->|Yes| AG[Generate JWT tokens]
        AG --> AH[Log login history]
        AH --> AI[Return tokens + user]
        
        K --> AJ[Verify Google token]
        AJ -->|Invalid| AK[Return 401 error]
        AJ -->|Valid| AL{User exists?}
        AL -->|No| AM[Create new user]
        AL -->|Yes| AN{Account active?}
        AN -->|No| AK
        AN -->|Yes| AO[Generate tokens]
        AM --> AO
        AO --> AP[Return tokens + user]
        
        L --> AQ[Clear refresh token in DB]
        AQ --> AR[Return success]
        
        W --> M
        AA --> M
        AC --> M
        AF --> M
        AI --> M
        AK --> M
        AP --> M
        AR --> S
    end
```

---

## 2. Account Settings

```mermaid
flowchart TD
    subgraph User["👤 USER"]
        A([Start]) --> B{Setting to change?}
        B -->|Profile| C[Edit name/avatar]
        B -->|Theme| D[Select light/dark/auto]
        B -->|Language| E[Select en/vi]
        B -->|Regional| F[Set timezone, date/time format]
        B -->|Password| G[Enter current & new password]
        
        C --> H[Submit profile update]
        D --> I[Submit theme update]
        E --> J[Submit language update]
        F --> K[Submit regional preferences]
        G --> L[Submit password change]
        
        H --> M{Success?}
        I --> M
        J --> M
        K --> M
        L --> M
        
        M -->|No| N[Show error message]
        N --> B
        M -->|Yes| O[Update local user state]
        O --> P[Apply changes to UI]
        P --> Q([End])
    end
    
    subgraph System["⚙️ SYSTEM"]
        H --> R[Verify JWT token]
        R --> S[Validate input data]
        S --> T[Update User document]
        T --> U[Return updated user]
        
        I --> V[Verify JWT token]
        V --> W{Valid theme?}
        W -->|No| X[Return 400 error]
        W -->|Yes| Y[Update user.theme]
        Y --> Z[Return updated user]
        
        J --> AA[Verify JWT token]
        AA --> AB{Valid language?}
        AB -->|No| AC[Return 400 error]
        AB -->|Yes| AD[Update user.language]
        AD --> AE[Return updated user]
        
        K --> AF[Verify JWT token]
        AF --> AG[Validate preferences]
        AG --> AH[Update regional settings]
        AH --> AI[Return updated user]
        
        L --> AJ[Verify JWT token]
        AJ --> AK{Current password correct?}
        AK -->|No| AL[Return 401 error]
        AK -->|Yes| AM{New password strong?}
        AM -->|No| AN[Return 400 error]
        AM -->|Yes| AO[Hash & update password]
        AO --> AP[Return success]
        
        U --> M
        X --> M
        Z --> M
        AC --> M
        AE --> M
        AI --> M
        AL --> M
        AN --> M
        AP --> M
    end
```

---

## 3. Task Management

```mermaid
flowchart TD
    subgraph User["👤 USER"]
        A([Start]) --> B{Action?}
        B -->|Create Task| C[Open Create Modal]
        B -->|Edit Task| D[Click on task]
        B -->|Delete Task| E[Click Delete]
        B -->|Assign Task| F[Select assignees]
        B -->|Create Folder| G[Open Folder Modal]
        B -->|Manage Folder Members| H[Open Folder Settings]
        
        C --> I[Fill task details]
        I --> J[Submit task]
        
        D --> K[Edit fields in modal]
        K --> L[Save changes]
        
        E --> M[Confirm deletion]
        M -->|Cancel| N([End])
        M -->|Confirm| O[Send delete request]
        
        F --> P[Select users from list]
        P --> Q[Submit assignment]
        
        G --> R[Enter folder name]
        R --> S[Submit folder]
        
        H --> T[Add/remove members]
        T --> U[Save folder members]
        
        J --> V{Success?}
        L --> V
        O --> V
        Q --> V
        S --> V
        U --> V
        
        V -->|No| W[Show error]
        W --> B
        V -->|Yes| X[Update UI via realtime]
        X --> N
    end
    
    subgraph System["⚙️ SYSTEM"]
        J --> Y[Verify token & permissions]
        Y -->|Denied| Z[Return 403]
        Y -->|Allowed| AA[Validate assignees by role]
        AA --> AB[Upload attachments if any]
        AB --> AC[Create Task in DB]
        AC --> AD[Emit task:created event]
        AD --> AE[Create notifications]
        AE --> AF[Return task]
        
        L --> AG[Verify token & edit permission]
        AG -->|Denied| AH[Return 403]
        AG -->|Allowed| AI[Validate changes]
        AI -->|Invalid| AJ[Return 400]
        AI -->|Valid| AK[Update Task in DB]
        AK --> AL[Emit task:updated event]
        AL --> AM[Return updated task]
        
        O --> AN[Verify token & delete permission]
        AN -->|Denied| AO[Return 403]
        AN -->|Allowed| AP[Delete attachments from cloud]
        AP --> AQ[Delete Task from DB]
        AQ --> AR[Emit task:deleted event]
        AR --> AS[Return success]
        
        Q --> AT[Verify assigner permissions]
        AT -->|Denied| AU[Return 403]
        AT -->|Allowed| AV[Validate target users by role rules]
        AV --> AW[Update task.assignedTo]
        AW --> AX[Create assignment notifications]
        AX --> AY[Return updated task]
        
        S --> AZ[Verify folder create permission]
        AZ -->|Denied| BA[Return 403]
        AZ -->|Allowed| BB{Name unique in group?}
        BB -->|No| BC[Return 400]
        BB -->|Yes| BD[Create Folder in DB]
        BD --> BE[Emit folder:created event]
        BE --> BF[Return folder]
        
        U --> BG[Verify folder manage permission]
        BG -->|Denied| BH[Return 403]
        BG -->|Allowed| BI[Update memberAccess array]
        BI --> BJ[Emit folder:updated event]
        BJ --> BK[Return updated folder]
        
        Z --> V
        AF --> V
        AH --> V
        AJ --> V
        AM --> V
        AO --> V
        AS --> V
        AU --> V
        AY --> V
        BA --> V
        BC --> V
        BF --> V
        BH --> V
        BK --> V
    end
```

---

## 4. Group Management

```mermaid
flowchart TD
    subgraph User["👤 USER"]
        A([Start]) --> B{Action?}
        B -->|Create Group| C[Open Create Modal]
        B -->|Invite Members| D[Open Invite Modal]
        B -->|Handle Invitation| E[View notification]
        
        C --> F[Enter name & description]
        F --> G[Select initial members]
        G --> H[Submit group]
        
        D --> I[Search users by email/name]
        I --> J[Select users to invite]
        J --> K[Send invitations]
        
        E --> L{Accept or Decline?}
        L -->|Decline| M[Click Decline]
        L -->|Accept| N[Click Accept]
        
        H --> O{Success?}
        K --> O
        M --> O
        N --> O
        
        O -->|No| P[Show error]
        P --> B
        O -->|Yes| Q[Update group list in UI]
        Q --> R([End])
    end
    
    subgraph System["⚙️ SYSTEM"]
        H --> S[Verify token & permissions]
        S -->|Denied| T[Return 403]
        S -->|Allowed| U{Members within limit?}
        U -->|No| V[Return 400]
        U -->|Yes| W[Create Group in DB]
        W --> X[Add creator as first member]
        X --> Y[Set as user's currentGroup]
        Y --> Z[Emit group:created event]
        Z --> AA[Return group]
        
        K --> AB[Verify invite permission]
        AB -->|Denied| AC[Return 403]
        AB -->|Allowed| AD[Loop through users]
        AD --> AE{Already member?}
        AE -->|Yes| AF[Skip]
        AE -->|No| AG{Pending invite exists?}
        AG -->|Yes| AF
        AG -->|No| AH[Create invitation notification]
        AF --> AI{More users?}
        AH --> AI
        AI -->|Yes| AD
        AI -->|No| AJ[Emit notification:new events]
        AJ --> AK[Return invitation results]
        
        M --> AL[Verify token]
        AL --> AM[Delete notification]
        AM --> AN[Return success]
        
        N --> AO[Verify token]
        AO --> AP{Notification valid?}
        AP -->|Expired| AQ[Return 400]
        AP -->|Valid| AR{Group exists?}
        AR -->|No| AS[Return 404]
        AR -->|Yes| AT[Add user to group.members]
        AT --> AU[Emit group:memberJoined event]
        AU --> AV[Notify other members]
        AV --> AW[Return group]
        
        T --> O
        V --> O
        AA --> O
        AC --> O
        AK --> O
        AN --> O
        AQ --> O
        AS --> O
        AW --> O
    end
```

---

## 5. Admin System

```mermaid
flowchart TD
    subgraph User["👤 ADMIN USER"]
        A([Start]) --> B[Access Admin Dashboard]
        B --> C{Action?}
        C -->|View Stats| D[View dashboard statistics]
        C -->|Manage Users| E[Open Users list]
        C -->|View Logs| F[Open Login History/Action Logs]
        C -->|Send Notification| G[Open Send Notification form]
        
        E --> H{User action?}
        H -->|Create| I[Fill user form & submit]
        H -->|Edit| J[Edit user details & save]
        H -->|Lock/Unlock| K[Toggle user status]
        H -->|Assign Role| L[Change user role]
        
        G --> M[Select recipients & compose message]
        M --> N[Send notification]
        
        I --> O{Success?}
        J --> O
        K --> O
        L --> O
        N --> O
        
        O -->|No| P[Show error]
        P --> C
        O -->|Yes| Q[Update UI]
        Q --> R([End])
        D --> R
        F --> R
    end
    
    subgraph System["⚙️ SYSTEM"]
        B --> S[Verify admin JWT token]
        S -->|Not admin| T[Return 403]
        S -->|Is admin| U[Allow access]
        
        D --> V[Query aggregated stats]
        V --> W[Return user count, task stats, etc.]
        
        E --> X[Query users with pagination]
        X --> Y[Return users list]
        
        F --> Z[Query logs with filters]
        Z --> AA[Return paginated logs]
        
        I --> AB[Validate user data]
        AB -->|Invalid| AC[Return 400]
        AB -->|Valid| AD[Create user in DB]
        AD --> AE[Log admin action]
        AE --> AF[Return new user]
        
        J --> AG[Validate update data]
        AG -->|Invalid| AH[Return 400]
        AG -->|Valid| AI[Update user in DB]
        AI --> AJ[Log admin action]
        AJ --> AK[Return updated user]
        
        K --> AL[Toggle user.isActive]
        AL --> AM[Log admin action]
        AM --> AN[Return updated user]
        
        L --> AO{Super Admin only?}
        AO -->|Not super admin| AP[Return 403]
        AO -->|Is super admin| AQ[Update user.role]
        AQ --> AR[Log admin action]
        AR --> AS[Return updated user]
        
        N --> AT[Validate notification data]
        AT -->|Invalid| AU[Return 400]
        AT -->|Valid| AV[Create notifications for recipients]
        AV --> AW[Emit notification events]
        AW --> AX[Log admin action]
        AX --> AY[Return sent count]
        
        T --> O
        W --> D
        Y --> E
        AA --> F
        AC --> O
        AF --> O
        AH --> O
        AK --> O
        AN --> O
        AP --> O
        AS --> O
        AU --> O
        AY --> O
    end
```

---

## 6. Notifications

```mermaid
flowchart TD
    subgraph User["👤 USER"]
        A([Start]) --> B{Interaction?}
        B -->|Receive| C[Get realtime notification via WebSocket]
        B -->|View List| D[Click notification bell]
        B -->|Handle| E[Click on notification item]
        
        C --> F[Update badge count]
        F --> G[Show toast if enabled]
        G --> H([End])
        
        D --> I[Fetch notifications list]
        I --> J[Display in panel]
        J --> K{Click item?}
        K -->|No| L[Close panel]
        K -->|Yes| E
        L --> H
        
        E --> M{Notification type?}
        M -->|Task| N[Navigate to task]
        M -->|Group Invite| O[Show Accept/Decline]
        M -->|Chat| P[Navigate to chat]
        M -->|Other| Q[Navigate to target]
        
        N --> R[Mark as read]
        O --> S[Handle in Group flow]
        P --> R
        Q --> R
        R --> T[Update unread count]
        T --> H
    end
    
    subgraph System["⚙️ SYSTEM"]
        U[Event Triggered] --> V{Event type?}
        V -->|Task Created| W[Build task notification]
        V -->|Task Assigned| X[Build assignment notification]
        V -->|Group Invite| Y[Build invitation notification]
        V -->|Chat Message| Z[Build chat notification]
        V -->|Mention| AA[Build mention notification]
        
        W --> AB[Determine recipients]
        X --> AB
        Y --> AB
        Z --> AB
        AA --> AB
        
        AB --> AC[Save to Notification collection]
        AC --> AD{Recipient online?}
        AD -->|Yes| AE[Emit via WebSocket]
        AD -->|No| AF[Store for later retrieval]
        AE --> C
        
        I --> AG[Verify token]
        AG --> AH[Query notifications with pagination]
        AH --> AI[Return notifications array]
        AI --> J
        
        R --> AJ[Verify token]
        AJ --> AK[Update isRead = true]
        AK --> AL[Decrement unread count]
        AL --> AM[Return success]
        AM --> T
    end
```

---

## 7. Communication

```mermaid
flowchart TD
    subgraph User["👤 USER"]
        A([Start]) --> B{Chat type?}
        B -->|Group Chat| C[Select group chat]
        B -->|Direct Message| D[Select user to chat]
        
        C --> E[Connect WebSocket]
        E --> F[Join group room]
        F --> G[Type message]
        G --> H[Attach files if needed]
        H --> I[Send message]
        I --> J[Receive message:new event]
        J --> K[Display message in UI]
        K --> L([End])
        
        D --> M{Conversation exists?}
        M -->|No| N[Create conversation]
        M -->|Yes| O[Load conversation]
        N --> O
        O --> P[Connect WebSocket]
        P --> Q[Join conversation room]
        Q --> R[Type message]
        R --> S[Attach files if needed]
        S --> T[Send message]
        T --> U[Receive direct-message:new event]
        U --> V[Display message in UI]
        V --> L
    end
    
    subgraph System["⚙️ SYSTEM"]
        E --> W[Verify token in handshake]
        W -->|Invalid| X[Reject connection]
        W -->|Valid| Y[Accept connection]
        
        F --> Z{User is group member?}
        Z -->|No| AA[Emit error event]
        Z -->|Yes| AB[Add socket to room]
        
        I --> AC[Validate message content]
        AC -->|Empty| AD[Emit error]
        AC -->|Valid| AE[Save GroupMessage to DB]
        AE --> AF[Broadcast to room]
        AF --> AG{Has mentions?}
        AG -->|Yes| AH[Create mention notifications]
        AG -->|No| AI[Create chat notifications for offline]
        AH --> AI
        AI --> J
        
        N --> AJ[Verify token]
        AJ --> AK[Create DirectConversation]
        AK --> AL[Return conversation]
        AL --> O
        
        Q --> AM{User is participant?}
        AM -->|No| AN[Emit error]
        AM -->|Yes| AO[Add socket to room]
        
        T --> AP[Validate message]
        AP -->|Empty| AQ[Emit error]
        AP -->|Valid| AR[Save DirectMessage to DB]
        AR --> AS[Update lastMessage]
        AS --> AT{Recipient online?}
        AT -->|Yes| AU[Emit to recipient socket]
        AT -->|No| AV[Create push notification]
        AU --> U
        AV --> U
        
        X --> L
        AA --> L
        AD --> L
        AN --> L
        AQ --> L
    end
```

---

## Summary Table

| # | Flow | Description | Key Features |
|---|------|-------------|--------------|
| 1 | Authentication | Login, Register, Logout | JWT tokens, Google OAuth, Personal Workspace |
| 2 | Account Settings | Profile, Theme, Language, Regional, Password | User preferences management |
| 3 | Task Management | CRUD tasks, Assign, Folders | Role-based permissions, Realtime sync |
| 4 | Group Management | Create, Invite, Accept/Decline | Member limits, Invitation notifications |
| 5 | Admin System | User management, Stats, Logs | Super Admin privileges, Action logging |
| 6 | Notifications | Realtime push, History, Mark read | WebSocket events, Multiple notification types |
| 7 | Communication | Group chat, Direct messages | WebSocket rooms, Mentions, Attachments |

---

## Technical Notes

- **Authentication**: JWT with Access Token (short-lived) and Refresh Token (long-lived)
- **Realtime**: Socket.IO for bidirectional communication
- **Permissions**: Account-level roles (groupRole, isLeader) instead of group member roles
- **Storage**: MongoDB for data, Cloudinary for file attachments
- **API Security**: All endpoints require JWT token in Authorization header

---

*Generated from Todo List Application codebase*
