# ForecastAI - Project Tasks

## Thành viên & Phân công

| STT | Thành viên | Vai trò | Nhiệm vụ chính |
|-----|------------|---------|----------------|
| 1 | ? | Backend Developer | API, Database |
| 2 | ? | Frontend Developer | Kết nối API, Fix UI |
| 3 | ? | Leader/Coordinator | Test, Deploy, Manage |

---

## Sprint 1: Hoàn thiện Backend API (MySQL)

### Task 1.0: Setup MySQL Database
- [ ] Cài đặt MySQL (dùng XAMPP hoặc MySQL Installer)
- [ ] Tạo database: chạy file `backend/src/models/database.sql`
- [ ] Tạo file `.env` từ `backend/.env.example`
- [ ] Cập nhật `backend/package.json` thêm `mysql2` và `dotenv`

### Task 1.1: Database Connection
- [ ] Cài đặt: `npm install mysql2 dotenv`
- [ ] Test kết nối database

### Task 1.2: Auth API
- [ ] Tạo `User` model
- [ ] API Login: `POST /api/auth/login`
- [ ] API Logout: `POST /api/auth/logout`
- [ ] Middleware xác thực JWT

### Task 1.3: Products API
- [ ] Tạo `Product` model
- [ ] API Get all: `GET /api/products`
- [ ] API Get by ID: `GET /api/products/:id`
- [ ] API Create: `POST /api/products`
- [ ] API Update: `PUT /api/products/:id`
- [ ] API Delete: `DELETE /api/products/:id`

### Task 1.4: Sales Data API
- [ ] Tạo `Sales` model
- [ ] API Get sales data
- [ ] API Import sales data

---

## Sprint 2: Kết nối Frontend với Backend

### Task 2.1: Update Login
- [ ] Sửa `login.js` gọi API `/api/auth/login`
- [ ] Lưu token vào localStorage
- [ ] Chuyển hướng sau login thành công

### Task 2.2: Update Products Page
- [ ] Sửa `products.js` gọi API `/api/products`
- [ ] Thêm loading state
- [ ] Xử lý error

### Task 2.3: Update Dashboard
- [ ] Sửa `dashboard.js` gọi API lấy dữ liệu dự báo
- [ ] Kết nối Chart.js với API

### Task 2.4: Authentication
- [ ] Thêm token vào header các API call
- [ ] Xử lý token hết hạn
- [ ] Chặn truy cập khi chưa login

---

## Sprint 3: Deploy & Testing

### Task 3.1: Deploy Backend
- [ ] Deploy lên Render.com hoặc Railway
- [ ] Cập nhật CORS settings
- [ ] Test API trên production

### Task 3.2: Deploy Frontend
- [ ] Deploy HTML lên Netlify hoặc Vercel
- [ ] Cập đường dẫn API trong code

### Task 3.3: Testing
- [ ] Test toàn bộ flow
- [ ] Fix bugs
- [ ] Tối ưu performance

---

## Cách chạy dự án

### Backend
```bash
cd backend
npm install
npm run dev
# Server chạy tại http://localhost:5000
```

### Frontend (HTML)
```bash
cd html-version
# Mở index.html trong trình duyệt
# Hoặc chạy: python -m http.server 8080
```

---

## Liên hệ
- GitHub Repo: https://github.com/Le-Van-Dai-17/ThucTapCoSo