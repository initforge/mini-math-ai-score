import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import './PageTransition.css';

export default function PageTransition({ children }) {
  const location = useLocation();
  const pageRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsVisible(true);
      if (pageRef.current) {
        // Fade in animation - only if element exists
        gsap.fromTo(
          pageRef.current,
          {
            opacity: 0,
            y: 10
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: 'power2.out'
          }
        );
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div 
      ref={pageRef} 
      className="page-transition"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

