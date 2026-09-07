import React, { useState, useEffect, useCallback, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './App.css';
import CursorOrb from './components/CursorOrb';
import Toast from './components/Toast';
import HeroDuel from './components/Duel/HeroDuel';
import ExamSection from './components/Examination/ExamSection';
import GrandHall from './components/GrandHall/GrandHall';
import Footer from './components/Footer/Footer';
import QuizFlow from './components/Quiz/QuizFlow';

export default function App() {
  const [toast, setToast] = useState({ message: '', isVisible: false });
  const toastTimeoutRef = useRef(null);

  // Check if initial URL hash corresponds to a quiz route
  const isQuizHash = (h) => {
    const clean = h.replace(/^#\/?/, '');
    return ['login', 'round-1', 'results', 'round-2', 'round-2/rules', 'round2/checkpoint'].some((route) =>
      clean.startsWith(route)
    );
  };

  const [currentView, setCurrentView] = useState(() =>
    isQuizHash(window.location.hash) ? 'quiz' : 'hall'
  );

  // Sync route with window hash changes
  useEffect(() => {
    const handleHashChange = () => {
      if (isQuizHash(window.location.hash)) {
        setCurrentView('quiz');
      } else if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#exams') {
        setCurrentView('hall');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Initialize Lenis luxury smooth scrolling for the homepage
  useEffect(() => {
    if (currentView !== 'hall') {
      if (window.lenis) {
        window.lenis.destroy();
        window.lenis = null;
      }
      return;
    }

    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
      infinite: false,
    });

    window.lenis = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Intercept in-page anchor clicks for buttery smooth scrolling
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('#') && !href.startsWith('#/')) {
        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          lenis.scrollTo(targetEl, { offset: 0, duration: 1.35 });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', handleAnchorClick);
      lenis.destroy();
      window.lenis = null;
    };
  }, [currentView]);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimeoutRef.current);
    setToast({ message: msg, isVisible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 2600);
  }, []);

  const scrollToExams = () => {
    if (window.lenis) {
      window.lenis.scrollTo('#exams', { offset: 0, duration: 1.35 });
    } else {
      const el = document.getElementById('exams');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Called when user clicks "START QUIZ" in ExamSection
  const handleStartQuizFromExam = () => {
    window.location.hash = '#/login';
    setCurrentView('quiz');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Called when user clicks "RETURN TO THE GREAT HALL" from any quiz screen
  const handleExitToGreatHall = () => {
    window.location.hash = '#/';
    setCurrentView('hall');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <>
      <CursorOrb />
      <Toast message={toast.message} isVisible={toast.isVisible} />

      {currentView === 'quiz' ? (
        <QuizFlow
          onExitToGreatHall={handleExitToGreatHall}
          onTriggerToast={showToast}
        />
      ) : (
        <>
          {/* Section 1: The Great Duel */}
          <HeroDuel onScrollToExams={scrollToExams} />

          {/* Section 2: Wizarding Examination */}
          <ExamSection
            onTriggerToast={showToast}
            onStartQuiz={handleStartQuizFromExam}
          />

          {/* Section 3: Grand Hall + Footer */}
          <section id="buildathon" aria-label="Bharat Buildathon and footer">
            <GrandHall />
            <Footer />
          </section>
        </>
      )}
    </>
  );
}
