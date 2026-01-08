# Cấu trúc dữ liệu Thống kê học sinh

## Database Structure

### 1. studentStats/{studentId}
```json
{
  "studentId": "student123",
  "lastUpdated": 1704240000000,
  "overallStats": {
    "totalExamsTaken": 15,
    "averageScore": 7.5,
    "multipleChoiceAccuracy": 0.85,
    "essayAverageScore": 7.2
  },
  "partStats": {
    "I": { "averageScore": 8.5, "totalQuestions": 50, "correctAnswers": 42 },
    "II": { "averageScore": 7.0, "totalQuestions": 30, "correctAnswers": 21 },
    "III": { "averageScore": 6.5, "totalQuestions": 20, "correctAnswers": 13 },
    "IV": { "averageScore": 7.5, "totalQuestions": 15, "essayTotalPoints": 15, "essayEarnedPoints": 11.25 }
  },
  "weaknesses": [
    {
      "part": "III",
      "topic": "Hình học không gian",
      "frequency": 8,
      "lastDetected": 1704240000000
    }
  ],
  "aiSuggestions": [
    {
      "message": "Em đang yếu phần III - Hình học không gian. Nên ôn thêm về khối đa diện và thể tích.",
      "priority": "high",
      "generatedAt": 1704240000000
    }
  ]
}
```

### 2. examResults/{resultId}
```json
{
  "studentId": "student123",
  "examId": "exam456",
  "submittedAt": 1704240000000,
  "gradedAt": 1704250000000,
  "scores": {
    "multipleChoice": 8.5,
    "essay": 7.0,
    "total": 7.75
  },
  "breakdown": {
    "partI": { "score": 8.5, "maxScore": 10 },
    "partII": { "score": 7.0, "maxScore": 10 },
    "partIII": { "score": 6.5, "maxScore": 10 },
    "partIV": { "score": 7.5, "maxScore": 10, "essayDetails": {...} }
  },
  "aiAnalysis": {
    "weakPoints": ["Hình học không gian", "Lượng giác"],
    "suggestions": "Em nên ôn thêm về...",
    "generatedAt": 1704250000000
  }
}
```

## API Flow

### Khi chấm bài xong:
1. Lưu `examResults` với breakdown chi tiết
2. Gọi AI để phân tích điểm yếu
3. Cập nhật `studentStats` với:
   - Thêm điểm mới vào partStats
   - Cập nhật weaknesses
   - Thêm aiSuggestions mới

### Khi xem trang Thống kê:
1. Load `studentStats/{currentStudentId}`
2. Render biểu đồ tròn từ `partStats`
3. Hiển thị AI suggestions từ `aiSuggestions`
