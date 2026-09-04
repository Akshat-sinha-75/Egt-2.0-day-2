import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_LEADERBOARD } from './QuizData';
import { spawnSparks } from '../../utils/sparks';

export default function ResultsDashboard({
  participant,
  result, // from backend: { result: 'QUALIFIED' | 'COMPLETED_NOT_QUALIFIED' | 'INCORRECT' | 'TIME_EXPIRED', rank, message }
  rank,
  onProceedToRound2,
  onRetryRound1,
  onBackToHall,
  onLogout
}) {
  const [houseFilter, setHouseFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const statusString = result.result || 'UNKNOWN';
  const isQualified = statusString === 'QUALIFIED' || statusString === 'ALREADY_QUALIFIED';
  const isIncorrect = statusString === 'INCORRECT';
  const isExpired = statusString === 'TIME_EXPIRED';
  const displayMessage = result.message || 'Status Unknown';

  // Celebratory magical sparks on qualification
  useEffect(() => {
    if (isQualified) {
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
  }, [isQualified]);

  // Combined leaderboard with current player's submission inserted
  const fullLeaderboard = useMemo(() => {
    const list = [...INITIAL_LEADERBOARD];
    const userRank = rank || result.rank || 999;

    // Insert user entry into ranking list if qualified or completed
    if (!isIncorrect && !isExpired) {
        const userEntry = {
          rank: userRank,
          name: participant.name,
          teamId: participant.teamId,
          house: 'Gryffindor', // Defaulting for visual mock
          score: isQualified ? 1 : 0, 
          total: 1,
          time: 'N/A', // Time from backend can be added later
          status: isQualified ? 'QUALIFIED' : 'STANDBY',
          isCurrentUser: true,
        };
        list.push(userEntry);
    }

    list.sort((a, b) => {
      return a.rank - b.rank;
    });

    // Re-index ranks cleanly
    return list.map((item, idx) => ({
      ...item,
      displayRank: idx + 1,
    }));
  }, [participant, result, rank, isQualified, isIncorrect, isExpired]);

  const filteredLeaderboard = fullLeaderboard.filter((item) => {
    const matchesHouse = houseFilter === 'All' || item.house === houseFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teamId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHouse && matchesSearch;
  });

  return (
    <section className="results-dashboard-page" aria-label="Round 1 results and tournament dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <header className="results-header">
          <p className="quiz-label center">THE FIRST TASK · EXAMINATION CONCLUDED</p>
          <h1 className="quiz-sec-title center">THE VAULT DASHBOARD</h1>
          <div className="center">
            <span className="part-status-chip">
              🧙 <b>{participant.name}</b> · {participant.teamId}
            </span>
          </div>
        </header>

        {/* House-Cup Scoreboard Card */}
        <section className="score-board-card th-card">
          <span className="corner tl"></span>
          <span className="corner tr"></span>
          <span className="corner bl"></span>
          <span className="corner br"></span>

          <div className="sb-grid">
            {/* Left: Big Status Icon */}
            <div className="sb-score-col">
              <div className="sb-score-number" style={{ fontSize: '3.5rem' }}>
                {isQualified ? '🏆' : isIncorrect ? '❌' : isExpired ? '⏳' : '📜'}
              </div>
            </div>

            {/* Middle: Title, Details */}
            <div className="sb-mid-col">
              <h2 className="sb-headline" style={{ fontSize: '1.8rem', color: isQualified ? '#43e08a' : '#f0d089' }}>
                {displayMessage}
              </h2>

              <p className="sb-details" style={{ fontSize: '1.2rem', marginTop: '1rem', color: '#ccc' }}>
                {isQualified && 'Outstanding! You have cracked the code and unlocked the gate.'}
                {isIncorrect && 'The codeword was incorrect. Please try again if time allows.'}
                {isExpired && 'Time has expired. The vault is sealed.'}
                {!isQualified && !isIncorrect && !isExpired && 'The Vault Stays Sealed.'}
              </p>
            </div>

            {/* Right: Grade Stamp & Rank Plaque */}
            <div className="sb-right-col">
              <div className={`grade-stamp ${isQualified ? 'pass' : 'fail'}`}>
                <b className="stamp-letter">{isQualified ? 'O' : 'T'}</b>
                <span className="stamp-label">{isQualified ? 'OUTSTANDING' : 'TROLL'}</span>
              </div>

              {(!isIncorrect && !isExpired) && (
                  <div className="rank-plaque">
                    <span className="plaque-label">YOUR RANK</span>
                    <b className="plaque-num">#{rank || result.rank || '—'}</b>
                  </div>
              )}
            </div>
          </div>
        </section>

        {/* Navigation Action Buttons */}
        <div className="results-actions-row">
          {isIncorrect && onRetryRound1 && (
            <button
              type="button"
              className="btn-gold"
              onClick={onRetryRound1}
              style={{
                boxShadow: '0 0 20px rgba(240, 208, 137, 0.5)',
                fontWeight: 'bold',
                letterSpacing: '0.08em',
                padding: '0.8rem 1.8rem'
              }}
            >
              ← RETRY QUESTION 11
            </button>
          )}
          {isQualified && (
              <button
                type="button"
                className="btn-gold"
                onClick={onProceedToRound2}
              >
                MOVE TO ROUND 2&nbsp;✦
              </button>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={onBackToHall}
          >
            ← RETURN TO THE GREAT HALL
          </button>
          
          <button
            type="button"
            className="btn-ghost"
            onClick={onLogout}
            style={{ color: '#d9534f' }}
          >
            LOGOUT
          </button>
        </div>

        {/* Tab Switcher: Scorecard vs Leaderboard */}
        <div className="dashboard-tabs" role="tablist">
          <button
            type="button"
            className={`tab-btn active`}
            role="tab"
            aria-selected={true}
          >
            🏆 TOURNAMENT LEADERBOARD
          </button>
        </div>

        {/* Tab 2: Tournament Leaderboard */}
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
      </div>
    </section>
  );
}
