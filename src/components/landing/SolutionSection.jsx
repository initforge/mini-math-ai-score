import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Card from '../common/Card';
import './SolutionSection.css';

gsap.registerPlugin(ScrollTrigger);

export default function SolutionSection() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    if (!sectionRef.current || !titleRef.current) return;

    // Title animation
    gsap.set(titleRef.current, { opacity: 1, y: 0 });
    const titleTrigger = ScrollTrigger.create({
      trigger: titleRef.current,
      start: 'top 80%',
      toggleActions: 'play none none none',
      animation: gsap.from(titleRef.current, {
        opacity: 0,
        y: -30,
        duration: 0.8,
        ease: 'power3.out'
      })
    });

    // Cards animation
    cardsRef.current.forEach((card, index) => {
      if (card) {
        gsap.set(card, { opacity: 1, y: 0 });
        const cardTrigger = ScrollTrigger.create({
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none none',
          animation: gsap.from(card, {
            opacity: 0,
            y: 50,
            duration: 0.6,
            delay: index * 0.15,
            ease: 'back.out(1.7)'
          })
        });
      }
    });

    return () => {
      titleTrigger?.kill();
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars?.trigger?.classList?.contains('solution-card')) {
          trigger.kill();
        }
      });
    };
  }, []);

  return (
    <section className="solution-section" ref={sectionRef}>
      <div className="container">
        <h2 className="section-title" ref={titleRef}>
          Giải pháp toàn diện cho giáo dục
        </h2>
        <div className="solution-grid">
          <Card 
            className="solution-card" 
            ref={el => cardsRef.current[0] = el}
          >
            <div className="solution-icon">🎯</div>
            <h3>Vấn đề giải quyết</h3>
            <ul>
              <li>✓ Tiết kiệm thời gian ra đề thi</li>
              <li>✓ Tự động hóa quy trình chấm thi</li>
              <li>✓ Phân tích kết quả học tập thông minh</li>
              <li>✓ Quản lý lớp học hiệu quả</li>
            </ul>
          </Card>
          <Card 
            className="solution-card" 
            ref={el => cardsRef.current[1] = el}
          >
            <div className="solution-icon">⭐</div>
            <h3>Điểm nổi bật</h3>
            <ul>
              <li>✓ AI tạo đề thi tự động từ tài liệu</li>
              <li>✓ Realtime tracking học sinh làm bài</li>
              <li>✓ AI chấm tự luận và đưa ra feedback</li>
              <li>✓ Phân tích thống kê chi tiết</li>
            </ul>
          </Card>
          <Card 
            className="solution-card" 
            ref={el => cardsRef.current[2] = el}
          >
            <div className="solution-icon">⚡</div>
            <h3>Công nghệ sử dụng</h3>
            <ul>
              <li>✓ React + Vite - Frontend hiện đại</li>
              <li>✓ Firebase Realtime Database</li>
              <li>✓ Gemini AI - Xử lý thông minh</li>
              <li>✓ Cloud Functions - Backend mạnh mẽ</li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}

