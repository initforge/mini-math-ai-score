import { useState, useEffect } from 'react';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Loading from '../../common/Loading';
import SearchableSelect from '../../common/SearchableSelect';
import { databaseService } from '../../../services/database';
import { excelService } from '../../../services/excel';
import { useAuth } from '../../../contexts/AuthContext';
import ResultsTable from './ResultsTable';
import ResultsFilters from './ResultsFilters';
import './Results.css';

export default function Results() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: '',
    scoreRange: '',
    className: ''
  });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [stats, setStats] = useState({
    averageScore: 0,
    totalStudents: 0,
    completedStudents: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (!user) return;

    loadExams();
    loadClasses();
    
    const unsubscribe = databaseService.subscribe('examTemplates', (examsData) => {
      if (examsData) {
        const teacherExams = Object.entries(examsData)
          .map(([id, exam]) => ({ id, ...exam }))
          .filter(exam => 
            exam.createdBy === user.id && 
            (exam.status === 'active' || exam.status === 'completed') // Show active and completed exams
          );
        setExams(teacherExams);
        // Nếu exam đang chọn bị xóa hoặc không còn completed, chọn exam khác
        if (selectedExam && !teacherExams.find(e => e.id === selectedExam)) {
          if (teacherExams.length > 0) {
            setSelectedExam(teacherExams[0].id);
          } else {
            setSelectedExam(null);
          }
        }
      } else {
        setExams([]);
        setSelectedExam(null);
      }
    });

    const unsubscribeClasses = databaseService.subscribe('classes', (classesData) => {
      if (classesData) {
        const classesList = Object.entries(classesData)
          .map(([id, cls]) => ({ id, ...cls }))
          .filter(cls => cls.teacherId === user.id);
        setClasses(classesList);
      } else {
        setClasses([]);
      }
    });

    // Subscribe examResults để cập nhật real-time khi học sinh nộp bài
    const unsubscribeResults = databaseService.subscribe('examResults', () => {
      if (selectedExam) {
        loadResults();
        loadStats();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeClasses();
      unsubscribeResults();
    };
  }, [user, selectedExam]);

  useEffect(() => {
    if (selectedExam) {
      loadResults();
      loadStats();
    }
  }, [selectedExam, filters, selectedClass]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const examsData = await databaseService.read('examTemplates');
      if (examsData && user) {
        const teacherExams = Object.entries(examsData)
          .map(([id, exam]) => ({ id, ...exam }))
          .filter(exam => 
            exam.createdBy === user.id &&
            (exam.status === 'active' || exam.status === 'completed')
          );
        setExams(teacherExams);
        if (teacherExams.length > 0 && !selectedExam) {
          setSelectedExam(teacherExams[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    if (!user) return;
    try {
      const classesData = await databaseService.read('classes');
      if (classesData) {
        const classesList = Object.entries(classesData)
          .map(([id, cls]) => ({ id, ...cls }))
          .filter(cls => cls.teacherId === user.id);
        setClasses(classesList);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadResults = async () => {
    if (!selectedExam) return;
    setLoading(true);
    try {
      const resultsData = await databaseService.read(`examResults/${selectedExam}`);
      if (resultsData) {
        let resultsList = Object.entries(resultsData)
          .map(([studentId, result]) => ({
            studentId,
            ...result
          }));

        // Apply filters
        if (filters.name) {
          const users = await databaseService.read('users');
          resultsList = resultsList.filter(r => {
            const user = users?.[r.studentId];
            return user?.profile?.fullName?.toLowerCase().includes(filters.name.toLowerCase());
          });
        }

        if (filters.scoreRange) {
          const [min, max] = filters.scoreRange.split('-').map(Number);
          resultsList = resultsList.filter(r => r.score >= min && r.score <= max);
        }

        if (filters.grade) {
          resultsList = resultsList.filter(r => getGrade(r.score, r.maxScore) === filters.grade);
        }

        // Filter by selected class
        if (selectedClass !== 'all') {
          const users = await databaseService.read('users');
          resultsList = resultsList.filter(r => {
            const user = users?.[r.studentId];
            return user?.profile?.class === selectedClass;
          });
        } else if (filters.className) {
          const users = await databaseService.read('users');
          resultsList = resultsList.filter(r => {
            const user = users?.[r.studentId];
            return user?.profile?.class === filters.className;
          });
        }

        setResults(resultsList);
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!selectedExam) return;
    try {
      const exam = await databaseService.read(`examTemplates/${selectedExam}`);
      if (!exam) {
        console.log('[Results] Exam not found:', selectedExam);
        return;
      }

      // Lấy danh sách học sinh trong các lớp của giáo viên
      const usersData = await databaseService.read('users');
      const allStudents = usersData ? Object.entries(usersData)
        .map(([id, user]) => ({ id, ...user }))
        .filter(user => user.role === 'student') : [];

      console.log('[Results] Total students in system:', allStudents.length);
      console.log('[Results] Selected exam:', exam.title);
      console.log('[Results] Exam classIds:', exam.classIds);
      console.log('[Results] Selected class filter:', selectedClass);

      let relevantStudents = [];
      
      if (selectedClass !== 'all') {
        // Lọc theo lớp đã chọn
        relevantStudents = allStudents.filter(s => s.profile?.class === selectedClass);
        console.log('[Results] Students in selected class:', relevantStudents.length);
      } else if (exam.classIds && exam.classIds.length > 0) {
        // Lọc theo các lớp của đề thi
        relevantStudents = allStudents.filter(s => 
          exam.classIds.includes(s.profile?.class)
        );
        console.log('[Results] Students in exam classes:', relevantStudents.length);
      } else {
        // Nếu exam không có classIds, lấy hết học sinh của giáo viên
        const classNames = classes.map(c => c.name);
        relevantStudents = allStudents.filter(s => classNames.includes(s.profile?.class));
        console.log('[Results] Students in teacher classes:', relevantStudents.length);
      }

      const totalStudents = relevantStudents.length;
      const studentIds = relevantStudents.map(s => s.id);

      // Lấy kết quả thi
      const resultsData = await databaseService.read(`examResults/${selectedExam}`);
      const allResults = resultsData ? Object.entries(resultsData)
        .map(([studentId, result]) => ({ studentId, ...result }))
        : [];
      
      console.log('[Results] Total exam results:', allResults.length);
      
      // Filter results by relevant students
      const filteredResults = allResults.filter(r => studentIds.includes(r.studentId));
      console.log('[Results] Filtered results:', filteredResults.length);

      const completedStudents = filteredResults.length;
      
      // Tính điểm trung bình
      const averageScore = filteredResults.length > 0
        ? filteredResults.reduce((sum, r) => sum + (r.score || 0), 0) / filteredResults.length
        : 0;

      setStats({
        averageScore: Math.round(averageScore * 100) / 100,
        totalStudents,
        completedStudents
      });
      
      console.log('[Results] Stats:', { averageScore, totalStudents, completedStudents });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getGrade = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'Xuất sắc';
    if (percentage >= 80) return 'Giỏi';
    if (percentage >= 70) return 'Khá';
    if (percentage >= 50) return 'Trung bình';
    return 'Yếu';
  };

  const handleExport = () => {
    if (results.length === 0) {
      alert('Không có dữ liệu để xuất');
      return;
    }

    const exportData = results.map(async (result) => {
      const user = await databaseService.read(`users/${result.studentId}`);
      return {
        'Họ tên': user?.profile?.fullName || result.studentId,
        'Lớp': user?.profile?.class || '-',
        'Điểm': result.score,
        'Điểm tối đa': result.maxScore,
        'Xếp loại': getGrade(result.score, result.maxScore)
      };
    });

    Promise.all(exportData).then(data => {
      excelService.exportResults(data, `ket_qua_${selectedExam}.xlsx`);
    });
  };

  const paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(results.length / itemsPerPage);

  return (
    <Layout>
      <div className="results-page">
        <div className="page-header-wrapper">
          <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
              <div style={{ flex: 1 }}>
                <PageHeader 
                  title="Kết quả & Chấm thi"
                  subtitle="Xem và quản lý kết quả thi"
                />
              </div>
              {selectedExam && (
                <Button 
                  variant="action" 
                  onClick={handleExport}
                  className="export-excel-btn"
                >
                  <span className="btn-icon">📥</span>
                  Xuất Excel
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="page-container">

          <Card>
            <div className="exam-selector">
              <div className="selector-row">
                <div className="selector-item">
                  <label>Chọn đề thi:</label>
                  <SearchableSelect
                    value={selectedExam || ''}
                    onChange={(value) => {
                      setSelectedExam(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '', label: 'Chọn đề thi' },
                      ...exams.map(exam => ({
                        value: exam.id,
                        label: exam.title
                      }))
                    ]}
                    placeholder="Tìm kiếm đề thi..."
                    className="exam-select"
                  />
                </div>
                <div className="selector-item">
                  <label>Chọn lớp:</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="class-select"
                    disabled={!selectedExam}
                  >
                    <option value="all">Tất cả lớp</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.name}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {selectedExam && (
            <Card className="stats-card">
              <h2>Thống kê: {exams.find(e => e.id === selectedExam)?.title}</h2>
              {selectedClass !== 'all' && (
                <p className="filter-info">Lớp: <strong>{selectedClass}</strong></p>
              )}
              <div className="stats-content">\n                <div className="stat-item total">
                  <div className="stat-value">{stats.averageScore}</div>
                  <div className="stat-label">Điểm trung bình</div>
                </div>
                <div className="stats-by-class">
                  <div className="class-stat-item">
                    <span className="class-name">Học sinh đã làm bài</span>
                    <span className="class-count">{stats.completedStudents}/{stats.totalStudents}</span>
                  </div>
                  <div className="class-stat-item">
                    <span className="class-name">Tỷ lệ hoàn thành</span>
                    <span className="class-count">
                      {stats.totalStudents > 0 
                        ? Math.round((stats.completedStudents / stats.totalStudents) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {selectedExam && (
            <>
              <Card>
                <ResultsFilters
                  filters={filters}
                  onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setCurrentPage(1);
                  }}
                />
              </Card>

              {loading ? (
                <Loading />
              ) : (
                <>
                  <ResultsTable
                    results={paginatedResults}
                    getGrade={getGrade}
                    examId={selectedExam}
                  />
                  
                  {totalPages > 1 && (
                    <div className="pagination">
                      <Button
                        variant="secondary"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        Trước
                      </Button>
                      <span className="page-info">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Sau
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
