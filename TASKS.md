# ForecastAI - Project Tasks

## Thành viên & Phân công

| STT | Thành viên | Vai trò | Nhiệm vụ chính |
|-----|------------|---------|----------------|
| 1 | Backend Dev | Backend Developer | API, Database |
| 2 | Frontend Dev | Frontend Developer | Kết nối API, Fix UI |
| 3 | Leader | Leader/Coordinator | Test, Deploy, Manage |

---

## 📋 PHÂN CÔNG CÔNG VIỆC CHO TỪNG NGƯỜI

### 👨‍💻 THÀNH VIÊN 1: BACKEND DEVELOPER
**Nhiệm vụ chính:** Xây dựng API và kết nối Database

| Task | Mô tả | File liên quan |
|------|-------|----------------|
| 1.0.1 | Cài đặt XAMPP (MySQL) | - |
| 1.0.2 | Tạo database `forecastai` trong phpMyAdmin | - |
| 1.0.3 | Import file `database.sql` vào MySQL | `backend/src/models/database.sql` |
| 1.0.4 | Tạo file `.env` từ `.env.example` | `backend/.env` |
| 1.1 | Test kết nối MySQL | `backend/src/models/db.js` |
| 1.2 | Viết Auth API (Login/Logout) | `backend/src/routes/auth.js` |
| 1.3 | Viết Products API (CRUD) | `backend/src/routes/products.js` |
| 1.4 | Viết Sales API | `backend/src/routes/sales.js` |
| 1.5 | Viết Purchase Orders API | `backend/src/routes/orders.js` |

**Deadline:** 1 tuần

---

### 👨‍💻 THÀNH VIÊN 2: FRONTEND DEVELOPER
**Nhiệm vụ chính:** Kết nối HTML với Backend API

| Task | Mô tả | File liên quan |
|------|-------|----------------|
| 2.1 | Sửa Login gọi API Auth | `html-version/assets/js/pages/login.js` |
| 2.2 | Sửa Products gọi API | `html-version/assets/js/pages/products.js` |
| 2.3 | Sửa Dashboard gọi API | `html-version/assets/js/pages/dashboard.js` |
| 2.4 | Sửa Sales Data gọi API | `html-version/assets/js/pages/sales-data.js` |
| 2.5 | Sửa Users gọi API | `html-version/assets/js/pages/users.js` |
| 2.6 | Xử lý Authentication (Token) | Tất cả file JS |

**Deadline:** 1 tuần (sau khi Backend xong)

---

### 👨‍💻 THÀNH VIÊN 3: LEADER
**Nhiệm vụ chính:** Quản lý và Deploy

| Task | Mô tả | File liên quan |
|------|-------|----------------|
| 3.1 | Test toàn bộ hệ thống | Tất cả |
| 3.2 | Fix bugs | - |
| 3.3 | Deploy Backend (Render) | `backend/` |
| 3.4 | Deploy Frontend (Netlify) | `html-version/` |
| 3.5 | Viết README hướng dẫn | `README.md` |

**Deadline:** Sau khi 2 thành viên kia xong

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