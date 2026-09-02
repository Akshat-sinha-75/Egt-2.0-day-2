import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import CursorOrb from './components/CursorOrb';
import Toast from './components/Toast';
import HeroDuel from './components/Duel/HeroDuel';
import ExamSection from './components/Examination/ExamSection';
import GrandHall from './components/GrandHall/GrandHall';
import Footer from './components/Footer/Footer';

export default function App() {
  const [toast, setToast] = useState({ message: '', isVisible: false });
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimeoutRef.current);
    setToast({ message: msg, isVisible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 2600);
  }, []);

  const scrollToExams = () => {
    const el = document.getElementById('exams');
    if (el) {
      el.scrollIntoView({ behavior: 'auto' });
    }
  };

  return (
    <>
      <CursorOrb />
      <Toast message={toast.message} isVisible={toast.isVisible} />

      {/* Section 1: The Great Duel */}
      <HeroDuel onScrollToExams={scrollToExams} />

      {/* Section 2: Wizarding Examination */}
      <ExamSection onTriggerToast={showToast} />

      {/* Section 3: Grand Hall + Footer */}
      <section id="buildathon" aria-label="Bharat Buildathon and footer">
        <GrandHall />
        <Footer />
      </section>
    </>
  );
}
