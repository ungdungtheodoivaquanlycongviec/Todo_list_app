# Hướng dẫn cấu hình .env cho Backend

## Tạo file .env

1. Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

Hoặc tạo file `.env` mới và copy nội dung từ `.env.example`

## Cấu hình Redis

### Nếu chạy Redis bằng Docker (khuyến nghị):

Thêm vào file `.env`:

```env
# Redis Configuration
ENABLE_SOCKET_REDIS_ADAPTER=true
REDIS_URL=redis://localhost:6379
```

### Nếu Redis có password:

```env
ENABLE_SOCKET_REDIS_ADAPTER=true
REDIS_URL=redis://:your_password@localhost:6379
```

### Nếu Redis trên server khác:

```env
ENABLE_SOCKET_REDIS_ADAPTER=true
REDIS_URL=redis://your-redis-server:6379
```

Hoặc dùng các biến riêng:

```env
ENABLE_SOCKET_REDIS_ADAPTER=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_TLS=false
```

### Nếu không dùng Redis (chỉ 1 server, không cần scaling):

```env
ENABLE_SOCKET_REDIS_ADAPTER=false
```

⚠️ **Lưu ý**: Nếu không bật Redis adapter, tính năng chat real-time vẫn hoạt động nhưng chỉ trên 1 server. Khi scale ra nhiều server thì cần Redis.

## Các biến môi trường quan trọng cho Chat

### Bắt buộc:
- `ENABLE_SOCKET_REDIS_ADAPTER=true` - Bật Redis adapter
- `REDIS_URL=redis://localhost:6379` - URL kết nối Redis

### Tùy chọn:
- `SOCKET_NAMESPACE=/ws/app` - Namespace cho Socket.IO (mặc định)
- `SOCKET_ALLOWED_ORIGINS=http://localhost:3000` - Các origin được phép (frontend URLs)
- `SOCKET_HEARTBEAT_INTERVAL_MS=25000` - Interval kiểm tra connection (25 giây)

## Kiểm tra cấu hình

Sau khi cấu hình, khởi động backend:

```bash
npm run dev
```

Bạn sẽ thấy log:
```
[Realtime] Redis adapter enabled for Socket.IO
[Realtime] Chat handlers registered.
```

Nếu có lỗi kết nối Redis:
```
[Realtime] Redis client error: connect ECONNREFUSED 127.0.0.1:6379
```

→ Hãy đảm bảo Redis đang chạy:
```bash
docker ps  # Kiểm tra container Redis
# hoặc
redis-cli ping  # Kiểm tra Redis trực tiếp
```

## Template .env đầy đủ

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/todolist

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this
JWT_REFRESH_EXPIRES_IN=30d

# Realtime & Socket.IO
ENABLE_REALTIME_NOTIFICATIONS=true

# Redis (cho Socket.IO adapter và chat)
ENABLE_SOCKET_REDIS_ADAPTER=true
REDIS_URL=redis://localhost:6379

# Socket.IO
SOCKET_NAMESPACE=/ws/app
SOCKET_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Cloudinary (nếu dùng upload file/ảnh)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

