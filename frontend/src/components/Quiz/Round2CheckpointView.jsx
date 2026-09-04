import React, { useState, useEffect } from 'react';
import './Quiz.css';

export default function Round2CheckpointView({ onBackToHall, onTriggerToast }) {
  const [token, setToken] = useState(localStorage.getItem('R2_Token'));
  const [teamId, setTeamId] = useState('');
  const [pass, setPass] = useState('');
  
  const [uiState, setUiState] = useState('loading'); // loading, login, scanning, error, solving, transit, complete
  const [errorMessage, setErrorMessage] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [nextDest, setNextDest] = useState('');
  
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
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, pass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('R2_Token', data.token);
      setToken(data.token);
    } catch (err) {
      setUiState('login');
      if (onTriggerToast) onTriggerToast(` LOGIN FAILED: ${err.message} `);
    }
  };

  const handleScanQr = async () => {
    setUiState('scanning');
    try {
      const res = await fetch('http://localhost:3001/api/round2/scan_qr', {
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

      if (data.state === 'COMPLETE') {
        setUiState('complete');
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
      const res = await fetch('http://localhost:3001/api/round2/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
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

      setNextDest(data.nextDestination);
      setUiState('transit');
      if (onTriggerToast) onTriggerToast(' CORRECT! ');
    } catch (err) {
      if (onTriggerToast) onTriggerToast(` ERROR: ${err.message} `);
      setUiState('solving');
    }
  };

  return (
    <div className="login-view-page" style={{ paddingTop: '10vh', fontFamily: "'Poppins', sans-serif" }}>
      <div className="login-box th-card" style={{ maxWidth: '420px', margin: '0 auto', fontFamily: "'Poppins', sans-serif" }}>
        <header className="login-header" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <p className="quiz-label center" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '2px', fontSize: '0.75rem' }}>ROUND 2: THE RUN</p>
          <h2 className="quiz-sec-title center" style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.6rem', fontWeight: 600 }}>CHECKPOINT SCANNED</h2>
          <p className="center" style={{ fontSize: '0.85rem', color: '#999', marginTop: '5px', fontFamily: "'Poppins', sans-serif" }}>ID: {qrCode}</p>
        </header>

        {uiState === 'loading' || uiState === 'scanning' ? (
          <div className="center" style={{ padding: '2rem' }}>
            <p style={{ color: '#f0d089' }}>{uiState === 'scanning' ? 'Verifying Checkpoint...' : 'Processing...'}</p>
          </div>
        ) : uiState === 'login' ? (
          <form className="login-form" onSubmit={handleLogin} style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div className="input-group">
              <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.75rem', fontWeight: 500, letterSpacing: '1px' }}>TEAM ID</label>
              <input
                type="text"
                placeholder="e.g. TH-007"
                required
                value={teamId}
                onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem' }}
              />
            </div>
            <div className="input-group">
              <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.75rem', fontWeight: 500, letterSpacing: '1px' }}>EVENT PASS</label>
              <input
                type="password"
                placeholder="Enter secret pass"
                required
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem' }}
              />
            </div>
            <button type="submit" className="btn-gold" style={{ width: '100%', marginTop: '1rem', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
              AUTHENTICATE
            </button>
          </form>
        ) : uiState === 'error' ? (
          <div className="center" style={{ padding: '2rem' }}>
            <h3 style={{ color: '#d9534f', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>❌ ERROR</h3>
            <p style={{ marginTop: '1rem', color: '#ccc' }}>{errorMessage}</p>
            <button className="btn-ghost" onClick={handleScanQr} style={{ marginTop: '2rem', fontFamily: "'Poppins', sans-serif" }}>RETRY SCAN</button>
          </div>
        ) : uiState === 'solving' ? (
          <div className="center" style={{ padding: '1rem' }}>
            <h3 style={{ color: '#43e08a', marginBottom: '1rem', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>CHECKPOINT CLEARED!</h3>
            <p style={{ marginBottom: '1rem', color: '#ccc' }}>To reveal your next destination, solve this:</p>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(240, 208, 137, 0.3)', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.95rem', color: '#fff', whiteSpace: 'pre-line', textAlign: 'left', lineHeight: '1.8', fontFamily: "'Poppins', sans-serif", fontWeight: 400 }}>{questionText}</p>
            </div>

            <form onSubmit={handleSubmitAnswer}>
              <input 
                type="text" 
                placeholder="Your Answer..." 
                required 
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                style={{ width: '100%', padding: '0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', textAlign: 'center', marginBottom: '1rem', fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 500, outline: 'none' }}
              />
              <button type="submit" className="btn-gold" style={{ width: '100%', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>SUBMIT ANSWER</button>
            </form>
          </div>
        ) : uiState === 'transit' ? (
          <div className="center" style={{ padding: '2rem' }}>
            <h3 style={{ color: '#43e08a', marginBottom: '1rem', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>CORRECT!</h3>
            <p style={{ color: '#ccc', marginBottom: '1rem' }}>Run immediately to your next destination:</p>
            <h2 style={{ fontSize: '2rem', color: '#f0d089', margin: '1rem 0', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>{nextDest}</h2>
            <p style={{ fontSize: '0.9rem', color: '#888' }}>Scan the QR code when you arrive.</p>
          </div>
        ) : uiState === 'complete' ? (
          <div className="center" style={{ padding: '2rem' }}>
            <h3 style={{ color: '#f0d089', fontSize: '2.5rem', marginBottom: '1rem' }}>🏆</h3>
            <h2 style={{ color: '#43e08a', marginBottom: '1rem', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>HUNT COMPLETED!</h2>
            <p style={{ color: '#ccc' }}>You have reached the final destination. Please see the organizers.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
