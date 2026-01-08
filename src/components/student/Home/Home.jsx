import { useEffect, useRef, useRef as useRefAlias } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import UpcomingExams from './UpcomingExams';
import ChangePassword from './ChangePassword';
import './Home.css';

gsap.registerPlugin(ScrollTrigger);

export default function StudentHome() {
  const bannerRef = useRef(null);
  const examsRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    let scrollTriggerInstance = null;
    const timer = setTimeout(() => {
      if (bannerRef.current) {
        gsap.set(bannerRef.current, { opacity: 1, y: 0 });
        gsap.from(bannerRef.current, {
          opacity: 0,
          y: -30,
          duration: 0.6,
          ease: 'power2.out'
        });
      }

      if (examsRef.current) {
        gsap.set(examsRef.current, { opacity: 1, y: 0 });
        scrollTriggerInstance = ScrollTrigger.create({
          trigger: examsRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
          animation: gsap.from(examsRef.current, {
            opacity: 0,
            y: 20,
            duration: 0.5,
            ease: 'power2.out'
          })
        });
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
      }
    };
  }, []);

  return (
    <Layout>
      <div className="student-home">
        <div className="student-home-header-wrapper">
          <div className="page-container">
            <div ref={bannerRef}>
              <PageHeader 
                title="Sẵn sàng cho kỳ thi"
                subtitle="Hệ thống thi online thông minh với AI, giúp bạn đạt kết quả tốt nhất"
                image="/images/student-home-banner.png"
                imageAlt="Student studying"
              />
            </div>
          </div>
        </div>
        <div className="content-container">
          <div className="upcoming-exams-section" ref={examsRef}>
            <UpcomingExams />
          </div>
          <ChangePassword />
        </div>
      </div>
    </Layout>
  );
}
