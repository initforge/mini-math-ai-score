import { useState, useEffect, useRef } from 'react';
import './CountdownTimer.css';

export default function CountdownTimer({ exam, session, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasCalledTimeUp = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    console.log('[Timer] Props received:', { 
      exam: exam ? { duration: exam.duration, title: exam.title } : null, 
      session: session ? { startedAt: session.startedAt, status: session.status } : null 
    });

    // Cleanup previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    hasCalledTimeUp.current = false;

    // Wait for both exam and session to be loaded
    if (!exam || !session) {
      console.log('[Timer] Waiting for exam or session...');
      setTimeLeft(null);
      setIsLoading(true); // Only set loading when actually waiting
      return;
    }

    // Check if exam has duration
    if (!exam.duration || exam.duration <= 0) {
      console.log('[Timer] No time limit (duration not set)');
      setTimeLeft(-1);
      setIsLoading(false);
      return;
    }

    // Check if session has started
    if (!session.startedAt) {
      console.log('[Timer] Session not started yet');
      setTimeLeft(null);
      return;
    }

    // Calculate exam end time based on when student started
    const examEndTime = session.startedAt + (exam.duration * 60 * 1000);
    const now = Date.now();
    const initialDiff = examEndTime - now;
    
    console.log('[Timer] Setup:', {
      startedAt: new Date(session.startedAt).toLocaleString(),
      startedAtRaw: session.startedAt,
      duration: exam.duration + ' minutes',
      durationMs: exam.duration * 60 * 1000,
      endTime: new Date(examEndTime).toLocaleString(),
      endTimeRaw: examEndTime,
      nowRaw: now,
      timeLeftMs: initialDiff,
      timeLeftSeconds: Math.floor(initialDiff / 1000)
    });

    setIsLoading(false);

    // If already expired, DON'T call onTimeUp immediately - might be a bug
    if (initialDiff <= 0) {
      console.log('[Timer] WARNING: Already expired on load! Not calling onTimeUp yet.');
      setTimeLeft(0);
      return; // Don't call onTimeUp on initial load
    }

    // Update timer every second
    const updateTimer = () => {
      const now = Date.now();
      const diff = examEndTime - now;
      
      if (diff <= 0) {
        setTimeLeft(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (onTimeUp && !hasCalledTimeUp.current) {
          hasCalledTimeUp.current = true;
          console.log('[Timer] Time up! Auto-submitting...');
          onTimeUp();
        }
        return;
      }
      
      setTimeLeft(diff);
    };

    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [exam, session, onTimeUp]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft === -1 || timeLeft === null) return 'var(--color-success)';
    if (timeLeft === 0) return 'var(--color-error)';
    const minutes = Math.floor(timeLeft / 60000);
    if (minutes < 5) return 'var(--color-error)';
    if (minutes < 15) return 'var(--color-warning)';
    return 'var(--color-primary)';
  };

  // Đang tải
  if (isLoading || timeLeft === null) {
    return (
      <div className="countdown-timer" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="timer-icon">⏱️</div>
        <div className="timer-value">--:--</div>
        <div className="timer-label">Đang tải...</div>
      </div>
    );
  }

  // Không giới hạn thời gian
  if (timeLeft === -1) {
    return (
      <div className="countdown-timer" style={{ color: 'var(--color-success)' }}>
        <div className="timer-icon">⏱️</div>
        <div className="timer-value">Không giới hạn</div>
        <div className="timer-label">Thời gian làm bài</div>
      </div>
    );
  }

  // Hết giờ
  if (timeLeft === 0) {
    return (
      <div className="countdown-timer" style={{ color: 'var(--color-error)' }}>
        <div className="timer-icon">⏱️</div>
        <div className="timer-value">00:00</div>
        <div className="timer-label">Hết giờ</div>
      </div>
    );
  }

  // Hiển thị thời gian còn lại
  return (
    <div className="countdown-timer" style={{ color: getTimeColor() }}>
      <div className="timer-icon">⏱️</div>
      <div className="timer-value">{formatTime(timeLeft)}</div>
      <div className="timer-label">Thời gian còn lại</div>
    </div>
  );
}

