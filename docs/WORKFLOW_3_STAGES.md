# Workflow 3 Giai Đoạn - Parse Đề Thi Thông Minh

## Tổng Quan

Workflow mới chia thành **3 màn hình riêng biệt** để xử lý đề thi một cách có hệ thống:

1. **Màn hình 1: Parse đề thi** - Extract text + hình ảnh
2. **Màn hình 2: Upload đáp án trắc nghiệm** - Match với câu hỏi
3. **Màn hình 3: Upload đáp án tự luận** - Lưu ảnh để chấm bài

---

## Màn Hình 1: Parse Đề Thi

### Chức năng:
- Upload file đề thi (DOCX/PDF)
- AI parse text từ file
- AI detect và extract hình ảnh từ file
- Hiển thị preview:
  - Ảnh nguyên đề thi (full page)
  - Danh sách hình ảnh đã extract (ảnh 1, ảnh 2, ...)
- User mapping: "Ảnh 1 là của câu X - phần Y"
- AI tự động lắp ghép: Text + Ảnh vào đúng câu hỏi

### Luồng xử lý:
```
1. User upload file đề (DOCX/PDF)
2. AI parse text → questions array
3. AI detect hình ảnh trong file → extract ra base64
4. Hiển thị preview:
   - Danh sách câu hỏi (text)
   - Danh sách hình ảnh (ảnh 1, ảnh 2, ...)
5. User map hình ảnh:
   - Chọn ảnh 1 → Chọn câu hỏi + phần
   - Chọn ảnh 2 → Chọn câu hỏi + phần
   - ...
6. AI lắp ghép:
   - Thêm imageUrl vào question object
   - question.images = ["base64_image_1", "base64_image_2"]
7. Lưu vào Firebase:
   - questions: { content, images: [base64], ... }
   - images: { imageId, base64, questionId, part }
```

### Cấu trúc dữ liệu:
```javascript
question = {
  id: "q1",
  part: "I",
  partName: "PHẦN I",
  questionNumber: 1,
  type: "multiple_choice",
  content: "Câu hỏi text...",
  options: ["A. ...", "B. ..."],
  images: [
    {
      imageId: "img1",
      base64: "data:image/png;base64,...",
      questionId: "q1",
      part: "I",
      questionNumber: 1
    }
  ],
  correctAnswer: "A"
}
```

---

## Màn Hình 2: Upload Đáp Án Trắc Nghiệm

### Chức năng:
- Upload file đáp án trắc nghiệm (Excel)
- AI parse và match với câu hỏi đã tạo ở màn hình 1
- Hiển thị preview: Câu hỏi + Đáp án đã match
- User confirm và lưu

### Luồng xử lý:
```
1. User upload file Excel đáp án
2. AI parse đáp án theo mã đề
3. Match với questions từ màn hình 1:
   - part + questionNumber
4. Update correctAnswer cho mỗi question
5. Hiển thị preview
6. User confirm → Lưu vào Firebase
```

---

## Màn Hình 3: Upload Đáp Án Tự Luận

### Chức năng:
- Upload ảnh đáp án tự luận (có thể nhiều ảnh)
- Map với câu hỏi tự luận (essay questions)
- Lưu ảnh base64 vào Firebase
- Dùng để chấm bài tự luận của học sinh (học sinh nộp ảnh)

### Luồng xử lý:
```
1. User upload ảnh đáp án tự luận
2. User map: "Ảnh này là đáp án câu X - phần IV"
3. Lưu vào Firebase:
   essayAnswers: {
     questionId: "q10",
     part: "IV",
     questionNumber: 1,
     answerImages: [
       {
         imageId: "essay_img1",
         base64: "data:image/png;base64,...",
         questionId: "q10",
         part: "IV",
         questionNumber: 1
       }
     ]
   }
4. Dùng để chấm bài:
   - Học sinh nộp ảnh bài làm
   - So sánh với answerImages
```

---

## Lưu Trữ Firebase

### Cấu trúc:
```javascript
// Questions với hình ảnh
questions: {
  q1: {
    content: "...",
    images: ["base64_img1", "base64_img2"], // Chỉ lưu hình minh họa
    ...
  }
}

// Essay answers (ảnh đáp án tự luận)
essayAnswers: {
  q10: {
    questionId: "q10",
    answerImages: ["base64_essay1", "base64_essay2"]
  }
}
```

### Lưu ý:
- ✅ **Lưu**: Hình minh họa trong câu hỏi (base64)
- ✅ **Lưu**: Ảnh đáp án tự luận (base64)
- ❌ **KHÔNG lưu**: Ảnh toàn bộ đề thi (chỉ dùng để preview)

---

## AI Xử Lý

### Extract hình ảnh từ file:
- **PDF**: Extract images từ PDF pages
- **DOCX**: Extract images từ word/media/ folder
- Convert sang base64
- Detect vị trí hình trong câu hỏi (AI)

### Lắp ghép tự động:
- AI detect: "Hình này thuộc câu nào?"
- User confirm: Map thủ công nếu AI không chắc
- Lưu vào question.images

---

## UI/UX

### Màn hình 1:
- Upload file
- Preview: Text questions + Extracted images
- Mapping tool: Drag & drop hoặc select
- Progress: "Đang extract hình ảnh...", "Đang lắp ghép..."

### Màn hình 2:
- Upload Excel
- Preview: Questions + Answers matched
- Confirm button

### Màn hình 3:
- Upload images
- Preview: Essay questions + Answer images
- Mapping tool
- Confirm button

