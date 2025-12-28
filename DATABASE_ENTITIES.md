# Mô tả Các Thực thể Chính của Hệ thống

Tài liệu này mô tả chi tiết các lớp thực thể chính của hệ thống Todo List App, được xác định dựa trên phân tích yêu cầu nghiệp vụ và các usecase.

---

## 1. Bảng USER (Người dùng)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của người dùng |
| email | String | REQUIRED, UNIQUE, LOWERCASE, VALIDATE(Email) | Email đăng nhập, phải là định dạng email hợp lệ |
| password | String | REQUIRED, MIN(8), SELECT(false) | Mật khẩu đã được hash bằng bcrypt (salt rounds: 12) |
| name | String | REQUIRED, TRIM, MAX(100) | Tên hiển thị của người dùng |
| avatar | String | NULLABLE | URL ảnh đại diện, lưu trữ trên Cloudinary |
| role | String | ENUM('user', 'admin', 'super_admin'), DEFAULT('user') | Vai trò hệ thống: người dùng thường, admin, super admin |
| groupRole | String | ENUM(GROUP_ROLES), NULLABLE | Vai trò nghiệp vụ trong nhóm (Product Owner, PM, Developer, ...) |
| isLeader | Boolean | DEFAULT(false) | Cờ đánh dấu người dùng là leader (được gán bởi admin) |
| theme | String | ENUM('light', 'dark', 'auto'), DEFAULT('light') | Chủ đề giao diện người dùng |
| language | String | ENUM('en', 'vi'), DEFAULT('en') | Ngôn ngữ ưa thích |
| regionalPreferences | Object | DEFAULT({...}) | Cài đặt khu vực: timeZone, dateFormat, timeFormat, weekStart |
| regionalPreferences.timeZone | String | DEFAULT('UTC+00:00') | Múi giờ |
| regionalPreferences.dateFormat | String | ENUM('DD MMM YYYY', 'MMM DD, YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'), DEFAULT('DD MMM YYYY') | Định dạng ngày tháng |
| regionalPreferences.timeFormat | String | ENUM('12h', '24h'), DEFAULT('12h') | Định dạng giờ |
| regionalPreferences.weekStart | String | ENUM('monday', 'sunday'), DEFAULT('monday') | Ngày bắt đầu tuần |
| isActive | Boolean | DEFAULT(true) | Trạng thái hoạt động của tài khoản |
| isEmailVerified | Boolean | DEFAULT(false) | Trạng thái xác thực email |
| lastLogin | Date | NULLABLE | Thời gian đăng nhập lần cuối |
| refreshToken | String | NULLABLE, SELECT(false) | Token refresh để gia hạn phiên đăng nhập |
| passwordResetToken | String | NULLABLE, SELECT(false) | Token để reset mật khẩu |
| passwordResetExpires | Date | NULLABLE, SELECT(false) | Thời gian hết hạn token reset mật khẩu |
| notificationSettings | Object | DEFAULT({...}) | Cài đặt thông báo của người dùng |
| notificationSettings.email | Boolean | DEFAULT(true) | Bật/tắt thông báo qua email |
| notificationSettings.push | Boolean | DEFAULT(true) | Bật/tắt thông báo push |
| notificationSettings.beforeDue | Number | DEFAULT(24) | Số giờ trước hạn để gửi thông báo |
| notificationSettings.quietHours | Object | NULLABLE | Giờ yên lặng: start, end, timezone |
| notificationSettings.channels | Array | DEFAULT([...]) | Danh sách kênh thông báo được bật |
| notificationSettings.categories | Map | DEFAULT({...}) | Cài đặt thông báo theo danh mục |
| currentGroupId | ObjectId | NULLABLE, REF('Group') | Nhóm hiện tại đang làm việc |
| createdAt | Date | AUTO | Thời gian tạo tài khoản |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ email: 1 }` (UNIQUE)
- `{ createdAt: -1 }`
- `{ currentGroupId: 1 }`

---

## 2. Bảng TASK (Công việc)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của công việc |
| title | String | REQUIRED, TRIM, MAX(200) | Tiêu đề công việc |
| description | String | DEFAULT(''), TRIM, MAX(2000) | Mô tả chi tiết công việc |
| status | String | ENUM('todo', 'in_progress', 'completed', 'incomplete', 'archived'), DEFAULT('todo') | Trạng thái công việc |
| priority | String | ENUM('low', 'medium', 'high', 'critical', 'urgent'), DEFAULT('medium') | Độ ưu tiên |
| dueDate | Date | NULLABLE | Ngày hạn hoàn thành (cho phép quá khứ, hiện tại, tương lai) |
| completedAt | Date | NULLABLE | Thời gian hoàn thành (tự động set khi status = 'completed') |
| createdBy | ObjectId | REQUIRED, REF('User') | Người tạo công việc |
| assignedTo | Array | MAX(50) | Danh sách người được gán công việc |
| assignedTo[].userId | ObjectId | REQUIRED, REF('User') | ID người được gán |
| assignedTo[].assignedAt | Date | DEFAULT(Date.now) | Thời gian gán |
| tags | Array[String] | MAX(10), MAX_LENGTH(30) | Thẻ phân loại công việc |
| category | String | NULLABLE, TRIM | Danh mục công việc |
| type | String | ENUM('Operational', 'Strategic', 'Financial', 'Technical', 'Other'), DEFAULT('Operational') | Loại công việc |
| groupId | ObjectId | REQUIRED, REF('Group') | Nhóm chứa công việc |
| folderId | ObjectId | NULLABLE, REF('Folder'), INDEX | Thư mục chứa công việc |
| attachments | Array | MAX(20) | Danh sách file đính kèm |
| attachments[].filename | String | REQUIRED | Tên file |
| attachments[].url | String | REQUIRED | URL file trên Cloudinary |
| attachments[].size | Number | REQUIRED | Kích thước file (bytes) |
| attachments[].mimetype | String | REQUIRED | Loại MIME của file |
| attachments[].publicId | String | REQUIRED | Public ID trên Cloudinary |
| attachments[].resourceType | String | DEFAULT('raw') | Loại resource: 'image' hoặc 'raw' |
| attachments[].uploadedBy | ObjectId | REF('User') | Người upload |
| attachments[].uploadedAt | Date | DEFAULT(Date.now) | Thời gian upload |
| estimatedTime | String | NULLABLE, TRIM | Thời gian ước tính hoàn thành |
| timeEntries | Array | MAX(1000) | Danh sách nhật ký thời gian làm việc |
| timeEntries[].user | ObjectId | REQUIRED, REF('User') | Người ghi nhận thời gian |
| timeEntries[].date | Date | REQUIRED, DEFAULT(Date.now) | Ngày làm việc |
| timeEntries[].hours | Number | REQUIRED | Số giờ làm việc |
| timeEntries[].minutes | Number | REQUIRED | Số phút làm việc |
| timeEntries[].description | String | TRIM, MAX(500) | Mô tả công việc đã làm |
| timeEntries[].billable | Boolean | DEFAULT(true) | Có tính phí hay không |
| timeEntries[].startTime | Date | NULLABLE | Thời gian bắt đầu (cho timer) |
| timeEntries[].endTime | Date | NULLABLE | Thời gian kết thúc |
| timeEntries[].createdAt | Date | DEFAULT(Date.now) | Thời gian tạo entry |
| scheduledWork | Array | MAX(500) | Công việc đã lên lịch |
| scheduledWork[].user | ObjectId | REQUIRED, REF('User') | Người được lên lịch |
| scheduledWork[].scheduledDate | Date | REQUIRED | Ngày lên lịch |
| scheduledWork[].estimatedHours | Number | DEFAULT(0) | Số giờ ước tính |
| scheduledWork[].estimatedMinutes | Number | DEFAULT(0) | Số phút ước tính |
| scheduledWork[].description | String | TRIM | Mô tả công việc |
| scheduledWork[].status | String | ENUM('scheduled', 'in-progress', 'completed', 'cancelled'), DEFAULT('scheduled') | Trạng thái công việc đã lên lịch |
| scheduledWork[].createdAt | Date | DEFAULT(Date.now) | Thời gian tạo |
| repetition | Object | DEFAULT({...}) | Cài đặt lặp lại công việc |
| repetition.isRepeating | Boolean | DEFAULT(false) | Có lặp lại hay không |
| repetition.frequency | String | ENUM('daily', 'weekly', 'monthly', 'yearly'), DEFAULT('weekly') | Tần suất lặp lại |
| repetition.interval | Number | DEFAULT(1) | Khoảng cách lặp lại (mỗi X ngày/tuần/tháng) |
| repetition.endDate | Date | NULLABLE | Ngày kết thúc lặp lại |
| repetition.occurrences | Number | NULLABLE | Số lần lặp lại |
| activeTimers | Array | | Danh sách timer đang chạy (nhiều người có thể timer cùng lúc) |
| activeTimers[].userId | ObjectId | REF('User') | Người đang chạy timer |
| activeTimers[].startTime | Date | DEFAULT(Date.now) | Thời gian bắt đầu timer |
| customStatus | Object | NULLABLE | Trạng thái tùy chỉnh |
| customStatus.name | String | TRIM | Tên trạng thái tùy chỉnh |
| customStatus.color | String | DEFAULT('#3B82F6') | Màu hiển thị |
| comments | Array | MAX(200) | Danh sách bình luận |
| comments[].user | ObjectId | REQUIRED, REF('User') | Người bình luận |
| comments[].content | String | DEFAULT(''), MAX(2000), TRIM | Nội dung bình luận |
| comments[].attachment | Object | NULLABLE | File đính kèm trong bình luận |
| comments[].createdAt | Date | DEFAULT(Date.now) | Thời gian bình luận |
| comments[].updatedAt | Date | NULLABLE | Thời gian chỉnh sửa |
| comments[].isEdited | Boolean | DEFAULT(false) | Đã chỉnh sửa hay chưa |
| comments[].mentions | Array[ObjectId] | REF('User') | Danh sách người được mention |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ createdBy: 1, status: 1 }`
- `{ groupId: 1, status: 1 }`
- `{ folderId: 1, status: 1 }`
- `{ 'assignedTo.userId': 1 }`
- `{ dueDate: 1 }`
- `{ priority: 1 }`
- `{ status: 1 }`
- `{ createdAt: -1 }`
- `{ type: 1 }`
- `{ 'timeEntries.date': 1 }`
- `{ 'scheduledWork.scheduledDate': 1 }`
- `{ title: 'text', description: 'text' }` (Text search)

---

## 3. Bảng GROUP (Nhóm)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của nhóm |
| name | String | REQUIRED, TRIM, MAX(100) | Tên nhóm |
| isPersonalWorkspace | Boolean | DEFAULT(false) | Có phải workspace cá nhân hay không |
| description | String | TRIM, MAX(500), DEFAULT('') | Mô tả nhóm |
| createdBy | ObjectId | REQUIRED, REF('User') | Người tạo nhóm (tự động thêm vào members) |
| members | Array | MAX(100) | Danh sách thành viên nhóm |
| members[].userId | ObjectId | REQUIRED, REF('User') | ID thành viên |
| members[].role | String | ENUM(GROUP_ROLES), NULLABLE | Vai trò trong nhóm (Product Owner, PM, Developer, ...) |
| members[].joinedAt | Date | DEFAULT(Date.now) | Thời gian tham gia nhóm |
| metadata | Object | DEFAULT({...}) | Metadata của nhóm |
| metadata.color | String | DEFAULT('#2563eb') | Màu hiển thị nhóm |
| metadata.icon | String | DEFAULT('users') | Icon hiển thị |
| defaultFolderId | ObjectId | NULLABLE, REF('Folder') | Thư mục mặc định của nhóm |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ createdBy: 1 }`
- `{ 'members.userId': 1 }`
- `{ name: 1, createdBy: 1 }`

**Virtual Fields:**
- `memberCount`: Số lượng thành viên

---

## 4. Bảng FOLDER (Thư mục)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của thư mục |
| name | String | REQUIRED, TRIM, MAX(100) | Tên thư mục |
| description | String | TRIM, MAX(500), DEFAULT('') | Mô tả thư mục |
| groupId | ObjectId | REQUIRED, REF('Group'), INDEX | Nhóm chứa thư mục |
| createdBy | ObjectId | REQUIRED, REF('User') | Người tạo thư mục |
| isDefault | Boolean | DEFAULT(false) | Có phải thư mục mặc định hay không (unique trong group) |
| order | Number | DEFAULT(0) | Thứ tự sắp xếp |
| metadata | Object | DEFAULT({...}) | Metadata của thư mục |
| metadata.color | String | DEFAULT('#1d4ed8') | Màu hiển thị |
| metadata.icon | String | DEFAULT('folder') | Icon hiển thị |
| memberAccess | Array | | Danh sách người có quyền truy cập |
| memberAccess[].userId | ObjectId | REQUIRED, REF('User') | ID người có quyền |
| memberAccess[].addedBy | ObjectId | REQUIRED, REF('User') | Người cấp quyền |
| memberAccess[].addedAt | Date | DEFAULT(Date.now) | Thời gian cấp quyền |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ groupId: 1, name: 1 }` (UNIQUE)
- `{ groupId: 1, isDefault: 1 }` (UNIQUE, partial filter: isDefault = true)
- `{ groupId: 1, 'memberAccess.userId': 1 }`

---

## 5. Bảng NOTE (Ghi chú)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của ghi chú |
| title | String | REQUIRED, TRIM, MAX(200) | Tiêu đề ghi chú |
| content | String | DEFAULT(''), MAX(10000) | Nội dung ghi chú |
| userId | ObjectId | REQUIRED, REF('User') | Người tạo ghi chú |
| groupId | ObjectId | REQUIRED, REF('Group') | Nhóm chứa ghi chú |
| folderId | ObjectId | NULLABLE, REF('Folder'), INDEX | Thư mục chứa ghi chú |
| lastEdited | Date | DEFAULT(Date.now) | Thời gian chỉnh sửa cuối cùng (tự động cập nhật) |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ userId: 1, lastEdited: -1 }`
- `{ userId: 1, title: 'text', content: 'text' }` (Text search)
- `{ groupId: 1, folderId: 1, lastEdited: -1 }`

**Virtual Fields:**
- `formattedLastEdited`: Định dạng thời gian chỉnh sửa (Today, Yesterday, X days ago, ...)

---

## 6. Bảng NOTIFICATION (Thông báo)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của thông báo |
| recipient | ObjectId | REQUIRED, REF('User') | Người nhận thông báo |
| sender | ObjectId | NULLABLE, REF('User') | Người gửi thông báo |
| type | String | REQUIRED, TRIM | Loại thông báo |
| eventKey | String | TRIM, NULLABLE | Key của sự kiện (để phân loại) |
| title | String | REQUIRED, TRIM | Tiêu đề thông báo |
| message | String | REQUIRED, TRIM | Nội dung thông báo |
| data | Mixed | DEFAULT({}) | Dữ liệu bổ sung (JSON) |
| metadata | Map | DEFAULT({}) | Metadata bổ sung |
| categories | Array[String] | ENUM(NOTIFICATION_CATEGORIES), MIN(1), DEFAULT(['system']) | Danh mục thông báo |
| channels | Array[String] | ENUM(NOTIFICATION_CHANNELS), MIN(1), DEFAULT(['in_app']) | Kênh gửi thông báo |
| isRead | Boolean | DEFAULT(false) | Đã đọc hay chưa |
| readAt | Date | NULLABLE | Thời gian đọc |
| deliveredAt | Date | NULLABLE | Thời gian gửi (tự động set khi tạo) |
| archived | Boolean | DEFAULT(false) | Đã lưu trữ hay chưa |
| status | String | ENUM('pending', 'delivered', 'accepted', 'declined', 'failed', 'expired'), DEFAULT('pending') | Trạng thái thông báo |
| expiresAt | Date | NULLABLE | Thời gian hết hạn (tự động set dựa trên TTL) |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ recipient: 1, isRead: 1, createdAt: -1 }`
- `{ recipient: 1, categories: 1, archived: 1, createdAt: -1 }`
- `{ status: 1, expiresAt: 1 }`
- `{ expiresAt: 1 }` (TTL Index - tự động xóa khi hết hạn)

**Virtual Fields:**
- `isExpired`: Kiểm tra thông báo đã hết hạn hay chưa

---

## 7. Bảng GROUP_MESSAGE (Tin nhắn nhóm)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của tin nhắn |
| groupId | ObjectId | REQUIRED, REF('Group'), INDEX | Nhóm chứa tin nhắn |
| senderId | ObjectId | REQUIRED, REF('User'), INDEX | Người gửi tin nhắn |
| content | String | TRIM, MAX(5000) | Nội dung tin nhắn |
| attachments | Array | | Danh sách file đính kèm |
| attachments[].type | String | ENUM('image', 'file'), REQUIRED | Loại file |
| attachments[].url | String | REQUIRED | URL file |
| attachments[].filename | String | REQUIRED | Tên file |
| attachments[].size | Number | REQUIRED | Kích thước file (bytes) |
| attachments[].mimeType | String | DEFAULT('') | Loại MIME |
| attachments[].thumbnailUrl | String | NULLABLE | URL thumbnail (cho ảnh) |
| attachments[].publicId | String | NULLABLE | Public ID trên Cloudinary |
| attachments[].resourceType | String | ENUM('image', 'raw'), DEFAULT('raw') | Loại resource |
| reactions | Array | | Danh sách reaction (emoji) |
| reactions[].emoji | String | REQUIRED, TRIM | Emoji reaction |
| reactions[].userId | ObjectId | REQUIRED, REF('User') | Người reaction |
| reactions[].createdAt | Date | DEFAULT(Date.now) | Thời gian reaction |
| replyTo | ObjectId | NULLABLE, REF('GroupMessage') | Tin nhắn được reply |
| mentions | Object | | Thông tin mention |
| mentions.users | Array[ObjectId] | REF('User') | Danh sách user được mention |
| mentions.roles | Array[String] | TRIM | Danh sách role được mention |
| editedAt | Date | NULLABLE | Thời gian chỉnh sửa |
| deletedAt | Date | NULLABLE | Thời gian xóa (soft delete) |
| messageType | String | ENUM('text', 'call'), DEFAULT('text') | Loại tin nhắn |
| callData | Object | NULLABLE | Dữ liệu cuộc gọi (nếu messageType = 'call') |
| callData.meetingId | String | NULLABLE | ID cuộc họp |
| callData.callType | String | ENUM('group', 'direct') | Loại cuộc gọi |
| callData.status | String | ENUM('active', 'ended'), DEFAULT('active') | Trạng thái cuộc gọi |
| callData.startedAt | Date | NULLABLE | Thời gian bắt đầu |
| callData.endedAt | Date | NULLABLE | Thời gian kết thúc |
| callData.participants | Array[ObjectId] | REF('User') | Danh sách người tham gia |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ groupId: 1, createdAt: -1 }`
- `{ groupId: 1, senderId: 1 }`
- `{ 'reactions.userId': 1 }`
- `{ replyTo: 1 }`

**Virtual Fields:**
- `reactionCounts`: Thống kê reaction theo emoji

---

## 8. Bảng DIRECT_MESSAGE (Tin nhắn trực tiếp)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của tin nhắn |
| conversationId | ObjectId | REQUIRED, REF('DirectConversation'), INDEX | Cuộc trò chuyện chứa tin nhắn |
| senderId | ObjectId | REQUIRED, REF('User'), INDEX | Người gửi tin nhắn |
| content | String | TRIM, MAX(5000), DEFAULT('') | Nội dung tin nhắn |
| attachments | Array | | Danh sách file đính kèm (cấu trúc giống GroupMessage) |
| reactions | Array | | Danh sách reaction (cấu trúc giống GroupMessage) |
| replyTo | ObjectId | NULLABLE, REF('DirectMessage') | Tin nhắn được reply |
| mentions | Array[ObjectId] | REF('User') | Danh sách user được mention |
| editedAt | Date | NULLABLE | Thời gian chỉnh sửa |
| deletedAt | Date | NULLABLE | Thời gian xóa (soft delete) |
| messageType | String | ENUM('text', 'call'), DEFAULT('text') | Loại tin nhắn |
| callData | Object | NULLABLE | Dữ liệu cuộc gọi (cấu trúc giống GroupMessage) |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ conversationId: 1, createdAt: -1 }`
- `{ conversationId: 1, senderId: 1 }`
- `{ 'reactions.userId': 1 }`
- `{ replyTo: 1 }`

**Virtual Fields:**
- `reactionCounts`: Thống kê reaction theo emoji

---

## 9. Bảng DIRECT_CONVERSATION (Cuộc trò chuyện trực tiếp)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của cuộc trò chuyện |
| participants | Array[ObjectId] | REQUIRED, LENGTH(2), REF('User') | Danh sách 2 người tham gia (chỉ cho phép 2 người) |
| participantHash | String | REQUIRED, UNIQUE | Hash để đảm bảo unique conversation giữa 2 người |
| lastMessagePreview | String | DEFAULT('') | Xem trước tin nhắn cuối cùng |
| lastMessageAt | Date | NULLABLE | Thời gian tin nhắn cuối cùng |
| lastMessageSender | ObjectId | NULLABLE, REF('User') | Người gửi tin nhắn cuối cùng |
| unreadCounts | Map | DEFAULT({}) | Số tin nhắn chưa đọc theo từng người tham gia |
| mutedBy | Array[ObjectId] | REF('User') | Danh sách người đã tắt thông báo cuộc trò chuyện |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ participantHash: 1 }` (UNIQUE)
- `{ participants: 1 }`
- `{ updatedAt: -1 }`

---

## 10. Bảng LOGIN_HISTORY (Lịch sử đăng nhập)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của bản ghi |
| user | ObjectId | REQUIRED, REF('User'), INDEX | Người dùng đăng nhập |
| email | String | REQUIRED, INDEX | Email đăng nhập |
| ipAddress | String | NULLABLE | Địa chỉ IP |
| userAgent | String | NULLABLE | User agent của trình duyệt |
| status | String | ENUM('success', 'failed', 'blocked'), REQUIRED, INDEX | Trạng thái đăng nhập |
| failureReason | String | NULLABLE | Lý do thất bại (nếu status = 'failed') |
| loginAt | Date | DEFAULT(Date.now), INDEX | Thời gian đăng nhập |
| createdAt | Date | AUTO | Thời gian tạo bản ghi |
| updatedAt | Date | AUTO | Thời gian cập nhật |

**Indexes:**
- `{ user: 1, loginAt: -1 }`
- `{ email: 1, loginAt: -1 }`
- `{ status: 1, loginAt: -1 }`
- `{ loginAt: -1 }`

---

## 11. Bảng ADMIN_ACTION_LOG (Nhật ký hành động Admin)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của bản ghi |
| admin | ObjectId | REQUIRED, REF('User'), INDEX | Admin thực hiện hành động |
| adminEmail | String | REQUIRED, INDEX | Email của admin |
| action | String | REQUIRED, ENUM([...]), INDEX | Loại hành động |
| targetType | String | ENUM('user', 'notification', 'system', 'admin'), REQUIRED | Loại đối tượng bị tác động |
| targetId | Mixed | NULLABLE | ID đối tượng bị tác động |
| description | String | REQUIRED | Mô tả hành động |
| changes | Mixed | DEFAULT({}) | Thay đổi chi tiết (JSON) |
| ipAddress | String | NULLABLE | Địa chỉ IP |
| userAgent | String | NULLABLE | User agent |
| metadata | Mixed | DEFAULT({}) | Metadata bổ sung |
| createdAt | Date | AUTO | Thời gian thực hiện |
| updatedAt | Date | AUTO | Thời gian cập nhật |

**Các giá trị action:**
- `user_create`: Tạo người dùng
- `user_update`: Cập nhật người dùng
- `user_delete`: Xóa người dùng
- `user_lock`: Khóa tài khoản
- `user_unlock`: Mở khóa tài khoản
- `user_role_change`: Thay đổi vai trò
- `notification_send`: Gửi thông báo
- `system_config_change`: Thay đổi cấu hình hệ thống
- `admin_create`: Tạo admin
- `admin_remove`: Xóa admin

**Indexes:**
- `{ admin: 1, createdAt: -1 }`
- `{ action: 1, createdAt: -1 }`
- `{ targetType: 1, targetId: 1 }`
- `{ createdAt: -1 }`

---

## 12. Bảng CHATBOT_STATE (Trạng thái Chatbot)

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| _id | ObjectId | PRIMARY KEY, AUTO | Định danh duy nhất của bản ghi |
| userId | ObjectId | REQUIRED, REF('User'), INDEX | Người dùng tương tác với chatbot |
| groupId | ObjectId | REQUIRED, REF('Group'), INDEX | Nhóm hiện tại |
| recommendedTaskIds | Array[ObjectId] | REF('Task') | Danh sách task được chatbot đề xuất ở lần gần nhất |
| createdAt | Date | AUTO | Thời gian tạo |
| updatedAt | Date | AUTO | Thời gian cập nhật cuối cùng |

**Indexes:**
- `{ userId: 1, groupId: 1 }` (UNIQUE)

---

## Tóm tắt Quan hệ giữa các Thực thể

### Quan hệ 1-Nhiều:
- **User** → **Task** (1 user tạo nhiều tasks)
- **User** → **Group** (1 user tạo nhiều groups)
- **User** → **Note** (1 user tạo nhiều notes)
- **User** → **Notification** (1 user nhận nhiều notifications)
- **User** → **LoginHistory** (1 user có nhiều lịch sử đăng nhập)
- **User** → **AdminActionLog** (1 admin thực hiện nhiều hành động)
- **Group** → **Task** (1 group chứa nhiều tasks)
- **Group** → **Folder** (1 group chứa nhiều folders)
- **Group** → **GroupMessage** (1 group có nhiều tin nhắn)
- **Folder** → **Task** (1 folder chứa nhiều tasks)
- **DirectConversation** → **DirectMessage** (1 conversation có nhiều tin nhắn)

### Quan hệ Nhiều-Nhiều:
- **User** ↔ **Group** (qua members array)
- **User** ↔ **DirectConversation** (qua participants array)

### Quan hệ Nhiều-1:
- **Task** → **Group** (nhiều tasks thuộc 1 group)
- **Task** → **Folder** (nhiều tasks thuộc 1 folder)
- **Task** → **User** (nhiều tasks được gán cho 1 user)
- **Folder** → **Group** (nhiều folders thuộc 1 group)
- **Note** → **Group** (nhiều notes thuộc 1 group)
- **Note** → **Folder** (nhiều notes thuộc 1 folder)
- **GroupMessage** → **Group** (nhiều messages thuộc 1 group)
- **DirectMessage** → **DirectConversation** (nhiều messages thuộc 1 conversation)

---

## Ghi chú kỹ thuật

1. **ObjectId**: Tất cả các trường tham chiếu sử dụng MongoDB ObjectId
2. **Timestamps**: Tất cả các bảng đều có `createdAt` và `updatedAt` tự động (trừ khi có ghi chú khác)
3. **Soft Delete**: Một số bảng sử dụng soft delete (deletedAt) thay vì xóa vật lý
4. **Indexes**: Các index được tối ưu cho các truy vấn thường xuyên
5. **Validation**: Tất cả các ràng buộc được thực thi ở cả schema level và application level
6. **Text Search**: Một số bảng có text search index để hỗ trợ tìm kiếm full-text

---

**Tài liệu được tạo dựa trên phân tích codebase và các models hiện có**  
**Cập nhật lần cuối**: 2024




