import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import Card from '../../common/Card';
import StatsCards from './StatsCards';
import ActiveExamsList from './ActiveExamsList';
import './Dashboard.css';

gsap.registerPlugin(ScrollTrigger);

export default function AdminDashboard() {
  const pageRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!pageRef.current || !titleRef.current) return;

    // Set initial state to visible
    gsap.set(pageRef.current, { opacity: 1, visibility: 'visible' });
    gsap.set(titleRef.current, { opacity: 1, y: 0 });

    // Delay to avoid conflict with PageTransition
    const timer = setTimeout(() => {
      // Title animation
      gsap.fromTo(titleRef.current, 
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      );

      // Cards stagger animation
      const cards = document.querySelectorAll('.dashboard-card');
      gsap.fromTo(cards,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 0.2 }
      );
    }, 200);

    return () => {
      clearTimeout(timer);
      // Cleanup animations
      if (titleRef.current) {
        gsap.killTweensOf(titleRef.current);
      }
      const cards = document.querySelectorAll('.dashboard-card');
      cards.forEach(card => gsap.killTweensOf(card));
    };
  }, []);

  return (
    <Layout>
      <div className="admin-dashboard" ref={pageRef}>
        <div className="page-header-wrapper">
          <div className="page-container">
            <PageHeader 
              title="Dashboard"
              subtitle="Tổng quan hệ thống"
            />
          </div>
        </div>
        <div className="dashboard-container">
          <div className="dashboard-content">
            <StatsCards />
            <ActiveExamsList />
          </div>
        </div>
      </div>
    </Layout>
  );
}
