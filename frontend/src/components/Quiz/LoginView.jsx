import React, { useState } from 'react';
import { spawnSparks } from '../../utils/sparks';

const CANDLES = [
  { left: '9%', top: '15%', dur: '6.5s', del: '-1s' },
  { left: '20%', top: '8%', dur: '7.6s', del: '-3s' },
  { left: '62%', top: '6%', dur: '6.9s', del: '-5s' },
  { left: '78%', top: '14%', dur: '7.2s', del: '-2s' },
  { left: '90%', top: '22%', dur: '6.4s', del: '-4s' },
];

export default function LoginView({ onLoginSuccess, onBackToHall, onTriggerToast }) {
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, val) => {
    if (field === 'name') setName(val);
    if (field === 'teamId') setTeamId(val);
    if (field === 'pass') setPass(val);

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    const cleanName = name.trim();
    const cleanId = teamId.trim();
    const cleanPass = pass.trim();

    if (cleanName.length < 2) {
      newErrors.name = 'Inscribe your name (at least 2 characters).';
    }
    if (cleanId.length < 3) {
      newErrors.teamId = 'A Team ID or email is required (at least 3 characters).';
    } else if (cleanId.includes('@') && !/^\S+@\S+\.\S+$/.test(cleanId)) {
      newErrors.teamId = 'Please enter a valid email address.';
    }
    if (cleanPass.length < 4) {
      newErrors.pass = 'The event pass must be at least 4 characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (onTriggerToast) {
        onTriggerToast(' THE GATE REFUSES THE SCROLL — CHECK YOUR CREDENTIALS ');
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    spawnSparks(rect.left + rect.width / 2, rect.top + 40, '#f0d089', 24);

    if (onTriggerToast) {
      onTriggerToast(`WELCOME, ${cleanName.toUpperCase()} — ROUND 1 UNLOCKED `);
    }

    onLoginSuccess({
      name: cleanName,
      teamId: cleanId.toUpperCase(),
      loggedInAt: Date.now(),
    });
  };

  return (
    <section className="quiz-login-page" aria-label="Participant login">
      {/* Background Ambience */}
      <div className="quiz-bg-sky"></div>
      <div className="quiz-bg-shade"></div>

      {CANDLES.map((c, i) => (
        <span
          key={i}
          className="candle"
          style={{
            left: c.left,
            top: c.top,
            '--dur': c.dur,
            '--del': c.del,
          }}
        />
      ))}

      <div className="login-card-container">
        <p className="quiz-label center">THE FIRST GATE</p>
        <h2 className="quiz-sec-title center">SIGN THE SCROLL</h2>
        <p className="quiz-sec-sub center">YOUR NAME ENTERS THE HUNT ONLY ONCE</p>

        <div className="quiz-card th-card">
          <span className="corner tl"></span>
          <span className="corner tr"></span>
          <span className="corner bl"></span>
          <span className="corner br"></span>

          <span className="card-spark" style={{ top: '14%', left: '10%' }}></span>
          <span className="card-spark" style={{ top: '22%', right: '12%', animationDelay: '1.2s' }}></span>
          <span className="card-spark" style={{ bottom: '18%', left: '16%', animationDelay: '2.1s' }}></span>

          <p className="login-em center">
            <span className="st"></span> &nbsp;WIZARD LOGIN&nbsp; <span className="st"></span>
          </p>
          <h3 className="login-desc center">Present your credentials to enter Round 1.</h3>
          <p className="login-note center">Your pass is verified once and never stored on this device.</p>

          <form id="loginForm" onSubmit={handleSubmit} noValidate>
            <div className="h-field">
              <label htmlFor="f-name">PARTICIPANT / TEAM NAME</label>
              <input
                id="f-name"
                type="text"
                autoComplete="name"
                placeholder="e.g. The Marauders"
                value={name}
                className={errors.name ? 'invalid' : ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              {errors.name && <p className="h-err">{errors.name}</p>}
            </div>

            <div className="h-field">
              <label htmlFor="f-id">EMAIL / TEAM ID</label>
              <input
                id="f-id"
                type="text"
                autoComplete="username"
                placeholder="e.g. TH-007 or owl@hogwarts.edu"
                value={teamId}
                className={errors.teamId ? 'invalid' : ''}
                onChange={(e) => handleInputChange('teamId', e.target.value)}
              />
              {errors.teamId && <p className="h-err">{errors.teamId}</p>}
            </div>

            <div className="h-field relative-field">
              <label htmlFor="f-pass">EVENT PASS / ACCESS CODE</label>
              <div className="pass-input-wrapper">
                <input
                  id="f-pass"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Given by the tournament organizers"
                  value={pass}
                  className={errors.pass ? 'invalid' : ''}
                  onChange={(e) => handleInputChange('pass', e.target.value)}
                />
                <button
                  type="button"
                  className="h-eye"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? 'NOX' : 'REVELIO'}
                </button>
              </div>
              {errors.pass && <p className="h-err">{errors.pass}</p>}
            </div>

            <div className="login-actions">
              <button type="submit" className="btn-gold login-submit-btn">
                ENTER ROUND 1&nbsp;
              </button>
              <button type="button" className="btn-ghost" onClick={onBackToHall}>
                ← RETURN TO THE GREAT HALL
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
