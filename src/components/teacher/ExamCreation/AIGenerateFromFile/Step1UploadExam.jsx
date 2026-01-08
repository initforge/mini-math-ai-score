import { useState, useRef } from 'react';
import Button from '../../../common/Button';
import Card from '../../../common/Card';
import Loading from '../../../common/Loading';
import { parseQuestionsWithAI } from '../../../../services/aiFileProcessor';
import './Step1UploadExam.css';

/**
 * Màn hình 1: Upload đề thi + Upload ảnh hình + Ghi chú
 */
export default function Step1UploadExam({ apiKey, onNext, onQuestionsParsed }) {
  const [examFiles, setExamFiles] = useState([]); // Danh sách file đề thi (tất cả đều là đề thi, không cần chọn)
  const [imageFiles, setImageFiles] = useState([]); // Danh sách ảnh hình
  const [imageNotes, setImageNotes] = useState({}); // Map imageIndex -> {part, questionNumber, note}
  const [loading, setLoading] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parseCache, setParseCache] = useState(null); // Cache kết quả parse để tránh parse lại
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isDraggingExamFile, setIsDraggingExamFile] = useState(false);
  const examFileInputRef = useRef(null);
  const imageFilesInputRef = useRef(null);

  // Xử lý file đề thi (dùng chung cho cả click và drag-drop) - GIỐNG HỆT processImageFiles
  const processExamFile = (fileList) => {
    if (!fileList || fileList.length === 0) {
      console.warn('[Step1] Không có files để xử lý');
      return;
    }

    // Convert FileList to Array - QUAN TRỌNG! (giống processImageFiles)
    const filesArray = Array.from(fileList);
    console.log(`[Step1] Nhận được ${filesArray.length} files từ FileList`);

    // Lọc file hợp lệ (PDF, Word, ảnh)
    const validFiles = filesArray.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const isValid = file.type.startsWith('image/') ||
        ext === 'pdf' ||
        ext === 'doc' ||
        ext === 'docx';
      if (!isValid) {
        console.warn(`[Step1] File ${file.name} không phải PDF/Word/ảnh (type: ${file.type})`);
      }
      return isValid;
    });

    if (validFiles.length === 0) {
      alert('Vui lòng chọn file PDF, Word hoặc ảnh');
      return;
    }

    console.log(`[Step1] Đã lọc được ${validFiles.length} file hợp lệ từ ${filesArray.length} files`);

    const timestamp = Date.now();
    const newFiles = validFiles.map((file, index) => {
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      console.log(`[Step1] Tạo preview URL cho file ${index + 1}: ${file.name}`);
      return {
        id: `exam-${timestamp}-${index}`,
        file,
        preview: previewUrl,
        name: file.name,
        type: file.type,
        size: file.size
      };
    });

    setExamFiles(prev => {
      const updated = [...prev, ...newFiles];
      console.log(`[Step1] ✅ Đã thêm ${newFiles.length} ảnh đề thi. Tổng: ${updated.length} ảnh (TẤT CẢ là MỘT đề thi duy nhất)`);
      return updated;
    });
  };

  // Upload file đề thi (click) - GIỐNG HỆT handleImageFilesChange
  const handleExamFileChange = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      console.warn('[Step1] Không có files được chọn');
      return;
    }
    console.log(`[Step1] Click chọn ${fileList.length} files`);
    processExamFile(fileList);
    // Không reset input value để user có thể thấy file đã chọn
  };

  // Drag and drop handlers cho file đề thi
  const handleDragOverExam = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExamFile(true);
  };

  const handleDragLeaveExam = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExamFile(false);
  };

  const handleDropExam = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExamFile(false);

    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) {
      console.warn('[Step1] Không có files được drop');
      return;
    }
    console.log(`[Step1] Drop ${fileList.length} files (DataTransfer.files type: ${typeof fileList})`);
    processExamFile(fileList);
  };

  // Xử lý files (dùng chung cho cả click và drag-drop) - HỖ TRỢ NHIỀU ẢNH
  const processImageFiles = (fileList) => {
    if (!fileList || fileList.length === 0) {
      console.warn('[Step1] Không có files để xử lý');
      return;
    }

    // Convert FileList to Array - QUAN TRỌNG!
    const filesArray = Array.from(fileList);
    console.log(`[Step1] Nhận được ${filesArray.length} files từ FileList`);

    const imageFiles = filesArray.filter(file => {
      const isImage = file && file.type && file.type.startsWith('image/');
      if (!isImage && file) {
        console.warn(`[Step1] File ${file.name} không phải ảnh (type: ${file.type})`);
      }
      return isImage;
    });

    if (imageFiles.length === 0) {
      alert('Vui lòng chọn file ảnh (PNG, JPG, JPEG, GIF)');
      return;
    }

    console.log(`[Step1] Đã lọc được ${imageFiles.length} ảnh từ ${filesArray.length} files`);

    const timestamp = Date.now();
    const newImages = imageFiles.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      console.log(`[Step1] Tạo preview URL cho ảnh ${index + 1}: ${file.name}`);
      return {
        id: `img-${timestamp}-${index}`,
        file,
        preview: previewUrl,
        note: { part: '', questionNumber: '', note: '' }
      };
    });

    setImageFiles(prev => {
      const updated = [...prev, ...newImages];
      console.log(`[Step1] ✅ Đã thêm ${newImages.length} ảnh. Tổng: ${updated.length} ảnh`);
      console.log(`[Step1] Danh sách ảnh IDs:`, updated.map(img => img.id));
      return updated;
    });
  };

  // Upload ảnh hình (click)
  const handleImageFilesChange = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      console.warn('[Step1] Không có files được chọn');
      return;
    }
    console.log(`[Step1] Click chọn ${fileList.length} files (FileList type: ${typeof fileList})`);
    processImageFiles(fileList);
    // Reset input để có thể chọn lại cùng files
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(false);

    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) {
      console.warn('[Step1] Không có files được drop');
      return;
    }
    console.log(`[Step1] Drop ${fileList.length} files (DataTransfer.files type: ${typeof fileList})`);
    processImageFiles(fileList);
  };

  // Xóa ảnh hình
  const handleRemoveImage = (imageId) => {
    setImageFiles(prev => prev.filter(img => img.id !== imageId));
    const newNotes = { ...imageNotes };
    delete newNotes[imageId];
    setImageNotes(newNotes);
  };

  // Cập nhật ghi chú cho ảnh
  const handleImageNoteChange = (imageId, field, value) => {
    setImageNotes(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        [field]: value
      }
    }));
  };

  // Xóa file đề thi
  const handleRemoveExamFile = (fileId) => {
    setExamFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke URL để tránh memory leak
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      console.log(`[Step1] Đã xóa file đề thi. Còn lại: ${updated.length} files`);
      return updated;
    });
  };

  // Parse đề thi và lắp ảnh
  const handleParseExam = async () => {
    console.log('[Step1] handleParseExam called. API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('[Step1] examFiles.length:', examFiles.length);
    
    if (!examFiles || examFiles.length === 0 || !apiKey) {
      const reason = !apiKey ? 'Thiếu API Key' : 'Chưa upload file đề thi';
      alert(`Vui lòng upload file đề thi và nhập API Key. Lý do: ${reason}`);
      console.error('[Step1] Không thể parse:', { hasApiKey: !!apiKey, filesCount: examFiles.length });
      return;
    }

    // ⚠️ CACHE: Kiểm tra cache để tránh parse lại (tránh rate limit 429)
    // Chỉ dùng name-size (bỏ lastModified vì có thể thay đổi khi chọn lại file)
    const examFilesKey = examFiles.map(f => `${f.file.name}-${f.file.size}`).join('|');

    console.log('[Step1] Cache check:', {
      hasCache: !!parseCache,
      cacheKey: parseCache?.key?.substring(0, 50),
      currentKey: examFilesKey.substring(0, 50),
      match: parseCache?.key === examFilesKey
    });

    if (parseCache && parseCache.key === examFilesKey) {
      console.log('[Step1] ✅ Dùng cache kết quả parse (tránh rate limit 429)');

      // Attach ảnh hình minh họa vào questions từ cache
      const questionsWithImages = await attachImagesToQuestions(
        parseCache.questions,
        imageFiles,
        imageNotes
      );

      // Restore imageMapping từ cache
      questionsWithImages._imageMapping = parseCache.imageMapping;

      setParsedQuestions(questionsWithImages);
      const firstFilePreview = examFiles.length > 0 ? examFiles[0].preview : null;
      onQuestionsParsed(questionsWithImages, firstFilePreview);

      alert('✅ Đã dùng cache kết quả parse (tránh rate limit). Nếu muốn parse lại, vui lòng thay đổi file hoặc reload trang.');
      return;
    }

    setLoading(true);
    try {
      // Bước 1: Parse đề thi (TẤT CẢ files đều là MỘT đề thi duy nhất - gửi tất cả cho AI)
      const allExamFiles = examFiles.map(f => f.file);
      console.log(`[Step1] Parse ${allExamFiles.length} ảnh đề thi (TẤT CẢ là MỘT đề thi duy nhất, gửi tất cả cho AI)`);
      const questions = await parseQuestionsWithAI(allExamFiles, apiKey);

      if (!questions || questions.length === 0) {
        alert('Không parse được câu hỏi nào. Vui lòng kiểm tra lại file.');
        return;
      }

      // ⚠️ DEBUG: Kiểm tra questionNumber sau khi parse
      console.log(`[Step1] 🔍 DEBUG: Kiểm tra questionNumber sau khi parse (${questions.length} câu):`);
      questions.forEach((q, i) => {
        console.log(`[Step1] Question ${i}: part=${q.part}, partName=${q.partName}, questionNumber=${q.questionNumber}, number=${q.number}`);
        if (!q.questionNumber && !q.number) {
          console.warn(`[Step1] ⚠️ Question ${i} KHÔNG CÓ questionNumber!`);
        }
      });

      // Bước 2: Lắp ảnh vào câu hỏi (nếu có)
      const questionsWithImages = await attachImagesToQuestions(
        questions,
        imageFiles,
        imageNotes
      );

      // ⚠️ DEBUG: Kiểm tra questionNumber sau khi attach images
      console.log(`[Step1] 🔍 DEBUG: Kiểm tra questionNumber sau khi attach images (${questionsWithImages.length} câu):`);
      questionsWithImages.forEach((q, i) => {
        console.log(`[Step1] Question ${i}: part=${q.part}, partName=${q.partName}, questionNumber=${q.questionNumber}, number=${q.number}, hasImages=${!!q.images}`);
        if (!q.questionNumber && !q.number) {
          console.warn(`[Step1] ⚠️ Question ${i} KHÔNG CÓ questionNumber sau khi attach images!`);
        }
        if (q.images && q.images.length > 0) {
          console.log(`[Step1] ✅ Question ${i} có ${q.images.length} ảnh đã map`);
        }
      });

      // Lưu mapping ảnh đề thi → questions
      const imageMapping = {
        examFiles: examFiles.map(f => ({
          id: f.id,
          name: f.file.name,
          preview: f.preview
        })),
        imageFiles: imageFiles.map(f => ({
          id: f.id,
          name: f.file.name,
          preview: f.preview,
          notes: imageNotes[f.id] || {}
        })),
        questionsCount: questionsWithImages.length,
        parsedAt: new Date().toISOString()
      };

      // Gán mapping vào questions để lưu vào database sau
      questionsWithImages._imageMapping = imageMapping;

      // ⚠️ LƯU CACHE: Lưu kết quả parse để tránh parse lại (tránh rate limit 429)
      // Chỉ dùng name-size (bỏ lastModified)
      const cacheKey = examFiles.map(f => `${f.file.name}-${f.file.size}`).join('|');
      setParseCache({
        key: cacheKey,
        questions: questions, // Lưu questions gốc (chưa có images từ imageFiles)
        imageMapping: imageMapping
      });
      console.log('[Step1] ✅ Đã lưu cache kết quả parse (tránh rate limit)');
      console.log('[Step1] Cache key:', cacheKey.substring(0, 100));

      setParsedQuestions(questionsWithImages);
      // Lấy preview của file đầu tiên (hoặc có thể là tất cả previews)
      const firstFilePreview = examFiles.length > 0 ? examFiles[0].preview : null;

      // Hiển thị validation errors/warnings
      if (questions._validationErrors && questions._validationErrors.length > 0) {
        const errorMsg = `❌ LỖI VALIDATION:\n\n${questions._validationErrors.join('\n\n')}\n\nVui lòng kiểm tra lại đề thi hoặc thử parse lại.`;
        alert(errorMsg);
        console.error('[Step1] Validation errors:', questions._validationErrors);
      } else if (questions._validationWarnings && questions._validationWarnings.length > 0) {
        const warningMsg = `⚠️ CẢNH BÁO:\n\n${questions._validationWarnings.join('\n\n')}\n\nVui lòng kiểm tra lại trong preview.`;
        alert(warningMsg);
        console.warn('[Step1] Validation warnings:', questions._validationWarnings);
      } else {
        // Chỉ hiển thị success nếu không có lỗi
        console.log(`[Step1] ✅ Parse thành công: ${questionsWithImages.length} câu hỏi`);
      }

      onQuestionsParsed(questionsWithImages, firstFilePreview);
    } catch (error) {
      console.error('Error parsing exam:', error);
      alert('Lỗi khi parse đề thi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Lắp ảnh vào câu hỏi (dựa trên ghi chú user, không cần AI)
  const attachImagesToQuestions = async (questions, images, notes) => {
    if (!images || images.length === 0) {
      return questions; // Không có ảnh, trả về câu hỏi như cũ
    }

    // Convert ảnh sang base64
    const imageData = await Promise.all(
      images.map(async (img) => {
        const base64 = await fileToBase64(img.file);
        return {
          id: img.id,
          base64,
          mimeType: img.file.type,
          note: notes[img.id] || {}
        };
      })
    );

    // Match ảnh với câu hỏi dựa trên ghi chú user (không cần AI)
    console.log(`[Step1] 🔍 Bắt đầu map ${imageData.length} ảnh vào ${questions.length} câu hỏi`);
    console.log(`[Step1] 🔍 Image notes:`, imageData.map(img => ({
      id: img.id,
      note: img.note
    })));

    return questions.map((q, qIndex) => {
      // ⚠️ QUAN TRỌNG: Đảm bảo questionNumber không bị mất khi map
      const questionWithNumber = {
        ...q,
        questionNumber: q.questionNumber || q.number // Giữ nguyên questionNumber
      };

      // Normalize part để so sánh (có thể là "I" hoặc "PHẦN I")
      const questionPart = questionWithNumber.part ||
        (questionWithNumber.partName ? questionWithNumber.partName.replace('PHẦN ', '').trim() : '');

      console.log(`[Step1] 🔍 Question ${qIndex}: part=${questionPart}, questionNumber=${questionWithNumber.questionNumber}, partName=${questionWithNumber.partName}`);

      const matchedImages = imageData
        .filter(img => {
          const note = img.note;
          // Normalize part từ note (có thể là "I", "II", etc.)
          const notePart = note.part || '';
          const noteQuestionNumber = parseInt(note.questionNumber) || 0;
          const questionNumber = questionWithNumber.questionNumber || 0;

          const matches = notePart === questionPart && noteQuestionNumber === questionNumber;

          if (notePart || noteQuestionNumber) {
            console.log(`[Step1] 🔍   So sánh ảnh ${img.id}: note.part="${notePart}" === question.part="${questionPart}"? ${notePart === questionPart}, note.questionNumber=${noteQuestionNumber} === question.questionNumber=${questionNumber}? ${noteQuestionNumber === questionNumber}, MATCH=${matches}`);
          }

          return matches;
        })
        .map(img => {
          // Tìm preview URL từ imageFiles
          const imageFile = images.find(f => f.id === img.id);
          console.log(`[Step1] ✅ Map ảnh ${img.id} vào câu ${questionPart} - Câu ${questionWithNumber.questionNumber}`);
          return {
            base64: img.base64,
            mimeType: img.mimeType,
            position: 'inline', // Mặc định inline
            preview: imageFile?.preview // Thêm preview URL để hiển thị trong Step2
          };
        });

      if (matchedImages.length > 0) {
        console.log(`[Step1] ✅ Câu ${qIndex} (${questionPart} - Câu ${questionWithNumber.questionNumber}) có ${matchedImages.length} ảnh`);
      }

      // ⚠️ QUAN TRỌNG: Return questionWithNumber để giữ nguyên questionNumber
      return {
        ...questionWithNumber,
        images: matchedImages.length > 0 ? matchedImages : undefined
      };
    });
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


  return (
    <div className="step1-upload-exam">
      <h2>Bước 1: Upload đề thi và ảnh hình</h2>

      {/* Upload file đề thi */}
      <Card className="upload-section">
        <h3>1. Upload file đề thi</h3>
        <input
          ref={examFileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleExamFileChange}
          className="file-input"
          id="exam-file-upload"
          multiple
        />
        <div
          className={`upload-label ${isDraggingExamFile ? 'drag-over' : ''}`}
          onDragOver={handleDragOverExam}
          onDragLeave={handleDragLeaveExam}
          onDrop={handleDropExam}
          onClick={() => {
            if (examFileInputRef.current) {
              console.log('[Step1] Click vào upload area, trigger file input');
              examFileInputRef.current.click();
            } else {
              console.error('[Step1] ❌ examFileInputRef.current is null!');
            }
          }}
        >
          <div className="upload-icon">📄</div>
          <p>{isDraggingExamFile ? 'Thả file vào đây...' : 'Kéo thả file vào đây hoặc click để chọn'}</p>
          <p className="upload-hint">PDF, Word, hoặc ảnh</p>
        </div>

        {/* Danh sách file đề thi đã upload */}
        {examFiles.length > 0 && (
          <div className="exam-files-section">
            <div className="exam-files-header">
              <h4>Ảnh đề thi đã upload ({examFiles.length} ảnh)</h4>
              <p className="section-hint" style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                ⚠️ Tất cả các ảnh này là MỘT đề thi duy nhất (đề thi dài nên chia thành nhiều ảnh)
              </p>
            </div>
            <div className="exam-files-list">
              {examFiles.map((fileItem, index) => (
                <div key={fileItem.id} className="exam-file-item">
                  <div className="exam-file-preview">
                    {fileItem.preview ? (
                      <img src={fileItem.preview} alt={`Trang ${index + 1} của đề thi`} />
                    ) : (
                      <div className="file-icon">📄</div>
                    )}
                    <button
                      className="remove-file-btn"
                      onClick={() => handleRemoveExamFile(fileItem.id)}
                      type="button"
                      title="Xóa ảnh"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="exam-file-label">Trang {index + 1}</div>
                  <div className="exam-file-name" title={fileItem.name}>
                    {fileItem.name.length > 20 ? fileItem.name.substring(0, 20) + '...' : fileItem.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Upload ảnh hình */}
      <Card className="upload-section">
        <h3>2. Upload ảnh hình (nếu có)</h3>
        <p className="section-hint">
          Upload các ảnh hình chi tiết cắt riêng từ đề thi. Sau đó ghi chú ảnh nào thuộc câu nào.
        </p>

        <input
          ref={imageFilesInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFilesChange}
          className="file-input"
          id="image-files-upload"
          multiple
        />
        <div
          className={`upload-label ${isDraggingImages ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (imageFilesInputRef.current) {
              console.log('[Step1] Click vào upload area ảnh, trigger file input');
              imageFilesInputRef.current.click();
            } else {
              console.error('[Step1] ❌ imageFilesInputRef.current is null!');
            }
          }}
        >
          <div className="upload-icon">🖼️</div>
          <p>{isDraggingImages ? 'Thả ảnh vào đây...' : 'Kéo thả ảnh vào đây hoặc click để chọn'}</p>
          <p className="upload-hint">Có thể chọn nhiều ảnh</p>
        </div>

        {/* Danh sách ảnh đã upload */}
        {imageFiles.length > 0 && (
          <div className="images-section">
            <div className="images-header">
              <h4>Ảnh đã upload ({imageFiles.length})</h4>
            </div>
            <div className="images-list">
              {imageFiles.map((img, index) => (
                <div key={img.id} className="image-item">
                  <div className="image-preview">
                    <img
                      src={img.preview}
                      alt={`Hình ${index + 1}`}
                    />
                    <button
                      className="remove-image-btn"
                      onClick={() => handleRemoveImage(img.id)}
                      type="button"
                      title="Xóa ảnh"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="image-label">Ảnh {index + 1}</div>
                  <div className="image-notes">
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <label style={{ fontSize: '10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>Phần:</span>
                        <select
                          value={imageNotes[img.id]?.part || ''}
                          onChange={(e) => handleImageNoteChange(img.id, 'part', e.target.value)}
                          style={{ fontSize: '11px', padding: '4px 6px', width: '100%', boxSizing: 'border-box' }}
                        >
                          <option value="">-</option>
                          <option value="I">I</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                        </select>
                      </label>
                      <label style={{ fontSize: '10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>Câu:</span>
                        <input
                          type="number"
                          min="1"
                          value={imageNotes[img.id]?.questionNumber || ''}
                          onChange={(e) => handleImageNoteChange(img.id, 'questionNumber', e.target.value)}
                          placeholder="?"
                          style={{ fontSize: '11px', padding: '4px 6px', width: '100%', boxSizing: 'border-box' }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="step-actions">
        <Button
          onClick={handleParseExam}
          disabled={
            examFiles.length === 0 ||
            !apiKey ||
            loading
          }
          className="parse-btn"
          title={
            !apiKey ? '⚠️ Vui lòng nhập API Key trước (click "Cập nhật API Key" ở sidebar)' :
            examFiles.length === 0 ? '⚠️ Vui lòng upload file đề thi ở mục 1 trước' :
            parseCache && parseCache.key === examFiles.map(f => `${f.file.name}-${f.file.size}`).join('|')
              ? 'Đã có cache, click để dùng cache (không parse lại)'
              : 'Click để parse đề thi'
          }
        >
          {loading ? 'Đang parse...' :
            !apiKey ? '🔒 Thiếu API Key' :
            examFiles.length === 0 ? '🔒 Chưa có file đề thi' :
            (parseCache && parseCache.key === examFiles.map(f => `${f.file.name}-${f.file.size}`).join('|'))
              ? '✅ Đã có cache (click để dùng)'
              : 'Parse đề thi và lắp ảnh'}
        </Button>

        {parsedQuestions.length > 0 && (
          <Button
            onClick={() => {
              const firstFilePreview = examFiles.length > 0 ? examFiles[0].preview : null;
              if (onNext) {
                onNext(parsedQuestions, firstFilePreview);
              } else if (onQuestionsParsed) {
                onQuestionsParsed(parsedQuestions, firstFilePreview);
              }
            }}
            className="next-btn"
          >
            Tiếp theo: Upload đáp án trắc nghiệm →
          </Button>
        )}
      </div>

      {loading && <Loading message="AI đang parse đề thi và lắp ảnh..." />}
    </div>
  );
}

