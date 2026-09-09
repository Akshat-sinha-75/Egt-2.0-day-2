import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { spawnSparks } from '../../utils/sparks';
import { fetchLeaderboardApi } from '../../utils/api';

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
  const [serverLeaderboard, setServerLeaderboard] = useState([]);
  const [isLoadingLb, setIsLoadingLb] = useState(false);

  const statusString = result.result || 'UNKNOWN';
  const isQualified = statusString === 'QUALIFIED' || statusString === 'ALREADY_QUALIFIED';
  const isIncorrect = statusString === 'INCORRECT';
  const isExpired = statusString === 'TIME_EXPIRED';
  const displayMessage = result.message || 'Status Unknown';

  // Fetch live tournament standings from backend
  const loadLiveLeaderboard = useCallback(async () => {
    try {
      const data = await fetchLeaderboardApi();
      if (data && Array.isArray(data.leaderboard)) {
        setServerLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.warn('Could not fetch live leaderboard:', err);
    }
  }, []);

  useEffect(() => {
    loadLiveLeaderboard();
    // Poll every 5 seconds to get live submissions
    const interval = setInterval(loadLiveLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [loadLiveLeaderboard]);

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

  // Combined leaderboard with server data + current player's submission
  const fullLeaderboard = useMemo(() => {
    const list = [...serverLeaderboard];
    const userRank = rank || result.rank || 999;
    const currentTeamId = participant?.teamId || '';

    // Check if current user is already in server results
    const existingIndex = list.findIndex((item) => item.teamId === currentTeamId);

    if (existingIndex !== -1) {
      // Mark as current user
      list[existingIndex] = {
        ...list[existingIndex],
        isCurrentUser: true,
      };
    } else if (!isIncorrect && !isExpired && currentTeamId) {
      // Optimistically insert user entry if just submitted
      const teamNum = parseInt(currentTeamId.replace(/\D/g, '') || '0', 10);
      const HOUSES = ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'];
      const userEntry = {
        rank: userRank,
        name: participant?.name || currentTeamId,
        teamId: currentTeamId,
        house: HOUSES[teamNum % 4],
        status: isQualified ? 'QUALIFIED' : 'COMPLETED_NOT_QUALIFIED',
        isCurrentUser: true,
      };
      list.push(userEntry);
    }

    // Mark isCurrentUser flag for all items
    const formattedList = list.map((item) => ({
      ...item,
      isCurrentUser: item.teamId === currentTeamId,
    }));

    formattedList.sort((a, b) => (a.rank || 999) - (b.rank || 999));

    // Assign displayRank
    return formattedList.map((item, idx) => ({
      ...item,
      displayRank: item.rank || idx + 1,
    }));
  }, [serverLeaderboard, participant, result, rank, isQualified, isIncorrect, isExpired]);

  const filteredLeaderboard = fullLeaderboard.filter((item) => {
    const matchesHouse = houseFilter === 'All' || item.house === houseFilter;
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.teamId || '').toLowerCase().includes(searchQuery.toLowerCase());
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
              <span className="star-dot">✦</span> <b>{participant?.name || 'Seeker'}</b> · {participant?.teamId || 'TEAM'}
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
              <div className="sb-score-number" style={{ fontSize: '3rem', color: isQualified ? '#43e08a' : '#f0d089' }}>
                {isQualified ? '✦' : isIncorrect ? '✕' : '✦'}
              </div>
            </div>

            {/* Middle: Title, Details */}
            <div className="sb-mid-col">
              <h2
                className="sb-headline"
                style={{
                  fontSize: '1.8rem',
                  color: isQualified ? '#43e08a' : isIncorrect ? '#ff5d47' : '#f0d089',
                  textTransform: 'uppercase'
                }}
              >
                {isQualified
                  ? (displayMessage || 'ROUND 1 CLEARED · QUALIFIED FOR ROUND 2')
                  : isIncorrect
                  ? 'CODEWORD INCORRECT'
                  : isExpired
                  ? 'ROUND 1 TIME EXPIRED'
                  : 'YOU MUGGLES WERE TOO SLOW FOR ROUND 2!'}
              </h2>

              <p className="sb-details" style={{ fontSize: '1.1rem', marginTop: '0.8rem', color: '#cbd4f0' }}>
                {isQualified && 'Outstanding! You are among the Top 20 squads and have unlocked Round 2.'}
                {isIncorrect && 'The codeword was incorrect. Please verify your letter arithmetic and try again.'}
                {isExpired && 'Time has expired. The vault is sealed.'}
                {!isQualified && !isIncorrect && !isExpired && 'Only the Top 20 squads advance to Round 2. All 20 qualification slots have been claimed by faster wizards!'}
              </p>
            </div>

            {/* Right: Grade Stamp & Rank Plaque */}
            <div className="sb-right-col">
              <div className={`grade-stamp ${isQualified ? 'pass' : 'fail'}`}>
                <b className="stamp-letter">{isQualified ? 'O' : isIncorrect ? 'P' : 'M'}</b>
                <span className="stamp-label">
                  {isQualified ? 'OUTSTANDING' : isIncorrect ? 'POOR' : 'TOO SLOW'}
                </span>
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
          {isQualified ? (
            <button
              type="button"
              className="btn-gold"
              onClick={onProceedToRound2}
            >
              MOVE TO ROUND 2&nbsp;✦
            </button>
          ) : !isIncorrect && !isExpired && (
            <div
              style={{
                padding: '10px 22px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 93, 71, 0.4)',
                background: 'rgba(255, 93, 71, 0.12)',
                color: '#ff8a70',
                fontFamily: 'var(--cinzel)',
                fontSize: '12px',
                letterSpacing: '0.15em',
                fontWeight: '700'
              }}
            >
              ✦ ROUND 2 LOCKED · TOP 20 QUALIFIERS ONLY ✦
            </div>
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
            ✦ TOURNAMENT LEADERBOARD
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
                  {filteredLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#9aa3c0', fontStyle: 'italic' }}>
                        No teams found on the leaderboard yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaderboard.map((team) => {
                      const isTop1 = team.displayRank === 1;
                      const isTop2 = team.displayRank === 2;
                      const isTop3 = team.displayRank === 3;

                      return (
                        <tr
                          key={`${team.teamId}-${team.displayRank}`}
                          className={`${team.isCurrentUser ? 'current-user-row' : ''}`}
                        >
                          <td className="rank-cell">
                            {isTop1 ? '#1 ✦' : isTop2 ? '#2' : isTop3 ? '#3' : `#${team.displayRank}`}
                          </td>
                          <td className="name-cell">
                            <b>{team.name}</b>
                            {team.isCurrentUser && <span className="you-tag">YOU</span>}
                            <small>{team.teamId}</small>
                          </td>
                          <td>
                            <span className={`house-pill house-${(team.house || 'gryffindor').toLowerCase()}`}>
                              {team.house || 'Gryffindor'}
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </section>
  );
}
