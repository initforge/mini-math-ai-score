import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import Layout from '../../common/Layout';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import { useApiKey } from '../../../contexts/ApiKeyContext';
import CountdownTimer from './CountdownTimer';
import QuestionList from './QuestionList';
import ResultDisplay from './ResultDisplay';
import './ExamRoom.css';

export default function ExamRoom() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { apiKey } = useApiKey();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const roomRef = useRef(null);

  useEffect(() => {
    loadExam();
    
    // Listen for session updates
    const unsubscribe = databaseService.subscribe(`examSessions/${examId}/${user?.id}`, (sessionData) => {
      if (sessionData) {
        setSession(sessionData);
        if (sessionData.answers) {
          setAnswers(sessionData.answers);
        }
        if (sessionData.status === 'submitted') {
          setSubmitted(true);
          loadResult();
        }
      }
    });

    return unsubscribe;
  }, [examId, user]);

  const loadExam = async () => {
    setLoading(true);
    try {
      // Load từ examTemplates - nguồn chung
      const examData = await databaseService.read(`examTemplates/${examId}`);
      if (!examData) {
        alert('Đề thi không tồn tại');
        navigate('/student/home');
        return;
      }

      // Kiểm tra thời gian: nếu có noEndTime = true thì không bao giờ khóa
      const now = Date.now();
      const startTime = examData.startTime || 0;
      const endTime = examData.endTime;
      const noEndTime = examData.noEndTime || false;

      if (examData.status !== 'active' && examData.status !== 'scheduled') {
        alert('Đề thi chưa bắt đầu hoặc đã kết thúc');
        navigate('/student/home');
        return;
      }

      // Kiểm tra thời gian bắt đầu
      if (now < startTime) {
        alert('Đề thi chưa bắt đầu');
        navigate('/student/home');
        return;
      }

      // Kiểm tra thời gian kết thúc (nếu có)
      if (!noEndTime && endTime && now > endTime) {
        alert('Đề thi đã kết thúc');
        navigate('/student/home');
        return;
      }

      setExam(examData);
      
      console.log('[ExamRoom] Loaded exam:', {
        id: examId,
        title: examData.title,
        duration: examData.duration,
        status: examData.status
      });

      // Load questions
      if (examData.questions && examData.questions.length > 0) {
        // Check if questions already have full data or just references
        const firstQ = examData.questions[0];
        
        if (firstQ.content) {
          // Full question data already in exam
          const questionsList = examData.questions.map((q, index) => ({
            ...q,
            order: q.order !== undefined ? q.order : index,
            points: q.points || 1
          }));
          questionsList.sort((a, b) => (a.order || 0) - (b.order || 0));
          setQuestions(questionsList);
        } else if (firstQ.questionId) {
          // Reference format - need to fetch
          const questionsList = [];
          for (const qRef of examData.questions) {
            const question = await databaseService.read(`questions/${qRef.questionId}`);
            if (question) {
              questionsList.push({ ...question, order: qRef.order, points: qRef.points });
            }
          }
          questionsList.sort((a, b) => a.order - b.order);
          setQuestions(questionsList);
        }
      }

      // Check existing session
      const sessionData = await databaseService.read(`examSessions/${examId}/${user.id}`);
      if (sessionData?.status === 'submitted') {
        // If session is already submitted, show result
        setSubmitted(true);
        setSession(sessionData);
        loadResult();
        return; // Stop here, don't create new session
      } else if (!sessionData) {
        // Create new session with explicit timestamp
        const now = Date.now();
        const newSession = {
          startedAt: now,
          status: 'in_progress',
          answers: {}
        };
        console.log('[ExamRoom] Creating new session with timestamp:', now, new Date(now).toLocaleString());
        await databaseService.update(`examSessions/${examId}/${user.id}`, newSession);
        setSession(newSession);
        console.log('[ExamRoom] Created new session:', newSession);
      } else {
        // Check if startedAt is valid timestamp (must be 13 digits, between 2020-2030)
        const isValidTimestamp = sessionData.startedAt && 
                                 sessionData.startedAt > 1577836800000 && // Jan 1, 2020
                                 sessionData.startedAt < 1893456000000;   // Jan 1, 2030
        
        if (!isValidTimestamp) {
          console.error('[ExamRoom] Invalid timestamp detected:', sessionData.startedAt);
          console.log('[ExamRoom] Creating fresh session...');
          const now = Date.now();
          const newSession = {
            startedAt: now,
            status: 'in_progress',
            answers: {}
          };
          await databaseService.update(`examSessions/${examId}/${user.id}`, newSession);
          setSession(newSession);
        } else {
          setSession(sessionData);
          console.log('[ExamRoom] Loaded existing session:', sessionData);
          if (sessionData.answers) {
            setAnswers(sessionData.answers);
          }
        }
      }
    } catch (error) {
      console.error('Error loading exam:', error);
      alert('Lỗi khi tải đề thi');
    } finally {
      setLoading(false);
    }
  };

  const loadResult = async () => {
    try {
      const resultData = await databaseService.read(`examResults/${examId}/${user.id}`);
      if (resultData) {
        setResult(resultData);
      }
    } catch (error) {
      console.error('Error loading result:', error);
    }
  };

  const handleAnswerChange = async (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    
    // Save to Firebase realtime
    await databaseService.update(`examSessions/${examId}/${user.id}/answers`, {
      [questionId]: answer
    });
  };

  const handleSubmit = async () => {
    const confirmed = window.confirm('Bạn có chắc muốn nộp bài? Sau khi nộp không thể sửa lại.');
    
    if (!confirmed) return;

    try {
      // Update session status
      await databaseService.update(`examSessions/${examId}/${user.id}`, {
        status: 'submitted',
        submittedAt: Date.now()
      });

      // Grade exam using new grading service
      const { gradeExam } = await import('../../../services/gradingService');
      // Use teacher's API key from exam, fallback to student's key, then localStorage
      const gradingApiKey = exam.teacherApiKey || apiKey || 
                           localStorage.getItem('geminiApiKey') || 
                           localStorage.getItem('gemini_api_key');
      
      console.log('[ExamRoom] Grading with API key from:', {
        hasTeacherKey: !!exam.teacherApiKey,
        hasStudentKey: !!apiKey,
        hasLocalStorageKey: !!(localStorage.getItem('geminiApiKey') || localStorage.getItem('gemini_api_key')),
        finalKeyAvailable: !!gradingApiKey
      });
      
      const resultData = await gradeExam(questions, answers, gradingApiKey);
      
      resultData.sessionId = `${examId}_${user.id}_${Date.now()}`;

      // Save result to database
      await databaseService.update(`examResults/${examId}/${user.id}`, resultData);
      
      // Log student exam
      const { logService } = await import('../../../services/logService');
      await logService.logStudentExam(
        user.username,
        examId,
        {
          score: resultData.score,
          maxScore: resultData.maxScore,
          percentage: resultData.percentage
        }
      );
      
      setResult(resultData);
      setSubmitted(true);
      
      console.log('[ExamRoom] Grading complete:', resultData);
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Lỗi khi nộp bài: ' + error.message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (roomRef.current) {
        gsap.set(roomRef.current, { opacity: 1, y: 0 });
        gsap.from(roomRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [examId]);

  if (loading) return <Loading />;
  if (!exam) return null;
  if (submitted && result) {
    return <ResultDisplay result={result} exam={exam} questions={questions} />;
  }
  
  // If submitted but no result yet - just show waiting message
  if (submitted && !result) {
    return (
      <Layout>
        <div className="exam-room">
          <Card className="submitted-card">
            <h2>Đã nộp bài</h2>
            <p>Bài thi của bạn đã được nộp. Đang tải kết quả...</p>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="exam-room" ref={roomRef}>
        <div className="page-container">
        <div className="exam-header-section">
          <h1 className="exam-title">{exam.title}</h1>
          <CountdownTimer 
            exam={exam}
            session={session}
            onTimeUp={handleSubmit}
          />
        </div>

        <Card className="questions-card">
          <QuestionList
            questions={questions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />
        </Card>

        <div className="submit-section">
          <Button 
            onClick={handleSubmit}
            className="submit-button"
            disabled={submitted}
          >
            {submitted ? 'Đã nộp bài' : 'Nộp bài'}
          </Button>
        </div>
        </div>
      </div>
    </Layout>
  );
}
