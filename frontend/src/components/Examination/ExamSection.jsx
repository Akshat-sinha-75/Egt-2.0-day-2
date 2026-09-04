import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';

const CANDLES = [
  { left: '8%', top: '16%', dur: '6.5s', del: '-1s' },
  { left: '19%', top: '7%', dur: '7.6s', del: '-3s' },
  { left: '64%', top: '5%', dur: '6.9s', del: '-5s' },
  { left: '79%', top: '12%', dur: '7.2s', del: '-2s' },
  { left: '91%', top: '24%', dur: '6.4s', del: '-4s' },
];

export default function ExamSection({ onTriggerToast, onStartQuiz }) {
  const [housePoints, setHousePoints] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bbHousePoints');
      if (stored) {
        setHousePoints(parseInt(stored, 10) || 0);
      }
    } catch (e) {
      console.warn('localStorage read error:', e);
    }
  }, []);

  const handleStartQuiz = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const clickX = e.clientX || rect.left + rect.width / 2;
    const clickY = e.clientY || rect.top + rect.height / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${clickX - rect.left - size / 2}px`;
    ripple.style.top = `${clickY - rect.top - size / 2}px`;

    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 750);

    spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, '#f0d089', 24);

    if (onTriggerToast) {
      onTriggerToast('✦ THE QUIZ PORTAL OPENS — SIGN THE SCROLL ✦');
    }

    if (onStartQuiz) {
      onStartQuiz();
    }
  };

  return (
    <section id="exams" aria-label="Wizarding examination">
      {CANDLES.map((c, idx) => (
        <span
          key={idx}
          className="candle"
          style={{
            left: c.left,
            top: c.top,
            '--dur': c.dur,
            '--del': c.del,
          }}
        />
      ))}

      <p className="label reveal">THE SECOND TASK</p>
      <h2 className="sec-title reveal">WIZARDING EXAMINATION</h2>
      <p className="sec-sub reveal">PROVE YOUR KNOWLEDGE. EARN YOUR HOUSE POINTS.</p>
      <div className="reveal">
        <span className="points-pill">
          🏆&nbsp; HOUSE POINTS :&nbsp;<b id="housePoints">{housePoints}</b>
        </span>
      </div>

      <div className="exam-card reveal" id="examCard">
        <span className="corner tl"></span>
        <span className="corner tr"></span>
        <span className="corner bl"></span>
        <span className="corner br"></span>

        <span className="card-spark" style={{ top: '14%', left: '10%' }}>
          ✦
        </span>
        <span
          className="card-spark"
          style={{ top: '22%', right: '12%', animationDelay: '1.2s' }}
        >
          ✦
        </span>
        <span
          className="card-spark"
          style={{ bottom: '18%', left: '16%', animationDelay: '2.1s' }}
        >
          ✦
        </span>
        <span
          className="card-spark"
          style={{ bottom: '26%', right: '10%', animationDelay: '0.6s' }}
        >
          ✦
        </span>

        <p className="exam-em">
          <span className="st">✦</span> &nbsp;O.W.L. EXAM&nbsp;{' '}
          <span className="st">✦</span>
        </p>
        <h3>Test your wizarding knowledge.</h3>
        <ul className="exam-meta">
          <li>
            <i>✦</i> 20 QUESTIONS
          </li>
          <li>
            <i>✦</i> TIMED EXAMINATION
          </li>
          <li>
            <i>✦</i> QUALIFY FOR ROUND 2
          </li>
        </ul>
        <button className="quiz-btn" id="startQuiz" onClick={handleStartQuiz}>
          START QUIZ
        </button>
      </div>
    </section>
  );
}
