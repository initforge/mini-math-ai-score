import { useState } from 'react';
import FeatureCard from './FeatureCard';
import './FeatureTabs.css';

const tabs = [
  { id: 'teacher', label: 'Cho Giáo viên' },
  { id: 'student', label: 'Cho Học sinh' }
];

const teacherFeatures = [
  {
    title: 'Quản lý Lớp học',
    description: 'Import Excel danh sách lớp, tự động tạo tài khoản học sinh',
    icon: '📚'
  },
  {
    title: 'Ngân hàng Câu hỏi',
    description: 'Quản lý câu hỏi theo môn, độ khó, loại câu hỏi',
    icon: '💡'
  },
  {
    title: 'Ra đề thi AI',
    description: 'AI tự động tạo đề thi từ file PDF/Word hoặc đề xuất từ ngân hàng',
    icon: '🤖'
  },
  {
    title: 'Tổ chức Thi',
    description: 'Tạo phòng thi, theo dõi realtime học sinh đang làm bài',
    icon: '📝'
  },
  {
    title: 'Chấm thi & Phân tích',
    description: 'AI chấm tự luận, phân tích kết quả, đưa ra insights',
    icon: '📊'
  }
];

const studentFeatures = [
  {
    title: 'Làm bài thi',
    description: 'Giao diện làm bài trực quan, đồng hồ đếm ngược realtime',
    icon: '✍️'
  },
  {
    title: 'Xem kết quả',
    description: 'Xem điểm ngay sau khi nộp bài, nhận feedback từ AI',
    icon: '✅'
  },
  {
    title: 'Lịch sử thi',
    description: 'Xem lại tất cả bài đã làm, AI giải thích câu sai',
    icon: '📖'
  },
  {
    title: 'Thống kê cá nhân',
    description: 'Biểu đồ năng lực, AI gợi ý cải thiện',
    icon: '📈'
  }
];

const solutionFeatures = [
  {
    title: 'Vấn đề giải quyết',
    description: 'Tự động hóa quy trình ra đề, chấm thi, phân tích kết quả',
    icon: '🎯'
  },
  {
    title: 'Điểm nổi bật',
    description: 'AI tích hợp, realtime tracking, phân tích thông minh',
    icon: '⭐'
  },
  {
    title: 'Công nghệ',
    description: 'React + Vite, Firebase Realtime Database, Gemini AI',
    icon: '⚡'
  }
];

export default function FeatureTabs() {
  const [activeTab, setActiveTab] = useState('teacher');

  const getFeatures = () => {
    if (activeTab === 'teacher') return teacherFeatures;
    if (activeTab === 'student') return studentFeatures;
    return teacherFeatures; // Default fallback
  };

  return (
    <section className="feature-tabs">
      <div className="container">
        <div className="tabs-header">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="features-grid">
          {getFeatures().map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

