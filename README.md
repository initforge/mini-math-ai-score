# Hệ thống thi online thông minh với AI

Hệ thống quản lý và tổ chức thi trực tuyến với hỗ trợ AI, sử dụng React + Vite, Firebase Realtime Database và Cloud Functions.

## Tính năng chính

### 👨‍💼 Admin
- Dashboard với thống kê realtime
- Quản lý tài khoản giáo viên và học sinh
- Cấu hình hệ thống
- Xem logs hoạt động

### 👨‍🏫 Giáo viên
- Dashboard với lịch thi và thông báo
- Quản lý lớp học và học sinh (Import/Export Excel)
- Ngân hàng câu hỏi
- Ra đề thi với AI (từ file PDF/Word hoặc từ ngân hàng câu hỏi)
- Tổ chức thi và theo dõi realtime
- Xem kết quả, bảng điểm và AI insights

### 👨‍🎓 Học sinh
- Trang chủ với banner và lịch thi sắp tới
- Làm bài thi với countdown timer
- Xem lịch sử thi và điểm số
- AI giải thích câu trả lời sai
- Thống kê cá nhân với biểu đồ năng lực và AI gợi ý

## Công nghệ sử dụng

- **Frontend:** React 18 + Vite
- **Database:** Firebase Realtime Database
- **Backend:** Firebase Cloud Functions
- **AI:** Google Gemini API
- **UI/UX:** GSAP animations, modern design

## Bắt đầu nhanh

1. **Cài đặt dependencies:**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. **Cấu hình Firebase:**
   - File `.env` đã được cấu hình sẵn với Firebase config
   - Chỉ cần thêm `GEMINI_API_KEY` nếu muốn sử dụng Cloud Functions

3. **Import dữ liệu mẫu:**
   - Vào Firebase Console > Realtime Database > Import JSON
   - Chọn file `database-seed.json`

4. **Khởi động:**
   ```bash
   npm run dev
   ```

## Tài khoản mẫu

Sau khi import `database-seed.json`:

- **Admin:** `admin` / `admin123`
- **Giáo viên:** `teacher1` / `teacher123`
- **Học sinh:** `student1` / `student123`

## Cấu trúc project

```
├── src/
│   ├── components/      # React components
│   ├── services/        # Firebase & API services
│   ├── contexts/        # React contexts
│   ├── routes/          # Routing
│   └── styles/          # CSS files
├── functions/           # Cloud Functions
├── public/              # Static assets
├── database-seed.json   # Sample data
└── .env                 # Environment variables
```

## Tài liệu

- [IMAGE_ASSETS.md](./IMAGE_ASSETS.md) - Keywords và prompts cho ảnh

## License

ISC
