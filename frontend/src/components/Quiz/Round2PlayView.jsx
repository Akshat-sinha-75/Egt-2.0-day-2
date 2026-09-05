import React, { useState, useEffect } from 'react';
import { spawnSparks } from '../../utils/sparks';
import './Quiz.css';

export default function Round2PlayView({ participant, onBackToHall, onTriggerToast }) {
  const [uiState, setUiState] = useState('loading'); // loading, solving, transit, complete, error
  const [errorMessage, setErrorMessage] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [nextDest, setNextDest] = useState('');

  const token = participant?.token || localStorage.getItem('R2_Token');

  useEffect(() => {
    if (!token) {
      setUiState('error');
      setErrorMessage('Missing authentication token. Please login again.');
      return;
    }
    fetchCurrentState();
  }, [token]);

  const fetchCurrentState = async () => {
    setUiState('loading');
    try {
      const res = await fetch('http://localhost:3001/api/round2/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to load round 2 state');

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
      const res = await fetch('http://localhost:3001/api/round2/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answer: answerInput })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (onTriggerToast) onTriggerToast(` INCORRECT: ${data.error} `);
        setUiState('solving');
        return;
      }

      // Success!
      spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#43e08a', 30);
      setAnswerInput('');
      setNextDest(data.nextDestination);
      setUiState('transit');
    } catch (err) {
      if (onTriggerToast) onTriggerToast(` ERROR: ${err.message} `);
      setUiState('solving');
    }
  };

  return (
    <section className="quiz-play-view" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="th-card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', textAlign: 'center' }}>
        
        {uiState === 'loading' && (
          <div>
            <h2 style={{ color: '#f0d089', marginBottom: '1rem' }}>Consulting the Map...</h2>
            <div className="spinner"></div>
          </div>
        )}

        {uiState === 'error' && (
          <div>
            <h2 style={{ color: '#e04343', marginBottom: '1rem' }}>ERROR</h2>
            <p style={{ color: '#ccc' }}>{errorMessage}</p>
            <button className="btn-ghost" style={{ marginTop: '2rem' }} onClick={fetchCurrentState}>RETRY</button>
          </div>
        )}

        {uiState === 'solving' && (
          <div>
            <p className="quiz-label" style={{ marginBottom: '0.5rem' }}>CURRENT RIDDLE</p>
            <h2 className="quiz-sec-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>WHERE TO NEXT?</h2>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '8px', border: '1px solid rgba(240, 208, 137, 0.3)', marginBottom: '2rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#fff', whiteSpace: 'pre-line', textAlign: 'left', lineHeight: '1.8', fontFamily: "'Poppins', sans-serif" }}>
                {questionText}
              </p>
            </div>

            <form onSubmit={handleSubmitAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Enter your answer..."
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                style={{ padding: '1rem', borderRadius: '4px', border: '1px solid #43e08a', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1.1rem', textAlign: 'center' }}
                autoFocus
              />
              <button type="submit" className="btn-gold" disabled={!answerInput.trim()}>
                SUBMIT ANSWER
              </button>
            </form>
          </div>
        )}

        {uiState === 'transit' && (
          <div>
            <p className="quiz-label" style={{ marginBottom: '0.5rem', color: '#43e08a' }}>CORRECT!</p>
            <h2 className="quiz-sec-title" style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>YOUR NEXT DESTINATION:</h2>
            <h1 style={{ color: '#f0d089', fontSize: '2.5rem', margin: '2rem 0', textTransform: 'uppercase', letterSpacing: '2px' }}>
              {nextDest}
            </h1>
            <p style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.5' }}>
              Run to this location immediately!<br/>
              Find the QR code posted there and scan it to prove you arrived.
            </p>
          </div>
        )}

        {uiState === 'complete' && (
          <div>
            <p className="quiz-label" style={{ marginBottom: '0.5rem', color: '#43e08a' }}>HUNT COMPLETE</p>
            <h2 className="quiz-sec-title" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>THE VAULT IS YOURS!</h2>
            <p style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.5', marginBottom: '2rem' }}>
              You have successfully cleared all checkpoints.<br/>
              Return to the Great Hall to await final rankings.
            </p>
            <button className="btn-gold" onClick={onBackToHall}>RETURN TO GREAT HALL</button>
          </div>
        )}

      </div>
      
      {uiState !== 'complete' && (
        <button type="button" className="btn-ghost" style={{ marginTop: '2rem' }} onClick={onBackToHall}>
          ← EXIT TO GREAT HALL
        </button>
      )}
    </section>
  );
}
