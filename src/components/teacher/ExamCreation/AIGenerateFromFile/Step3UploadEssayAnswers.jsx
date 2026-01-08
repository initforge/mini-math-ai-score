import { useState } from 'react';
import Button from '../../../common/Button';
import Card from '../../../common/Card';
import Loading from '../../../common/Loading';
import MathRenderer from '../../../common/MathRenderer';
import { useAuth } from '../../../../contexts/AuthContext';
import { callGeminiAPIWithFiles } from '../../../../services/aiFileProcessor';
import './Step3UploadEssayAnswers.css';

/**
 * Màn hình 3: Upload đáp án tự luận
 * Lưu ảnh đáp án để dùng chấm bài học sinh (học sinh nộp ảnh)
 */
export default function Step3UploadEssayAnswers({
  questions,
  apiKey,
  onBack,
  onComplete
}) {
  useAuth(); // Keep context for potential future use
  const [essayAnswerImages, setEssayAnswerImages] = useState([]); // [{questionId, imageBase64, mimeType, barem?}]
  const [loading, setLoading] = useState(false);
  const [isDraggingEssayImages, setIsDraggingEssayImages] = useState(false);
  const [replacedQuestions, setReplacedQuestions] = useState({}); // {questionId: {preview, source}}
  const [ocrBaremLoading, setOcrBaremLoading] = useState({}); // {imageId: true/false}

  // Lọc chỉ câu tự luận và SẮP XẾP theo thứ tự (part, questionNumber)
  const essayQuestions = questions
    .filter(q => q.type === 'essay')
    .sort((a, b) => {
      // Sort theo part trước (I, II, III, IV)
      const partOrder = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
      const aPart = partOrder[a.part] || 99;
      const bPart = partOrder[b.part] || 99;
      if (aPart !== bPart) return aPart - bPart;

      // Sau đó sort theo questionNumber
      const aNum = a.questionNumber || a.number || 0;
      const bNum = b.questionNumber || b.number || 0;
      return aNum - bNum;
    });

  // Xử lý files (dùng chung cho cả click và drag-drop) - HỖ TRỢ NHIỀU ẢNH
  const processEssayImageFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) {
      console.warn('[Step3] Không có files để xử lý');
      return;
    }

    // Convert FileList to Array - QUAN TRỌNG!
    const filesArray = Array.from(fileList);
    console.log(`[Step3] Nhận được ${filesArray.length} files từ FileList`);

    const imageFiles = filesArray.filter(file => {
      const isImage = file && file.type && file.type.startsWith('image/');
      if (!isImage && file) {
        console.warn(`[Step3] File ${file.name} không phải ảnh (type: ${file.type})`);
      }
      return isImage;
    });

    if (imageFiles.length === 0) {
      alert('Vui lòng chọn file ảnh (PNG, JPG, JPEG, GIF)');
      return;
    }

    console.log(`[Step3] Đã lọc được ${imageFiles.length} ảnh từ ${filesArray.length} files`);

    const timestamp = Date.now();
    const newImages = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      console.log(`[Step3] Tạo preview URL cho ảnh ${i + 1}: ${file.name}`);
      newImages.push({
        id: `essay-${timestamp}-${i}`,
        file,
        preview: previewUrl,
        base64,
        mimeType: file.type,
        questionId: null, // Sẽ match sau
        questionNumber: null
      });
    }

    setEssayAnswerImages(prev => {
      const updated = [...prev, ...newImages];
      console.log(`[Step3] ✅ Đã thêm ${newImages.length} ảnh. Tổng: ${updated.length} ảnh`);
      console.log(`[Step3] Danh sách ảnh IDs:`, updated.map(img => img.id));
      return updated;
    });

    // Không tự động OCR nữa, để user nhấn nút
  };

  // OCR tất cả ảnh barem cùng lúc
  const ocrAllBaremImages = async () => {
    if (!apiKey) {
      alert('Vui lòng nhập API Key trước khi OCR');
      return;
    }

    if (essayAnswerImages.length === 0) {
      alert('Vui lòng upload ảnh đáp án trước');
      return;
    }

    setOcrBaremLoading({ all: true });

    try {
      console.log(`[Step3] 🤖 Gửi ${essayAnswerImages.length} ảnh đến AI để OCR barem...`);

      // Gửi TẤT CẢ ảnh cùng lúc
      const fileData = essayAnswerImages.map((img, idx) => ({
        fileName: `barem-${idx + 1}.png`,
        mimeType: img.mimeType,
        data: img.base64
      }));

      const prompt = `Bạn là một hệ thống AI chuyên phân tích barem chấm điểm cho câu hỏi tự luận.

NHIỆM VỤ: OCR và extract BAREM CHẤM ĐIỂM (lời giải) từ tất cả ảnh đáp án.

⚠️ QUAN TRỌNG - GHÉP ẢNH:
- Nhiều ảnh có thể thuộc CÙNG 1 CÂU (bị cắt ngang)
- Nhận diện số câu từ text "CÂU 1:", "CÂU 2:", "CÂU 3:"
- Nếu ảnh không có "CÂU X:" → ghép vào câu trước đó

📋 NHIỆM VỤ CỦA BẠN:
1. Đọc tất cả ảnh và nhận diện số câu (CÂU 1, CÂU 2, CÂU 3...)
2. Với mỗi câu, extract TẤT CẢ các bước giải + điểm số tương ứng
3. Bỏ qua phần đề bài (hàng đầu tiên có "CÂU X: Đề bài...")
4. Chỉ lấy phần LỜI GIẢI/BAREM có điểm số

🔢 FORMAT CỦA MỖI BƯỚC:
- Nếu có label (a), b), c)...) → giữ lại
- Nếu không có label → để trống
- Điểm số: Lấy số điểm ở cột phải (0.5, 0.25, 1.0...)
- Nội dung: Giữ NGUYÊN công thức toán học dạng LaTeX

📐 KÝ HIỆU TOÁN HỌC (LaTeX):
- Inline math: $công thức$
- Ví dụ: 
  * A ∩ B = (-6;5) → $A \\cap B = (-6; 5)$
  * A \\ B = (-6;1] → $A \\backslash B = (-6; 1]$
  * AC = √(10² + 12²) → $AC = \\sqrt{10^2 + 12^2}$
  * sin ACD = 118.6m² → $\\sin ACD = 118,6m^2$

🖼️ NẾU CÓ HÌNH VẼ/BIỂU ĐỒ:
- Set hasImage = true
- Trong notes, ghi rõ: "Đáp án có hình vẽ [mô tả ngắn gọn hình vẽ]"
- Ví dụ: "Đáp án có hình vẽ miền nghiệm của hệ bất phương trình trên mặt phẳng tọa độ Oxy"

📤 OUTPUT (JSON format):
{
  "questions": [
    {
      "questionNumber": 1,
      "totalPoints": 1.0,
      "steps": [
        {
          "label": "a)",
          "solution": "$A \\cap B = (-6; 5)$",
          "points": 0.5
        },
        {
          "label": "b)",
          "solution": "$A \\backslash B = (-6; 1]$",
          "points": 0.5
        }
      ],
      "hasImage": false,
      "notes": ""
    },
    {
      "questionNumber": 2,
      "totalPoints": 1.0,
      "steps": [
        {
          "label": "a)",
          "solution": "$AC = \\sqrt{10^2 + 12^2} = 2\\sqrt{61}$",
          "points": 0.5
        },
        {
          "label": "b)",
          "solution": "$S_{ACD} = \\frac{1}{2}CA.CD.\\sin ACD = 118,6m^2$",
          "points": 0.25
        },
        {
          "label": "",
          "solution": "Tiền trái thám $T = 118,6 \\times 250.000 = 29.650.000$ đồng",
          "points": 0.25
        }
      ],
      "hasImage": true,
      "notes": "Đáp án có hình vẽ tứ giác ABCD với độ dài các cạnh và góc"
    },
    {
      "questionNumber": 3,
      "totalPoints": 1.0,
      "steps": [
        {
          "label": "",
          "solution": "Gọi số bộ sản phẩm loại I sản xuất trong một ngày là: $x (x \\geq 0)$. Số bộ sản phẩm loại II sản xuất trong một ngày là: $y (y \\geq 0)$. Số lãi thu được: $L = 5x + 4y$. Số giờ làm việc của công nhân là: $3x + 3y$. Theo giả thiết: Một ngày máy làm việc không quá 15 giờ, nhân công làm việc không quá 8 giờ nên ta có hệ BPT: $\\begin{cases} 3x + 3y \\leq 15 \\\\ 2x + y \\leq 8 \\\\ x \\geq 0 \\\\ y \\geq 0 \\end{cases}$",
          "points": 0.5
        },
        {
          "label": "",
          "solution": "Miền nghiệm của hệ BPT: Xét các bộ $(x; y)$: $(x; y) = (0; 0) \\Rightarrow L = 0$, $(x; y) = (4; 0) \\Rightarrow L = 20$, $(x; y) = (3; 2) \\Rightarrow L = 23 \\Rightarrow L_{max} = 23$, $(x; y) = (0; 5) \\Rightarrow L = 20$",
          "points": 0.5
        }
      ],
      "hasImage": true,
      "notes": "Đáp án có hình vẽ miền nghiệm của hệ bất phương trình trên mặt phẳng tọa độ Oxy, miền được tô màu"
    }
  ]
}

⚠️ LƯU Ý:
- KHÔNG cần phân tách strict theo table row hay đường kẻ ngang
- Chỉ cần đọc và extract tất cả bước giải + điểm số
- Nếu một bước dài, để nguyên trong 1 step
- totalPoints = tổng điểm của tất cả steps
- Trả về CHỈ JSON object, KHÔNG có markdown code block`;


      const result = await callGeminiAPIWithFiles(prompt, fileData, apiKey);

      console.log(`[Step3] ======================== AI RESPONSE ========================`);
      console.log(`[Step3] 📥 Raw result:`, JSON.stringify(result, null, 2));
      console.log(`[Step3] 📊 Số câu hỏi trả về:`, result.questions?.length);
      console.log(`[Step3] 📊 Số ảnh đã upload:`, essayAnswerImages.length);
      console.log(`[Step3] 📊 Danh sách essay questions:`, essayQuestions.map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        number: q.number,
        part: q.part
      })));

      // Parse kết quả và update TRỰC TIẾP vào essayAnswerImages
      if (result.questions && Array.isArray(result.questions)) {
        const parsedBarems = result.questions;

        console.log(`[Step3] ======================== PARSING BAREM ========================`);
        // Tạo map: questionNumber -> barem data
        const baremMap = {};
        parsedBarems.forEach(baremData => {
          const { questionNumber, steps, totalPoints, hasImage, notes } = baremData;
          baremMap[questionNumber] = {
            barem: steps || [],
            baremTotalPoints: totalPoints || 0,
            baremNotes: notes || '',
            baremHasImage: hasImage || false
          };
          console.log(`[Step3] 📦 Câu ${questionNumber}: ${steps?.length} bước, ${totalPoints}đ`);
        });

        console.log(`[Step3] ======================== MAPPING LOGIC ========================`);
        console.log(`[Step3] 📋 BaremMap keys (sorted):`, Object.keys(baremMap).map(Number).sort((a, b) => a - b));

        // Update essayAnswerImages: Gán mỗi ảnh với questionNumber tương ứng
        setEssayAnswerImages(prev => {
          // Lấy danh sách questionNumber từ AI (đã sort)
          const questionNumbers = Object.keys(baremMap).map(Number).sort((a, b) => a - b);

          console.log(`[Step3] 🔄 Mapping ${prev.length} ảnh với ${questionNumbers.length} câu...`);

          // Giả định: Số ảnh = số câu hỏi, ảnh i tương ứng câu i
          const updated = prev.map((img, idx) => {
            const questionNumber = questionNumbers[idx];

            console.log(`[Step3] 🔍 Ảnh ${idx + 1} (id: ${img.id}):`, {
              originalQuestionId: img.questionId,
              originalQuestionNumber: img.questionNumber,
              newQuestionNumber: questionNumber
            });

            if (questionNumber && baremMap[questionNumber]) {
              // Tìm câu hỏi tương ứng để lấy questionId
              const matchedQuestion = essayQuestions.find(q =>
                q.questionNumber === questionNumber || q.number === questionNumber
              );

              if (matchedQuestion) {
                const questionId = matchedQuestion.id || `${matchedQuestion.part}-${questionNumber}`;
                console.log(`[Step3] ✅ Match: Ảnh ${idx + 1} → Câu ${questionNumber} (${questionId})`);

                return {
                  ...img,
                  questionId,
                  questionNumber,
                  ...baremMap[questionNumber]
                };
              } else {
                console.warn(`[Step3] ⚠️ Không tìm thấy câu hỏi ${questionNumber} trong essayQuestions`);
              }
            } else {
              console.warn(`[Step3] ⚠️ Ảnh ${idx + 1} không có questionNumber tương ứng`);
            }
            return img;
          });

          console.log(`[Step3] ======================== FINAL RESULT ========================`);
          console.log(`[Step3] 📤 Updated images:`, updated.map(img => ({
            id: img.id,
            questionId: img.questionId,
            questionNumber: img.questionNumber,
            hasBarem: !!img.barem,
            baremSteps: img.barem?.length,
            totalPoints: img.baremTotalPoints
          })));

          return updated;
        });

        alert(`✅ Đã phân tích xong ${parsedBarems.length} câu hỏi!\n\nBarem đã được tự động gán cho từng câu tự luận.`);
      } else {
        throw new Error('Không parse được kết quả từ AI');
      }

    } catch (error) {
      console.error(`[Step3] ❌ OCR barem thất bại:`, error);
      alert('Lỗi khi OCR barem: ' + error.message);
    } finally {
      setOcrBaremLoading({});
    }
  };

  // Upload ảnh đáp án tự luận (click)
  const handleEssayImageChange = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      console.warn('[Step3] Không có files được chọn');
      return;
    }
    console.log(`[Step3] Click chọn ${fileList.length} files (FileList type: ${typeof fileList})`);
    processEssayImageFiles(fileList);
    // Reset input để có thể chọn lại cùng files
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragOverEssay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEssayImages(true);
  };

  const handleDragLeaveEssay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEssayImages(false);
  };

  const handleDropEssay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEssayImages(false);

    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) {
      console.warn('[Step3] Không có files được drop');
      return;
    }
    console.log(`[Step3] Drop ${fileList.length} files (DataTransfer.files type: ${typeof fileList})`);
    processEssayImageFiles(fileList);
  };

  const handleRemoveEssayImage = (imageId) => {
    setEssayAnswerImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Xử lý thay thế câu hỏi bằng ảnh gốc
  const handleReplaceQuestionWithImage = (question, _index) => {
    // Tìm ảnh gốc từ imageMapping (nếu có)
    const imageMapping = questions._imageMapping;
    if (!imageMapping || !imageMapping.examFiles || imageMapping.examFiles.length === 0) {
      alert('Không tìm thấy ảnh gốc. Vui lòng upload lại đề thi.');
      return;
    }

    // Cho user chọn ảnh từ danh sách ảnh đã upload
    const imageOptions = imageMapping.examFiles.map((img, idx) =>
      `${idx + 1}. ${img.name}`
    ).join('\n');

    const imageIndex = prompt(
      `Chọn ảnh để thay thế câu hỏi này:\n\n${imageOptions}\n\nNhập số thứ tự ảnh (1-${imageMapping.examFiles.length}):`
    );

    if (!imageIndex || isNaN(imageIndex) || imageIndex < 1 || imageIndex > imageMapping.examFiles.length) {
      return;
    }

    const selectedImage = imageMapping.examFiles[parseInt(imageIndex) - 1];
    const questionId = question.id || `${question.part}-${question.questionNumber}`;

    // Lưu vào state để hiển thị
    setReplacedQuestions(prev => ({
      ...prev,
      [questionId]: {
        preview: selectedImage.preview,
        source: selectedImage.name
      }
    }));

    alert(`✅ Đã thay thế câu hỏi bằng ảnh: ${selectedImage.name}`);
  };

  const handleSave = async () => {
    // Merge replacedQuestions vào questions trước khi lưu
    const finalQuestions = questions.map(q => {
      const questionId = q.id || `${q.part}-${q.questionNumber || q.number}`;
      const replaced = replacedQuestions[questionId];
      if (replaced) {
        return {
          ...q,
          replacedWithImage: replaced.preview,
          imageSource: replaced.source
        };
      }
      return q;
    });

    if (essayQuestions.length === 0) {
      // Không có câu tự luận, skip bước này
      onComplete(finalQuestions, essayAnswerImages);
      return;
    }

    setLoading(true);
    try {
      // ✅ KHÔNG lưu riêng vào essayAnswers collection nữa
      // Thay vào đó: merge barem vào questions → lưu 1 lần trong NewUploadFileMode
      // Điều này tránh data bị tách ra 2 nơi và dễ quản lý hơn
      
      console.log('[Step3] ======================== MERGING BAREM TO QUESTIONS ========================');
      console.log(`[Step3] 📊 Số ảnh đáp án tự luận: ${essayAnswerImages.length}`);
      
      // Cập nhật questions với thông tin đáp án tự luận
      // Log để debug matching process
      console.log('[Step3] 📊 essayAnswerImages:', essayAnswerImages.map(img => ({
        id: img.id,
        questionId: img.questionId,
        questionNumber: img.questionNumber,
        hasBarem: !!img.barem,
        baremLength: img.barem?.length,
        baremSteps: img.barem
      })));
      console.log('[Step3] 📊 essay questions:', questions.filter(q => q.type === 'essay').map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        number: q.number,
        part: q.part
      })));

      const updatedQuestions = questions.map(q => {
        if (q.type === 'essay') {
          // Thử nhiều cách match khác nhau
          let answerImage = null;

          // Cách 1: Match theo questionId
          answerImage = essayAnswerImages.find(img => img.questionId && img.questionId === q.id);

          // Cách 2: Match theo questionNumber
          if (!answerImage) {
            answerImage = essayAnswerImages.find(img =>
              img.questionNumber && (img.questionNumber === q.questionNumber || img.questionNumber === q.number)
            );
          }

          // Cách 3: Match theo vị trí trong essayQuestions list
          if (!answerImage) {
            const essayQsList = questions.filter(question => question.type === 'essay');
            const essayIdx = essayQsList.findIndex(eq => eq.id === q.id || (eq.part === q.part && eq.questionNumber === q.questionNumber));
            if (essayIdx !== -1 && essayAnswerImages[essayIdx] && essayAnswerImages[essayIdx].barem) {
              answerImage = essayAnswerImages[essayIdx];
            }
          }

          console.log(`[Step3] 🔍 Essay question (${q.id || q.questionNumber}):`, {
            foundImage: !!answerImage,
            answerImageId: answerImage?.id,
            hasBarem: !!answerImage?.barem,
            baremLength: answerImage?.barem?.length
          });

          if (answerImage && answerImage.barem && answerImage.barem.length > 0) {
            console.log(`[Step3] ✅ Matched barem for question ${q.questionNumber}:`, answerImage.barem);
            return {
              ...q,
              essayAnswerImageId: answerImage.id,
              essayAnswerBase64: answerImage.base64, // Lưu ảnh để dùng chấm bài
              // ✅ Lưu barem để hiển thị và chấm điểm tự động
              barem: answerImage.barem,
              baremTotalPoints: answerImage.baremTotalPoints || 0,
              baremNotes: answerImage.baremNotes || '',
              baremHasImage: answerImage.baremHasImage || false
            };
          } else {
            console.warn(`[Step3] ⚠️ No barem found for question ${q.questionNumber}`);
          }
        }
        return q;
      });

      console.log(`[Step3] ✅ Đã merge ${essayAnswerImages.length} đáp án tự luận vào questions`);
      
      // Merge replacedQuestions vào updatedQuestions
      const finalQuestions = updatedQuestions.map(q => {
        const questionId = q.id || `${q.part}-${q.questionNumber || q.number}`;
        const replaced = replacedQuestions[questionId];
        if (replaced) {
          return {
            ...q,
            replacedWithImage: replaced.preview,
            imageSource: replaced.source
          };
        }
        return q;
      });

      // ✅ DEBUG: Log chi tiết câu tự luận trước khi gọi onComplete
      console.log('[Step3] ======================== BEFORE onComplete ========================');
      const essayQuestionsToSave = finalQuestions.filter(q => q.type === 'essay');
      console.log(`[Step3] 📊 Số câu tự luận: ${essayQuestionsToSave.length}`);
      essayQuestionsToSave.forEach((q, idx) => {
        console.log(`[Step3] 📝 Câu ${idx + 1}:`, {
          id: q.id,
          questionNumber: q.questionNumber,
          hasBarem: !!q.barem,
          baremType: typeof q.barem,
          baremIsArray: Array.isArray(q.barem),
          baremLength: Array.isArray(q.barem) ? q.barem.length : 'N/A',
          baremSteps: q.barem,
          baremTotalPoints: q.baremTotalPoints,
          baremNotes: q.baremNotes,
          baremHasImage: q.baremHasImage
        });
      });
      console.log('[Step3] ======================== CALLING onComplete ========================');
      console.log(`[Step3] 🚀 Gọi onComplete với ${finalQuestions.length} câu hỏi (bao gồm ${essayQuestionsToSave.length} câu tự luận có barem)`);

      onComplete(finalQuestions, essayAnswerImages);
    } catch (error) {
      console.error('Error saving essay answers:', error);
      alert('Lỗi khi lưu đáp án tự luận: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  if (essayQuestions.length === 0) {
    // Không có câu tự luận, skip màn hình này
    return (
      <div className="step3-upload-essay-answers">
        <h2>Bước 3: Upload đáp án tự luận</h2>
        <Card className="no-essay-section">
          <p>Đề thi này không có câu tự luận.</p>
          <Button onClick={() => {
            // Merge replacedQuestions vào questions
            const finalQuestions = questions.map(q => {
              const questionId = q.id || `${q.part}-${q.questionNumber || q.number}`;
              const replaced = replacedQuestions[questionId];
              if (replaced) {
                return {
                  ...q,
                  replacedWithImage: replaced.preview,
                  imageSource: replaced.source
                };
              }
              return q;
            });
            onComplete(finalQuestions, []);
          }}>
            Hoàn thành
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="step3-upload-essay-answers">
      <h2>Bước 3: Upload đáp án tự luận</h2>
      <p className="section-description">
        Upload ảnh đáp án tự luận để dùng chấm bài học sinh (học sinh sẽ nộp ảnh bài làm)
      </p>

      <Card className="upload-section">
        <h3>Upload ảnh đáp án tự luận</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleEssayImageChange}
          className="file-input"
          id="essay-images-upload"
          multiple
        />
        <div
          className={`upload-label ${isDraggingEssayImages ? 'drag-over' : ''}`}
          onDragOver={handleDragOverEssay}
          onDragLeave={handleDragLeaveEssay}
          onDrop={handleDropEssay}
          onClick={() => document.getElementById('essay-images-upload').click()}
        >
          <div className="upload-icon">📸</div>
          <p>{isDraggingEssayImages ? 'Thả ảnh vào đây...' : 'Kéo thả nhiều ảnh vào đây hoặc click để chọn'}</p>
          <p className="upload-hint">Có thể chọn nhiều ảnh cùng lúc (giữ Ctrl/Cmd khi click hoặc kéo thả nhiều file)</p>
        </div>
      </Card>

      {/* Danh sách câu tự luận */}
      <Card className="essay-questions-section">
        <h3>Preview câu hỏi và đáp án tự luận ({essayQuestions.length} câu)</h3>
        <div className="essay-questions-list">
          {essayQuestions.map((q, index) => {
            // Tìm ảnh matched dựa trên questionNumber hoặc questionId
            const matchedImage = essayAnswerImages.find(img =>
              img.questionId === q.id ||
              img.questionNumber === q.questionNumber ||
              img.questionNumber === q.number
            );
            const questionId = q.id || `${q.part}-${q.questionNumber}`;
            const replaced = replacedQuestions[questionId];
            return (
              <div key={q.id || index} className="essay-question-item">
                <div className="question-header">
                  <span className="question-ref">
                    {q.partName || `PHẦN ${q.part}`} - Câu {q.questionNumber}
                  </span>
                  <div className="question-actions">
                    {matchedImage && (
                      <span className="has-answer-badge">✓ Đã có đáp án</span>
                    )}
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleReplaceQuestionWithImage(q, index)}
                      className="replace-image-btn"
                      title="Thay thế câu hỏi bằng ảnh gốc (nếu AI parse sai)"
                    >
                      📷 Thay bằng ảnh
                    </Button>
                  </div>
                </div>

                <div className="question-content-full">
                  <div className="question-text">
                    <strong>Câu hỏi:</strong>
                    {replaced ? (
                      <div className="replaced-image-preview">
                        <img
                          src={replaced.preview}
                          alt={`Câu hỏi ${q.questionNumber} (thay thế bằng ảnh)`}
                          className="question-image"
                        />
                        <p className="image-source">Nguồn: {replaced.source}</p>
                      </div>
                    ) : (
                      <>
                        <div className="content-preview">
                          {q.content ? (
                            <MathRenderer content={q.content} />
                          ) : (
                            <span className="no-content">Chưa có nội dung câu hỏi</span>
                          )}
                        </div>
                        {/* Hiển thị ảnh đã mapping từ Step1 */}
                        {q.images && q.images.length > 0 && (
                          <div className="question-images-preview">
                            {q.images.map((img, imgIdx) => {
                              // Support nhiều format: base64, preview URL, hoặc URL
                              let imageSrc = '';
                              if (img.preview) {
                                imageSrc = img.preview;
                              } else if (img.base64) {
                                imageSrc = `data:${img.mimeType || 'image/png'};base64,${img.base64}`;
                              } else if (img.url) {
                                imageSrc = img.url;
                              }

                              return imageSrc ? (
                                <img
                                  key={imgIdx}
                                  src={imageSrc}
                                  alt={`Hình ${imgIdx + 1} - Câu ${q.questionNumber || q.number || index + 1}`}
                                  className="question-attached-image"
                                />
                              ) : null;
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="answer-section">
                    <strong>Barem chấm điểm:</strong>
                    {matchedImage && matchedImage.barem && matchedImage.barem.length > 0 ? (
                      <div className="barem-preview">
                        <div className="barem-steps">
                          {matchedImage.barem.map((step, stepIdx) => (
                            <div key={stepIdx} className="barem-step">
                              {step.label && (
                                <span className="barem-step-label">{step.label}</span>
                              )}
                              <span className="barem-points">{step.points} điểm</span>
                              {step.solution && (
                                <div className="barem-solution">
                                  <MathRenderer content={step.solution} />
                                </div>
                              )}
                              {/* Fallback cho format cũ */}
                              {step.description && !step.solution && (
                                <div className="barem-description">
                                  <MathRenderer content={step.description} />
                                </div>
                              )}
                              {step.requirements && step.requirements.length > 0 && (
                                <ul className="barem-requirements">
                                  {step.requirements.map((req, reqIdx) => (
                                    <li key={reqIdx}><MathRenderer content={req} /></li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                        {matchedImage.baremTotalPoints && (
                          <div className="barem-total">Tổng điểm: {matchedImage.baremTotalPoints} điểm</div>
                        )}
                        {matchedImage.baremHasImage && (
                          <div className="barem-image-note">⚠️ Đáp án có hình vẽ/biểu đồ</div>
                        )}
                        {matchedImage.baremNotes && (
                          <div className="barem-notes">
                            <MathRenderer content={matchedImage.baremNotes} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="no-answer">Chưa có barem chấm điểm</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Danh sách ảnh đã upload */}
      {essayAnswerImages.length > 0 && (
        <Card className="essay-images-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Ảnh đáp án đã upload ({essayAnswerImages.length})</h3>
            <Button
              onClick={ocrAllBaremImages}
              disabled={!apiKey || ocrBaremLoading.all}
              size="small"
              style={{ background: '#4CAF50', fontWeight: 'bold' }}
            >
              {ocrBaremLoading.all ? '⏳ Đang OCR...' : '🤖 Gửi tất cả ảnh đến AI'}
            </Button>
          </div>
          <div className="essay-images-list">
            {essayAnswerImages.map((img, index) => (
              <div key={img.id} className="essay-image-item" style={{ maxWidth: '120px', width: '100%' }}>
                <div className="image-preview" style={{ maxWidth: '120px', maxHeight: '120px', width: '100%' }}>
                  <img
                    src={img.preview}
                    alt={`Đáp án ${index + 1}`}
                    style={{ maxWidth: '120px', maxHeight: '120px', width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <button
                    className="remove-image-btn"
                    onClick={() => handleRemoveEssayImage(img.id)}
                    type="button"
                    title="Xóa ảnh"
                  >
                    ✕
                  </button>
                </div>
                <div className="image-label">Ảnh {index + 1}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="step-actions">
        <Button variant="secondary" onClick={onBack}>
          ← Quay lại
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="save-btn"
        >
          {loading ? 'Đang lưu...' : 'Lưu và hoàn thành'}
        </Button>
      </div>

      {loading && <Loading message="Đang lưu đáp án tự luận..." />}
    </div>
  );
}

