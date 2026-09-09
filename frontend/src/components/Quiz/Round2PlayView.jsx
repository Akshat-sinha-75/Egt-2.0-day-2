import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';
import { API_BASE_URL } from '../../utils/api';
import './Quiz.css';
import './Round2CheckpointView.css';

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

export default function Round2PlayView({ participant, onBackToHall, onTriggerToast, onLogout }) {
  const [uiState, setUiState] = useState('loading'); // loading, solving, transit, complete, error, expired
  const [errorMessage, setErrorMessage] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [nextDest, setNextDest] = useState('');
  const [nextRiddle, setNextRiddle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stepInfo, setStepInfo] = useState({
    currentStep: 0,
    totalSteps: 7,
    stepNumber: 0,
    remainingSteps: 7,
    currentDestination: null,
    arrivedDestination: null,
    isInitialStart: true
  });

  const token = participant?.token || localStorage.getItem('R2_Token');

  useEffect(() => {
    if (!token) {
      setUiState('expired');
      setErrorMessage('Missing authentication session. Please login to continue.');
      return;
    }
    fetchCurrentState();
  }, [token]);

  const handleRelogin = () => {
    localStorage.removeItem('R2_Token');
    sessionStorage.removeItem('egt2_wizarding_hunt_v2');
    if (onLogout) {
      onLogout();
    } else {
      window.location.hash = '#/login';
      window.location.reload();
    }
  };

  const fetchCurrentState = async (retries = 2) => {
    setUiState('loading');
    try {
      const res = await fetch(`${API_BASE_URL}/round2/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('R2_Token');
          sessionStorage.removeItem('egt2_wizarding_hunt_v2');
          setUiState('expired');
          setErrorMessage('Your session has expired. Please log in again to resume Round 2.');
          return;
        }
        if (res.status === 403) {
          setUiState('error');
          setErrorMessage('YOU MUGGLES WERE TOO SLOW FOR ROUND 2! Only the top 20 qualifying teams can enter.');
          return;
        }
        throw new Error(data.error || 'Failed to load round 2 state');
      }

      if (data.currentStep !== undefined) {
        setStepInfo({
          currentStep: data.currentStep,
          totalSteps: data.totalSteps || 7,
          remainingSteps: data.remainingSteps !== undefined ? data.remainingSteps : Math.max(0, (data.totalSteps || 7) - data.currentStep),
          stepNumber: data.currentStep,
          displayStep: data.displayStep !== undefined ? data.displayStep : data.currentStep,
          currentDestination: data.arrivedDestination || data.currentDestination || null,
          arrivedDestination: data.arrivedDestination || data.currentDestination || null,
          isInitialStart: data.currentStep === 0
        });
      }

      if (data.state === 'PENDING_SOLVE') {
        setQuestionText(data.question || 'Decipher the starting cipher to unlock your first checkpoint.');
        setUiState('solving');
      } else if (data.state === 'TRANSIT') {
        setNextDest(data.nextDestination || 'Next Checkpoint');
        setNextRiddle(data.nextRiddle || null);
        setUiState('transit');
      } else if (data.state === 'COMPLETE') {
        setUiState('complete');
      }
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchCurrentState(retries - 1), 1800);
        return;
      }
      setErrorMessage(err.message || 'Connecting to vault server...');
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
          setUiState('expired');
          setErrorMessage('Your session has expired. Please log in again to resume Round 2.');
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
          displayStep: data.displayStep !== undefined ? data.displayStep : data.currentStep,
          currentDestination: data.arrivedDestination || data.currentDestination || null,
          arrivedDestination: data.arrivedDestination || data.currentDestination || null,
          isInitialStart: data.currentStep === 0
        });
      }

      // Success!
      setIsSubmitting(false);
      spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#43e08a', 35);
      setAnswerInput('');

      // Clear scan verification for this solved step so next step requires a fresh physical QR scan
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
        if (onTriggerToast) onTriggerToast(' 🏆 ALL RIDDLES CONQUERED! SPRINT TO THE FINAL DESTINATION! ');
      } else {
        setNextDest(data.nextDestination);
        setNextRiddle(data.nextRiddle);
        setUiState('transit');
        if (onTriggerToast) onTriggerToast(' CORRECT! SPRINT TO NEXT DESTINATION! ');
      }
    } catch (err) {
      setIsSubmitting(false);
      if (onTriggerToast) onTriggerToast(` ERROR: ${err.message} `);
      setUiState('solving');
    }
  };

  const pushMessage = getMotivationalPush(stepInfo?.remainingSteps ?? 7, stepInfo?.stepNumber ?? 0, stepInfo?.totalSteps ?? 7) || {
    theme: 'normal',
    pill: 'EXPEDITION TRIAL • STAY SHARP',
    headline: 'SPRINT TO THE NEXT MARKER!',
    subtext: 'Conquer the riddle and sprint across campus to log your arrival!'
  };

  // Total nodes safe calculation
  const totalSteps = Math.max(1, Number(stepInfo?.totalSteps) || 7);
  const totalNodes = totalSteps + 1;
  const nodes = Array.from({ length: totalNodes }, (_, idx) => idx);
  const activeIdx = Math.min(Math.max(0, Number(stepInfo?.currentStep) || 0), totalNodes - 1);
  const fillPercentage = totalNodes > 1 ? (activeIdx / (totalNodes - 1)) * 100 : 0;

  return (
    <section className="r2-page-wrap" aria-label="Round 2 Checkpoint Trial">
      <div className="r2-ambient-glow"></div>
      <div className="r2-stars-overlay"></div>

      {/* Top Header Navigation Bar */}
      <header className="quiz-top-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <div className="quiz-top-inner">
          <div className="quiz-brand">
            <span className="brand-title">ROUND 2 · THE MARAUDER’S EXPEDITION</span>
            <small className="brand-sub">CAMPUS-WIDE PHYSICAL CHECKPOINT HUNT</small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              className="quiz-who-pill"
              title={`${participant?.name || 'Seeker'} · ${participant?.teamId || 'TEAM'}`}
            >
              <span className="star-dot" style={{ color: '#48e28f' }}>✦</span>
              <b>{participant?.name || 'Seeker'}</b>
              <span className="sep">·</span>
              <span style={{ color: '#48e28f' }}>{participant?.teamId || 'TEAM'}</span>
            </div>

            <button
              type="button"
              className="btn-ghost"
              onClick={onBackToHall}
              style={{ fontSize: '11px', padding: '6px 14px' }}
            >
              ← GREAT HALL
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Card */}
      <div className="r2-main-card" style={{ marginTop: '72px' }}>
        
        {uiState === 'loading' && (
          <div className="r2-scanner-wrap">
            <div className="r2-radar-ring"></div>
            <p className="r2-scanner-text">Consulting the Marauder's Map...</p>
            <p className="r2-scanner-sub">Attuning to the campus enchantments...</p>
          </div>
        )}

        {uiState === 'expired' && (
          <div className="r2-error-box">
            <div className="r2-error-icon" style={{ color: '#f0d089', fontSize: '32px' }}>✦</div>
            <h3 className="r2-error-title" style={{ color: '#f0d089' }}>SESSION EXPIRED</h3>
            <p className="r2-error-msg">{errorMessage}</p>
            <button className="r2-btn-gold" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }} onClick={handleRelogin}>
              LOG IN TO CONTINUE ✦
            </button>
          </div>
        )}

        {uiState === 'error' && (
          <div className="r2-error-box">
            <div className="r2-error-icon" style={{ color: '#ef4444', fontSize: '32px' }}>✦</div>
            <h3 className="r2-error-title">COORDINATES UNREACHABLE</h3>
            <p className="r2-error-msg">{errorMessage}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="r2-btn-gold" onClick={() => fetchCurrentState(2)}>RETRY SIGNAL ↻</button>
              <button className="r2-btn-ghost" onClick={handleRelogin}>LOG IN</button>
            </div>
          </div>
        )}

        {/* Roadmap tracker for solving, transit, complete */}
        {['solving', 'transit', 'complete'].includes(uiState) && (
          <div className="r2-roadmap">
            <div className="r2-tracker-card">
              <div className="r2-tracker-header">
                <span className="star-dot">✦</span>
                <span>
                  {uiState === 'complete' 
                    ? 'ALL 6 CHECKPOINTS CLEARED!' 
                    : (stepInfo.displayStep || 0) === 0 
                      ? 'STARTING TRIAL • 6 CHECKPOINTS TO GO'
                      : `CHECKPOINT ${stepInfo.displayStep} OF 6 CLEARED`}
                </span>
                <span className="r2-tracker-meta">{Math.max(0, 6 - (stepInfo.displayStep || 0))} to Final</span>
              </div>
            </div>

            <div className="r2-nodes-row">
              <div className="r2-track-line-bg">
                <div 
                  className="r2-track-line-fill" 
                  style={{ width: `${fillPercentage}%` }}
                ></div>
              </div>

              {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
                const isDone = uiState === 'complete' || idx < (stepInfo.displayStep || 0);
                const isActive = uiState !== 'complete' && idx === (stepInfo.displayStep || 0);
                const isFinal = idx === 6;

                let nodeClass = 'r2-node-circle';
                if (isDone) nodeClass += ' done';
                else if (isActive) nodeClass += ' active';
                if (isFinal) nodeClass += ' final-node';

                return (
                  <div key={idx} className="r2-node-wrapper">
                    <div className={nodeClass}>
                      {isDone ? '✓' : isFinal ? '🏆' : idx === 0 ? '✦' : idx}
                    </div>
                    <span className={`r2-node-label ${isActive ? 'active-label' : ''}`}>
                      {idx === 0 ? 'START' : `CP ${idx}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Push Banner */}
        {(uiState === 'transit' || (uiState === 'solving' && stepInfo.remainingSteps <= 3)) && (
          <div className={`r2-push-banner r2-push-${pushMessage.theme}`}>
            <div className="r2-push-pill">
              {pushMessage.pill}
            </div>
            <h3 className="r2-push-headline">{pushMessage.headline}</h3>
            <p className="r2-push-subtext">{pushMessage.subtext}</p>
          </div>
        )}

        {/* SOLVING STATE: ENCHANTED RIDDLE SCROLL */}
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
            
            {/* The Parchment Scroll for Question */}
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

            {/* Answer Input Group */}
            <form onSubmit={handleSubmitAnswer} className="r2-form-group" style={{ marginTop: '1.5rem' }}>
              <div className="r2-input-wrapper">
                <label className="r2-input-label">YOUR CIPHER SOLUTION:</label>
                <input
                  type="text"
                  placeholder="Enter the solution keyword..."
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  className="r2-input"
                  autoFocus
                  disabled={isSubmitting}
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

        {/* TRANSIT STATE: SPRINT RADAR WITH RIDDLE */}
        {uiState === 'transit' && (
          <div className="r2-transit-card">
            <div className="r2-transit-badge">
              <span>✓</span> {(stepInfo.displayStep || 0) === 0 ? 'TRIAL UNLOCKED!' : `CHECKPOINT ${stepInfo.displayStep} OF 6 CLEARED!`}
            </div>

            <div className="r2-dest-spotlight" style={{ padding: '2.5rem 2rem' }}>
              <p className="r2-dest-kicker" style={{ color: '#f0d089', marginBottom: '1.2rem', letterSpacing: '0.1em' }}>
                {(stepInfo.displayStep || 0) === 0 ? 'SOLVE THIS TO FIND YOUR FIRST CHECKPOINT' : 'SOLVE THIS TO FIND YOUR NEXT DESTINATION'}
              </p>
              
              {/* Destination Riddle Display */}
              {nextRiddle ? (
                <div className="r2-riddle-parchment th-card" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                  <span className="corner tl"></span>
                  <span className="corner tr"></span>
                  <span className="corner bl"></span>
                  <span className="corner br"></span>
                  <p className="r2-riddle-text" style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', fontSize: '1.2rem', lineHeight: 1.6 }}>
                    {nextRiddle}
                  </p>
                </div>
              ) : (
                <h2 className="r2-dest-name">{nextDest}</h2>
              )}
              
              <p className="r2-dest-instruction" style={{ opacity: 0.95, color: '#f0d089', fontSize: '1.05rem', margin: '1rem 0 0 0' }}>
                Decipher the destination charm and sprint there with your squad — our Order's Station Volunteers await your arrival!
              </p>
            </div>

            {/* Volunteer Presence Guidance Box - Only shown on the final checkpoint */}
            {((stepInfo.displayStep || 0) >= 6 || stepInfo.remainingSteps <= 1) && (
              <div className="r2-action-guidance" style={{ marginTop: '1.2rem', background: 'rgba(240, 208, 137, 0.08)', border: '1px solid rgba(240, 208, 137, 0.25)', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span className="r2-guidance-icon" style={{ fontSize: '1.6rem' }}>🧙‍♂️</span>
                <p className="r2-guidance-text" style={{ margin: 0, fontSize: '0.94rem', color: '#fef3c7', lineHeight: '1.5' }}>
                  When you arrive at <strong>the enchanted location</strong>, locate our <strong>Order Volunteers & Marshals</strong> stationed there. Approach them to reveal the <strong>hidden round</strong>!
                </p>
              </div>
            )}
          </div>
        )}

        {/* COMPLETE STATE: CHAMPION'S VICTORY */}
        {uiState === 'complete' && (
          <div className="r2-complete-card">
            <div className="r2-trophy-aura">🏆</div>
            <h2 className="r2-complete-title">ALL RIDDLES CONQUERED!</h2>
            <p className="r2-complete-sub" style={{ color: '#ffd700', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.04em' }}>
              ✦ SPRINT TO THE FINAL DESTINATION RIGHT NOW ✦
            </p>
            <p className="r2-complete-desc">
              You have conquered all checkpoints and solved every keeper's riddle!
              The championship race is yours — sprint to the final station as fast as you can to claim victory!
              Report your arrival to the tournament marshals at the finish line.
            </p>
            <button className="r2-btn-gold" onClick={onBackToHall}>RETURN TO GREAT HALL</button>
          </div>
        )}

      </div>
    </section>
  );
}
