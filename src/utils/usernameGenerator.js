import { databaseService } from '../services/database';

// Chuyển đổi ký tự tiếng Việt sang không dấu
function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str.toLowerCase();
}

// Tách tên đầy đủ thành firstName và lastName
function parseVietnameseName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  
  const firstName = parts[parts.length - 1]; // Tên là từ cuối cùng
  const lastName = parts.slice(0, -1).join(' '); // Họ đệm là các từ còn lại
  
  return { firstName, lastName };
}

// Lấy chữ cái đầu của họ đệm
function getInitialsFromLastName(lastName) {
  if (!lastName) return '';
  const words = lastName.trim().split(/\s+/);
  return words.map(word => {
    const firstChar = removeVietnameseTones(word.charAt(0));
    return firstChar;
  }).join('');
}

// Tạo username base
function generateBaseUsername(fullName, className) {
  const { firstName, lastName } = parseVietnameseName(fullName);
  const firstNameLower = removeVietnameseTones(firstName).toLowerCase();
  const lastNameInitials = getInitialsFromLastName(lastName).toLowerCase();
  const classLower = className.toLowerCase().replace(/\s+/g, '');
  
  return `${firstNameLower}${lastNameInitials}${classLower}`;
}

// Check username exists
async function checkUsernameExists(username) {
  try {
    const users = await databaseService.read('users');
    if (!users) return false;
    
    return Object.values(users).some(user => user.username === username);
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
}

// Generate unique username với suffix
export async function generateUsername(fullName, className) {
  const baseUsername = generateBaseUsername(fullName, className);
  
  // Check nếu base username chưa tồn tại
  const exists = await checkUsernameExists(baseUsername);
  if (!exists) {
    return baseUsername;
  }
  
  // Tìm suffix tiếp theo
  let suffix = 1;
  let username = `${baseUsername}.${suffix}`;
  
  while (await checkUsernameExists(username)) {
    suffix++;
    username = `${baseUsername}.${suffix}`;
  }
  
  return username;
}

// Generate random password
export function generatePassword(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

