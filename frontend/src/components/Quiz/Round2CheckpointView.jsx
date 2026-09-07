import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';
import { API_BASE_URL } from '../../utils/api';
import { loadQuizState, saveQuizState } from './QuizData';
import './Round2CheckpointView.css';

/**
 * Returns dynamic, high-adrenaline motivational push copy based on remaining checkpoints
 */
function getMotivationalPush(remainingSteps, currentStep, totalSteps = 7) {
  if (currentStep === 0) {
    return {
      theme: 'normal',
      pill: 'FIRST STRETCH • THE RACE IS ON',
      headline: 'FIRST DESTINATION UNLOCKED! SPRINT!',
      subtext: 'The tournament clock has started! Sprint to your first checkpoint on campus and scan the QR code to check in!'
    };
  }
  if (remainingSteps === 1) {
    return {
      theme: 'climax',
      pill: 'FINAL SPRINT • THE FINAL AWAITS',
      headline: 'SPRINT TO THE FINAL! EGT 2.0 IS YOURS TO WIN!',
      subtext: 'This is the ultimate showdown! You have conquered all previous trials. Sprint to the Final checkpoint QR code right now and claim victory!'
    };
  }
  if (remainingSteps === 2) {
    return {
      theme: 'penultimate',
      pill: 'PENULTIMATE LAP • 2 CHECKPOINTS TO GLORY',
      headline: 'JUST 2 MORE AND EGT IS YOURS!',
      subtext: 'Feel the adrenaline surging! You are in the elite championship pack now. Keep pushing — do not slow down for a second!'
    };
  }
  if (remainingSteps === 3) {
    return {
      theme: 'fast',
      pill: 'BLAZING PACE • STAY AGGRESSIVE',
      headline: 'YES, KEEP GOING! MAYBE YOU ARE THE FIRST SOLVING SO FAST!',
      subtext: 'Your squad is blitzing through the map at record speed! Maintain this momentum and leave every rival behind!'
    };
  }
  if (remainingSteps === 4) {
    return {
      theme: 'fast',
      pill: 'OVER HALFWAY • UNSTOPPABLE RUN',
      headline: 'HALFWAY POINT SMASHED! CHARGE FORWARD!',
      subtext: 'Checkpoints are falling in record time. Stay sharp, communicate fast, and conquer the next marker!'
    };
  }
  return {
    theme: 'normal',
    pill: 'CHECKPOINT CLEARED • SPEED IS EVERYTHING',
    headline: 'SMOOTH SOLVE! SPRINT TO THE NEXT TARGET!',
    subtext: 'Every second counts on the leaderboard. Keep your eyes sharp and legs moving towards your next stop!'
  };
}

export default function Round2CheckpointView({ onBackToHall, onTriggerToast }) {
  const [token, setToken] = useState(() => {
    const saved = loadQuizState();
    return saved?.participant?.token || localStorage.getItem('R2_Token') || null;
  });
  const [teamId, setTeamId] = useState('');
  const [pass, setPass] = useState('');
  
  const [uiState, setUiState] = useState('loading'); // loading, login, scanning, error, solving, transit, complete
  const [errorMessage, setErrorMessage] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [nextDest, setNextDest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progress tracking
  const [stepInfo, setStepInfo] = useState({
    currentStep: 0,
    totalSteps: 7,
    stepNumber: 0,
    remainingSteps: 7,
    currentDestination: null,
    arrivedDestination: null,
    isInitialStart: true
  });
  
  const getQrIdentifier = () => {
    // 1. Check window.location.hash
    const hash = window.location.hash.replace(/^#\/?/, '');
    const hashParts = hash.split('/').filter(Boolean);
    const chkIdx = hashParts.indexOf('checkpoint');
    if (chkIdx !== -1 && hashParts[chkIdx + 1]) {
      return decodeURIComponent(hashParts[chkIdx + 1]).trim();
    }
    // 2. Check window.location.pathname
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const pathChkIdx = pathParts.indexOf('checkpoint');
    if (pathChkIdx !== -1 && pathParts[pathChkIdx + 1]) {
      return decodeURIComponent(pathParts[pathChkIdx + 1]).trim();
    }
    // 3. Fallback to any segment starting with qr_
    const lastHash = hashParts[hashParts.length - 1];
    if (lastHash && lastHash.startsWith('qr_')) return decodeURIComponent(lastHash).trim();
    const lastPath = pathParts[pathParts.length - 1];
    if (lastPath && lastPath.startsWith('qr_')) return decodeURIComponent(lastPath).trim();
    return '';
  };

  const qrCode = getQrIdentifier();

  useEffect(() => {
    if (!token) {
      setUiState('login');
    } else if (qrCode) {
      handleScanQr(qrCode);
    } else {
      fetchCurrentState();
    }
  }, [token, qrCode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setUiState('loading');
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamId.trim(), pass: pass.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('R2_Token', data.token);
      setToken(data.token);
      spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#f0d089', 20);
    } catch (err) {
      setUiState('login');
      if (onTriggerToast) onTriggerToast(`✦ LOGIN FAILED: ${err.message} ✦`);
    }
  };

  const handleScanQr = async (codeToScan = qrCode) => {
    if (!codeToScan) return;
    setUiState('scanning');
    try {
      const res = await fetch(`${API_BASE_URL}/round2/scan_qr`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qrCode: codeToScan })
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('R2_Token');
          setToken(null);
          setUiState('login');
          return;
        }

        // Strictly show error — NEVER open question on wrong destination!
        setErrorMessage(data.error || 'WRONG LOCATION: You must sprint to your assigned checkpoint.');
        setUiState('error');
        if (onTriggerToast) onTriggerToast(`⛔ ${data.error || 'WRONG LOCATION SCANNED'}`);
        return;
      }

      if (data.currentStep !== undefined) {
        setStepInfo({
          currentStep: data.currentStep,
          totalSteps: data.totalSteps || 7,
          remainingSteps: data.remainingSteps !== undefined ? data.remainingSteps : Math.max(0, (data.totalSteps || 7) - data.currentStep),
          stepNumber: data.currentStep,
          currentDestination: data.arrivedDestination || data.currentDestination || null,
          arrivedDestination: data.arrivedDestination || data.currentDestination || null,
          isInitialStart: data.currentStep === 0
        });
      }

      if (data.state === 'COMPLETE') {
        setUiState('complete');
        spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#43e08a', 40);
      } else {
        sessionStorage.setItem('r2_scan_verified_' + (data.currentStep ?? 0), 'true');
        if (data.question) {
          setQuestionText(data.question);
          setUiState('solving');
        } else {
          fetchCurrentState();
        }
      }
    } catch (err) {
      setErrorMessage(err.message);
      setUiState('error');
    }
  };

  const fetchCurrentState = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/round2/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('R2_Token');
          sessionStorage.removeItem('egt2_wizarding_hunt_v2');
          setToken(null);
          setUiState('login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch status');
      }

      if (data.currentStep !== undefined) {
        setStepInfo({
          currentStep: data.currentStep,
          totalSteps: data.totalSteps || 7,
          remainingSteps: data.remainingSteps !== undefined ? data.remainingSteps : Math.max(0, (data.totalSteps || 7) - data.currentStep),
          stepNumber: data.currentStep,
          currentDestination: data.arrivedDestination || data.currentDestination || null,
          arrivedDestination: data.arrivedDestination || data.currentDestination || null,
          isInitialStart: data.currentStep === 0
        });
      }
      
      if (data.state === 'PENDING_SOLVE') {
        setQuestionText(data.question);
        setUiState('solving');
      } else if (data.state === 'TRANSIT') {
        setNextDest(data.nextDestination);
        setUiState('transit');
      } else if (data.state === 'COMPLETE') {
        setUiState('complete');
        spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#43e08a', 40);
      }
    } catch (err) {
      setErrorMessage(err.message);
      setUiState('error');
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/round2/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answer: answerInput.trim() })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setIsSubmitting(false);
        if (res.status === 401) {
          localStorage.removeItem('R2_Token');
          sessionStorage.removeItem('egt2_wizarding_hunt_v2');
          setToken(null);
          setUiState('login');
          if (onTriggerToast) onTriggerToast(' SESSION EXPIRED: PLEASE LOG IN AGAIN ');
          return;
        }
        if (onTriggerToast) onTriggerToast(` INCORRECT: ${data.error} `);
        setUiState('solving');
        return;
      }

      if (data.currentStep !== undefined) {
        setStepInfo({
          currentStep: data.currentStep,
          totalSteps: data.totalSteps || 7,
          remainingSteps: data.remainingSteps !== undefined ? data.remainingSteps : Math.max(0, (data.totalSteps || 7) - data.currentStep),
          stepNumber: data.currentStep,
          currentDestination: data.arrivedDestination || data.currentDestination || null,
          arrivedDestination: data.arrivedDestination || data.currentDestination || null,
          isInitialStart: data.currentStep === 0
        });
      }

      setIsSubmitting(false);
      spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#43e08a', 35);
      setAnswerInput('');

      // Clear verification for this solved step so next step requires a fresh physical QR scan
      sessionStorage.removeItem('r2_scan_verified_' + stepInfo.currentStep);

      if (data.state === 'COMPLETE') {
        if (data.currentStep !== undefined) {
          setStepInfo(prev => ({
            ...prev,
            currentStep: data.currentStep,
            totalSteps: data.totalSteps || 7,
            remainingSteps: 0
          }));
        }
        spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#ffd700', 50);
        setUiState('complete');
        if (onTriggerToast) onTriggerToast(' 🏆 ALL RIDDLES SOLVED! SPRINT TO THE FOUNTAIN! ');
      } else {
        setNextDest(data.nextDestination);
        setUiState('transit');
        if (onTriggerToast) onTriggerToast(' CORRECT! SPRINT TO NEXT DESTINATION! ');
      }
    } catch (err) {
      setIsSubmitting(false);
      if (onTriggerToast) onTriggerToast(` ERROR: ${err.message} `);
      setUiState('solving');
    }
  };

  const pushMessage = getMotivationalPush(stepInfo.remainingSteps, stepInfo.currentStep, stepInfo.totalSteps);

  // 8 nodes
  const totalNodes = (stepInfo.totalSteps || 7) + 1;
  const nodes = Array.from({ length: totalNodes }, (_, idx) => idx);
  const activeIdx = Math.min(stepInfo.currentStep, totalNodes - 1);
  const fillPercentage = (activeIdx / (totalNodes - 1)) * 100;

  return (
    <div className="r2-page-wrap" aria-label="Checkpoint Arrival Verification">
      <div className="r2-ambient-glow"></div>
      <div className="r2-stars-overlay"></div>

      <div className="r2-main-card">
        {/* Card Header */}
        <header className="r2-card-header">
          <div>
            <span className="r2-badge-kicker">
              <span className="r2-dot"></span>
              ROUND 2 · THE EXPEDITION
            </span>
          </div>
          <h1 className="r2-title">
            {uiState === 'transit' 
              ? (stepInfo.currentStep === 0 ? 'DESTINATION UNLOCKED!' : 'CHECKPOINT CLEARED!') 
              : 'CHECKPOINT VERIFICATION'}
          </h1>
          <div className="r2-qr-pill">
            <span>✦ SCAN IDENTIFIER:</span>
            <strong>{qrCode || 'CAMPUS MARKER'}</strong>
          </div>
        </header>

        {/* Checkpoint Roadmap Progress Tracker (Visible on solving, transit, complete) */}
        {['solving', 'transit', 'complete'].includes(uiState) && (
          <div className="r2-roadmap">
            <div className="r2-roadmap-top">
              <span className="r2-roadmap-status">
                <span className="star-dot">✦</span>
                {uiState === 'complete' 
                  ? `ALL ${stepInfo.totalSteps - 1} CHECKPOINTS COMPLETED!` 
                  : stepInfo.currentStep === 0
                  ? `STARTING TRIAL • ${stepInfo.totalSteps - 1} CHECKPOINTS TO GO`
                  : `CHECKPOINT ${stepInfo.currentStep} OF ${stepInfo.totalSteps - 1} CLEARED`}
              </span>
              <span className="r2-roadmap-remaining">
                {uiState === 'complete'
                  ? '✦ CHAMPION ✦'
                  : stepInfo.remainingSteps === 1
                  ? '✦ FINAL SPRINT NEXT ✦'
                  : `${stepInfo.remainingSteps} to Final`}
              </span>
            </div>

            <div className="r2-nodes-row">
              <div className="r2-track-line-bg">
                <div 
                  className="r2-track-line-fill" 
                  style={{ width: `${fillPercentage}%` }}
                ></div>
              </div>

              {nodes.map((idx) => {
                const isFinal = idx === totalNodes - 1;
                const isDone = uiState === 'complete' || idx < stepInfo.currentStep;
                const isActive = uiState !== 'complete' && idx === stepInfo.currentStep;

                let nodeClass = 'r2-node-circle';
                if (isDone) nodeClass += ' done';
                else if (isActive) nodeClass += ' active';
                if (isFinal) nodeClass += ' fountain-node';

                return (
                  <div key={idx} className="r2-node-wrapper">
                    <div className={nodeClass}>
                      {isDone ? '✓' : isFinal ? '🏆' : idx === 0 ? '✦' : idx}
                    </div>
                    <span className={`r2-node-label ${isActive ? 'active-label' : ''}`}>
                      {isFinal ? 'VAULT' : idx === 0 ? 'START' : `CP ${idx}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Motivational Push Banner (On transit or solving) */}
        {(uiState === 'transit' || (uiState === 'solving' && stepInfo.remainingSteps <= 3)) && (
          <div className={`r2-push-banner r2-push-${pushMessage.theme}`}>
            <div className="r2-push-pill">
              {pushMessage.pill}
            </div>
            <h3 className="r2-push-headline">{pushMessage.headline}</h3>
            <p className="r2-push-subtext">{pushMessage.subtext}</p>
          </div>
        )}

        {/* State 1: Scanning / Loading */}
        {(uiState === 'loading' || uiState === 'scanning') && (
          <div className="r2-scanner-wrap">
            <div className="r2-radar-ring"></div>
            <p className="r2-scanner-text">
              {uiState === 'scanning' ? 'Verifying ancient QR coordinates...' : 'Consulting Tournament Map...'}
            </p>
            <p className="r2-scanner-sub">Attuning to the campus enchantments...</p>
          </div>
        )}

        {/* State 2: Login Required */}
        {uiState === 'login' && (
          <div className="r2-login-card">
            <p style={{ color: '#d0d8ee', fontSize: '0.92rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Present your team credentials to register this checkpoint.
            </p>
            <form onSubmit={handleLogin}>
              <div className="r2-field-wrap">
                <label className="r2-field-label">TEAM IDENTIFIER</label>
                <input
                  type="text"
                  placeholder="e.g. TH-007 or TEAM-001"
                  required
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                  className="r2-input"
                />
              </div>
              <div className="r2-field-wrap">
                <label className="r2-field-label">TOURNAMENT PASS</label>
                <input
                  type="password"
                  placeholder="Enter secret pass"
                  required
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="r2-input"
                />
              </div>
              <button type="submit" className="r2-btn-gold" style={{ marginTop: '0.5rem' }}>
                AUTHENTICATE CHECKPOINT ✦
              </button>
            </form>
          </div>
        )}

        {/* State 3: Error / Wrong Location Screen */}
        {uiState === 'error' && (
          <div className="r2-error-box">
            <div className="r2-error-icon" style={{ color: '#ef4444', fontSize: '38px', marginBottom: '8px' }}>⛔</div>
            <h3 className="r2-error-title" style={{ color: '#ff6b6b', letterSpacing: '1px' }}>
              {errorMessage?.toLowerCase().includes('wrong location') ? 'WRONG LOCATION SCANNED' : 'CHECKPOINT NOTICE'}
            </h3>
            <p className="r2-error-msg" style={{ fontSize: '1.05rem', color: '#f0d089', lineHeight: '1.55', fontWeight: 600 }}>
              {errorMessage}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1.4rem', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="r2-btn-gold" 
                style={{ width: 'auto', padding: '0.85rem 1.6rem', fontSize: '0.9rem' }} 
                onClick={() => {
                  window.location.hash = '#/round-2';
                }}
              >
                VIEW TARGET DESTINATION 🧭
              </button>
              <button 
                type="button" 
                className="r2-btn-ghost" 
                onClick={() => handleScanQr()}
              >
                RETRY SCAN ↻
              </button>
            </div>
          </div>
        )}

        {/* State 4: Solving Riddle (PENDING_SOLVE) */}
        {uiState === 'solving' && (
          <div className="r2-riddle-container">
            <div className="r2-solved-banner">
              <span className="star-dot">✦</span>
              {stepInfo.currentStep === 0
                ? 'INITIAL TRIAL • CIPHER DISCOVERY'
                : stepInfo.arrivedDestination || stepInfo.currentDestination
                ? `ARRIVED AT: ${stepInfo.arrivedDestination || stepInfo.currentDestination}`
                : `CHECKPOINT ${stepInfo.currentStep} REACHED`}
            </div>
            
            <p className="r2-riddle-intro">
              {stepInfo.currentStep === 0
                ? 'Decipher this starting riddle to reveal your First Checkpoint coordinates on campus:'
                : 'Checkpoint verified! Decipher the riddle below to unlock your next destination:'}
            </p>
            
            <div className="r2-riddle-parchment th-card">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>

              <div className="riddle-header-row">
                <span className="riddle-badge">✦ KEEPER’S ENIGMA ✦</span>
                <span className="riddle-step-pill">
                  {stepInfo.currentStep === 0 ? 'CIPHER 1' : `STATION ${stepInfo.currentStep}`}
                </span>
              </div>

              <p className="r2-riddle-text">{questionText}</p>
            </div>

            <form onSubmit={handleSubmitAnswer} className="r2-form-group" style={{ marginTop: '1.5rem' }}>
              <div className="r2-input-wrapper">
                <label className="r2-input-label">YOUR CIPHER SOLUTION:</label>
                <input 
                  type="text" 
                  placeholder="Type your answer keyword here..." 
                  required 
                  autoFocus
                  disabled={isSubmitting}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  className="r2-input"
                />
              </div>
              <button 
                type="submit" 
                className="r2-btn-gold" 
                disabled={!answerInput.trim() || isSubmitting}
              >
                {isSubmitting ? 'VERIFYING SPELL…' : 'SUBMIT TRIAL ANSWER ✦'}
              </button>
            </form>
          </div>
        )}

        {/* State 5: Transit (Destination Revealed) */}
        {uiState === 'transit' && (
          <div className="r2-transit-card">
            <div className="r2-transit-badge">
              <span>✓</span> {stepInfo.currentStep === 0 ? 'FIRST DESTINATION UNLOCKED!' : `CHECKPOINT ${stepInfo.currentStep} OF ${stepInfo.totalSteps} CLEARED!`}
            </div>

            <div className="r2-dest-spotlight">
              <div className="r2-dest-compass-ring">
                <span className="r2-compass-icon">🧭</span>
              </div>

              <p className="r2-dest-kicker">
                {stepInfo.currentStep === 0 ? 'SPRINT TO YOUR FIRST CHECKPOINT' : 'RUN IMMEDIATELY TO YOUR NEXT DESTINATION'}
              </p>
              <h2 className="r2-dest-name">{nextDest}</h2>
              <p className="r2-dest-instruction">
                Sprint to this campus landmark immediately with your squad!
              </p>
            </div>

            <div className="r2-action-guidance">
              <span className="r2-guidance-icon">📷</span>
              <p className="r2-guidance-text">
                When you arrive at <strong>{nextDest}</strong>, search for the hidden tournament QR seal and scan it with your device camera to log your arrival!
              </p>
            </div>

            <button 
              type="button" 
              className="r2-btn-ghost" 
              style={{ width: '100%', marginTop: '0.8rem' }} 
              onClick={fetchCurrentState}
            >
              REFRESH STATUS ↻
            </button>
          </div>
        )}

        {/* State 6: Complete (Final Riddle Solved — Sprint to Fountain!) */}
        {uiState === 'complete' && (
          <div className="r2-complete-card">
            <div className="r2-trophy-aura">🏆</div>
            <h2 className="r2-complete-title">ALL RIDDLES SOLVED!</h2>
            <p className="r2-complete-sub" style={{ color: '#ffd700', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.04em' }}>
              ✦ SPRINT TO THE FOUNTAIN RIGHT NOW ✦
            </p>
            <p className="r2-complete-desc">
              You have conquered all checkpoints and solved every keeper's riddle! 
              The race is yours — sprint to the Fountain as fast as you can to claim victory!
              Report your arrival to the tournament marshals at the finish line.
            </p>
            {onBackToHall && (
              <button type="button" className="r2-btn-gold" onClick={onBackToHall}>
                RETURN TO GREAT HALL
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onBackToHall && uiState !== 'loading' && (
          <button 
            type="button" 
            onClick={onBackToHall} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#8e9bb8', 
              fontSize: '0.85rem', 
              cursor: 'pointer',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
          >
            ← Exit to Great Hall
          </button>
        )}

        {token && uiState !== 'login' && (
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('R2_Token');
              sessionStorage.removeItem('egt2_wizarding_hunt_v2');
              setToken(null);
              setUiState('login');
              if (onTriggerToast) onTriggerToast('✦ SQUAD LOGGED OUT — PLEASE AUTHENTICATE ✦');
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#f0d089', 
              fontSize: '0.82rem', 
              cursor: 'pointer',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textDecoration: 'underline'
            }}
          >
            ✦ Switch Squad / Log In
          </button>
        )}
      </div>
    </div>
  );
}
