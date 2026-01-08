# Phân Tích Khả Năng AI Parse Sai

## So Sánh PDF vs DOCX

### PDF (Portable Document Format)
**Ưu điểm:**
- ✅ **Giữ nguyên format**: Layout, font, ký hiệu toán học được preserve hoàn toàn
- ✅ **Gemini hỗ trợ tốt**: Google Gemini được train tốt trên PDF, OCR tốt
- ✅ **Không mất ký hiệu**: Công thức toán, ký hiệu đặc biệt được giữ nguyên
- ✅ **Ổn định hơn**: Ít lỗi parse hơn DOCX

**Nhược điểm:**
- ⚠️ **File lớn hơn**: PDF thường lớn hơn DOCX
- ⚠️ **Khó edit**: Nếu cần sửa file gốc, PDF khó edit hơn
- ⚠️ **Vẫn có thể sai**: AI vẫn có thể parse sai nếu:
  - PDF scan từ ảnh (OCR có thể sai)
  - Layout phức tạp (nhiều cột, bảng)
  - Font không chuẩn

**Độ chính xác ước tính:**
- PDF text-based: **90-95%** chính xác
- PDF scan (OCR): **70-85%** chính xác

---

### DOCX (Microsoft Word)
**Ưu điểm:**
- ✅ **Dễ edit**: Có thể sửa file gốc dễ dàng
- ✅ **File nhỏ hơn**: DOCX thường nhỏ hơn PDF

**Nhược điểm:**
- ❌ **Mất format khi extract**: Khi extract text từ DOCX → mất layout, format
- ❌ **Ký hiệu toán học**: OMath/MathML có thể bị mất hoặc sai
- ❌ **Gemini không hỗ trợ trực tiếp**: Phải extract text → gửi text/plain → mất thông tin
- ❌ **Phức tạp hơn**: Cần parse XML, decode entities, handle OMath

**Độ chính xác ước tính:**
- DOCX với extract text tốt: **75-85%** chính xác
- DOCX với extract text cơ bản: **60-75%** chính xác

---

## Kết Luận

### PDF ỔN HƠN DOCX cho AI Parsing

**Lý do:**
1. **Gemini hỗ trợ PDF tốt hơn**: Được train trên PDF, OCR tốt
2. **Giữ nguyên format**: Không mất ký hiệu toán học
3. **Độ chính xác cao hơn**: 90-95% vs 75-85%
4. **Ít lỗi hơn**: Ít bị mất ký hiệu, format

### Nhưng VẪN CÓ THỂ SAI

**Ngay cả với PDF, AI vẫn có thể sai:**
- ❌ Đếm sai số câu hỏi (21 câu → 29-30 câu)
- ❌ Parse sai format (tách câu đúng/sai thành nhiều câu)
- ❌ Bỏ sót câu hỏi
- ❌ Parse sai đáp án (match sai mã đề)
- ❌ Mất ký hiệu toán học (nếu PDF scan chất lượng kém)

---

## Giải Pháp Đề Xuất

### 1. Validation Sau Khi Parse
```javascript
// Đếm số câu hỏi trong file gốc (ước tính)
const expectedCount = estimateQuestionCount(fileContent);

// So sánh với số câu parse được
if (Math.abs(questions.length - expectedCount) > 2) {
  // Cảnh báo: Số câu hỏi không khớp
  showWarning(`Số câu hỏi parse được (${questions.length}) khác với ước tính (${expectedCount}). Vui lòng kiểm tra lại.`);
}
```

### 2. Manual Review & Edit
- ✅ **Preview step** (đã có): Cho phép xem và chọn câu hỏi
- ✅ **Edit từng câu**: Cho phép sửa nội dung, đáp án
- ✅ **Xóa câu sai**: Cho phép xóa câu parse sai
- ✅ **Thêm câu thiếu**: Cho phép thêm câu bị bỏ sót

### 3. Convert DOCX → PDF (Nếu Có Thể)
- Nếu user upload DOCX → convert sang PDF trước khi parse
- Giữ nguyên format, tăng độ chính xác

### 4. Fallback: Manual Input
- Nếu AI parse sai quá nhiều → cho phép nhập tay
- Hoặc parse lại với prompt khác

---

## Khuyến Nghị

1. **Ưu tiên PDF**: Khuyến khích user upload PDF thay vì DOCX
2. **Validation**: Thêm validation số câu hỏi sau khi parse
3. **Manual Review**: Luôn có preview step để user kiểm tra và sửa
4. **Edit Capability**: Cho phép edit từng câu hỏi sau khi parse
5. **Warning**: Cảnh báo nếu số câu hỏi không khớp

