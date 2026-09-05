import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';
import './Quiz.css';
import './Round2CheckpointView.css';

function getMotivationalPush(remainingSteps, stepNumber, totalSteps = 7) {
  if (remainingSteps === 1) {
    return {
      theme: 'climax',
      pill: '🔥 FINAL SPRINT • THE FOUNTAIN AWAITS',
      headline: 'RUN TO THE FOUNTAIN! EGT 2.0 IS YOURS TO WIN!',
      subtext: 'This is the ultimate showdown! You have conquered all previous trials. Sprint to the Fountain QR code right now and claim victory!'
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

export default function Round2PlayView({ participant, onBackToHall, onTriggerToast, onLogout }) {
  const [uiState, setUiState] = useState('loading'); // loading, solving, transit, complete, error, expired
  const [errorMessage, setErrorMessage] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [nextDest, setNextDest] = useState('');

  const [stepInfo, setStepInfo] = useState({
    currentStep: 0,
    totalSteps: 7,
    stepNumber: 1,
    remainingSteps: 6,
    currentDestination: null
  });

  const token = participant?.token || localStorage.getItem('R2_Token');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  const fetchCurrentState = async () => {
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
        throw new Error(data.error || 'Failed to load round 2 state');
      }

      if (data.currentStep !== undefined) {
        setStepInfo({
          currentStep: data.currentStep,
          totalSteps: data.totalSteps || 7,
          remainingSteps: data.remainingSteps !== undefined ? data.remainingSteps : Math.max(0, (data.totalSteps || 7) - data.currentStep),
          stepNumber: data.stepNumber || (data.currentStep + 1),
          currentDestination: data.currentDestination || null
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
          stepNumber: data.stepNumber || (data.currentStep + 1)
        });
      }

      // Success!
      spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#43e08a', 35);
      setAnswerInput('');
      setNextDest(data.nextDestination);
      setUiState('transit');
      if (onTriggerToast) onTriggerToast(' CORRECT! SPRINT TO NEXT DESTINATION! ');
    } catch (err) {
      if (onTriggerToast) onTriggerToast(` ERROR: ${err.message} `);
      setUiState('solving');
    }
  };

  const pushMessage = getMotivationalPush(stepInfo.remainingSteps, stepInfo.stepNumber, stepInfo.totalSteps);

  const totalNodes = stepInfo.totalSteps || 7;
  const nodes = Array.from({ length: totalNodes }, (_, idx) => idx);
  const activeIdx = Math.min(stepInfo.currentStep, totalNodes - 1);
  const fillPercentage = (activeIdx / (totalNodes - 1)) * 100;

  return (
    <section className="r2-page-wrap">
      <div className="r2-ambient-glow"></div>
      <div className="r2-stars-overlay"></div>

      <div className="r2-main-card">
        
        {uiState === 'loading' && (
          <div className="r2-scanner-wrap">
            <div className="r2-radar-ring"></div>
            <p className="r2-scanner-text">Consulting the Marauder's Map...</p>
            <p className="r2-scanner-sub">Locating current coordinates...</p>
          </div>
        )}

        {uiState === 'expired' && (
          <div className="r2-error-box">
            <div className="r2-error-icon">🔒</div>
            <h3 className="r2-error-title" style={{ color: '#f0d089' }}>SESSION EXPIRED</h3>
            <p className="r2-error-msg">{errorMessage}</p>
            <button className="r2-btn-gold" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }} onClick={handleRelogin}>
              🔑 LOG IN TO CONTINUE
            </button>
          </div>
        )}

        {uiState === 'error' && (
          <div className="r2-error-box">
            <div className="r2-error-icon">⚠️</div>
            <h3 className="r2-error-title">COORDINATES UNREACHABLE</h3>
            <p className="r2-error-msg">{errorMessage}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem' }}>
              <button className="r2-btn-ghost" onClick={fetchCurrentState}>RETRY</button>
              <button className="r2-btn-ghost" onClick={handleRelogin}>LOG IN</button>
            </div>
          </div>
        )}

        {/* Roadmap tracker for solving, transit, complete */}
        {['solving', 'transit', 'complete'].includes(uiState) && (
          <div className="r2-roadmap">
            <div className="r2-roadmap-top">
              <span className="r2-roadmap-status">
                <span>⚡</span>
                {uiState === 'complete' 
                  ? 'ALL 7 CHECKPOINTS CLEARED!' 
                  : `CHECKPOINT ${stepInfo.stepNumber} OF ${stepInfo.totalSteps}`}
              </span>
              <span className="r2-roadmap-remaining">
                {uiState === 'complete'
                  ? '🏆 CHAMPION'
                  : stepInfo.remainingSteps === 1
                  ? '🔥 FOUNTAIN NEXT!'
                  : `${stepInfo.remainingSteps} to Fountain`}
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
                const isDone = uiState === 'complete' || idx < stepInfo.currentStep;
                const isActive = uiState !== 'complete' && idx === stepInfo.currentStep;
                const isFountain = idx === totalNodes - 1;

                let nodeClass = 'r2-node-circle';
                if (isDone) nodeClass += ' done';
                else if (isActive) nodeClass += ' active';
                if (isFountain) nodeClass += ' fountain-node';

                return (
                  <div key={idx} className="r2-node-wrapper">
                    <div className={nodeClass}>
                      {isDone ? '✓' : isFountain ? '🏆' : idx + 1}
                    </div>
                    <span className={`r2-node-label ${isActive ? 'active-label' : ''}`}>
                      {isFountain ? 'FOUNTAIN' : `CP ${idx + 1}`}
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

        {uiState === 'solving' && (
          <div className="r2-riddle-container">
            <div className="r2-solved-banner">
              <span>📍</span> CURRENT RIDDLE
            </div>
            <p className="r2-riddle-intro">
              Decipher the riddle to unlock your next destination:
            </p>
            
            <div className="r2-riddle-parchment">
              <p className="r2-riddle-text">{questionText}</p>
            </div>

            <form onSubmit={handleSubmitAnswer} className="r2-form-group">
              <input
                type="text"
                placeholder="Enter your answer..."
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                className="r2-input"
                autoFocus
              />
              <button type="submit" className="r2-btn-gold" disabled={!answerInput.trim()}>
                SUBMIT ANSWER ⚡
              </button>
            </form>
          </div>
        )}

        {uiState === 'transit' && (
          <div className="r2-transit-card">
            <div className="r2-transit-badge">
              <span>✓</span> CORRECT ANSWER CONFIRMED!
            </div>

            <div className="r2-dest-spotlight">
              <p className="r2-dest-kicker">RUN IMMEDIATELY TO YOUR NEXT DESTINATION</p>
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
          </div>
        )}

        {uiState === 'complete' && (
          <div className="r2-complete-card">
            <div className="r2-trophy-aura">🏆</div>
            <h2 className="r2-complete-title">THE VAULT IS YOURS!</h2>
            <p className="r2-complete-sub">ALL 7 CHECKPOINTS COMPLETED!</p>
            <p className="r2-complete-desc">
              You have successfully conquered all checkpoints of the tournament.
              Return to the Great Hall to claim your standing!
            </p>
            <button className="r2-btn-gold" onClick={onBackToHall}>RETURN TO GREAT HALL</button>
          </div>
        )}

      </div>
      
      {uiState !== 'complete' && (
        <button type="button" className="r2-btn-ghost" style={{ marginTop: '2rem' }} onClick={onBackToHall}>
          ← EXIT TO GREAT HALL
        </button>
      )}
    </section>
  );
}
