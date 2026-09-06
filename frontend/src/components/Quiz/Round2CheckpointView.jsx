import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';
import { API_BASE_URL } from '../../utils/api';
import './Round2CheckpointView.css';

/**
 * Returns dynamic, high-adrenaline motivational push copy based on remaining checkpoints
 */
function getMotivationalPush(remainingSteps, currentStep, totalSteps = 7) {
  if (currentStep === 0) {
    return {
      theme: 'normal',
      pill: '🏃 FIRST STRETCH • THE RACE IS ON',
      headline: 'FIRST DESTINATION UNLOCKED! SPRINT!',
      subtext: 'The tournament clock has started! Sprint to your first checkpoint on campus and scan the QR code to check in!'
    };
  }
  if (remainingSteps === 1) {
    return {
      theme: 'climax',
      pill: '🔥 FINAL SPRINT • THE FINAL AWAITS',
      headline: 'SPRINT TO THE FINAL! EGT 2.0 IS YOURS TO WIN!',
      subtext: 'This is the ultimate showdown! You have conquered all previous trials. Sprint to the Final checkpoint QR code right now and claim victory!'
    };
  }
  if (remainingSteps === 2) {
    return {
      theme: 'penultimate',
      pill: '⚡ PENULTIMATE LAP • 2 CHECKPOINTS TO GLORY',
      headline: 'JUST 2 MORE AND EGT IS YOURS!',
      subtext: 'Feel the adrenaline surging! You are in the elite championship pack now. Keep pushing — do not slow down for a second!'
    };
  }
  if (remainingSteps === 3) {
    return {
      theme: 'fast',
      pill: '🚀 BLAZING PACE • STAY AGGRESSIVE',
      headline: 'YES, KEEP GOING! MAYBE YOU ARE THE FIRST SOLVING SO FAST!',
      subtext: 'Your squad is blitzing through the map at record speed! Maintain this momentum and leave every rival behind!'
    };
  }
  if (remainingSteps === 4) {
    return {
      theme: 'fast',
      pill: '✨ OVER HALFWAY • UNSTOPPABLE RUN',
      headline: 'HALFWAY POINT SMASHED! CHARGE FORWARD!',
      subtext: 'Checkpoints are falling in record time. Stay sharp, communicate fast, and conquer the next marker!'
    };
  }
  return {
    theme: 'normal',
    pill: '🏃 CHECKPOINT CLEARED • SPEED IS EVERYTHING',
    headline: 'SMOOTH SOLVE! SPRINT TO THE NEXT TARGET!',
    subtext: 'Every second counts on the leaderboard. Keep your eyes sharp and legs moving towards your next stop!'
  };
}

export default function Round2CheckpointView({ onBackToHall, onTriggerToast }) {
  const [token, setToken] = useState(localStorage.getItem('R2_Token'));
  const [teamId, setTeamId] = useState('');
  const [pass, setPass] = useState('');
  
  const [uiState, setUiState] = useState('loading'); // loading, login, scanning, error, solving, transit, complete
  const [errorMessage, setErrorMessage] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [nextDest, setNextDest] = useState('');

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
  
  const qrCode = window.location.hash.split('/').pop();

  useEffect(() => {
    if (!token) {
      setUiState('login');
    } else {
      handleScanQr();
    }
  }, [token]);

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
      if (onTriggerToast) onTriggerToast(` LOGIN FAILED: ${err.message} `);
    }
  };

  const handleScanQr = async () => {
    setUiState('scanning');
    try {
      const res = await fetch(`${API_BASE_URL}/round2/scan_qr`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qrCode })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('R2_Token');
          setToken(null);
          return;
        }
        setErrorMessage(data.error);
        setUiState('error');
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
        fetchCurrentState();
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
    if (!answerInput.trim()) return;

    setUiState('loading');
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

      spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#43e08a', 35);
      setAnswerInput('');

      if (data.state === 'COMPLETE') {
        // Final riddle solved — auto-complete, sprint to fountain
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
      if (onTriggerToast) onTriggerToast(` ERROR: ${err.message} `);
      setUiState('solving');
    }
  };

  const pushMessage = getMotivationalPush(stepInfo.remainingSteps, stepInfo.currentStep, stepInfo.totalSteps);

  // 8 nodes: INITIAL + CP1-CP6 + FINAL
  const totalNodes = (stepInfo.totalSteps || 7) + 1;
  const nodes = Array.from({ length: totalNodes }, (_, idx) => idx);
  const activeIdx = Math.min(stepInfo.currentStep, totalNodes - 1);
  const fillPercentage = (activeIdx / (totalNodes - 1)) * 100;

  return (
    <div className="r2-page-wrap">
      <div className="r2-ambient-glow"></div>
      <div className="r2-stars-overlay"></div>

      <div className="r2-main-card">
        {/* Card Header */}
        <header className="r2-card-header">
          <div>
            <span className="r2-badge-kicker">
              <span className="r2-dot"></span>
              ROUND 2 • THE RUN
            </span>
          </div>
          <h1 className="r2-title">
            {uiState === 'transit' 
              ? (stepInfo.currentStep === 0 ? 'DESTINATION UNLOCKED!' : 'CHECKPOINT CLEARED!') 
              : 'CHECKPOINT VERIFICATION'}
          </h1>
          <div className="r2-qr-pill">
            <span>📍 SCAN ID:</span>
            <strong>{qrCode}</strong>
          </div>
        </header>

        {/* Checkpoint Roadmap Progress Tracker (Visible on solving, transit, complete) */}
        {['solving', 'transit', 'complete'].includes(uiState) && (
          <div className="r2-roadmap">
            <div className="r2-roadmap-top">
              <span className="r2-roadmap-status">
                <span>⚡</span>
                {uiState === 'complete' 
                  ? `ALL ${stepInfo.totalSteps - 1} CHECKPOINTS COMPLETED!` 
                  : stepInfo.currentStep === 0
                  ? `STARTING TRIAL • ${stepInfo.totalSteps - 1} CHECKPOINTS TO GO`
                  : `CHECKPOINT ${stepInfo.currentStep} OF ${stepInfo.totalSteps - 1} CLEARED`}
              </span>
              <span className="r2-roadmap-remaining">
                {uiState === 'complete'
                  ? '🏆 CHAMPION'
                  : stepInfo.remainingSteps === 1
                  ? '🔥 FINAL NEXT!'
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
                // INITIAL = idx 0, CP1-CP6 = idx 1-6, FINAL = idx 7
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
                      {isDone ? '✓' : isFinal ? '🏆' : idx === 0 ? '⚡' : idx}
                    </div>
                    <span className={`r2-node-label ${isActive ? 'active-label' : ''}`}>
                      {isFinal ? 'FINAL' : idx === 0 ? 'INITIAL' : `CP ${idx}`}
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
            <p className="r2-scanner-sub">Please hold steady while the checkpoint authenticates</p>
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
                AUTHENTICATE CHECKPOINT
              </button>
            </form>
          </div>
        )}

        {/* State 3: Error */}
        {uiState === 'error' && (
          <div className="r2-error-box">
            <div className="r2-error-icon">⚠️</div>
            <h3 className="r2-error-title">CHECKPOINT NOTICE</h3>
            <p className="r2-error-msg">{errorMessage}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem' }}>
              <button className="r2-btn-ghost" onClick={handleScanQr}>
                🔄 RETRY
              </button>
              <button className="r2-btn-ghost" onClick={() => {
                localStorage.removeItem('R2_Token');
                sessionStorage.removeItem('egt2_wizarding_hunt_v2');
                setToken(null);
                setUiState('login');
              }}>
                🔑 LOG IN
              </button>
            </div>
          </div>
        )}

        {/* State 4: Solving Riddle (PENDING_SOLVE) */}
        {uiState === 'solving' && (
          <div className="r2-riddle-container">
            <div className="r2-solved-banner">
              <span>📍</span>
              {stepInfo.currentStep === 0
                ? 'INITIAL TRIAL • STARTING CLUE'
                : stepInfo.arrivedDestination || stepInfo.currentDestination
                ? `ARRIVED AT: ${stepInfo.arrivedDestination || stepInfo.currentDestination}`
                : `CHECKPOINT ${stepInfo.currentStep} REACHED`}
            </div>
            
            <p className="r2-riddle-intro">
              {stepInfo.currentStep === 0
                ? 'Decipher this starting riddle to reveal your First Checkpoint on campus:'
                : 'Checkpoint verified! Decipher the riddle below to unlock your next destination coordinates:'}
            </p>
            
            <div className="r2-riddle-parchment">
              <p className="r2-riddle-text">{questionText}</p>
            </div>

            <form onSubmit={handleSubmitAnswer} className="r2-form-group">
              <input 
                type="text" 
                placeholder="Type your answer here..." 
                required 
                autoFocus
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                className="r2-input"
              />
              <button type="submit" className="r2-btn-gold" disabled={!answerInput.trim()}>
                SUBMIT ANSWER ⚡
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
              <p className="r2-dest-kicker">
                {stepInfo.currentStep === 0 ? 'SPRINT TO YOUR FIRST CHECKPOINT' : 'RUN IMMEDIATELY TO YOUR NEXT DESTINATION'}
              </p>
              <h2 className="r2-dest-name">{nextDest}</h2>
              <p className="r2-dest-instruction">
                Sprint to this location on campus right now!
              </p>
            </div>

            <div className="r2-action-guidance">
              <span className="r2-guidance-icon">📍</span>
              <p className="r2-guidance-text">
                When you arrive at <strong>{nextDest}</strong>, search for the hidden tournament QR code and scan it with your device camera to log your arrival!
              </p>
            </div>

            <button 
              type="button" 
              className="r2-btn-ghost" 
              style={{ width: '100%', marginTop: '0.5rem' }} 
              onClick={fetchCurrentState}
            >
              🔄 REFRESH STATUS
            </button>
          </div>
        )}

        {/* State 6: Complete (Final Riddle Solved — Sprint to Fountain!) */}
        {uiState === 'complete' && (
          <div className="r2-complete-card">
            <div className="r2-trophy-aura">🏆</div>
            <h2 className="r2-complete-title">ALL RIDDLES SOLVED!</h2>
            <p className="r2-complete-sub" style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 800 }}>
              🏃 SPRINT TO THE FOUNTAIN RIGHT NOW!
            </p>
            <p className="r2-complete-desc">
              You have conquered all 6 checkpoints and solved every riddle! 
              The race is yours — run to the Fountain as fast as you can to claim victory!
              Report your time to the tournament marshals on arrival.
            </p>
            {onBackToHall && (
              <button type="button" className="r2-btn-gold" onClick={onBackToHall}>
                RETURN TO GREAT HALL
              </button>
            )}
          </div>
        )}
      </div>

      {onBackToHall && uiState !== 'loading' && (
        <button 
          type="button" 
          onClick={onBackToHall} 
          style={{ 
            marginTop: '1.5rem', 
            background: 'none', 
            border: 'none', 
            color: '#6b7391', 
            fontSize: '0.85rem', 
            cursor: 'pointer',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}
        >
          ← Exit to Great Hall
        </button>
      )}
    </div>
  );
}
