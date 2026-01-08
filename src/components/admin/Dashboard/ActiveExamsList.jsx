import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Card from '../../common/Card';
import { databaseService } from '../../../services/database';
import Loading from '../../common/Loading';
import './ActiveExamsList.css';

gsap.registerPlugin(ScrollTrigger);

export default function ActiveExamsList() {
  const [activeExams, setActiveExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    const loadActiveExams = async () => {
      try {
        const exams = await databaseService.read('exams');
        if (exams) {
          const active = Object.entries(exams)
            .filter(([_, exam]) => exam.status === 'active')
            .map(([id, exam]) => ({ id, ...exam }));
          setActiveExams(active);
        }
      } catch (error) {
        console.error('Error loading active exams:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActiveExams();
    
    const unsubscribe = databaseService.subscribe('exams', (exams) => {
      if (exams) {
        const active = Object.entries(exams)
          .filter(([_, exam]) => exam.status === 'active')
          .map(([id, exam]) => ({ id, ...exam }));
        setActiveExams(active);
      }
    });

    // Entrance animation
    if (listRef.current) {
      const scrollTrigger = ScrollTrigger.create({
        trigger: listRef.current,
        start: 'top 80%',
        toggleActions: 'play none none none',
        animation: gsap.from(listRef.current, {
          y: 30,
          opacity: 0,
          duration: 0.6,
          delay: 0.3,
          ease: 'power3.out'
        })
      });

      return () => {
        scrollTrigger?.kill();
      };
    }

    return unsubscribe;
  }, []);

  if (loading) return <Loading />;

  return (
    <Card className="active-exams-card dashboard-card" ref={listRef}>
      <div className="card-header">
        <h2>Đề thi đang diễn ra (Realtime)</h2>
        <div className="live-indicator">
          <span className="live-dot"></span>
          Live
        </div>
      </div>
      {activeExams.length === 0 ? (
        <p className="no-exams">Không có đề thi nào đang diễn ra</p>
      ) : (
        <div className="exams-list">
          {activeExams.map((exam, index) => (
            <div 
              key={exam.id} 
              className="exam-item"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="exam-header">
                <h3>{exam.title}</h3>
                <span className="exam-status-badge">Đang diễn ra</span>
              </div>
              <div className="exam-info">
                <p><strong>Môn:</strong> {exam.subject}</p>
                <p><strong>Thời gian kết thúc:</strong> {new Date(exam.endTime).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
