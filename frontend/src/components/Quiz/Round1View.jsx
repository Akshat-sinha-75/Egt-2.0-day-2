import React, { useState } from 'react';
import { ROUND1_QUESTIONS, TOTAL_QUESTIONS } from './QuizData';
import { spawnSparks } from '../../utils/sparks';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function Round1View({
  participant,
  answers,
  onSelectAnswer,
  onSubmitQuiz,
  onBackToHall,
}) {
  const [currentId, setCurrentId] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] != null && answers[k] !== ''
  ).length;

  const currentQ =
    ROUND1_QUESTIONS.find((q) => q.id === currentId) || ROUND1_QUESTIONS[0];
  const selectedOption = answers[currentQ.id];

  const handleOptionClick = (opt, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    spawnSparks(rect.left + 24, rect.top + rect.height / 2, '#f0d089', 8);
    onSelectAnswer(currentQ.id, opt);
  };

  const handleConfirmSubmit = async (e) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, '#f0d089', 24);

    setTimeout(() => {
      setShowConfirmModal(false);
      onSubmitQuiz();
    }, 450);
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

          <div
            className="quiz-who-pill"
            title={`${participant.name} · ${participant.teamId}`}
          >
            <span className="wizard-icon">🧙</span>
            <b>{participant.name}</b>
            <span className="sep">·</span>
            <span>{participant.teamId}</span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="quiz-main-wrap">
        <div className="quiz-layout-container">
          {/* Left Column: Active Question */}
          <div className="quiz-question-column">
            <article className="qcard th-card" key={currentQ.id}>
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>

              <span className="card-spark" style={{ top: '12%', right: '10%' }}>
          
              </span>

              <div className="q-kicker-row">
                <p className="qnum">
                  QUESTION {currentQ.id} OF {TOTAL_QUESTIONS}
                </p>
                {selectedOption && (
                  <span className="done-badge"> ANSWERED</span>
                )}
              </div>

              <h2 className="qtext">{currentQ.question}</h2>

              <div
                className="opts-group"
                role="radiogroup"
                aria-label={`Options for Question ${currentQ.id}`}
              >
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOption === opt;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`opt-btn ${isSelected ? 'selected' : ''}`}
                      onClick={(e) => handleOptionClick(opt, e)}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      <span className="opt-key">{OPTION_LETTERS[idx]}</span>
                      <span className="opt-label">{opt}</span>
                    </button>
                  );
                })}
              </div>

              <div className="q-nav-step">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={currentId <= 1}
                  onClick={() => {
                    setCurrentId((prev) => Math.max(1, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ← PREVIOUS
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={currentId >= TOTAL_QUESTIONS}
                  onClick={() => {
                    setCurrentId((prev) => Math.min(TOTAL_QUESTIONS, prev + 1));
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
                <h3 className="palette-title">QUESTION PALETTE</h3>
                <span className="palette-count-chip">
                  {answeredCount} / {TOTAL_QUESTIONS}
                </span>
              </div>

              {/* 1–20 Grid of Question Numbers */}
              <nav className="qnav-grid" aria-label="Question numbers">
                {ROUND1_QUESTIONS.map((q) => {
                  const isCurrent = q.id === currentId;
                  const isAnswered = answers[q.id] != null && answers[q.id] !== '';
                  let btnClass = 'qgrid-btn';
                  if (isCurrent) btnClass += ' current';
                  else if (isAnswered) btnClass += ' answered';

                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={btnClass}
                      onClick={() => {
                        setCurrentId(q.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      aria-label={`Question ${q.id} ${isAnswered ? '(Answered)' : '(Unanswered)'}`}
                      aria-current={isCurrent ? 'step' : 'false'}
                    >
                      {q.id}
                    </button>
                  );
                })}
              </nav>

              {/* Status Legend */}
              <div className="qnav-legend-sidebar">
                <span className="leg-item">
                  <i className="lg-dot cur"></i> Current
                </span>
                <span className="leg-item">
                  <i className="lg-dot ans"></i> Answered
                </span>
                <span className="leg-item">
                  <i className="lg-dot un"></i> Unanswered
                </span>
              </div>

              {/* Progress Bar & Summary */}
              <div className="palette-progress-box">
                <div className="palette-progress-info">
                  <span>PROGRESS</span>
                  <b>{Math.round((answeredCount / TOTAL_QUESTIONS) * 100)}%</b>
                </div>
                <div className="palette-progress-track">
                  <div
                    className="palette-progress-fill"
                    style={{ width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%` }}
                  ></div>
                </div>
                <div className="palette-stats-row">
                  <span className="stat-pill stat-ans">
                    <b>{answeredCount}</b> Answered
                  </span>
                  <span className="stat-pill stat-rem">
                    <b>{TOTAL_QUESTIONS - answeredCount}</b> Left
                  </span>
                </div>
              </div>

              {/* SUBMIT BUTTON DIRECTLY BELOW QUESTION NUMBERS */}
              <div className="palette-submit-action">
                <button
                  type="button"
                  className="btn-gold sidebar-submit-btn"
                  onClick={() => setShowConfirmModal(true)}
                >
                  SUBMIT ROUND 1&nbsp;
                </button>
                <small className="submit-hint">
                  Seals your answers for O.W.L. grading
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
              Are you sure you want to submit <b>Round 1</b>?
              <br />
              You have answered <b>{answeredCount} of {TOTAL_QUESTIONS}</b> questions.
            </p>

            {answeredCount < TOTAL_QUESTIONS && (
              <p className="modal-warn">
                ⚠️ {TOTAL_QUESTIONS - answeredCount} question{TOTAL_QUESTIONS - answeredCount > 1 ? 's are' : ' is'} still unanswered and will be marked incorrect.
              </p>
            )}

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
                {isSubmitting ? 'SEALING SCROLL…' : 'SUBMIT '}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
