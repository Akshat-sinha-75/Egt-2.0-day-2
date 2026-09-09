import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';
import { fetchQuestionsApi, API_BASE_URL } from '../../utils/api';

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
  const [retryCount, setRetryCount] = useState(0);

  const [currentIdx, setCurrentIdx] = useState(0); // 0 to 9 for Q1-Q10, 10 for Q11
  const [finalCode, setFinalCode] = useState(() => {
    return sessionStorage.getItem('r1_final_code') || '';
  });

  const [localAnswers, setLocalAnswers] = useState(() => {
    try {
      const saved = sessionStorage.getItem('r1_answers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return answers || {};
  });

  // Keep localAnswers synced with answers prop if updated from above
  useEffect(() => {
    if (answers && Object.keys(answers).length > 0) {
      setLocalAnswers((prev) => ({ ...prev, ...answers }));
    }
  }, [answers]);

  const mergedAnswers = { ...(answers || {}), ...(localAnswers || {}) };
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [hintCharacter, setHintCharacter] = useState('harry'); // 'harry' | 'voldy'

  // Device & Proctoring Violation States
  const teamKey = participant?.teamId || 'TEAM';
  const mountTimeRef = React.useRef(Date.now());
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [hasAcceptedRules, setHasAcceptedRules] = useState(() => {
    return sessionStorage.getItem('r1_rules_accepted') === 'true';
  });
  const [proctorWarnings, setProctorWarnings] = useState(() => {
    const stored = localStorage.getItem(`r1_warnings_${teamKey}`) || sessionStorage.getItem('r1_proctor_warnings');
    return parseInt(stored || '0', 10);
  });
  const [activeWarningModal, setActiveWarningModal] = useState(null); // null | { count, isFinal, isLocked, title, message }
  const [isQuizLocked, setIsQuizLocked] = useState(() => {
    const isLocked = localStorage.getItem(`r1_locked_${teamKey}`) === 'true';
    const storedWarnings = parseInt(localStorage.getItem(`r1_warnings_${teamKey}`) || sessionStorage.getItem('r1_proctor_warnings') || '0', 10);
    return isLocked || storedWarnings >= 3;
  });

  // Auto-clear scratchpad, warnings, and accepted rules whenever round is reset/WAITING
  useEffect(() => {
    if (roundStatus === 'WAITING') {
      localStorage.removeItem(`r1_warnings_${teamKey}`);
      localStorage.removeItem(`r1_locked_${teamKey}`);
      sessionStorage.removeItem('r1_answers');
      sessionStorage.removeItem('r1_final_code');
      sessionStorage.removeItem('r1_proctor_warnings');
      sessionStorage.removeItem('r1_rules_accepted');
      setLocalAnswers({});
      setFinalCode('');
      setProctorWarnings(0);
      setIsQuizLocked(false);
      setHasAcceptedRules(false);
      setCurrentIdx(0);
    }
  }, [roundStatus, teamKey]);

  // Check if screen is not a laptop/desktop (< 960px or mobile touch agent)
  useEffect(() => {
    const checkDevice = () => {
      const isNarrow = window.innerWidth < 960;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileDevice(isNarrow && isMobileUA);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  });

  const enterFullscreen = () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (e) {}
  };

  // Tab Switch, Focus Loss & Fullscreen Exit Proctor Listener (Active only when round is ACTIVE, rules accepted, and not yet locked)
  useEffect(() => {
    if (roundStatus !== 'ACTIVE' || !hasAcceptedRules || isQuizLocked) return;

    let lastViolationTime = 0;

    const triggerViolation = (reason) => {
      const now = Date.now();
      // Debounce violations within 1.5 seconds to avoid double triggering on a single alt-tab or esc
      if (now - lastViolationTime < 1500) return;
      lastViolationTime = now;

      const isFSEnv = reason === 'fullscreen_exit';

      setProctorWarnings((prev) => {
        const nextCount = prev + 1;
        localStorage.setItem(`r1_warnings_${teamKey}`, nextCount.toString());
        sessionStorage.setItem('r1_proctor_warnings', nextCount.toString());

        if (nextCount >= 3) {
          localStorage.setItem(`r1_locked_${teamKey}`, 'true');
          setIsQuizLocked(true);
          setActiveWarningModal({
            count: 3,
            isLocked: true,
            title: '⛔ 3/3 VIOLATIONS REACHED · ASSESSMENT LOCKED',
            message: 'You have switched tabs, lost window focus, or exited Fullscreen mode 3 times. Your Round 1 assessment has been locked and flagged for invigilator review.'
          });
        } else if (nextCount === 2) {
          setActiveWarningModal({
            count: 2,
            isFinal: true,
            title: isFSEnv ? '🚨 CRITICAL WARNING [2 of 3]: FULLSCREEN EXITED!' : '🚨 CRITICAL WARNING [2 of 3]: FOCUS LOST!',
            message: isFSEnv 
              ? 'You exited mandatory Fullscreen mode! You are on your FINAL WARNING. You must re-enter Fullscreen (F11 / Fn + F11) immediately. One more violation will lock your quiz.'
              : 'Tab switch or window blur detected! You are on your FINAL WARNING. One more violation will immediately lock your quiz.'
          });
        } else {
          setActiveWarningModal({
            count: 1,
            title: isFSEnv ? '⚠️ WARNING [1 of 3]: FULLSCREEN MODE EXITED!' : '⚠️ WARNING [1 of 3]: TAB SWITCH DETECTED!',
            message: isFSEnv
              ? 'You exited Fullscreen mode! Round 1 requires continuous Fullscreen mode. Please press F11 (or Fn + F11) or click below to re-enter Fullscreen.'
              : 'You navigated away or minimized the quiz window. You must remain on this assessment tab in Fullscreen mode at all times during Round 1.'
          });
        }

        return nextCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('tab_switch');
      }
    };

    const handleBlur = () => {
      triggerViolation('window_blur');
    };

    const handleFullscreenChange = () => {
      const isFS = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFS);

      // Only trigger violation after initial mount grace window (2.5s)
      if (!isFS && Date.now() - mountTimeRef.current > 2500) {
        triggerViolation('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [roundStatus, hasAcceptedRules, isQuizLocked, teamKey]);

  // Close hint bubble & randomly pick Harry or Voldy when switching questions
  useEffect(() => {
    setIsHintOpen(false);
    setHintCharacter(Math.random() < 0.5 ? 'harry' : 'voldy');
  }, [currentIdx]);

  // Poll backend for questions & round status
  useEffect(() => {
    let pollInterval = null;
    let isMounted = true;

    async function checkStatus() {
      if (!participant?.token) return;
      try {
        // First, check if team is already in Round 2
        try {
          const r2Res = await fetch(`${API_BASE_URL}/round2/current`, {
            headers: { Authorization: `Bearer ${participant.token}` }
          });
          if (r2Res.ok && isMounted) {
            const r2Data = await r2Res.json();
            if (r2Data && (r2Data.state === 'PENDING_SOLVE' || r2Data.state === 'TRANSIT' || r2Data.state === 'COMPLETE')) {
              window.location.hash = '#/round-2';
              return;
            }
          }
        } catch (e) {
          // ignore R2 check errors
        }

        const data = await fetchQuestionsApi(participant.token);
        if (!isMounted) return;
        
        // If team already submitted Round 1, immediately redirect to Round 2 or Results!
        if (data.roundStatus === 'ALREADY_SUBMITTED' || data.alreadySubmitted) {
          if (data.result === 'QUALIFIED') {
            window.location.hash = '#/round-2';
            return;
          } else {
            window.location.hash = '#/results';
            return;
          }
        }

        setError('');
        setRoundStatus(data.roundStatus || 'WAITING');
        setTimeRemaining(data.timeRemaining || 0);

        if (data.roundStatus === 'ACTIVE') {
          const sorted = (data.questions || []).sort((a, b) => {
            const numA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
            const numB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
            return numA - numB;
          });
          setQuestions(sorted);
          setQ11Text(data.q11 || 'Q11 is being prepared by the Headmaster.');
        } else {
          setQuestions([]);
        }
      } catch (err) {
        if (!isMounted) return;
        // If it's the initial load, record error but keep background polling to catch server wake up
        setError((prev) => prev || err.message || 'Connecting to vault server...');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (participant && participant.token) {
      checkStatus();
      // Poll every 3 seconds so the lobby automatically transitions when admin starts the round
      pollInterval = setInterval(checkStatus, 3000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [participant, retryCount]);

  // Local second-by-second countdown when active
  useEffect(() => {
    if (roundStatus !== 'ACTIVE') return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [roundStatus]);

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <section className="round1-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="card-spark" style={{ fontSize: '28px', color: 'var(--gold-bright)', marginBottom: '14px', animation: 'twk 1.4s infinite' }}>✦</div>
        <h2 style={{ color: '#f0d089', fontFamily: 'var(--quiz-font-display)', letterSpacing: '0.08em', fontSize: '1.4rem' }}>Consulting the Archives...</h2>
        <p style={{ color: '#9aa3c0', marginTop: '8px', fontSize: '13px' }}>Unlocking your examination scroll</p>
      </section>
    );
  }

  if (error && questions.length === 0 && roundStatus !== 'WAITING') {
    return (
      <section className="round1-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', padding: '24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: 'rgba(20, 14, 30, 0.85)', padding: '36px 24px', borderRadius: '14px', border: '1px solid rgba(240, 208, 137, 0.3)' }}>
          <div style={{ color: '#ef4444', fontSize: '24px', marginBottom: '12px' }}>✦</div>
          <h2 style={{ color: '#f0d089', fontFamily: 'var(--quiz-font-display)', fontSize: '1.3rem' }}>Connection In Progress</h2>
          <p style={{ color: '#bcc3dc', margin: '12px 0 24px', fontSize: '13.5px', lineHeight: '1.5' }}>
            {error.includes('Failed to fetch') || error.includes('invalid response')
              ? 'The tournament server is waking up or synchronizing. Retrying signal...'
              : error}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn-gold" 
              onClick={() => {
                setError('');
                setLoading(true);
                setRetryCount((c) => c + 1);
              }}
              style={{ padding: '10px 22px', fontSize: '12px' }}
            >
              RETRY CONNECTION ↻
            </button>
            <button className="btn-ghost" onClick={onBackToHall} style={{ padding: '10px 18px', fontSize: '12px' }}>
              Return to Great Hall
            </button>
          </div>
        </div>
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
              title={`${participant?.name || 'Seeker'} · ${participant?.teamId || 'TEAM'}`}
            >
              <span className="star-dot">✦</span>
              <b>{participant?.name || 'Seeker'}</b>
              <span className="sep">·</span>
              <span>{participant?.teamId || 'TEAM'}</span>
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

              <div style={{ fontSize: '2.5rem', color: '#f0d089', marginBottom: '1.2rem', animation: 'float 3s ease-in-out infinite' }}>
                ✦
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

              <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
  const qKey = currentQ ? (currentQ.id != null ? String(currentQ.id) : String(currentIdx + 1)) : '';
  const currentAnswer = isQ11 ? finalCode : (mergedAnswers[qKey] || '');

  const answeredCount = questions.filter((q, idx) => {
    const k = q.id != null ? String(q.id) : String(idx + 1);
    const val = mergedAnswers[k];
    return val != null && String(val).trim() !== '';
  }).length;

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  const handleAcceptRulesAndStart = () => {
    // Attempt to enter fullscreen immediately on user gesture
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}

    // Ensure scratchpad is freshly initialized
    sessionStorage.removeItem('r1_answers');
    sessionStorage.removeItem('r1_final_code');
    setLocalAnswers({});
    setFinalCode('');
    
    sessionStorage.setItem('r1_rules_accepted', 'true');
    setHasAcceptedRules(true);
    setCurrentIdx(0);
  };

  const handleClearAllScratchpad = () => {
    if (window.confirm('Clear all recorded scratchpad notes for Keys 1 through 10?')) {
      sessionStorage.removeItem('r1_answers');
      setLocalAnswers({});
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (isQ11) {
      setFinalCode(val);
      sessionStorage.setItem('r1_final_code', val);
      if (submitError) setSubmitError('');
    } else if (currentQ) {
      const targetKey = currentQ.id != null ? String(currentQ.id) : String(currentIdx + 1);
      const updated = { 
        ...mergedAnswers, 
        [targetKey]: val
      };
      setLocalAnswers(updated);
      try {
        sessionStorage.setItem('r1_answers', JSON.stringify(updated));
      } catch (err) {}
      if (onSelectAnswer) {
        onSelectAnswer(targetKey, val);
      }
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

  // RULES OF CONDUCT & FULLSCREEN MANDATE GATE (Shown before Question 1 when Round 1 becomes Active)
  if (roundStatus === 'ACTIVE' && !hasAcceptedRules) {
    return (
      <section className="round1-page" aria-label="Round 1 Rules of Conduct and Fullscreen Gate">
        <header className="quiz-top-bar">
          <div className="quiz-top-inner">
            <div className="quiz-brand">
              <span className="brand-title">ROUND 1 · THE O.W.L. VAULT</span>
              <small className="brand-sub">HOGWARTS ACADEMIC EXAMINATION</small>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span 
                className="r2-timer-pill"
                style={{ margin: 0, padding: '7px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="star-dot">✦</span> {formatTime(timeRemaining)}
              </span>

              <div
                className="quiz-who-pill"
                title={`${participant?.name || 'Seeker'} · ${participant?.teamId || 'TEAM'}`}
              >
                <span className="star-dot">✦</span>
                <b>{participant?.name || 'Seeker'}</b>
                <span className="sep">·</span>
                <span>{participant?.teamId || 'TEAM'}</span>
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

        <main className="quiz-main-wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem 1rem' }}>
          <div style={{ maxWidth: '820px', width: '100%' }}>
            <article className="qcard th-card" style={{ padding: '2.6rem 2.2rem', textAlign: 'center' }}>
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>

              <div style={{ fontSize: '2.8rem', color: '#f0d089', marginBottom: '0.6rem' }}>
                📜
              </div>

              <p className="qnum" style={{ letterSpacing: '0.22em', color: '#f0d089', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                TRIWIZARD TOURNAMENT · MANDATORY EXAMINATION PROTOCOLS
              </p>

              <h1 style={{ fontFamily: 'var(--quiz-font-display)', fontSize: 'clamp(1.6rem, 3.2vw, 2.2rem)', color: '#fff', margin: '0.2rem 0 1.2rem' }}>
                Code of Conduct & Fullscreen Mandate
              </h1>

              {/* Fullscreen Alert Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(229, 190, 104, 0.16) 0%, rgba(16, 20, 43, 0.9) 100%)',
                border: '2px solid rgba(229, 190, 104, 0.7)',
                borderRadius: '10px',
                padding: '1.3rem 1.6rem',
                marginBottom: '1.8rem',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)'
              }}>
                <div style={{ fontSize: '2.6rem', color: '#f0d089', flexShrink: 0 }}>🖥️</div>
                <div>
                  <strong style={{ color: '#f0d089', display: 'block', fontSize: '1.1rem', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    FULLSCREEN MODE IS MANDATORY FOR ALL LAPTOPS
                  </strong>
                  <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.55' }}>
                    Please press <kbd style={{ background: '#070b18', padding: '3px 9px', borderRadius: '4px', border: '1px solid #e5be68', color: '#f5d796', fontWeight: 'bold' }}>F11</kbd> or <kbd style={{ background: '#070b18', padding: '3px 9px', borderRadius: '4px', border: '1px solid #e5be68', color: '#f5d796', fontWeight: 'bold' }}>Fn + F11</kbd> on your laptop keyboard to enter Fullscreen mode, or use the button below.
                  </p>
                </div>
              </div>

              {/* 4 Rules Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.1rem',
                textAlign: 'left',
                marginBottom: '2rem'
              }}>
                <div style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '1.1rem 1.3rem' }}>
                  <strong style={{ color: '#f0d089', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.98rem', marginBottom: '6px' }}>
                    <span>🛡️</span> Strict 3-Strikes Proctoring
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                    Tab-switching, minimizing, or losing window focus triggers anti-cheat strikes. <b>3 strikes permanently lock your assessment.</b>
                  </p>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '1.1rem 1.3rem' }}>
                  <strong style={{ color: '#f0d089', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.98rem', marginBottom: '6px' }}>
                    <span>💻</span> Laptop Workstations Only
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                    All participants must use team laptops. Mobile devices or small touch screens are strictly prohibited.
                  </p>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '1.1rem 1.3rem' }}>
                  <strong style={{ color: '#f0d089', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.98rem', marginBottom: '6px' }}>
                    <span>📝</span> Fresh Scratchpad Ready
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                    Your scratchpad is initialized fresh for Round 1. Record intermediate calculations for Keys 1 through 10 to deduce the codeword.
                  </p>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '1.1rem 1.3rem' }}>
                  <strong style={{ color: '#f0d089', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.98rem', marginBottom: '6px' }}>
                    <span>🔐</span> Submit Q11 to Unlock Round 2
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                    Enter the calculated final codeword in <b>Q11 (The Vault)</b> and seal the scroll before the live round timer expires.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-gold"
                  onClick={handleAcceptRulesAndStart}
                  style={{
                    width: '100%',
                    maxWidth: '560px',
                    padding: '16px 26px',
                    fontSize: '15px',
                    letterSpacing: '0.08em',
                    fontWeight: 'bold',
                    boxShadow: '0 6px 30px rgba(229, 190, 104, 0.4)'
                  }}
                >
                  I AGREE TO THE CODE OF CONDUCT · ENTER FULLSCREEN & BEGIN ✦
                </button>

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleToggleFullscreen}
                  style={{ fontSize: '12px', padding: '8px 20px', color: '#a6b1cf' }}
                >
                  ⛶ Toggle Fullscreen Mode
                </button>
              </div>
            </article>
          </div>
        </main>
      </section>
    );
  }

  const isVoldy = hintCharacter === 'voldy';
  const charData = isVoldy
    ? {
        name: 'Lord Voldemort',
        img: '/assets/voldy.webp',
        speech: "You Muggles can't even do this?",
        title: "✦ THE DARK LORD'S WHISPER ✦",
        footer: `Mockingly revealed by the Dark Lord for Key ${currentIdx + 1}`,
        sparkColor: '#48e28f',
        themeClass: 'theme-voldy'
      }
    : {
        name: 'Harry Potter',
        img: '/assets/harry.webp',
        speech: 'Here for the help!',
        title: "✦ HARRY'S MIND THOUGHT ✦",
        footer: `Extracted from Harry's mind for Key ${currentIdx + 1}`,
        sparkColor: '#f0d089',
        themeClass: 'theme-harry'
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span 
              className={`r2-timer-pill ${timeRemaining <= 300000 ? 'urgent' : ''}`}
              style={{ margin: 0, padding: '7px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="star-dot">✦</span> {formatTime(timeRemaining)}
            </span>

            <div
              className="quiz-who-pill"
              title={`${participant?.name || 'Seeker'} · ${participant?.teamId || 'TEAM'}`}
            >
              <span className="star-dot">✦</span>
              <b>{participant?.name || 'Seeker'}</b>
              <span className="sep">·</span>
              <span>{participant?.teamId || 'TEAM'}</span>
            </div>

            {/* Anti-Cheating / Proctor Warning Counter Pill */}
            <div 
              className={`r1-proctor-pill ${proctorWarnings === 0 ? 'safe' : proctorWarnings === 1 ? 'warn' : 'danger'}`}
              title="Anti-Cheating Proctoring: Tab switches and window focus loss are strictly monitored"
            >
              <span className="proctor-icon">🛡️</span>
              <span className="proctor-text">WARNINGS: <b>{proctorWarnings}/3</b></span>
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
                  <span className="done-badge">✦ RECORDED</span>
                )}
              </div>

              {!isQ11 ? (
                <>
                  <h2 className="qtext" style={{ whiteSpace: 'pre-wrap' }}>{currentQ?.text || 'Loading trial...'}</h2>

                  {/* Admin-Activated Clue / Hint Box */}
                  {currentQ?.hint && (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1.2rem 1.4rem',
                      background: 'linear-gradient(135deg, rgba(240, 208, 137, 0.12), rgba(212, 160, 23, 0.06))',
                      border: '1px solid rgba(240, 208, 137, 0.4)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      boxShadow: '0 4px 20px rgba(240, 208, 137, 0.15)',
                      animation: 'fadeIn 0.4s ease-out'
                    }}>
                      <span style={{ fontSize: '1.6rem', lineHeight: '1', color: '#f0d089', flexShrink: 0 }}>📜</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ color: '#f0d089', fontSize: '0.95rem', letterSpacing: '0.06em', fontFamily: 'var(--quiz-font-display)' }}>
                            ✦ HEADMASTER'S CLUE · HINT UNLOCKED
                          </strong>
                          <span style={{ 
                            background: 'rgba(56, 239, 125, 0.2)', 
                            color: '#38ef7d', 
                            fontSize: '10px', 
                            padding: '2px 7px', 
                            borderRadius: '10px', 
                            fontWeight: 'bold',
                            border: '1px solid rgba(56, 239, 125, 0.4)'
                          }}>
                            LIVE
                          </span>
                        </div>
                        <p style={{ margin: 0, color: '#fef3c7', fontSize: '0.96rem', lineHeight: '1.5' }}>
                          {currentQ.hint}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="opts-group" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ color: '#ccc', margin: 0, display: 'block', fontSize: '13px', letterSpacing: '0.04em' }}>Your Answer (Scratchpad):</label>
                      {currentAnswer && !isQuizLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetKey = currentQ?.id != null ? String(currentQ.id) : String(currentIdx + 1);
                            const updated = { ...mergedAnswers, [targetKey]: '' };
                            setLocalAnswers(updated);
                            try {
                              sessionStorage.setItem('r1_answers', JSON.stringify(updated));
                            } catch (e) {}
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            color: '#d0d8ee',
                            fontSize: '11px',
                            padding: '3px 8px',
                            cursor: 'pointer',
                            fontFamily: 'var(--quiz-font-display)'
                          }}
                        >
                          🧹 Clear Key {currentIdx + 1}
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={currentAnswer} 
                      onChange={handleInputChange} 
                      disabled={!isFullscreen || isQuizLocked}
                      placeholder={
                        isQuizLocked 
                          ? "Assessment locked due to proctoring violations" 
                          : !isFullscreen
                          ? "Fullscreen required to enter answers (Press F11)"
                          : "Enter the numerical or string value"
                      }
                      style={{
                        width: '100%', padding: '1rem', fontSize: '1.15rem',
                        background: isQuizLocked || !isFullscreen ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.3)', 
                        color: isQuizLocked || !isFullscreen ? '#fca5a5' : '#fff', 
                        border: isQuizLocked || !isFullscreen ? '1px solid #ef4444' : '1px solid #555',
                        borderRadius: '6px',
                        cursor: isQuizLocked || !isFullscreen ? 'not-allowed' : 'text'
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="qtext" style={{ whiteSpace: 'pre-wrap' }}>
                    {q11Text || 'Q11: The Final Codeword'}
                  </h2>
                   <div className="opts-group" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ color: '#f0d089', margin: 0, display: 'block', fontWeight: 'bold', letterSpacing: '0.06em' }}>FINAL CODEWORD:</label>
                      {finalCode && isFullscreen && !isQuizLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            setFinalCode('');
                            sessionStorage.removeItem('r1_final_code');
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(240,208,137,0.3)',
                            borderRadius: '4px',
                            color: '#f0d089',
                            fontSize: '11px',
                            padding: '3px 8px',
                            cursor: 'pointer',
                            fontFamily: 'var(--quiz-font-display)'
                          }}
                        >
                          🧹 Clear Codeword
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={finalCode} 
                      onChange={handleInputChange} 
                      disabled={!isFullscreen || isQuizLocked}
                      placeholder={
                        isQuizLocked 
                          ? "Assessment locked" 
                          : !isFullscreen
                          ? "Fullscreen required (Press F11)"
                          : "Enter the final codeword to unlock the vault"
                      }
                      style={{
                        width: '100%', padding: '1rem', fontSize: '1.4rem',
                        background: isQuizLocked || !isFullscreen ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.5)', 
                        color: submitError ? '#ff8080' : isQuizLocked || !isFullscreen ? '#fca5a5' : '#f0d089', 
                        border: submitError ? '2px solid #ef4444' : isQuizLocked || !isFullscreen ? '2px solid #ef4444' : '2px solid #f0d089',
                        boxShadow: submitError || isQuizLocked || !isFullscreen ? '0 0 14px rgba(239, 68, 68, 0.4)' : 'none',
                        borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '2px',
                        transition: 'all 0.3s ease',
                        cursor: isQuizLocked || !isFullscreen ? 'not-allowed' : 'text'
                      }}
                    />
                  </div>

                  {isQuizLocked && (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1.2rem 1.4rem',
                      background: 'rgba(239, 68, 68, 0.18)',
                      border: '2px solid #ef4444',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      color: '#fca5a5',
                      boxShadow: '0 4px 25px rgba(239, 68, 68, 0.3)'
                    }}>
                      <span style={{ fontSize: '2rem', flexShrink: 0, color: '#ef4444' }}>⛔</span>
                      <div>
                        <strong style={{ color: '#ff6b6b', display: 'block', fontSize: '1.05rem', letterSpacing: '0.04em', marginBottom: '4px' }}>
                          ASSESSMENT LOCKED · PROCTORING VIOLATIONS (3/3)
                        </strong>
                        <span style={{ fontSize: '0.92rem', color: '#fecaca', lineHeight: '1.4' }}>
                          Your screen has been locked due to exceeding tab-switch or fullscreen violations. Please summon an invigilator to verify your workstation.
                        </span>
                      </div>
                    </div>
                  )}

                  {submitError && !isQuizLocked && (
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
                      <span style={{ fontSize: '1.6rem', flexShrink: 0, color: '#ef4444' }}>✦</span>
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
                  const k = q.id != null ? String(q.id) : String(idx + 1);
                  const ansVal = mergedAnswers[k];
                  const isAnswered = ansVal != null && String(ansVal).trim() !== '';
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
                      title={`Key ${idx + 1}${q.hint ? ' (💡 Hint Unlocked)' : ''}`}
                      style={{ position: 'relative' }}
                    >
                      K{idx + 1}
                      {q.hint && (
                        <span 
                          style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '-3px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ffd700',
                            boxShadow: '0 0 8px #ffd700',
                            border: '1px solid #fff'
                          }}
                          title="Admin Hint Active"
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
              
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                 <button 
                    type="button" 
                    className={`qgrid-btn ${isQ11 ? 'current' : ''} ${finalCode.trim() ? 'answered' : ''}`}
                    style={{ width: '100%', borderRadius: '6px', padding: '0.8rem', fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '0.04em' }}
                    onClick={() => {
                        setCurrentIdx(TOTAL_QUESTIONS);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                 >
                    Q11: THE VAULT
                 </button>
              </div>

              {/* Global Scratchpad Reset */}
              {answeredCount > 0 && isFullscreen && !isQuizLocked && (
                <div style={{ marginTop: '0.9rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleClearAllScratchpad}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9aa3c0',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontFamily: 'var(--quiz-font-display)',
                      letterSpacing: '0.05em'
                    }}
                  >
                    🧹 Clear All Scratchpad Notes
                  </button>
                </div>
              )}

              {/* SUBMIT BUTTON DIRECTLY BELOW QUESTION NUMBERS */}
              <div className="palette-submit-action" style={{ marginTop: '1.8rem' }}>
                <button
                  type="button"
                  className="btn-gold sidebar-submit-btn"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!finalCode.trim() || timeRemaining <= 0 || isQuizLocked || !isFullscreen}
                >
                  {isQuizLocked ? 'ASSESSMENT LOCKED' : !isFullscreen ? 'FULLSCREEN REQUIRED' : timeRemaining <= 0 ? 'ROUND TIME EXPIRED' : 'SUBMIT ROUND 1'}&nbsp;
                </button>
                <small className="submit-hint">
                  {isQuizLocked
                    ? "Violations threshold exceeded. Quiz locked."
                    : !isFullscreen
                    ? "Fullscreen mode must be restored to submit."
                    : timeRemaining <= 0 
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
              <strong style={{ fontSize: '1.2rem', color: '#f0d089', display: 'block', margin: '1rem 0', letterSpacing: '0.06em' }}>{finalCode.toUpperCase()}</strong>
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
                {isSubmitting ? 'SEALING SCROLL…' : 'SUBMIT ✦'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Hint Assistant (Bottom-Left) - Randomly Harry or Voldy */}
      {!isQ11 && currentQ?.hint && (
        <aside className={`harry-hint-widget ${charData.themeClass}`} aria-label={`${charData.name} Hint Assistant`}>
          {isHintOpen && (
            <div className="harry-thought-card" role="dialog" aria-modal="false">
              <div className="harry-thought-header">
                <span className="harry-thought-title">{charData.title}</span>
                <button 
                  type="button" 
                  className="harry-thought-close" 
                  onClick={() => setIsHintOpen(false)}
                  title="Close hint"
                >
                  ✕
                </button>
              </div>
              <p className="harry-thought-body">{currentQ.hint}</p>
              <small className="harry-thought-footer">{charData.footer}</small>
            </div>
          )}

          <button
            type="button"
            className="harry-character-btn"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, charData.sparkColor, 24);
              setIsHintOpen((prev) => !prev);
            }}
            title={isHintOpen ? `Hide ${charData.name}'s Hint` : `Click ${charData.name} to reveal the hint`}
          >
            {!isHintOpen && (
              <div className="harry-speech-bubble">
                <span>✦</span> {charData.speech}
              </div>
            )}
            <div className="harry-figure-wrap">
              <img src={charData.img} alt={charData.name} className="harry-figure-img" />
              <div className="harry-sparkle-badge">✦</div>
            </div>
          </button>
        </aside>
      )}

      {/* 💻 MANDATORY LAPTOP / DEVICE RESTRICTION MODAL */}
      {isMobileDevice && (
        <div className="proctor-modal-overlay">
          <div className="proctor-modal-card device-warning-card">
            <span className="corner tl"></span>
            <span className="corner tr"></span>
            <span className="corner bl"></span>
            <span className="corner br"></span>

            <div className="proctor-icon-banner">💻</div>
            <h3 className="proctor-modal-title">LAPTOP REQUIRED FOR ROUND 1</h3>
            <p className="proctor-modal-sub">
              HOGWARTS EXAM BOARD · MANDATORY HARDWARE REQUIREMENT
            </p>

            <div className="proctor-notice-body">
              <p>
                Round 1 (The O.W.L. Vault) requires solving complex algorithmic and logic challenges designed for a <b>laptop or desktop computer</b>.
              </p>
              <div className="proctor-rules-list">
                <div>✦ <b>Screens under 960px or mobile devices</b> are not permitted.</div>
                <div>✦ Full keyboard and wide display are required for key calculations.</div>
                <div>✦ Anti-cheating proctoring active: tab-switching is prohibited.</div>
              </div>
            </div>

            <div className="proctor-actions-row">
              <button 
                type="button"
                className="btn-gold" 
                onClick={() => setIsMobileDevice(false)}
                style={{ width: '100%', padding: '12px', fontSize: '14px', letterSpacing: '0.06em' }}
              >
                I AM ON A LAPTOP / CONTINUE ANYWAY ✦
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⛶ MANDATORY FULLSCREEN RESTORATION OVERLAY (Shown if windowed while round active and rules accepted) */}
      {!isFullscreen && hasAcceptedRules && roundStatus === 'ACTIVE' && !activeWarningModal && !isQuizLocked && (
        <div className="proctor-modal-overlay">
          <div className="proctor-modal-card final-warning">
            <span className="corner tl"></span>
            <span className="corner tr"></span>
            <span className="corner bl"></span>
            <span className="corner br"></span>

            <div className="proctor-icon-banner">🖥️</div>
            <h3 className="proctor-modal-title">FULLSCREEN MODE REQUIRED</h3>
            <p className="proctor-modal-sub">
              TRIWIZARD TOURNAMENT · ASSESSMENT INTEGRITY PROTOCOL
            </p>

            <div className="proctor-notice-body">
              <p>
                Your assessment is temporarily <b>locked in windowed mode</b>. To view questions and continue entering answers, you must return to Fullscreen mode.
              </p>
              <div className="proctor-rules-list">
                <div>✦ Press <kbd style={{ background: '#070b18', padding: '2px 7px', borderRadius: '4px', border: '1px solid #e5be68', color: '#f5d796', fontWeight: 'bold' }}>F11</kbd> or <kbd style={{ background: '#070b18', padding: '2px 7px', borderRadius: '4px', border: '1px solid #e5be68', color: '#f5d796', fontWeight: 'bold' }}>Fn + F11</kbd> on your laptop keyboard.</div>
                <div>✦ Or click the restoration button below to re-engage Fullscreen immediately.</div>
              </div>
            </div>

            <div className="proctor-actions-row">
              <button 
                type="button"
                className="btn-gold" 
                onClick={enterFullscreen}
                style={{ width: '100%', padding: '14px', fontSize: '14px', letterSpacing: '0.08em', fontWeight: 'bold' }}
              >
                ⛶ RESTORE FULLSCREEN MODE & RESUME ✦
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 ANTI-CHEAT / PROCTORING VIOLATION MODAL (1 of 3, 2 of 3, 3 of 3) */}
      {activeWarningModal && (
        <div className="proctor-modal-overlay">
          <div className={`proctor-modal-card ${activeWarningModal.isLocked ? 'locked' : activeWarningModal.isFinal ? 'final-warning' : 'warning-1'}`}>
            <span className="corner tl"></span>
            <span className="corner tr"></span>
            <span className="corner bl"></span>
            <span className="corner br"></span>

            <div className="strike-meter-row">
              <div className={`strike-pip ${activeWarningModal.count >= 1 ? 'active' : ''}`}>
                STRIKE 1 {activeWarningModal.count >= 1 ? '⚠️' : '⚪'}
              </div>
              <div className={`strike-pip ${activeWarningModal.count >= 2 ? 'active danger' : ''}`}>
                STRIKE 2 {activeWarningModal.count >= 2 ? '🚨' : '⚪'}
              </div>
              <div className={`strike-pip ${activeWarningModal.count >= 3 ? 'active locked' : ''}`}>
                LOCKOUT {activeWarningModal.count >= 3 ? '⛔' : '⚪'}
              </div>
            </div>

            <h3 className="proctor-modal-title">{activeWarningModal.title}</h3>
            <p className="proctor-modal-desc">{activeWarningModal.message}</p>

            <div className="proctor-policy-box">
              <strong>TRIWIZARD TOURNAMENT PROCTORING POLICY:</strong>
              <ul>
                <li>Navigating away from the quiz tab or exiting Fullscreen is an honor code violation.</li>
                <li>You are granted a maximum of <b>3 warnings</b> before permanent assessment lock.</li>
                <li>All violation timestamps are transmitted to the invigilator dashboard.</li>
              </ul>
            </div>

            <div className="proctor-actions-row">
              {activeWarningModal.isLocked ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>
                    ⛔ WORKSTATION FLAGGED & LOCKED
                  </p>
                  <p style={{ color: '#bbb', fontSize: '12px' }}>
                    Please report to the nearest event coordinator or invigilator to unlock your assessment.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  className={activeWarningModal.isFinal ? "btn-danger-proctor" : "btn-gold"}
                  onClick={() => {
                    enterFullscreen();
                    setActiveWarningModal(null);
                  }}
                  style={{ width: '100%', padding: '14px', fontSize: '14px', letterSpacing: '0.08em', fontWeight: 'bold' }}
                >
                  {activeWarningModal.isFinal 
                    ? '⛶ RE-ENTER FULLSCREEN & ACKNOWLEDGE FINAL WARNING ✦' 
                    : '⛶ RE-ENTER FULLSCREEN & RESUME ASSESSMENT ✦'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
