# Hệ thống Admin - Tóm tắt

## Tổng quan

Hệ thống admin đã được triển khai với đầy đủ các tính năng quản lý người dùng, gửi thông báo và theo dõi lịch sử đăng nhập.

## Tính năng đã triển khai

### 1. Super Admin
- **Email**: nguyenngochuyenz17012001@gmail.com
- **Password mặc định**: SuperAdmin@2024 (cần đổi sau lần đăng nhập đầu)
- **Vai trò**: super_admin
- Super admin được tự động tạo khi khởi động hệ thống lần đầu (xem `backend/src/utils/initSuperAdmin.js`)
- Chỉ super admin mới có thể thêm/xóa vai trò admin cho các user khác

### 2. Quản lý người dùng (Users Management)

#### Quyền truy cập
- Admin và Super Admin có thể quản lý users
- Chỉ Super Admin có thể thêm/xóa vai trò admin

#### Tính năng
- ✅ Xem danh sách users với phân trang và lọc
- ✅ Tìm kiếm theo tên hoặc email
- ✅ Lọc theo role (user/admin/super_admin)
- ✅ Lọc theo trạng thái (active/inactive)
- ✅ Thêm user mới
- ✅ Chỉnh sửa thông tin user (name, email, role, status)
- ✅ Khóa/mở khóa tài khoản
- ✅ Gán/xóa vai trò admin (chỉ Super Admin)
- ✅ Kiểm tra dữ liệu trước khi lưu
- ✅ Báo lỗi nếu dữ liệu không hợp lệ
- ✅ Log tất cả các thay đổi vào AdminActionLog

#### API Endpoints
```
GET    /api/admin/users              - Lấy danh sách users
GET    /api/admin/users/:id          - Lấy thông tin user theo ID
POST   /api/admin/users              - Tạo user mới
PUT    /api/admin/users/:id          - Cập nhật user
PATCH  /api/admin/users/:id/lock     - Khóa tài khoản
PATCH  /api/admin/users/:id/unlock   - Mở khóa tài khoản
POST   /api/admin/users/:id/assign-admin   - Gán vai trò admin (Super Admin only)
POST   /api/admin/users/:id/remove-admin   - Xóa vai trò admin (Super Admin only)
```

### 3. Gửi thông báo (Notifications)

#### Tính năng
- ✅ Gửi thông báo đến cá nhân
- ✅ Gửi thông báo đến nhóm
- ✅ Gửi thông báo đến toàn hệ thống
- ✅ Kiểm tra thông báo không được rỗng
- ✅ Lưu lịch sử gửi thông báo
- ✅ Log hành động vào AdminActionLog

#### API Endpoint
```
POST   /api/admin/notifications/send  - Gửi thông báo
```

#### Request Body
```json
{
  "title": "Tiêu đề thông báo",
  "message": "Nội dung thông báo",
  "recipients": ["userId1", "userId2"],  // Optional: danh sách user IDs
  "groupId": "groupId",                   // Optional: ID của nhóm
  "sendToAll": true                       // Optional: gửi đến tất cả users
}
```

### 4. Lịch sử đăng nhập (Login History)

#### Tính năng
- ✅ Xem lịch sử đăng nhập của tất cả users
- ✅ Lọc theo người dùng (userId)
- ✅ Lọc theo email
- ✅ Lọc theo trạng thái (success/failed/blocked)
- ✅ Lọc theo khoảng thời gian (startDate/endDate)
- ✅ Hiển thị IP address và User Agent
- ✅ Chỉ Admin/Super Admin được xem
- ✅ Dữ liệu chỉ đọc

#### API Endpoint
```
GET    /api/admin/login-history  - Lấy lịch sử đăng nhập
```

#### Query Parameters
- `page`: Số trang (mặc định: 1)
- `limit`: Số bản ghi mỗi trang (mặc định: 50)
- `userId`: Lọc theo user ID
- `email`: Lọc theo email
- `status`: Lọc theo trạng thái (success/failed/blocked)
- `startDate`: Ngày bắt đầu (ISO format)
- `endDate`: Ngày kết thúc (ISO format)
- `sortBy`: Trường sắp xếp (mặc định: loginAt)
- `sortOrder`: Thứ tự sắp xếp (asc/desc, mặc định: desc)

### 5. Dashboard & Thống kê

#### Tính năng
- ✅ Thống kê tổng số users
- ✅ Thống kê users active/inactive
- ✅ Thống kê số lượng admins
- ✅ Thống kê số lượng groups
- ✅ Thống kê đăng nhập trong 24h
- ✅ Thống kê hành động admin trong 24h

#### API Endpoint
```
GET    /api/admin/dashboard/stats  - Lấy thống kê dashboard
```

### 6. Action Logs

#### Tính năng
- ✅ Lưu tất cả các hành động của admin
- ✅ Ghi lại thay đổi trước và sau
- ✅ Lưu IP address và User Agent
- ✅ Lọc và tìm kiếm logs

#### API Endpoint
```
GET    /api/admin/action-logs  - Lấy action logs
```

## Cấu trúc Backend

### Models
- `User.model.js` - Đã cập nhật thêm role `super_admin`
- `LoginHistory.model.js` - Model mới cho lịch sử đăng nhập
- `AdminActionLog.model.js` - Model mới cho action logs

### Services
- `admin.service.js` - Service xử lý logic admin
- `auth.service.js` - Đã cập nhật để log login history

### Controllers
- `admin.controller.js` - Controller xử lý API endpoints

### Middlewares
- `adminAuth.js` - Middleware kiểm tra quyền admin/super_admin
- `auth.js` - Middleware xác thực (đã có sẵn)

### Routes
- `admin.routes.js` - Routes cho admin APIs
- Đã tích hợp vào `routes/index.js`

### Utils
- `initSuperAdmin.js` - Script khởi tạo super admin

## Cấu trúc Frontend

### Pages
- `frontend/app/admin/page.tsx` - Trang admin chính

### Services
- `frontend/app/services/admin.service.ts` - Service gọi API admin

### Components
Trang admin bao gồm các tab:
1. **Dashboard** - Hiển thị thống kê
2. **Users** - Quản lý users
3. **Notifications** - Gửi thông báo
4. **Login History** - Xem lịch sử đăng nhập

## Bảo mật

1. **Authentication**: Tất cả API endpoints yêu cầu authentication
2. **Authorization**: Kiểm tra role admin/super_admin trước khi truy cập
3. **Validation**: Kiểm tra dữ liệu đầu vào trước khi xử lý
4. **Logging**: Log tất cả các hành động quan trọng
5. **Error Handling**: Xử lý lỗi và trả về thông báo phù hợp

## Cách sử dụng

### 1. Khởi động hệ thống
Khi khởi động backend, super admin sẽ tự động được tạo nếu chưa tồn tại.

### 2. Đăng nhập Super Admin
- Email: nguyenngochuyenz17012001@gmail.com
- Password: SuperAdmin@2024
- **Lưu ý**: Nên đổi password ngay sau lần đăng nhập đầu tiên

### 3. Truy cập Admin Panel
Truy cập: `http://localhost:3000/admin` (hoặc URL frontend của bạn)

### 4. Quản lý Users
- Vào tab "Users"
- Sử dụng bộ lọc để tìm kiếm users
- Click "Edit" để chỉnh sửa user
- Click "Lock/Unlock" để khóa/mở khóa tài khoản
- Click "Make Admin/Remove Admin" để quản lý vai trò (chỉ Super Admin)

### 5. Gửi thông báo
- Vào tab "Notifications"
- Nhập tiêu đề và nội dung
- Chọn loại người nhận (All Users / Specific Users / Group)
- Click "Send Notification"

### 6. Xem lịch sử đăng nhập
- Vào tab "Login History"
- Sử dụng bộ lọc để tìm kiếm
- Xem chi tiết từng lần đăng nhập

## Lưu ý quan trọng

1. **Password Super Admin**: Mặc định là `SuperAdmin@2024`, cần đổi ngay sau lần đăng nhập đầu
2. **Quyền hạn**: Chỉ Super Admin mới có thể gán/xóa vai trò admin cho user khác
3. **Logging**: Tất cả hành động admin đều được log vào AdminActionLog
4. **Login History**: Tự động log mọi lần đăng nhập (thành công/thất bại/bị chặn)

## API Response Format

Tất cả API responses đều theo format:
```json
{
  "success": true,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

## Error Handling

Khi có lỗi:
```json
{
  "success": false,
  "message": "Error message"
}
```

Status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (chưa đăng nhập)
- `403`: Forbidden (không có quyền)
- `404`: Not Found
- `500`: Internal Server Error

