# Todo List Backend API

Backend API cho hệ thống quản lý công việc (To-Do List System) đa nền tảng.

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary (planned)

## 📋 Prerequisites

Trước khi chạy project, đảm bảo bạn đã cài đặt:

- Node.js (v18 hoặc cao hơn)
- MongoDB (v6 hoặc cao hơn)
- npm hoặc yarn

## 🛠️ Installation

1. Clone repository và di chuyển vào thư mục backend:
```bash
cd backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

4. Cấu hình file `.env` với thông tin của bạn:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/todolist
NODE_ENV=development
JWT_SECRET=your_secret_key_here
```

## 🎯 Running the Application

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## 🧪 Testing

Test server đang chạy:
```bash
curl http://localhost:5000/health
```

Hoặc mở browser và truy cập: `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js  # MongoDB connection
│   │   ├── environment.js  # Environment variables
│   │   └── constants.js    # Application constants
│   ├── models/          # Mongoose models
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── middlewares/     # Custom middlewares
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── app.js           # Express app setup
├── server.js            # Entry point
├── .env                 # Environment variables (gitignored)
├── .env.example         # Environment template
└── package.json         # Dependencies
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Check server status

### Coming Soon
- Task Management APIs
- User Authentication APIs
- Group Management APIs
- Notifications APIs

## 📊 Development Progress

- [x] Phase 0: Project Setup & MongoDB Connection
- [ ] Phase 1: Create Task (FR-01)
- [ ] Phase 2: Update & Delete Task (FR-02)
- [ ] Phase 3: Multiple Views (FR-03)
- [ ] Phase 4-11: Advanced Features

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Kiểm tra MongoDB đang chạy
mongod --version

# Khởi động MongoDB (Windows)
net start MongoDB

# Khởi động MongoDB (Linux/Mac)
sudo systemctl start mongod
```

### Port Already in Use
```bash
# Thay đổi PORT trong file .env
PORT=5001
```

## 👥 Contributors

- Nhóm phát triển Todo List System

## 📝 License

MIT
