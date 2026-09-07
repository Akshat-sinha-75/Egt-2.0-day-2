import React, { useState, useEffect } from 'react';
import { ROUND2_RULES } from './QuizData';
import { spawnSparks } from '../../utils/sparks';

const EXPEDITION_NODES = [
  {
    id: 1,
    num: 'I',
    icon: '🔮',
    phase: 'THE INITIAL CIPHER',
    short: 'Decode in App',
    desc: 'Solve the starting riddle in your dashboard to reveal your team’s unique Checkpoint 1 campus coordinates.'
  },
  {
    id: 2,
    num: 'II',
    icon: '🏃‍♂️',
    phase: 'CAMPUS SPRINT',
    short: 'Physical Race',
    desc: 'Sprint with your squad across campus landmarks before competing houses claim the territory.'
  },
  {
    id: 3,
    num: 'III',
    icon: '📷',
    phase: 'QR CHECK-IN & TRIAL',
    short: 'Scan & Decipher',
    desc: 'Find the physical tournament QR marker, scan with your phone camera, and solve the keeper’s checkpoint riddle.'
  },
  {
    id: 4,
    num: 'IV',
    icon: '🗝️',
    phase: 'THE GRAND VAULT',
    short: 'Championship Finish',
    desc: 'Conquer the final checkpoint to unlock the Grand Vault and record your squad’s official championship time.'
  }
];

const DECREE_TITLES = [
  'DECREE I · THE EXPEDITION CHARTER',
  'DECREE II · THE SEQUENTIAL TRAIL',
  'DECREE III · THE HOURGLASS OF TIME',
  'DECREE IV · MINISTRY SAFEGUARDS',
  'DECREE V · THE GRAND VAULT FINALE',
  'DECREE VI · ETERNAL HOUSE GLORY'
];

const DECREE_ICONS = ['🧭', '🗺️', '⏱️', '🛡️', '🗝️', '🏆'];

export default function Round2RulesView({ participant, onStartRound2, onBackToResults, onLogout }) {
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isSealed, setIsSealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleWaxSealClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, '#48e28f', 36);
    setIsSealed(true);
  };

  const handleLaunch = (e) => {
    if (!isReady) return;
    const rect = e.currentTarget.getBoundingClientRect();
    spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, '#48e28f', 40);
    if (onStartRound2) {
      onStartRound2();
    }
  };

  return (
    <section className="marauder-rules-page" aria-label="Round 2 Rules of the Hunt">
      {/* Floating Ambient Candles */}
      <div className="scroll-candle c-left"></div>
      <div className="scroll-candle c-right"></div>
      <div className="scroll-candle c-mid"></div>

      {/* Top Header Navigation Bar */}
      <header className="quiz-top-bar">
        <div className="quiz-top-inner">
          <div className="quiz-brand">
            <span className="brand-title">ROUND 2 · THE MARAUDER’S EXPEDITION</span>
            <small className="brand-sub">THE TRIWIZARD TRIAL OF SPEED & WITS</small>
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
              onClick={onBackToResults}
              style={{ fontSize: '11px', padding: '6px 14px' }}
            >
              ← RESULTS
            </button>
          </div>
        </div>
      </header>

      {/* Unfurled Ancient Scroll Container */}
      <div className="parchment-scroll-wrap">
        {/* Top Scroll Roller Bar */}
        <div className="scroll-roller scroll-roller-top">
          <div className="roller-knob left">✦</div>
          <div className="roller-bar"></div>
          <div className="roller-knob right">✦</div>
        </div>

        {/* Parchment Body */}
        <div className="parchment-body">
          {/* Watermark Crest */}
          <div className="parchment-watermark"> Hogwarts </div>

          {/* Scroll Header */}
          <div className="scroll-hero-head center">
            <div className="headmaster-seal">
              <span>H</span>
            </div>
            <p className="scroll-kicker">✦ THE MINISTRY OF MAGIC & HOGWARTS ACADEMIC COUNCIL ✦</p>
            <h1 className="scroll-main-title">THE CODE OF THE HUNT</h1>
            <p className="scroll-latin-motto">“Draco Dormiens Nunquam Titillandus”</p>
            <p className="scroll-preamble">
              To all qualified squads: The physical tournament grounds are now charged with enchantments.
              Read the sacred decrees below, master the expedition path, and swear the oath of the hunt.
            </p>
          </div>

          {/* SECTION 1: THE MARAUDER’S WINDING TRAIL (NO BOXES - ORGANIC PATH) */}
          <div className="trail-section">
            <div className="section-ribbon">
              <span className="ribbon-line"></span>
              <span className="ribbon-text">✦ THE 4-PHASE EXPEDITION TRAIL ✦</span>
              <span className="ribbon-line"></span>
            </div>

            <div className="winding-trail-container">
              <div className="trail-ink-line"></div>

              {EXPEDITION_NODES.map((node, idx) => (
                <div key={node.id} className={`trail-node-row ${idx % 2 === 0 ? 'node-left' : 'node-right'}`}>
                  <div className="trail-sigil-circle">
                    <span className="trail-num">{node.num}</span>
                    <span className="trail-icon">{node.icon}</span>
                  </div>

                  <div className="trail-parchment-card">
                    <span className="trail-phase-tag">{node.short}</span>
                    <h3 className="trail-phase-title">{node.phase}</h3>
                    <p className="trail-phase-desc">{node.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: THE 6 MINISTRY DECREES (INTERACTIVE CODEX TABLET) */}
          <div className="decrees-section">
            <div className="section-ribbon">
              <span className="ribbon-line"></span>
              <span className="ribbon-text">✦ THE SIX EDUCATIONAL DECREES ✦</span>
              <span className="ribbon-line"></span>
            </div>

            {/* Decree Tabs Selector */}
            <div className="decree-tabs-ribbon">
              {ROUND2_RULES.map((rule, idx) => (
                <button
                  key={rule.id}
                  type="button"
                  className={`decree-tab-pill ${activeTab === idx ? 'active' : ''}`}
                  onClick={() => setActiveTab(idx)}
                >
                  <span className="tab-icon">{DECREE_ICONS[idx]}</span>
                  <span className="tab-label">Decree {idx + 1}</span>
                </button>
              ))}
            </div>

            {/* Active Decree Showcase Tablet */}
            <div className="active-decree-tablet">
              <div className="decree-tablet-seal">
                <span className="decree-seal-icon">{DECREE_ICONS[activeTab]}</span>
              </div>

              <div className="decree-tablet-content">
                <span className="decree-number-badge">OFFICIAL HOGWARTS EDICT #{activeTab + 1}</span>
                <h2 className="decree-display-title">{DECREE_TITLES[activeTab]}</h2>
                <h3 className="decree-sub-name">{ROUND2_RULES[activeTab]?.title}</h3>

                <ul className="decree-bullet-list">
                  {ROUND2_RULES[activeTab]?.points.map((pt, pIdx) => (
                    <li key={pIdx} dangerouslySetInnerHTML={{ __html: pt }} />
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 3: THE SOLEMN OATH & INTERACTIVE WAX SEAL */}
          <div className="oath-ceremony-section center">
            <div className="section-ribbon">
              <span className="ribbon-line"></span>
              <span className="ribbon-text">✦ THE SOLEMN OATH OF PARTICIPATION ✦</span>
              <span className="ribbon-line"></span>
            </div>

            <p className="oath-text-quote">
              “I solemnly swear that my squad shall honor the ancient statutes of the Triwizard Tournament, 
              visit all checkpoints on foot, decode every cipher by our own wit, and manage all mischief with dignity.”
            </p>

            {/* Interactive 3D Wax Seal Button */}
            <div className="wax-seal-ceremony">
              <button
                type="button"
                className={`wax-seal-stamp ${isSealed ? 'stamp-affixed' : ''}`}
                onClick={handleWaxSealClick}
                title={isSealed ? 'Oath Affixed!' : 'Click to Stamp the Wax Seal'}
              >
                <div className="wax-seal-inner">
                  <span className="wax-emblem">{isSealed ? '✓' : '✦'}</span>
                  <span className="wax-label">{isSealed ? 'SEALED' : 'AFFIX SEAL'}</span>
                </div>
              </button>
              
              <p className="wax-seal-caption">
                {isSealed 
                  ? '✦ YOUR SQUAD’S OATH IS SEALED IN HOGWARTS INK ✦' 
                  : 'Click the Wax Seal to affirm your squad’s commitment'}
              </p>
            </div>

            {/* Launch Button */}
            <div className="scroll-launch-action">
              <button
                type="button"
                className={`btn-gold scroll-start-btn ${isSealed ? 'unlocked-portal' : ''}`}
                disabled={!isReady || !isSealed}
                onClick={handleLaunch}
              >
                {!isSealed 
                  ? 'AFFIX WAX SEAL ABOVE TO PROCEED ✦' 
                  : 'ENTER ROUND 2 · MISCHIEF COMMENCED ⚡'}
              </button>
              <small className="scroll-timer-warn">
                <span>⚠</span> The tournament clock begins the instant you proceed past this parchment.
              </small>
            </div>
          </div>
        </div>

        {/* Bottom Scroll Roller Bar */}
        <div className="scroll-roller scroll-roller-bottom">
          <div className="roller-knob left">✦</div>
          <div className="roller-bar"></div>
          <div className="roller-knob right">✦</div>
        </div>
      </div>
    </section>
  );
}
