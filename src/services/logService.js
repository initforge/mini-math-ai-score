import { databaseService } from './database';

/**
 * Ghi log hoạt động của học sinh và giáo viên
 */
export const logService = {
  /**
   * Ghi log học sinh làm bài
   * @param {string} studentId - Username học sinh
   * @param {string} examId - ID đề thi
   * @param {object} metadata - Thông tin bổ sung (điểm số, thời gian làm bài, etc.)
   */
  async logStudentExam(studentId, examId, metadata = {}) {
    try {
      const logData = {
        action: 'student_exam_completed',
        userId: studentId,
        examId,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          type: 'student'
        }
      };
      await databaseService.create('logs', logData);
    } catch (error) {
      console.error('Error logging student exam:', error);
    }
  },

  /**
   * Ghi log giáo viên ra đề thi
   * @param {string} teacherId - Username giáo viên
   * @param {string} examId - ID đề thi
   * @param {string} examTitle - Tên đề thi
   */
  async logTeacherCreateExam(teacherId, examId, examTitle) {
    try {
      const logData = {
        action: 'teacher_create_exam',
        userId: teacherId,
        examId,
        timestamp: Date.now(),
        metadata: {
          examTitle,
          type: 'teacher'
        }
      };
      await databaseService.create('logs', logData);
    } catch (error) {
      console.error('Error logging teacher create exam:', error);
    }
  },

  /**
   * Ghi log giáo viên set lịch thi
   * @param {string} teacherId - Username giáo viên
   * @param {string} examId - ID đề thi
   * @param {number} startTime - Thời gian bắt đầu (timestamp)
   * @param {number} endTime - Thời gian kết thúc (timestamp)
   * @param {array} classIds - Danh sách lớp được thi
   */
  async logTeacherScheduleExam(teacherId, examId, startTime, endTime, classIds = []) {
    try {
      const logData = {
        action: 'teacher_schedule_exam',
        userId: teacherId,
        examId,
        timestamp: Date.now(),
        metadata: {
          startTime,
          endTime,
          startTimeFormatted: new Date(startTime).toLocaleString('vi-VN'),
          endTimeFormatted: new Date(endTime).toLocaleString('vi-VN'),
          classIds,
          type: 'teacher'
        }
      };
      await databaseService.create('logs', logData);
    } catch (error) {
      console.error('Error logging teacher schedule exam:', error);
    }
  }
};

