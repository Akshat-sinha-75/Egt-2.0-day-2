import React, { useState, useEffect } from 'react';
import { ROUND2_RULES } from './QuizData';
import { spawnSparks } from '../../utils/sparks';

export default function Round2RulesView({ participant, onStartRound2, onBackToResults }) {
  const [isReady, setIsReady] = useState(false);
  const [showRiddleModal, setShowRiddleModal] = useState(false);
  const [firstRiddle, setFirstRiddle] = useState('');
  const [isLoadingRiddle, setIsLoadingRiddle] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = async (e) => {
    if (!isReady) return;
    const rect = e.currentTarget.getBoundingClientRect();
    spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, '#43e08a', 28);
    
    setIsLoadingRiddle(true);
    setShowRiddleModal(true);
    try {
      const res = await fetch('http://localhost:3001/api/round2/current', {
        headers: { 'Authorization': `Bearer ${participant?.token || ''}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch riddle');
      
      setFirstRiddle(data.question || 'Wait for admin to configure your path.');
    } catch (err) {
      setFirstRiddle(`Error: ${err.message}`);
    }
    setIsLoadingRiddle(false);
  };

  return (
    <section className="rules-page" aria-label="Round 2 Rules of the Hunt">
      <div className="rules-inner-container">
        {/* Header */}
        <header className="rules-header center">
          <p className="quiz-label">THE SECOND TASK AWAITS</p>
          <h1 className="quiz-sec-title">ROUND 2 · THE CHECKPOINT HUNT</h1>
          <p className="quiz-sec-sub">SIX SEALS · SIX STATIONS · ONE FINAL VAULT</p>

          <div className="rules-chips-row">
            <span className="r-chip">20 QUALIFIED TEAMS</span>
            <span className="r-chip">5 CHECKPOINTS</span>
            <span className="r-chip">1 FINAL DESTINATION</span>
          </div>
        </header>

        {/* 6 Rules Grid */}
        <div className="rules-grid">
          {ROUND2_RULES.map((rule) => (
            <article key={rule.id} className="rule-card th-card">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>

              <h3 className="rule-title">
                <span className="rule-icon">{rule.icon}</span>
                {rule.title}
              </h3>

              <ul className="rule-points">
                {rule.points.map((pt, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: pt }} />
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Action Button */}
        <div className="rules-cta-row center">
          <button
            type="button"
            className="btn-gold start-r2-btn"
            disabled={!isReady}
            onClick={handleStart}
          >
            {isReady ? 'START ROUND 2 ' : 'UNROLLING THE MAP…'}
          </button>
          <div style={{ marginTop: '14px' }}>
            <button type="button" className="btn-ghost" onClick={onBackToResults}>
              ← BACK TO RESULTS
            </button>
          </div>
        </div>
      </div>

      {/* First Riddle Modal */}
      {showRiddleModal && (
        <div className="modal-overlay">
          <div className="modal-content th-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
            <h2 style={{ color: '#43e08a', marginBottom: '1rem' }}>ROUND 2 STARTED</h2>
            <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>Solve this riddle to find your very first destination. When you arrive, scan the QR code there!</p>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '8px', border: '1px solid rgba(240, 208, 137, 0.3)', marginBottom: '1.5rem' }}>
              {isLoadingRiddle ? (
                <p style={{ color: '#f0d089' }}>Unsealing envelope...</p>
              ) : (
                <p style={{ fontSize: '0.95rem', color: '#fff', whiteSpace: 'pre-line', textAlign: 'left', lineHeight: '1.8', fontFamily: "'Poppins', sans-serif", fontWeight: 400 }}>{firstRiddle}</p>
              )}
            </div>

            <button className="btn-ghost" onClick={() => setShowRiddleModal(false)}>CLOSE</button>
          </div>
        </div>
      )}
    </section>
  );
}
