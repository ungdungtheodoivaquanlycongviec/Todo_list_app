# 🧪 Testing Documentation

Thư mục này chứa tất cả tài liệu và resources để test API.

---

## 📁 Cấu Trúc

```
tests/
├── postman/
│   └── Todo_API.postman_collection.json  # Postman collection
└── README.md                              # File này
```

---

## 🚀 Quick Start

### Bước 1: Import Collection vào Postman
```
Postman → Import → Choose Files
→ Select: postman/Todo_API.postman_collection.json
```

### Bước 2: Chạy Request Đầu Tiên
```
"Create Task - Success" → Send → Tự động lưu taskId ✅
```

### Bước 3: Test Các Endpoints Khác
```
GET, PUT, DELETE sẽ tự động dùng {{taskId}}
```

---

## 📚 Tài Liệu Hướng Dẫn

Đọc các file sau để hiểu rõ hơn:

### 1. **QUICK_START.md** (Đọc đầu tiên!)
- 🎯 Hướng dẫn từng bước chi tiết
- ⚠️ Giải quyết lỗi `{{taskId}}`
- 🔧 Cách test thủ công

### 2. **TESTING_GUIDE.md** (Chi tiết về test cases)
- ✅ 7 test cases Phase 1
- 📋 Expected responses
- 🐛 Common issues

### 3. **TESTING_DEMO.md** (Examples & Screenshots)
- 📸 Ví dụ request/response
- 🎯 Workflow hoàn chỉnh
- 💡 Tips & tricks

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Phải Chạy POST Trước!

```
❌ WRONG:
GET /api/tasks/{{taskId}}  → Lỗi ngay!

✅ CORRECT:
POST /api/tasks            → Tạo task, lưu ID
GET /api/tasks/{{taskId}}  → Hoạt động!
```

### Variable `{{taskId}}` Tự Động

Script trong POST request:
```javascript
pm.collectionVariables.set("taskId", jsonData.data._id);
```

Không cần set thủ công!

---

## 🎯 Test Workflow

```
1. POST Create Task        → taskId = "67021abc..."
2. GET All Tasks           → Xem danh sách
3. GET Task by ID          → Dùng {{taskId}}
4. PUT Update Task         → Dùng {{taskId}}
5. DELETE Task             → Dùng {{taskId}}
```

---

## 🐛 Gặp Lỗi?

### Lỗi: "Cast to ObjectId failed for {{taskId}}"

**Đọc ngay**: `../QUICK_START.md`

**Tóm tắt giải pháp**:
1. Chạy "Create Task - Success"
2. Xem Console: "Task ID saved: ..."
3. Retry request bị lỗi

---

## 📊 Postman Collection Structure

```
Todo List API
└── Tasks
    ├── Create Task - Success          ← Chạy đầu tiên!
    ├── Create Task - Missing Title    
    ├── Create Task - Past Due Date    
    ├── Create Task - Invalid Priority 
    ├── Create Task - Minimal Data     
    ├── Get All Tasks                  
    ├── Get Task by ID                 ← Cần taskId
    ├── Update Task - Full             ← Cần taskId
    └── Delete Task                    ← Cần taskId
```

---

## ✅ Success Criteria

Tất cả tests đều pass:
- ✅ POST requests: 201 Created
- ✅ GET requests: 200 OK
- ✅ PUT requests: 200 OK
- ✅ DELETE requests: 200 OK
- ✅ Validation tests: 400 Bad Request

---

## 🔗 Liên Kết Hữu Ích

- 📖 [Postman Documentation](https://learning.postman.com/)
- 🌐 [REST API Best Practices](https://restfulapi.net/)
- 🔧 [MongoDB ObjectId Format](https://www.mongodb.com/docs/manual/reference/method/ObjectId/)

---

**Cần trợ giúp?** Đọc các file hướng dẫn hoặc check server logs!
