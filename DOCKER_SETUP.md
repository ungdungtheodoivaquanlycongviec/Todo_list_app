# 🐳 Hướng dẫn chạy ứng dụng với Docker

Tài liệu này hướng dẫn cách chạy toàn bộ ứng dụng (Frontend, Backend, Chatbot, Redis) chỉ bằng một lệnh Docker.

## 📋 Yêu cầu

- Docker Desktop đã được cài đặt và đang chạy
- Docker Compose (thường đi kèm với Docker Desktop)

## 🚀 Cách sử dụng

### 1. Chuẩn bị file môi trường (nếu chưa có)

#### Backend (.env)
Tạo file `backend/.env` với nội dung tối thiểu:
```env
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/todolist
JWT_SECRET=your-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-change-this
REDIS_URL=redis://redis:6379
ENABLE_SOCKET_REDIS_ADAPTER=true
SOCKET_ALLOWED_ORIGINS=http://localhost:3000
```

#### Frontend (.env.local) - Tùy chọn
Tạo file `frontend/.env.local` nếu cần override:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:8080
NEXT_PUBLIC_CHATBOT_API_URL=http://localhost:5000
```

**Lưu ý:** Nếu không có file `.env.local`, docker-compose sẽ sử dụng các giá trị mặc định đã được cấu hình.

### 2. Chạy ứng dụng

Từ thư mục gốc của project, chạy lệnh:

```bash
docker-compose up
```

Hoặc chạy ở chế độ background (detached):

```bash
docker-compose up -d
```

### 3. Truy cập ứng dụng

Sau khi các containers đã khởi động thành công:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api
- **Chatbot**: http://localhost:5000
- **Redis**: localhost:6379

### 4. Xem logs

Xem logs của tất cả services:
```bash
docker-compose logs -f
```

Xem logs của một service cụ thể:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f chatbot
docker-compose logs -f redis
```

### 5. Dừng ứng dụng

Dừng tất cả containers:
```bash
docker-compose down
```

Dừng và xóa volumes (bao gồm Redis data):
```bash
docker-compose down -v
```

## 🔧 Các lệnh hữu ích khác

### Rebuild containers sau khi thay đổi Dockerfile
```bash
docker-compose up --build
```

### Chạy lại một service cụ thể
```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart chatbot
```

### Xem trạng thái các containers
```bash
docker-compose ps
```

### Vào trong container để debug
```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh

# Chatbot
docker-compose exec chatbot bash
```

## 📝 Lưu ý quan trọng

1. **MongoDB**: Docker Compose này không bao gồm MongoDB. Bạn cần:
   - Chạy MongoDB riêng (local hoặc cloud)
   - Cập nhật `MONGODB_URI` trong `backend/.env` để trỏ đến MongoDB instance của bạn

2. **Hot Reload**: Các services được cấu hình với volume mounts để hỗ trợ hot reload:
   - Thay đổi code trong `backend/` sẽ tự động reload backend
   - Thay đổi code trong `frontend/` sẽ tự động reload frontend
   - Thay đổi code trong `chatbot-deployment/` sẽ tự động reload chatbot

3. **Ports**: Đảm bảo các ports sau không bị chiếm bởi ứng dụng khác:
   - 3000 (Frontend)
   - 8080 (Backend)
   - 5000 (Chatbot)
   - 6379 (Redis)

4. **Environment Variables**: 
   - Backend đọc từ `backend/.env`
   - Frontend đọc từ `frontend/.env.local` (nếu có)
   - Chatbot sử dụng environment variables từ docker-compose.yml

## 🐛 Troubleshooting

### Container không khởi động được
```bash
# Xem logs chi tiết
docker-compose logs [service-name]

# Rebuild lại containers
docker-compose up --build --force-recreate
```

### Port đã được sử dụng
Thay đổi ports trong `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Thay vì 3000:3000
```

### Lỗi kết nối giữa services
Đảm bảo tất cả services đều trong cùng network `app-network`. Kiểm tra bằng:
```bash
docker network inspect my-todo-list-app_app-network
```

### Redis connection error
Kiểm tra backend có thể kết nối Redis:
```bash
docker-compose exec backend sh
# Trong container
ping redis
```

## 📚 Tài liệu thêm

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Backend ENV Setup](./backend/ENV_SETUP.md)
- [Redis Setup](./backend/REDIS_SETUP.md)


