import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Card from '../common/Card';
import './FeatureCard.css';

gsap.registerPlugin(ScrollTrigger);

export default function FeatureCard({ title, description, icon }) {
  const cardRef = useRef(null);
  const iconRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    const icon = iconRef.current;

    if (!card || !icon) return;

    // Hover animation
    const handleMouseEnter = () => {
      gsap.to(card, {
        y: -8,
        scale: 1.02,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(icon, {
        scale: 1.2,
        rotation: 5,
        duration: 0.3,
        ease: 'back.out(1.7)'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(icon, {
        scale: 1,
        rotation: 0,
        duration: 0.3,
        ease: 'back.out(1.7)'
      });
    };

    // Set initial state
    gsap.set(card, { opacity: 1, y: 0 });

    // Scroll animation
    const scrollTrigger = ScrollTrigger.create({
      trigger: card,
      start: 'top 85%',
      toggleActions: 'play none none none',
      animation: gsap.from(card, {
        opacity: 0,
        y: 30,
        duration: 0.5,
        ease: 'power2.out'
      })
    });

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
      scrollTrigger?.kill();
    };
  }, []);

  return (
    <Card className="feature-card" ref={cardRef}>
      <div className="feature-icon" ref={iconRef}>{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </Card>
  );
}

