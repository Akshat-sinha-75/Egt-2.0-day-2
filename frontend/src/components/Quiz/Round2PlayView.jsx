import React, { useState, useEffect } from 'react';
import {
  ROUND2_CHECKPOINTS,
  ROUND2_TIME_LIMIT,
  ROUND2_RETRY_LOCK,
} from './QuizData';
import { spawnSparks } from '../../utils/sparks';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function Round2PlayView({ participant, round2State, onUpdateRound2, onBackToHall }) {
  const [currentIdx, setCurrentIdx] = useState(round2State?.current || 0);
  const [unlocked, setUnlocked] = useState(round2State?.unlocked || false);
  const [clearedList, setClearedList] = useState(round2State?.cleared || []);
  const [selectedAns, setSelectedAns] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [retryUntil, setRetryUntil] = useState(round2State?.retryAt || null);
  const [timeLeft, setTimeLeft] = useState(ROUND2_TIME_LIMIT);
  const [shakeCard, setShakeCard] = useState(false);
  const [finished, setFinished] = useState(round2State?.finished || false);
  const [elapsedTime, setElapsedTime] = useState(round2State?.elapsedTime || 0);

  const startTime = round2State?.startedAt || Date.now();

  // 1-second interval timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, ROUND2_TIME_LIMIT - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0 && !finished) {
        setFinished(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, finished]);

  const isLocked = retryUntil && Date.now() < retryUntil;
  const lockSeconds = isLocked ? Math.ceil((retryUntil - Date.now()) / 1000) : 0;
  const cp = ROUND2_CHECKPOINTS[currentIdx] || ROUND2_CHECKPOINTS[0];
  const totalStations = ROUND2_CHECKPOINTS.length;

  const handleUnlockCode = (e) => {
    e.preventDefault();
    if (isLocked) return;

    const trimmed = codeInput.trim().toUpperCase();
    if (trimmed === cp.code) {
      spawnSparks(innerWidth / 2, innerHeight / 2, '#43e08a', 24);
      setUnlocked(true);
      setCodeInput('');
      onUpdateRound2?.({ current: currentIdx, unlocked: true, cleared: clearedList });
    } else {
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 550);
      const lockDeadline = Date.now() + ROUND2_RETRY_LOCK * 1000;
      setRetryUntil(lockDeadline);
      onUpdateRound2?.({ current: currentIdx, unlocked: false, cleared: clearedList, retryAt: lockDeadline });
    }
  };

  const handleConfirmAnswer = () => {
    if (!selectedAns) return;

    if (selectedAns === cp.correctAnswer) {
      spawnSparks(innerWidth / 2, innerHeight / 2, '#f0d089', 26);
      const nextCleared = [...clearedList, cp.id];
      setClearedList(nextCleared);

      if (currentIdx >= totalStations - 1) {
        const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(totalElapsed);
        setFinished(true);
        onUpdateRound2?.({
          current: currentIdx,
          unlocked: true,
          cleared: nextCleared,
          finished: true,
          elapsedTime: totalElapsed,
        });
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setUnlocked(false);
        setSelectedAns(null);
        onUpdateRound2?.({
          current: nextIdx,
          unlocked: false,
          cleared: nextCleared,
        });
      }
    } else {
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 550);
      const lockDeadline = Date.now() + ROUND2_RETRY_LOCK * 1000;
      setRetryUntil(lockDeadline);
      setSelectedAns(null);
      onUpdateRound2?.({
        current: currentIdx,
        unlocked: true,
        cleared: clearedList,
        retryAt: lockDeadline,
      });
    }
  };

  // Final Vault Cleared State
  if (finished) {
    return (
      <section className="round2-play-page" aria-label="Round 2 Completed">
        <div className="r2-inner-shell center">
          <p className="quiz-label">THE SECOND TASK · CONCLUDED</p>
          <div className="final-vault-card th-card">
            <span className="corner tl"></span>
            <span className="corner tr"></span>
            <span className="corner bl"></span>
            <span className="corner br"></span>

            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
            <h2 className="vault-title">THE FINAL DESTINATION IS UNLOCKED</h2>
            <p className="vault-desc">
              All seals have been broken. Your team has conquered the Checkpoint Hunt.
              <br />
              Standings have been recorded by the tournament server.
            </p>

            <div className="completion-time-pill">
              ⏱ TOTAL TIME · {formatTime(elapsedTime || 120)}
            </div>

            <div style={{ marginTop: '24px' }}>
              <button type="button" className="btn-gold" onClick={onBackToHall}>
                RETURN TO THE GREAT HALL&nbsp;
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="round2-play-page" aria-label="Round 2 Checkpoints">
      <div className="r2-inner-shell">
        <header className="r2-header center">
          <p className="quiz-label">THE SECOND TASK</p>
          <h2 className="quiz-sec-title">ROUND 2 · THE CHECKPOINT HUNT</h2>
          <p className="quiz-sec-sub">
            {participant.name} · {participant.teamId}
          </p>

          <div className="r2-timer-wrap">
            <span className={`r2-timer-pill ${timeLeft <= 300 ? 'urgent' : ''}`}>
              ⏳ VAULT TIMER · {formatTime(timeLeft)}
            </span>
          </div>
        </header>

        {/* Route Map Nodes */}
        <nav className="checkpoint-map" aria-label="Checkpoints map">
          {ROUND2_CHECKPOINTS.map((c, i) => {
            const isDone = clearedList.includes(c.id);
            const isCurrent = i === currentIdx && !isDone;
            let nodeClass = 'cp-node';
            if (isDone) nodeClass += ' done';
            if (isCurrent) nodeClass += ' current';

            return (
              <div key={c.id} className={nodeClass}>
                <span className="cp-sigil">{isDone ? '✅' : c.sigil}</span>
                <span className="cp-name">{c.name}</span>
              </div>
            );
          })}
        </nav>

        {/* Active Station Card */}
        <article className={`cp-active-card th-card ${shakeCard ? 'shake' : ''}`}>
          <span className="corner tl"></span>
          <span className="corner tr"></span>
          <span className="corner bl"></span>
          <span className="corner br"></span>

          <span className="card-spark" style={{ top: '12%', right: '10%' }}></span>

          <p className="cp-kicker">
            STATION {currentIdx + 1} OF {totalStations} · {cp.sigil}
          </p>
          <h3 className="cp-station-name">{cp.name}</h3>

          {!unlocked ? (
            /* Rune Code Gate */
            <div className="rune-gate-box">
              <p className="cp-hint">
                Whisper from the Marauder’s Map: <b>{cp.hint}</b>
              </p>

              <form onSubmit={handleUnlockCode} className="code-entry-form">
                <input
                  type="text"
                  placeholder="ENTER RUNE CODE"
                  className="code-input"
                  maxLength={16}
                  value={codeInput}
                  disabled={isLocked}
                  onChange={(e) => setCodeInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-gold"
                  disabled={isLocked || !codeInput.trim()}
                >
                  {isLocked ? `JAMMED · ${lockSeconds}s` : 'UNLOCK STATION 🗝️'}
                </button>
              </form>

              {isLocked && (
                <p className="lock-warn">
                  THE LOCK IS JAMMED — HOLD YOUR WAND STEADY. ({lockSeconds}s remaining)
                </p>
              )}
            </div>
          ) : (
            /* Checkpoint Question Challenge */
            <div className="station-question-box">
              <p className="station-question-text">{cp.question}</p>

              <div className="opts-group" role="radiogroup">
                {cp.options.map((opt, i) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const isSelected = selectedAns === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`opt-btn ${isSelected ? 'selected' : ''}`}
                      disabled={isLocked}
                      onClick={() => setSelectedAns(opt)}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      <span className="opt-key">{letters[i]}</span>
                      <span className="opt-label">{opt}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn-gold"
                  disabled={!selectedAns || isLocked}
                  onClick={handleConfirmAnswer}
                >
                  {isLocked ? `JAMMED · ${lockSeconds}s` : 'CONFIRM ANSWER '}
                </button>
              </div>

              {isLocked && (
                <p className="lock-warn">
                  WRONG ANSWER — STATION LOCK JAMMED FOR {lockSeconds}s.
                </p>
              )}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
