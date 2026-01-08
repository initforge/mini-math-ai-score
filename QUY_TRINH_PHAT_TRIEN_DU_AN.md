# QUY TRÌNH PHÁT TRIỂN DỰ ÁN
**Hệ thống thi trực tuyến tích hợp Trí tuệ nhân tạo (AI)**

---

## BƯỚC 1: NGHIÊN CỨU VÀ XÁC ĐỊNH VẤN ĐỀ

### 1.1. Quan sát thực tế
Chúng em nhận thấy các thầy cô giáo tại trường gặp rất nhiều khó khăn trong việc tổ chức kiểm tra:
- Phải ngồi gõ lại từng câu hỏi từ đề thi giấy lên Google Forms hoặc Excel, mất hàng tiếng đồng hồ.
- Chấm bài tự luận phải đọc từng bài, so sánh với đáp án, ghi điểm thủ công - rất mệt mỏi và dễ sai sót.
- Muốn thống kê xem cả lớp yếu phần nào thì phải tự tổng hợp bằng tay.

### 1.2. Đặt câu hỏi nghiên cứu
> *"Làm thế nào để máy tính có thể 'nhìn' được đề thi trên giấy và tự động chấm điểm giúp thầy cô?"*

### 1.3. Tìm hiểu công nghệ
Chúng em đã nghiên cứu các công nghệ hiện có:
- **Trí tuệ nhân tạo (AI)**: Đặc biệt là Google Gemini - một AI mới ra mắt của Google, có khả năng "đọc hiểu" hình ảnh và văn bản rất tốt, hỗ trợ tiếng Việt, và quan trọng là **miễn phí** cho mục đích học tập.
- **Lập trình Web**: Tìm hiểu ReactJS - một thư viện JavaScript phổ biến để xây dựng giao diện web hiện đại.
- **Cơ sở dữ liệu đám mây**: Firebase của Google - lưu trữ dữ liệu trên "đám mây", không cần thuê máy chủ riêng.

### 1.4. Xác định mục tiêu cụ thể
1. Xây dựng hệ thống web cho phép giáo viên **chụp ảnh đề thi** → AI tự động nhận diện và tạo thành đề thi điện tử.
2. Học sinh làm bài trực tiếp trên web hoặc **chụp ảnh bài làm tay** tải lên.
3. Hệ thống **tự động chấm điểm** trắc nghiệm và **AI hỗ trợ chấm** phần tự luận.
4. Tự động **thống kê kết quả**, vẽ biểu đồ phân tích.

---

## BƯỚC 2: THIẾT KẾ HỆ THỐNG

### 2.1. Thiết kế kiến trúc tổng thể
Chúng em vẽ sơ đồ mô tả cách các thành phần kết nối với nhau:

```
┌─────────────────────┐
│   Người dùng        │  (Giáo viên / Học sinh)
│   (Trình duyệt)     │
└──────────┬──────────┘
           │ Truy cập web
           ▼
┌─────────────────────┐
│   Giao diện Web     │  ← Viết bằng ReactJS + Vite
│   (Frontend)        │
└──────────┬──────────┘
           │ Gửi/Nhận dữ liệu
           ▼
┌─────────────────────┐
│   Firebase          │
│   - Database        │  ← Lưu người dùng, đề thi, điểm số
│   - Cloud Functions │  ← Xử lý logic phức tạp
└──────────┬──────────┘
           │ Gọi API
           ▼
┌─────────────────────┐
│   Google Gemini AI  │  ← Nhận diện ảnh, chấm điểm tự luận
└─────────────────────┘
```

### 2.2. Thiết kế cơ sở dữ liệu
Xác định cần lưu trữ những thông tin gì:
- **users**: Thông tin tài khoản (tên, mật khẩu, vai trò: admin/giáo viên/học sinh)
- **classes**: Danh sách lớp học
- **exams**: Đề thi (tiêu đề, câu hỏi, thời gian, điểm số)
- **examSessions**: Phiên thi của học sinh (bài làm, điểm, thời gian nộp)

### 2.3. Thiết kế giao diện người dùng (UI/UX)
Vẽ phác thảo các màn hình chính:
- **Trang đăng nhập**: Đơn giản, rõ ràng
- **Dashboard Giáo viên**: Hiển thị lịch thi, nút tạo đề mới, xem kết quả
- **Phòng thi Học sinh**: Giao diện làm bài với đồng hồ đếm ngược, danh sách câu hỏi
- **Trang kết quả**: Hiển thị điểm số, biểu đồ phân tích

### 2.4. Thiết kế quy trình xử lý AI
Vẽ sơ đồ chi tiết cách AI sẽ hoạt động:

**Quy trình tạo đề từ ảnh:**
```
Ảnh đề thi (JPG/PNG)
       ↓
[Gửi lên Firebase Cloud Function]
       ↓
[Cloud Function gọi Google Gemini API]
       ↓
[Gemini phân tích: OCR + Hiểu ngữ nghĩa]
       ↓
[Trả về JSON: {câu 1: "...", đáp án A/B/C/D, ...}]
       ↓
[Hiển thị để GV kiểm tra, chỉnh sửa nếu cần]
       ↓
[Lưu vào Database thành đề thi chính thức]
```

---

## BƯỚC 3: LẬP TRÌNH VÀ XÂY DỰNG

### 3.1. Thiết lập môi trường phát triển
- Cài đặt **Node.js** phiên bản 18 (để chạy JavaScript trên máy tính).
- Cài đặt **VS Code** (công cụ viết code).
- Khởi tạo dự án React bằng lệnh: `npm create vite@latest` để tạo khung dự án.
- Tạo project **Firebase** trên Google Cloud Console, lấy API key.

### 3.2. Xây dựng giao diện (Frontend)
Chúng em chia giao diện thành nhiều **component** (thành phần) riêng biệt để dễ quản lý:

| Component | Chức năng |
|-----------|-----------|
| `LoginPage.jsx` | Trang đăng nhập cho người dùng |
| `TeacherDashboard.jsx` | Trang chủ của giáo viên |
| `StudentDashboard.jsx` | Trang chủ của học sinh |
| `ExamRoom.jsx` | Phòng thi trực tuyến với đồng hồ đếm ngược |
| `Step1UploadExam.jsx` | Bước 1 tạo đề: Tải ảnh đề thi lên |
| `Step2UploadAnswers.jsx` | Bước 2 tạo đề: Tải file Excel đáp án |
| `MathRenderer.jsx` | Component hiển thị công thức toán học (dùng KaTeX) |

**Các thư viện hỗ trợ đã sử dụng:**
- `react-router-dom`: Điều hướng giữa các trang
- `katex`: Hiển thị công thức toán học đẹp mắt
- `xlsx`: Đọc file Excel đáp án
- `gsap`: Tạo hiệu ứng animation mượt mà

### 3.3. Xây dựng Backend (Firebase Cloud Functions)
Viết các hàm xử lý phía server:

**Hàm `generateQuizFromImage`:**
- Nhận ảnh đề thi từ Frontend
- Chuyển ảnh thành base64
- Gửi đến Google Gemini API với prompt (câu lệnh) yêu cầu AI:
  > *"Hãy phân tích hình ảnh này, đây là một đề thi. Hãy trích xuất từng câu hỏi, các đáp án, và định dạng thành JSON..."*
- Nhận kết quả JSON từ AI, trả về Frontend

**Hàm `gradeEssayFromImage`:**
- Nhận ảnh bài làm tự luận của học sinh
- Nhận đề bài và đáp án mẫu
- Gửi đến Gemini với prompt yêu cầu chấm điểm:
  > *"Đây là bài làm của học sinh cho câu hỏi: [đề bài]. Đáp án mẫu là: [đáp án]. Hãy chấm điểm từ 0-10 và đưa ra nhận xét..."*
- Trả về điểm số và nhận xét

### 3.4. Kết nối các thành phần
- Frontend gọi Cloud Functions thông qua HTTP request
- Cloud Functions xử lý và lưu kết quả vào Firebase Realtime Database
- Database tự động đồng bộ dữ liệu về Frontend theo thời gian thực (realtime)

### 3.5. Xử lý các vấn đề kỹ thuật phát sinh
Trong quá trình lập trình, chúng em gặp và giải quyết nhiều vấn đề:

| Vấn đề | Giải pháp |
|--------|-----------|
| AI đọc sai công thức toán | Điều chỉnh prompt, yêu cầu AI trả về dạng LaTeX |
| Ảnh chất lượng thấp, AI không nhận diện được | Thêm hướng dẫn cho người dùng chụp ảnh rõ nét |
| Đồng hồ đếm ngược chạy sai khi đổi tab | Sử dụng `Date.now()` thay vì `setInterval` đơn thuần |
| Công thức toán không hiển thị đúng | Tích hợp thêm thư viện KaTeX để render LaTeX |

---

## BƯỚC 4: KIỂM THỬ VÀ ĐÁNH GIÁ

### 4.1. Tự kiểm thử nội bộ
Nhóm tự đóng vai các đối tượng người dùng để kiểm tra:
- Đăng nhập với từng loại tài khoản (Admin, Giáo viên, Học sinh)
- Tạo đề thi từ ảnh, kiểm tra xem AI nhận diện có chính xác không
- Làm bài thi, nộp bài, xem kết quả
- Kiểm tra trên cả máy tính và điện thoại

### 4.2. Thử nghiệm với người dùng thực
Chúng em nhờ các bạn học sinh trong lớp và một số thầy cô giáo bộ môn dùng thử:
- Mời 15 bạn học sinh lớp 11 tham gia thi thử môn Toán
- Nhờ 2 thầy cô tạo đề thi từ ảnh đề kiểm tra thật
- Thu thập ý kiến phản hồi qua Google Forms

**Kết quả thu được:**
- Độ chính xác nhận diện câu hỏi từ ảnh: **80-85%** (với ảnh rõ nét)
- Độ chính xác chấm trắc nghiệm: **100%** (so sánh với file Excel đáp án)
- Thời gian tạo đề: Giảm từ **30-60 phút** xuống còn **5-10 phút**
- Phản hồi tích cực: Giao diện dễ sử dụng, đồng hồ đếm ngược rõ ràng

### 4.3. Sửa lỗi và tối ưu hóa
Dựa trên phản hồi, chúng em đã cải tiến:
- Thêm bước preview để giáo viên kiểm tra lại trước khi lưu đề
- Tối ưu giao diện cho màn hình điện thoại (responsive design)
- Thêm cảnh báo khi sắp hết giờ làm bài (còn 5 phút, 1 phút)
- Cải thiện tốc độ tải trang bằng kỹ thuật lazy loading

---

## BƯỚC 5: HOÀN THIỆN VÀ VIẾT BÁO CÁO

### 5.1. Hoàn thiện tài liệu
- Viết file README hướng dẫn cài đặt và sử dụng
- Viết báo cáo khoa học theo cấu trúc chuẩn
- Chuẩn bị slide thuyết trình

### 5.2. Đóng gói và triển khai
- Deploy (triển khai) website lên Firebase Hosting
- Tạo tài khoản mẫu để demo
- Chuẩn bị dữ liệu mẫu (đề thi, lớp học, học sinh)

### 5.3. Chuẩn bị trả lời phản biện
Dự đoán và chuẩn bị câu trả lời cho các câu hỏi giám khảo có thể hỏi:

| Câu hỏi dự đoán | Hướng trả lời |
|-----------------|---------------|
| "AI chấm tự luận có chính xác không?" | "Dạ, AI đưa ra điểm tham khảo, giáo viên có thể điều chỉnh. Độ chính xác phụ thuộc chất lượng ảnh bài làm." |
| "Nếu mất mạng giữa chừng thì sao?" | "Hệ thống tự động lưu bài làm sau mỗi câu trả lời, khi kết nối lại sẽ khôi phục được." |
| "Chi phí vận hành bao nhiêu?" | "Firebase và Gemini API đều có gói miễn phí đủ dùng cho quy mô trường học. Chỉ tốn tiền khi mở rộng lớn." |
| "Khó khăn lớn nhất là gì?" | "Việc điều chỉnh prompt cho AI nhận diện chính xác công thức toán học. Phải thử nghiệm rất nhiều lần." |

---

## TÓM TẮT THỜI GIAN THỰC HIỆN

| Giai đoạn | Thời gian | Công việc chính |
|-----------|-----------|-----------------|
| Nghiên cứu | 2 tuần | Tìm hiểu công nghệ, xác định yêu cầu |
| Thiết kế | 1 tuần | Vẽ sơ đồ, thiết kế giao diện, database |
| Lập trình | 4 tuần | Viết code Frontend, Backend, tích hợp AI |
| Kiểm thử | 2 tuần | Test nội bộ, thử nghiệm với người dùng, sửa lỗi |
| Hoàn thiện | 1 tuần | Viết báo cáo, chuẩn bị thuyết trình |
| **Tổng cộng** | **~10 tuần** | |

---

*Tài liệu này mô tả quy trình thực tế mà nhóm đã thực hiện để hoàn thành dự án.*
