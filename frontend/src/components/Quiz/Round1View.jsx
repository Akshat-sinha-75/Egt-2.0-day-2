import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';
import { fetchQuestionsApi } from '../../utils/api';

export default function Round1View({
  participant,
  answers,
  onSelectAnswer,
  onSubmitQuiz,
  onBackToHall,
  onLogout
}) {
  const [roundStatus, setRoundStatus] = useState('WAITING');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [q11Text, setQ11Text] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentIdx, setCurrentIdx] = useState(0); // 0 to 9 for Q1-Q10, 10 for Q11
  const [finalCode, setFinalCode] = useState('');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Poll backend for questions & round status
  useEffect(() => {
    let pollInterval = null;

    async function checkStatus() {
      try {
        const data = await fetchQuestionsApi(participant.token);
        setRoundStatus(data.roundStatus || 'WAITING');
        setTimeRemaining(data.timeRemaining || 0);

        if (data.roundStatus === 'ACTIVE') {
          const sorted = (data.questions || []).sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
            return numA - numB;
          });
          setQuestions(sorted);
          setQ11Text(data.q11 || 'Q11 is being prepared.');
        } else {
          setQuestions([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (participant && participant.token) {
      checkStatus();
      // Poll every 3 seconds so the lobby automatically transitions when admin starts the round
      pollInterval = setInterval(checkStatus, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [participant]);

  // Local second-by-second countdown when active
  useEffect(() => {
    if (roundStatus !== 'ACTIVE' || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [roundStatus, timeRemaining > 0]);

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <section className="round1-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: '#f0d089', fontFamily: 'var(--quiz-font-display)' }}>Consulting the Archives...</h2>
      </section>
    );
  }

  if (error) {
    return (
      <section className="round1-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <h2 style={{ color: '#ff6b6b' }}>Error</h2>
        <p style={{ color: '#fff' }}>{error}</p>
        <button className="btn-ghost" onClick={onBackToHall}>Return to Great Hall</button>
      </section>
    );
  }

  // WAITING LOBBY: If round is not active or questions haven't unlocked yet
  if (roundStatus !== 'ACTIVE' || questions.length === 0) {
    return (
      <section className="round1-page" aria-label="Waiting for Round 1">
        <header className="quiz-top-bar">
          <div className="quiz-top-inner">
            <div className="quiz-brand">
              <span className="brand-title">ROUND 1 · THE O.W.L. VAULT</span>
              <small className="brand-sub">HOGWARTS ACADEMIC EXAMINATION</small>
            </div>

            <div
              className="quiz-who-pill"
              title={`${participant.name} · ${participant.teamId}`}
            >
              <span className="wizard-icon">🧙</span>
              <b>{participant.name}</b>
              <span className="sep">·</span>
              <span>{participant.teamId}</span>
            </div>
          </div>
        </header>

        <main className="quiz-main-wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: '2rem 1rem' }}>
          <div style={{ maxWidth: '640px', width: '100%' }}>
            <article className="qcard th-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>

              <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem', animation: 'float 3s ease-in-out infinite' }}>
                ⏳
              </div>

              <p className="qnum" style={{ letterSpacing: '0.2em', color: '#f0d089', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                THE ANTECHAMBER · ROUND 1
              </p>

              <h2 style={{ fontFamily: 'var(--quiz-font-display)', fontSize: '1.8rem', color: '#fff', margin: '0.5rem 0 1rem' }}>
                Waiting for the Headmaster to Begin
              </h2>

              <p style={{ color: '#b0b8c4', lineHeight: '1.7', fontSize: '1.05rem', margin: '0 auto 2rem', maxWidth: '520px' }}>
                Round 1 has not started yet. Please stand by with your team — once the administrators start the event from the control room, your 10 Trial Keys and the Final Codeword will unlock automatically.
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 22px',
                borderRadius: '999px',
                background: 'rgba(240, 208, 137, 0.08)',
                border: '1px solid rgba(240, 208, 137, 0.25)',
                color: '#f0d089',
                fontSize: '0.85rem',
                letterSpacing: '0.12em',
                fontFamily: 'var(--quiz-font-display)',
                fontWeight: '600'
              }}>
                <span style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#28a745',
                  boxShadow: '0 0 12px #28a745',
                  display: 'inline-block'
                }}></span>
                LIVE SIGNAL ACTIVE · AWAITING START
              </div>

              <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button type="button" className="btn-ghost" onClick={onBackToHall}>
                  ← RETURN TO GREAT HALL
                </button>
                <button type="button" className="btn-ghost" onClick={onLogout} style={{ color: '#d9534f' }}>
                  LOGOUT
                </button>
              </div>
            </article>
          </div>
        </main>
      </section>
    );
  }

  const TOTAL_QUESTIONS = questions.length;
  const isQ11 = currentIdx === TOTAL_QUESTIONS;
  
  const currentQ = isQ11 ? null : questions[currentIdx];
  const currentAnswer = isQ11 ? finalCode : (answers[currentQ.id] || '');

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] != null && answers[k].trim() !== ''
  ).length;

  const handleInputChange = (e) => {
    if (isQ11) {
      setFinalCode(e.target.value);
      if (submitError) setSubmitError('');
    } else {
      onSelectAnswer(currentQ.id, e.target.value);
    }
  };

  const handleConfirmSubmit = async (e) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    const rect = e.currentTarget.getBoundingClientRect();
    spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, '#f0d089', 24);

    try {
      const res = await onSubmitQuiz(finalCode);
      if (res && !res.success) {
        setSubmitError(res.message || 'Incorrect final codeword. The vault remains sealed.');
        setIsSubmitting(false);
        setShowConfirmModal(false);
        setCurrentIdx(TOTAL_QUESTIONS); // Keep user focused on Q11
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit codeword. Please try again.');
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <section className="round1-page" aria-label="Round 1 O.W.L. examination">
      {/* Top Header Bar */}
      <header className="quiz-top-bar">
        <div className="quiz-top-inner">
          <div className="quiz-brand">
            <span className="brand-title">ROUND 1 · THE O.W.L. VAULT</span>
            <small className="brand-sub">HOGWARTS ACADEMIC EXAMINATION</small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span 
              className={`r2-timer-pill ${timeRemaining <= 300000 ? 'urgent' : ''}`}
              style={{ margin: 0, padding: '7px 18px', fontSize: '13px' }}
            >
              ⏳ {formatTime(timeRemaining)}
            </span>

            <div
              className="quiz-who-pill"
              title={`${participant.name} · ${participant.teamId}`}
            >
              <span className="wizard-icon">🧙</span>
              <b>{participant.name}</b>
              <span className="sep">·</span>
              <span>{participant.teamId}</span>
            </div>
            
            <button 
              type="button" 
              className="btn-ghost" 
              onClick={onLogout}
              style={{ fontSize: '11px', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="quiz-main-wrap">
        <div className="quiz-layout-container">
          {/* Left Column: Active Question */}
          <div className="quiz-question-column">
            <article className="qcard th-card">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>

              <div className="q-kicker-row">
                <p className="qnum">
                  {isQ11 ? 'THE FINAL VAULT' : `KEY ${currentIdx + 1} OF ${TOTAL_QUESTIONS}`}
                </p>
                {!isQ11 && currentAnswer && (
                  <span className="done-badge"> RECORDED</span>
                )}
              </div>

              {!isQ11 ? (
                <>
                  <h2 className="qtext" style={{ whiteSpace: 'pre-wrap' }}>{currentQ.text}</h2>
                  {currentQ.hint && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(240, 208, 137, 0.1)', borderLeft: '4px solid #f0d089', color: '#f0d089' }}>
                      <strong>Hint:</strong> {currentQ.hint}
                    </div>
                  )}
                  <div className="opts-group" style={{ marginTop: '2rem' }}>
                    <label style={{ color: '#ccc', marginBottom: '0.5rem', display: 'block' }}>Your Answer (Scratchpad):</label>
                    <input 
                      type="text" 
                      value={currentAnswer} 
                      onChange={handleInputChange} 
                      placeholder="Enter the numerical or string value"
                      style={{
                        width: '100%', padding: '1rem', fontSize: '1.2rem',
                        background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid #555',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                   <h2 className="qtext" style={{ color: '#f0d089' }}>Q11: The Final Codeword</h2>
                   <div style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#ccc', whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
                     {q11Text}
                   </div>
                   <div className="opts-group" style={{ marginTop: '2rem' }}>
                    <label style={{ color: '#f0d089', marginBottom: '0.5rem', display: 'block', fontWeight: 'bold' }}>FINAL CODEWORD:</label>
                    <input 
                      type="text" 
                      value={finalCode} 
                      onChange={handleInputChange} 
                      placeholder="Enter the final codeword to unlock the vault"
                      style={{
                        width: '100%', padding: '1rem', fontSize: '1.5rem',
                        background: 'rgba(0,0,0,0.5)', 
                        color: submitError ? '#ff8080' : '#f0d089', 
                        border: submitError ? '2px solid #ef4444' : '2px solid #f0d089',
                        boxShadow: submitError ? '0 0 14px rgba(239, 68, 68, 0.4)' : 'none',
                        borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '2px',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>

                  {submitError && (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1.1rem 1.3rem',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.6)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      color: '#fca5a5',
                      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)'
                    }}>
                      <span style={{ fontSize: '2rem', flexShrink: 0 }}>❌</span>
                      <div>
                        <strong style={{ color: '#ff6b6b', display: 'block', fontSize: '1rem', letterSpacing: '0.04em', marginBottom: '3px' }}>
                          INCORRECT FINAL CODEWORD
                        </strong>
                        <span style={{ fontSize: '0.92rem', color: '#fecaca', lineHeight: '1.4' }}>
                          {submitError} The vault refuses to open. Please recheck your calculations for Keys 1 through 10 and try again!
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="q-nav-step" style={{ marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={currentIdx <= 0}
                  onClick={() => {
                    setCurrentIdx((prev) => Math.max(0, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ← PREVIOUS
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={currentIdx >= TOTAL_QUESTIONS}
                  onClick={() => {
                    setCurrentIdx((prev) => Math.min(TOTAL_QUESTIONS, prev + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  NEXT →
                </button>
              </div>
            </article>
          </div>

          {/* Right Column: Question Number Palette & Submit Button */}
          <aside className="quiz-sidebar-column" aria-label="Question palette and submission">
            <div className="qpalette-card th-card">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>

              <div className="palette-header">
                <h3 className="palette-title">KEY PALETTE</h3>
                <span className="palette-count-chip">
                  {answeredCount} / {TOTAL_QUESTIONS}
                </span>
              </div>

              {/* Grid of Question Numbers */}
              <nav className="qnav-grid" aria-label="Question numbers">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = answers[q.id] != null && answers[q.id].trim() !== '';
                  let btnClass = 'qgrid-btn';
                  if (isCurrent) btnClass += ' current';
                  else if (isAnswered) btnClass += ' answered';

                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={btnClass}
                      onClick={() => {
                        setCurrentIdx(idx);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      title={`Key ${idx + 1}`}
                    >
                      K{idx + 1}
                    </button>
                  );
                })}
              </nav>
              
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                 <button 
                    type="button" 
                    className={`qgrid-btn ${isQ11 ? 'current' : ''} ${finalCode.trim() ? 'answered' : ''}`}
                    style={{ width: '100%', borderRadius: '4px', padding: '0.8rem', fontWeight: 'bold', fontSize: '1.1rem' }}
                    onClick={() => {
                        setCurrentIdx(TOTAL_QUESTIONS);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                 >
                    Q11: THE VAULT
                 </button>
              </div>

              {/* SUBMIT BUTTON DIRECTLY BELOW QUESTION NUMBERS */}
              <div className="palette-submit-action" style={{ marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn-gold sidebar-submit-btn"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!finalCode.trim() || timeRemaining <= 0}
                >
                  {timeRemaining <= 0 ? 'ROUND TIME EXPIRED' : 'SUBMIT ROUND 1'}&nbsp;
                </button>
                <small className="submit-hint">
                  {timeRemaining <= 0 
                    ? "The examination window has closed."
                    : finalCode.trim() ? "Seals your final codeword for evaluation" : "Enter the final codeword (Q11) to submit"}
                </small>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-veil" onClick={() => !isSubmitting && setShowConfirmModal(false)}>
          <div
            className="modal-card th-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="corner tl"></span>
            <span className="corner tr"></span>
            <span className="corner bl"></span>
            <span className="corner br"></span>

            <h3 className="modal-title">SEAL THE SCROLL?</h3>
            <p className="modal-desc">
              Are you sure you want to submit your final codeword?
              <br />
              <strong style={{ fontSize: '1.2rem', color: '#f0d089', display: 'block', margin: '1rem 0' }}>{finalCode.toUpperCase()}</strong>
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="btn-gold"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
              >
                {isSubmitting ? 'SEALING SCROLL…' : 'SUBMIT '}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
