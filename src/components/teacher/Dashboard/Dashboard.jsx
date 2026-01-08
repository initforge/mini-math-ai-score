import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import UpcomingExams from './UpcomingExams';
import StudentStats from './StudentStats';
import './Dashboard.css';

export default function TeacherDashboard() {
  const pageRef = useRef(null);

  useEffect(() => {
    if (!pageRef.current) return;

    const timer = setTimeout(() => {
      const cards = document.querySelectorAll('.dashboard-section');
      gsap.from(cards, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out'
      });
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout>
      <div className="teacher-dashboard" ref={pageRef}>
        <div className="page-header-wrapper">
          <div className="page-container">
            <PageHeader 
              title="Dashboard"
              subtitle="Quản lý lớp học và kỳ thi"
            />
          </div>
        </div>
        <div className="dashboard-container">
          <div className="dashboard-grid">
            <div className="dashboard-main dashboard-section">
              <UpcomingExams />
              <StudentStats />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
