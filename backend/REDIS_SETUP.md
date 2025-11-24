# Hướng dẫn cài đặt Redis

## Windows - Cách 1: Sử dụng Docker (KHUYẾN NGHỊ - Dễ nhất)

### Bước 1: Cài đặt Docker Desktop
1. Tải Docker Desktop từ: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop

### Bước 2: Chạy Redis bằng Docker
Mở terminal/PowerShell trong thư mục `backend` và chạy:

```bash
docker-compose -f docker-compose.redis.yml up -d
```

Hoặc nếu file docker-compose đã có sẵn, chỉ cần:

```bash
docker-compose up -d redis
```

### Bước 3: Kiểm tra Redis đã chạy
```bash
docker ps
```

Bạn sẽ thấy container Redis đang chạy.

### Bước 4: Test kết nối
```bash
docker exec -it redis redis-cli ping
```

Nếu trả về `PONG` thì Redis đã hoạt động tốt!

---

## Windows - Cách 2: Sử dụng WSL2 (Linux Subsystem)

### Bước 1: Cài đặt WSL2
1. Mở PowerShell với quyền Administrator
2. Chạy lệnh:
```powershell
wsl --install
```
3. Khởi động lại máy

### Bước 2: Cài đặt Redis trong WSL2
Mở Ubuntu terminal và chạy:

```bash
# Cập nhật packages
sudo apt update

# Cài đặt Redis
sudo apt install redis-server -y

# Khởi động Redis
sudo service redis-server start

# Kiểm tra Redis
redis-cli ping
```

### Bước 3: Cấu hình Redis tự động khởi động
```bash
sudo systemctl enable redis-server
```

---

## Windows - Cách 3: Memurai (Redis tương thích cho Windows)

### Bước 1: Tải Memurai
Tải từ: https://www.memurai.com/get-memurai

### Bước 2: Cài đặt Memurai
Chạy file cài đặt và làm theo hướng dẫn

### Bước 3: Khởi động Memurai
Memurai sẽ tự động chạy như một Windows service

### Bước 4: Test kết nối
```bash
# Cài đặt redis-cli cho Windows hoặc sử dụng Memurai CLI
memurai-cli ping
```

---

## macOS

### Bước 1: Cài đặt Homebrew (nếu chưa có)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Bước 2: Cài đặt Redis
```bash
brew install redis
```

### Bước 3: Khởi động Redis
```bash
brew services start redis
```

Hoặc chạy tạm thời:
```bash
redis-server
```

### Bước 4: Test kết nối
```bash
redis-cli ping
```

---

## Linux (Ubuntu/Debian)

### Bước 1: Cài đặt Redis
```bash
sudo apt update
sudo apt install redis-server -y
```

### Bước 2: Khởi động Redis
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Bước 3: Test kết nối
```bash
redis-cli ping
```

---

## Cấu hình Redis cho Project

Sau khi cài đặt Redis, cấu hình trong file `.env` của backend:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# Socket.IO với Redis Adapter
REALTIME_ENABLE_REDIS_ADAPTER=true
REALTIME_REDIS_URL=redis://localhost:6379
```

Hoặc nếu dùng Docker:
```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
```

---

## Sử dụng Redis trong Docker Compose

File `docker-compose.redis.yml` đã có sẵn, bạn có thể sử dụng:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis_data:
```

Chạy bằng lệnh:
```bash
docker-compose -f docker-compose.redis.yml up -d
```

---

## Kiểm tra Redis hoạt động

### Test từ command line:
```bash
# Windows với Docker
docker exec -it redis redis-cli

# Linux/macOS
redis-cli
```

Trong Redis CLI:
```redis
# Test ping
ping
# Kết quả: PONG

# Set một giá trị
set test "Hello Redis"
# Kết quả: OK

# Get giá trị
get test
# Kết quả: "Hello Redis"

# Thoát
exit
```

---

## Troubleshooting

### Redis không khởi động được (Windows)
- Sử dụng Docker (Cách 1) - Dễ nhất và ổn định nhất
- Hoặc cài Memurai thay cho Redis

### Port 6379 đã được sử dụng
```bash
# Windows
netstat -ano | findstr :6379

# Linux/macOS
lsof -i :6379
```

Đổi port trong file `.env`:
```env
REDIS_PORT=6380
```

### Redis không kết nối được từ ứng dụng
- Kiểm tra Redis đang chạy: `docker ps` hoặc `redis-cli ping`
- Kiểm tra firewall không chặn port 6379
- Kiểm tra file `.env` có cấu hình đúng không

---

## Dừng Redis

### Docker:
```bash
docker-compose -f docker-compose.redis.yml down
```

### Service (Linux/macOS):
```bash
sudo systemctl stop redis-server
```

### Homebrew (macOS):
```bash
brew services stop redis
```

---

## Khuyến nghị

**Cho Windows:** Sử dụng Docker (Cách 1) - Đơn giản, ổn định, dễ quản lý

**Cho macOS/Linux:** Sử dụng package manager (Homebrew/apt) - Tích hợp tốt với hệ thống

