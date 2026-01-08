import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import Card from '../../common/Card';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import './Statistics.css';

gsap.registerPlugin(ScrollTrigger);

export default function Statistics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ subjects: {}, average: 0, exams: [] });
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    loadStats();
    
    // Entrance animation
    const timer = setTimeout(() => {
      if (pageRef.current) {
        gsap.set(pageRef.current, { opacity: 1, y: 0 });
        gsap.from(pageRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load exam results
      const resultsData = await databaseService.read('examResults');
      const templatesData = await databaseService.read('examTemplates');
      
      if (!resultsData || !templatesData) {
        setStats({ sections: {}, average: 0, exams: [], totalExams: 0 });
        setLoading(false);
        return;
      }

      // Initialize exactly 4 sections
      const sectionScores = {
        'Phần I': { total: 0, max: 0, count: 0 },
        'Phần II': { total: 0, max: 0, count: 0 },
        'Phần III': { total: 0, max: 0, count: 0 },
        'Phần IV': { total: 0, max: 0, count: 0 }
      };
      
      let totalScore = 0;
      let totalMax = 0;
      let examCount = 0;

      for (const [examId, results] of Object.entries(resultsData)) {
        if (results[user.id]) {
          const result = results[user.id];
          const exam = templatesData[examId];
          
          if (exam && result.results && exam.questions) {
            examCount++;
            
            // Process each question result
            result.results.forEach((questionResult, index) => {
              const question = exam.questions[index];
              if (!question) return;

              // Determine section based on question.section field
              let section = question.section;
              
              // If no section field, determine by type
              if (!section) {
                if (question.type === 'multiple-choice') section = 'Phần I';
                else if (question.type === 'true-false') section = 'Phần II';
                else if (question.type === 'short-answer') section = 'Phần III';
                else if (question.type === 'essay') section = 'Phần IV';
                else section = 'Phần IV'; // Default to Phần IV
              }

              // Ensure section exists (only use 4 sections)
              if (!sectionScores[section]) {
                // Map to closest valid section
                if (section.includes('V') || section.includes('VI')) {
                  section = 'Phần IV';
                }
              }

              if (sectionScores[section]) {
                const score = questionResult.score || 0;
                const maxScore = question.points || 0;

                sectionScores[section].total += score;
                sectionScores[section].max += maxScore;
                sectionScores[section].count++;

                totalScore += score;
                totalMax += maxScore;
              }
            });
          }
        }
      }

      const average = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0;

      setStats({
        sections: sectionScores,
        average: parseFloat(average),
        exams: [],
        totalExams: examCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({ sections: {}, average: 0, exams: [], totalExams: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine section by question type
  const determineSectionByType = (type, index) => {
    if (type === 'multiple-choice') return 'Phần I';
    if (type === 'true-false') return 'Phần II';
    if (type === 'short-answer') return 'Phần III';
    if (type === 'essay') {
      // Distribute essay questions across sections IV, V, VI
      if (index <= 10) return 'Phần IV';
      if (index <= 15) return 'Phần V';
      return 'Phần VI';
    }
    return 'Phần khác';
  };

  if (loading) return <Loading />;

  // Prepare pie chart data for sections
  const pieData = Object.entries(stats.sections).map(([section, data]) => ({
    section,
    percentage: ((data.total / data.max) * 100).toFixed(1),
    score: data.total,
    max: data.max
  }));

  // Prepare bar chart data for sections
  const barData = Object.entries(stats.sections).map(([section, data]) => ({
    section,
    average: ((data.total / data.max) * 100).toFixed(1),
    count: data.count
  }));

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <Layout>
      <div className="statistics-page" ref={pageRef}>
        <div className="page-header-wrapper">
          <div className="page-container">
            <PageHeader 
              title="Thống kê cá nhân"
              subtitle="Theo dõi tiến độ và năng lực học tập"
            />
          </div>
        </div>
        <div className="page-container">
          {stats.totalExams === 0 ? (
            <Card>
              <div className="no-stats">
                <h3>Chưa có dữ liệu thống kê</h3>
                <p>Hãy hoàn thành một số bài thi để xem thống kê chi tiết</p>
              </div>
            </Card>
          ) : (
            <div className="stats-container">
              {/* Summary Card */}
              <Card className="summary-card">
                <h3>Tổng quan</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Số đề đã làm</span>
                    <span className="summary-value">{stats.totalExams}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Điểm trung bình</span>
                    <span className="summary-value" style={{ color: stats.average >= 80 ? '#10b981' : stats.average >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {stats.average}%
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Số phần</span>
                    <span className="summary-value">{Object.keys(stats.sections).length}</span>
                  </div>
                </div>
              </Card>

              {/* Charts Grid */}
              <div className="charts-grid">
                {/* Pie Chart */}
                <Card className="chart-card">
                  <h3>Phân bố điểm theo phần</h3>
                  <div className="pie-chart">
                    <svg viewBox="0 0 200 200" className="pie-svg">
                      {(() => {
                        let currentAngle = 0;
                        return pieData.map((item, index) => {
                          const percentage = parseFloat(item.percentage);
                          const angle = (percentage / 100) * 360;
                          const startAngle = currentAngle;
                          currentAngle += angle;
                          
                          const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                          const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                          const endX = 100 + 80 * Math.cos((currentAngle - 90) * Math.PI / 180);
                          const endY = 100 + 80 * Math.sin((currentAngle - 90) * Math.PI / 180);
                          const largeArc = angle > 180 ? 1 : 0;
                          
                          return (
                            <g key={index}>
                              <path
                                d={`M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArc} 1 ${endX} ${endY} Z`}
                                fill={colors[index % colors.length]}
                                opacity="0.8"
                              />
                            </g>
                          );
                        });
                      })()}
                    </svg>
                    <div className="pie-legend">
                      {pieData.map((item, index) => (
                        <div key={index} className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: colors[index % colors.length] }}></span>
                          <span className="legend-text">{item.section}: {item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Bar Chart */}
                <Card className="chart-card">
                  <h3>Điểm trung bình theo phần</h3>
                  <div className="bar-chart">
                    {barData.map((item, index) => (
                      <div key={index} className="bar-item">
                        <div className="bar-label">{item.section}</div>
                        <div className="bar-wrapper">
                          <div 
                            className="bar-fill" 
                            style={{ 
                              width: `${item.average}%`,
                              backgroundColor: colors[index % colors.length]
                            }}
                          >
                            <span className="bar-value">{item.average}%</span>
                          </div>
                        </div>
                        <div className="bar-info">{item.count} câu</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
