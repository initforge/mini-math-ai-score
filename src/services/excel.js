import * as XLSX from 'xlsx';
import { generateUsername, generatePassword } from '../utils/usernameGenerator';
import { databaseService } from './database';

export const excelService = {
  // Import Excel file
  async importStudents(file, className, teacherId) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Validate format
          if (!jsonData.length) {
            throw new Error('File Excel không có dữ liệu');
          }
          
          // Process students
          const students = [];
          for (const row of jsonData) {
            const fullName = row['Họ tên'] || row['Họ Tên'] || row['HỌ TÊN'] || '';
            if (!fullName) continue;
            
            const username = await generateUsername(fullName, className);
            const password = generatePassword();
            
            students.push({
              fullName,
              username,
              password,
              className,
              dateOfBirth: row['Ngày sinh'] || row['Ngày Sinh'] || '',
              email: row['Email'] || ''
            });
          }
          
          // Check if class exists
          let classId = null;
          const classes = await databaseService.read('classes');
          if (classes) {
            const existingClass = Object.entries(classes).find(
              ([_, cls]) => cls.name === className && cls.teacherId === teacherId
            );
            if (existingClass) {
              classId = existingClass[0];
            }
          }
          
          if (!classId) {
            classId = await databaseService.create('classes', {
              name: className,
              teacherId,
              studentIds: []
            });
          }
          
          const studentIds = [];
          for (const student of students) {
            const nameParts = student.fullName.trim().split(/\s+/);
            const firstName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
            const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
            
            const userId = await databaseService.create('users', {
              username: student.username,
              password: student.password,
              role: 'student',
              profile: {
                fullName: student.fullName,
                firstName,
                lastName,
                class: className,
                email: student.email || '',
                avatar: ''
              }
            });
            
            studentIds.push(userId);
          }
          
          // Update class with student IDs
          const currentClass = await databaseService.read(`classes/${classId}`);
          const existingIds = currentClass?.studentIds || [];
          await databaseService.update(`classes/${classId}`, {
            studentIds: [...existingIds, ...studentIds]
          });
          
          resolve({ students, classId });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },
  
  // Export Excel với credentials
  exportStudents(students, filename = 'danh_sach_hoc_sinh.xlsx') {
    const data = students.map(student => ({
      'Họ tên': student.fullName,
      'Username': student.username,
      'Password': student.password,
      'Lớp': student.className
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách học sinh');
    
    // Style
    const wscols = [
      { wch: 25 }, // Họ tên
      { wch: 20 }, // Username
      { wch: 15 }, // Password
      { wch: 10 }  // Lớp
    ];
    worksheet['!cols'] = wscols;
    
    XLSX.writeFile(workbook, filename);
  },
  
  // Export results to Excel
  exportResults(results, filename = 'ket_qua_thi.xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kết quả');
    
    const wscols = [
      { wch: 25 }, // Họ tên
      { wch: 10 }, // Lớp
      { wch: 10 }, // Điểm
      { wch: 10 }, // Điểm tối đa
      { wch: 15 }  // Xếp loại
    ];
    worksheet['!cols'] = wscols;
    
    XLSX.writeFile(workbook, filename);
  }
};

