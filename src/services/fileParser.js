/**
 * Service parse file danh sách học sinh
 * (Các function parse đề thi/đáp án đã được chuyển sang aiFileProcessor.js)
 */

import * as XLSX from 'xlsx';
import { databaseService } from './database';
import { parseStudentListWithAI } from './aiFileProcessor';

/**
 * Parse file danh sách học sinh và tạo tài khoản (dùng AI)
 */
export async function parseStudentList(file, className, teacherId, apiKey) {
  if (!apiKey) {
    throw new Error('API Key không được để trống');
  }

  // Parse bằng AI
  const studentsData = await parseStudentListWithAI(file, className, apiKey);
  
  if (!studentsData || studentsData.length === 0) {
    throw new Error('Không tìm thấy học sinh nào trong file');
  }

  const { generateUsername, generatePassword } = await import('../utils/usernameGenerator');
  
  // Tạo tài khoản cho từng học sinh
  const students = [];
  for (const studentData of studentsData) {
    if (!studentData.fullName) continue; // Bỏ qua nếu không có tên
    
    // Tạo username và password
    const username = await generateUsername(studentData.fullName, className);
    const password = generatePassword();
    
    // Tách tên
    const nameParts = studentData.fullName.trim().split(/\s+/);
    const firstName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
    const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
    
    // Tạo tài khoản học sinh
    const userId = await databaseService.create('users', {
      username,
      password,
      role: 'student',
      profile: {
        fullName: studentData.fullName,
        firstName,
        lastName,
        class: className,
        studentId: studentData.studentId || '',
        dateOfBirth: studentData.dateOfBirth || '',
        email: '',
        avatar: ''
      }
    });
    
    students.push({
      id: userId,
      studentId: studentData.studentId || '',
      fullName: studentData.fullName,
      firstName,
      lastName,
      dateOfBirth: studentData.dateOfBirth || '',
      className,
      username,
      password
    });
  }
  
  // Tạo hoặc cập nhật lớp
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
  
  // Cập nhật danh sách học sinh trong lớp
  const currentClass = await databaseService.read(`classes/${classId}`);
  const existingIds = currentClass?.studentIds || [];
  const newStudentIds = students.map(s => s.id);
  await databaseService.update(`classes/${classId}`, {
    studentIds: [...existingIds, ...newStudentIds]
  });
  
  return { students, classId };
}

/**
 * Parse file danh sách học sinh và tạo tài khoản (rule-based - fallback)
 * @deprecated Dùng parseStudentList với AI thay thế
 */
export async function parseStudentListLegacy(file, className, teacherId) {
  const { generateUsername, generatePassword } = await import('../utils/usernameGenerator');
  
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  // Tìm hàng header
  let headerRowIndex = -1;
  let headerMap = {};
  
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (Array.isArray(row)) {
      const rowText = row.join(' ').toLowerCase();
      if (rowText.includes('mã học sinh') || rowText.includes('họ và tên') || rowText.includes('họ tên') || rowText.includes('stt')) {
        headerRowIndex = i;
        // Map các cột
        row.forEach((cell, index) => {
          const cellText = String(cell).toLowerCase().trim();
          if (cellText.includes('stt')) headerMap.stt = index;
          if (cellText.includes('mã học sinh')) headerMap.studentId = index;
          if (cellText.includes('họ và tên') || cellText.includes('họ tên')) headerMap.fullName = index;
          if (cellText.includes('ngày sinh')) headerMap.dateOfBirth = index;
        });
        break;
      }
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error('Không tìm thấy header trong file Excel');
  }
  
  // Parse dữ liệu học sinh
  const students = [];
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!Array.isArray(row)) continue;
    
    const studentId = headerMap.studentId !== undefined ? String(row[headerMap.studentId] || '').trim() : '';
    const fullName = headerMap.fullName !== undefined ? String(row[headerMap.fullName] || '').trim() : '';
    const dateOfBirth = headerMap.dateOfBirth !== undefined ? String(row[headerMap.dateOfBirth] || '').trim() : '';
    
    if (!fullName) continue; // Bỏ qua hàng không có tên
    
    // Tạo username và password
    const username = await generateUsername(fullName, className);
    const password = generatePassword();
    
    // Tách tên
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
    const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
    
    // Tạo tài khoản học sinh
    const userId = await databaseService.create('users', {
      username,
      password,
      role: 'student',
      profile: {
        fullName,
        firstName,
        lastName,
        class: className,
        studentId,
        dateOfBirth,
        email: '',
        avatar: ''
      }
    });
    
    students.push({
      id: userId,
      studentId,
      fullName,
      firstName,
      lastName,
      dateOfBirth,
      className,
      username,
      password
    });
  }
  
  // Tạo hoặc cập nhật lớp
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
  
  // Cập nhật danh sách học sinh trong lớp
  const currentClass = await databaseService.read(`classes/${classId}`);
  const existingIds = currentClass?.studentIds || [];
  const newStudentIds = students.map(s => s.id);
  await databaseService.update(`classes/${classId}`, {
    studentIds: [...existingIds, ...newStudentIds]
  });
  
  return { students, classId };
}
