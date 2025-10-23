# Group Management System - Hướng dẫn sử dụng

## 🎯 Tổng quan

Hệ thống quản lý groups đã được tích hợp hoàn toàn vào sidebar hiện có. Mỗi user sẽ có Personal Workspace mặc định và có thể tạo thêm các groups khác.

## ✨ Tính năng chính

### 1. Personal Workspace mặc định
- Mỗi user khi đăng ký sẽ tự động có 1 Personal Workspace
- Personal Workspace được set làm currentGroupId mặc định
- User có quyền admin trong Personal Workspace của mình

### 2. Sidebar Group Management
- **My Groups**: Hiển thị tất cả groups do user tạo
- **Shared with me**: Hiển thị groups mà user được mời tham gia
- **Create Group**: Click vào dấu + để tạo group mới
- **Switch Group**: Click vào group để chuyển đổi workspace

### 3. Group Operations
- Tạo group mới với tên và mô tả
- Chuyển đổi giữa các groups
- Tasks được tách biệt theo group
- Chỉ hiển thị tasks của group hiện tại

## 🔧 Cách sử dụng

### Tạo Group mới
1. Mở sidebar (bên trái)
2. Click vào dấu **+** bên cạnh "My Groups"
3. Nhập tên group và mô tả (tùy chọn)
4. Click "Create Group"
5. Group mới sẽ được tạo và tự động chuyển sang group đó

### Chuyển đổi Group
1. Mở sidebar
2. Click vào group muốn chuyển đến trong "My Groups" hoặc "Shared with me"
3. Workspace sẽ chuyển sang group đó
4. Tasks sẽ được lọc theo group mới

### Quản lý Tasks theo Group
- Mỗi group có tasks riêng biệt
- Khi chuyển group, chỉ hiển thị tasks của group đó
- Tạo task mới sẽ tự động thuộc về group hiện tại

## 🗄️ Cấu trúc dữ liệu

### User Model
```javascript
{
  currentGroupId: ObjectId, // Group hiện tại đang active
  // ... other fields
}
```

### Group Model
```javascript
{
  name: String,
  description: String,
  createdBy: ObjectId, // User tạo group
  members: [{
    userId: ObjectId,
    role: String, // 'admin' hoặc 'member'
    joinedAt: Date
  }]
}
```

### Task Model
```javascript
{
  groupId: ObjectId, // Required - thuộc về group nào
  // ... other fields
}
```

## 🚀 Migration cho Users hiện có

Chạy script migration để tạo Personal Workspace cho users hiện có:

```bash
cd backend
node scripts/migrate-users-to-personal-workspace.js
```

## 🔐 API Endpoints

### Group Management
- `GET /api/groups` - Lấy danh sách groups (phân chia My Groups và Shared)
- `POST /api/groups` - Tạo group mới
- `GET /api/groups/:id` - Lấy chi tiết group
- `POST /api/groups/:id/join` - Tham gia group
- `POST /api/groups/:id/switch` - Chuyển sang group
- `DELETE /api/groups/:id/leave` - Rời khỏi group

### Task Management (đã cập nhật)
- Tất cả task APIs đã được cập nhật để hoạt động theo group
- Middleware `requireCurrentGroup` đảm bảo user phải có group active
- Tasks được filter theo `currentGroupId` của user

## 🎨 UI Components

### Sidebar
- `frontend/app/components/layouts/Sidebar.tsx` - Sidebar chính với group management
- Tích hợp CreateGroupModal để tạo group mới
- Hiển thị My Groups và Shared with me

### AuthContext
- `frontend/app/contexts/AuthContext.tsx` - Quản lý currentGroup state
- Tự động load groups khi login
- Sync currentGroupId với localStorage

### Services
- `frontend/app/services/group.service.ts` - API calls cho group management
- `frontend/app/services/task.service.ts` - Đã cập nhật để sử dụng currentGroupId

## 🔄 Workflow

1. **User đăng ký** → Tự động tạo Personal Workspace
2. **User login** → Load currentGroup và groups
3. **User tạo group** → Thêm vào My Groups, tự động switch
4. **User chuyển group** → Cập nhật currentGroupId, filter tasks
5. **User tạo task** → Tự động thuộc về currentGroup

## 🐛 Troubleshooting

### User không thấy groups
- Kiểm tra xem user có currentGroupId không
- Chạy migration script nếu cần
- Kiểm tra console logs để debug

### Tasks không hiển thị
- Đảm bảo user đã chọn group
- Kiểm tra groupId trong task data
- Verify middleware requireCurrentGroup

### Không thể tạo group
- Kiểm tra authentication
- Verify API endpoints
- Check network requests

## 📝 Notes

- Personal Workspace không thể xóa
- User luôn có ít nhất 1 group (Personal Workspace)
- Tasks được tách biệt hoàn toàn theo group
- Sidebar tự động refresh khi có thay đổi groups

