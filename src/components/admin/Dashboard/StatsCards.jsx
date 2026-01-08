import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Card from '../../common/Card';
import { databaseService } from '../../../services/database';
import Loading from '../../common/Loading';
import './StatsCards.css';

gsap.registerPlugin(ScrollTrigger);

export default function StatsCards() {
  const [stats, setStats] = useState({ teachers: 0, students: 0 });
  const [loading, setLoading] = useState(true);
  const cardsRef = useRef([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load users và classes để tính toán chính xác
        const [usersData, classesData] = await Promise.all([
          databaseService.read('users'),
          databaseService.read('classes')
        ]);

        if (usersData) {
          // Đếm giáo viên: tất cả users có role === 'teacher'
          const teachers = Object.values(usersData).filter(u => u.role === 'teacher').length;
          
          // Đếm học sinh: chỉ đếm học sinh đang thuộc ít nhất 1 lớp
          let studentIdsInClasses = new Set();
          if (classesData) {
            Object.values(classesData).forEach(cls => {
              if (cls.studentIds && Array.isArray(cls.studentIds)) {
                cls.studentIds.forEach(id => studentIdsInClasses.add(id));
              }
            });
          }
          
          // Đếm số học sinh unique đang thuộc lớp
          const students = studentIdsInClasses.size;
          
          setStats({ teachers, students });
          
          // Animate numbers
          animateNumbers(teachers, students);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Subscribe cả users và classes để cập nhật real-time
    const unsubscribeUsers = databaseService.subscribe('users', () => {
      loadStats();
    });

    const unsubscribeClasses = databaseService.subscribe('classes', () => {
      loadStats();
    });

    // Card entrance animations
    const timer = setTimeout(() => {
      cardsRef.current.forEach((card, index) => {
        if (card) {
          const scrollTrigger = ScrollTrigger.create({
            trigger: card,
            start: 'top 80%',
            toggleActions: 'play none none none',
            animation: gsap.from(card, {
              y: 50,
              opacity: 0,
              duration: 0.6,
              delay: index * 0.1,
              ease: 'back.out(1.7)'
            })
          });
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars?.trigger?.classList?.contains('stat-card')) {
          trigger.kill();
        }
      });
      unsubscribeUsers();
      unsubscribeClasses();
    };
  }, []);

  const animateNumbers = (teachers, students) => {
    const teacherCard = cardsRef.current[0];
    const studentCard = cardsRef.current[1];
    
    if (teacherCard) {
      const numberEl = teacherCard.querySelector('.stat-value');
      if (numberEl) {
        const currentValue = parseInt(numberEl.textContent) || 0;
        gsap.to({ value: currentValue }, {
          value: teachers,
          duration: 1,
          ease: 'power2.out',
          onUpdate: function() {
            numberEl.textContent = Math.round(this.targets()[0].value);
          }
        });
      }
    }
    
    if (studentCard) {
      const numberEl = studentCard.querySelector('.stat-value');
      if (numberEl) {
        const currentValue = parseInt(numberEl.textContent) || 0;
        gsap.to({ value: currentValue }, {
          value: students,
          duration: 1,
          ease: 'power2.out',
          onUpdate: function() {
            numberEl.textContent = Math.round(this.targets()[0].value);
          }
        });
      }
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="stats-cards">
      <Card 
        className="stat-card dashboard-card" 
        ref={el => cardsRef.current[0] = el}
      >
        <div className="stat-icon">👨‍🏫</div>
        <div className="stat-content">
          <h3 className="stat-label">Giáo viên</h3>
          <p className="stat-value">{stats.teachers}</p>
        </div>
        <div className="stat-glow"></div>
      </Card>
      <Card 
        className="stat-card dashboard-card" 
        ref={el => cardsRef.current[1] = el}
      >
        <div className="stat-icon">👨‍🎓</div>
        <div className="stat-content">
          <h3 className="stat-label">Học sinh</h3>
          <p className="stat-value">{stats.students}</p>
        </div>
        <div className="stat-glow"></div>
      </Card>
    </div>
  );
}
