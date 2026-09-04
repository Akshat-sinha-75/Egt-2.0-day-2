import React, { useState, useEffect, useMemo } from 'react';
import { owlGrade, INITIAL_LEADERBOARD } from './QuizData';
import { spawnSparks } from '../../utils/sparks';

export default function ResultsDashboard({
  participant,
  result,
  rank,
  onProceedToRound2,
  onBackToHall,
}) {
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard' | 'leaderboard'
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'ok' | 'bad'
  const [houseFilter, setHouseFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const grade = owlGrade(result.score);
  const isPerfect = result.isPerfect;

  // Celebratory magical sparks on perfect score mount
  useEffect(() => {
    if (isPerfect) {
      let count = 0;
      const timer = setInterval(() => {
        const x = innerWidth * (0.2 + Math.random() * 0.6);
        const y = 80 + Math.random() * 260;
        spawnSparks(x, y, count % 2 === 0 ? '#f0d089' : '#43e08a', 18);
        count++;
        if (count >= 5) clearInterval(timer);
      }, 350);
      return () => clearInterval(timer);
    }
  }, [isPerfect]);

  // Combined leaderboard with current player's submission inserted
  const fullLeaderboard = useMemo(() => {
    const list = [...INITIAL_LEADERBOARD];
    const userRank = rank || 1;

    // Check if user already exists
    const userEntry = {
      rank: userRank,
      name: participant.name,
      teamId: participant.teamId,
      house: 'Gryffindor',
      score: result.score,
      total: result.total,
      time: '04m 30s',
      status: result.isQualified ? 'QUALIFIED' : 'STANDBY',
      isCurrentUser: true,
    };

    // Insert user entry into ranking list
    list.push(userEntry);
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.rank - b.rank;
    });

    // Re-index ranks cleanly
    return list.map((item, idx) => ({
      ...item,
      displayRank: idx + 1,
    }));
  }, [participant, result, rank]);

  const filteredLeaderboard = fullLeaderboard.filter((item) => {
    const matchesHouse = houseFilter === 'All' || item.house === houseFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teamId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHouse && matchesSearch;
  });

  const filteredReview = result.review.filter((r) => {
    if (reviewFilter === 'ok') return r.isCorrect;
    if (reviewFilter === 'bad') return !r.isCorrect;
    return true;
  });

  return (
    <section className="results-dashboard-page" aria-label="Round 1 results and tournament dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <header className="results-header">
          <p className="quiz-label center">THE FIRST TASK · EXAMINATION CONCLUDED</p>
          <h1 className="quiz-sec-title center">THE HOUSE-CUP DASHBOARD</h1>
          <div className="center">
            <span className="part-status-chip">
              🧙 <b>{participant.name}</b> · {participant.teamId}
            </span>
          </div>
        </header>

        {/* House-Cup Scoreboard Card (inspired by dd.html) */}
        <section className="score-board-card th-card">
          <span className="corner tl"></span>
          <span className="corner tr"></span>
          <span className="corner bl"></span>
          <span className="corner br"></span>

          <div className="sb-grid">
            {/* Left: Big Score & Accuracy */}
            <div className="sb-score-col">
              <div className="sb-score-number">{result.score}</div>
              <span className="sb-score-sub">OF {result.total} CORRECT</span>
              <div className="sb-accuracy-badge">{result.percent}% ACCURACY</div>
            </div>

            {/* Middle: Title, Progress Bar, Details */}
            <div className="sb-mid-col">
              <h2 className="sb-headline">
                {isPerfect
                  ? '🎉 Outstanding! A Flawless Scroll'
                  : result.isQualified
                  ? '🧹 Exceeds Expectations — Gate Unlocked'
                  : '🌫️ The Vault Stays Sealed'}
              </h2>

              <div className="sb-bar-wrap">
                <div
                  className="sb-bar-fill"
                  style={{ width: `${result.percent}%` }}
                ></div>
              </div>

              <p className="sb-details">
                Submitted on {new Date(result.submittedAt).toLocaleTimeString()} · All 20 answers locked and recorded on the tournament ledger.
              </p>
            </div>

            {/* Right: Grade Stamp & Rank Plaque */}
            <div className="sb-right-col">
              <div className={`grade-stamp ${result.isQualified ? 'pass' : 'fail'}`}>
                <b className="stamp-letter">{grade.grade}</b>
                <span className="stamp-label">{grade.label.toUpperCase()}</span>
              </div>

              <div className="rank-plaque">
                <span className="plaque-label">YOUR RANK</span>
                <b className="plaque-num">#{rank || 1}</b>
              </div>
            </div>
          </div>
        </section>

        {/* Qualification Decree Banner */}
        {isPerfect ? (
          <div className="decree-banner good th-card">
            <span className="decree-icon">🎉</span>
            <div className="decree-text">
              <h4>DECREE OF ADVANCEMENT</h4>
              <p>
                Congratulations! You answered all <b>20 questions correctly</b>. You have conquered Round 1 and the gates of Round 2 are open for your team.
              </p>
            </div>
          </div>
        ) : (
          <div className="decree-banner info th-card">
            <span className="decree-icon">📜</span>
            <div className="decree-text">
              <h4>TOURNAMENT STANDINGS RECORDED</h4>
              <p>
                You scored <b>{result.score} of {result.total}</b>. Your score has been entered into the live leaderboard below.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="results-actions-row">
          <button
            type="button"
            className="btn-gold"
            onClick={onProceedToRound2}
          >
            MOVE TO ROUND 2&nbsp;✦
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onBackToHall}
          >
            ← RETURN TO THE GREAT HALL
          </button>
        </div>

        {/* Tab Switcher: Scorecard vs Leaderboard */}
        <div className="dashboard-tabs" role="tablist">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'scorecard' ? 'active' : ''}`}
            onClick={() => setActiveTab('scorecard')}
            role="tab"
            aria-selected={activeTab === 'scorecard'}
          >
            📊 SCORECARD & ANSWER REVIEW
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
            role="tab"
            aria-selected={activeTab === 'leaderboard'}
          >
            🏆 TOURNAMENT LEADERBOARD
          </button>
        </div>

        {/* Tab 1: Answer Review */}
        {activeTab === 'scorecard' && (
          <div className="review-section">
            <div className="review-controls">
              <h3 className="review-title">THE SCROLL, LINE BY LINE</h3>
              <div className="filter-chips">
                <button
                  type="button"
                  className={`f-chip ${reviewFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setReviewFilter('all')}
                >
                  ALL · {result.total}
                </button>
                <button
                  type="button"
                  className={`f-chip ${reviewFilter === 'ok' ? 'active' : ''}`}
                  onClick={() => setReviewFilter('ok')}
                >
                  ✅ CORRECT · {result.score}
                </button>
                <button
                  type="button"
                  className={`f-chip ${reviewFilter === 'bad' ? 'active' : ''}`}
                  onClick={() => setReviewFilter('bad')}
                >
                  ❌ MISSED · {result.total - result.score}
                </button>
              </div>
            </div>

            <div className="review-list">
              {filteredReview.map((row) => (
                <article
                  key={row.id}
                  className={`review-row-card th-card ${row.isCorrect ? 'ok' : 'bad'}`}
                >
                  <div className="row-icon">{row.isCorrect ? '✅' : '❌'}</div>
                  <div className="row-content">
                    <div className="row-meta">
                      <span className="row-qnum">QUESTION {String(row.id).padStart(2, '0')}</span>
                      <span className={`row-badge ${row.isCorrect ? 'ok' : 'bad'}`}>
                        {row.isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    </div>
                    <p className="row-question">{row.question}</p>
                    <p className="row-ans">
                      Your answer:&nbsp;
                      <b>{row.userAnswer || '— not answered —'}</b>
                    </p>
                    {!row.isCorrect && (
                      <p className="row-correct">
                        Correct answer:&nbsp;
                        <b>{row.correctAnswer}</b>
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Tournament Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="leaderboard-section">
            <div className="lb-controls-row">
              <input
                type="text"
                placeholder="Search team or participant…"
                className="lb-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="house-filter-pills">
                {['All', 'Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'].map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`h-chip ${houseFilter === h ? 'active' : ''}`}
                    onClick={() => setHouseFilter(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-responsive th-card">
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>TEAM / PARTICIPANT</th>
                    <th>HOUSE</th>
                    <th>SCORE</th>
                    <th>TIME</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((team) => {
                    const isTop1 = team.displayRank === 1;
                    const isTop2 = team.displayRank === 2;
                    const isTop3 = team.displayRank === 3;

                    return (
                      <tr
                        key={`${team.teamId}-${team.displayRank}`}
                        className={`${team.isCurrentUser ? 'current-user-row' : ''}`}
                      >
                        <td className="rank-cell">
                          {isTop1 ? '🥇 #1' : isTop2 ? '🥈 #2' : isTop3 ? '🥉 #3' : `#${team.displayRank}`}
                        </td>
                        <td className="name-cell">
                          <b>{team.name}</b>
                          {team.isCurrentUser && <span className="you-tag">YOU</span>}
                          <small>{team.teamId}</small>
                        </td>
                        <td>
                          <span className={`house-pill house-${team.house.toLowerCase()}`}>
                            {team.house}
                          </span>
                        </td>
                        <td className="score-cell">
                          <b>{team.score}</b> / {team.total}
                        </td>
                        <td className="time-cell">{team.time}</td>
                        <td>
                          <span
                            className={`status-chip ${
                              team.status === 'QUALIFIED' ? 'qualified' : 'standby'
                            }`}
                          >
                            {team.status === 'QUALIFIED' ? 'QUALIFIED ✦' : 'STANDBY'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
