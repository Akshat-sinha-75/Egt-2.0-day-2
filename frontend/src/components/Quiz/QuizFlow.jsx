import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './LoginView';
import Round1View from './Round1View';
import ResultsDashboard from './ResultsDashboard';
import Round2RulesView from './Round2RulesView';
import Round2PlayView from './Round2PlayView';
import Round2CheckpointView from './Round2CheckpointView';
import {
  loadQuizState,
  saveQuizState,
  clearQuizState,
} from './QuizData';
import { submitCodeApi } from '../../utils/api';
import './Quiz.css';

export default function QuizFlow({ onExitToGreatHall, onTriggerToast }) {
  // Restore persisted state or start fresh
  const [quizState, setQuizState] = useState(() => {
    const saved = loadQuizState();
    if (saved) {
      // If user had an INCORRECT submission result saved in session, recover back to round-1
      if (saved.result && saved.result.result === 'INCORRECT') {
        return {
          ...saved,
          stage: 'round-1',
          result: null,
        };
      }
      return saved;
    }
    return {
      stage: 'login', // 'login' | 'round-1' | 'results' | 'round-2-rules' | 'round-2-play'
      participant: null,
      answers: {},
      result: null,
      rank: null,
      round2: null,
    };
  });

  // Stage change helper that also updates window hash
  const navigateStage = useCallback((nextStage) => {
    setQuizState((prev) => ({ ...prev, stage: nextStage }));
    const hashMap = {
      login: '#/login',
      'round-1': '#/round-1',
      results: '#/results',
      'round-2-rules': '#/round-2/rules',
      'round-2-play': '#/round-2',
      'round-2-checkpoint': '#/round2/checkpoint',
    };
    if (hashMap[nextStage]) {
      window.location.hash = hashMap[nextStage];
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Sync hash with stage on mount and whenever URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash.replace(/^#\/?/, '');
      if (currentHash === 'login') {
        setQuizState((prev) => ({ ...prev, stage: 'login' }));
      } else if (currentHash === 'round-1') {
        setQuizState((prev) => {
          // If unauthenticated, redirect to login
          if (!prev.participant?.token && !localStorage.getItem('R2_Token')) {
            window.location.hash = '#/login';
            return { ...prev, stage: 'login' };
          }
          return { ...prev, stage: 'round-1', result: null };
        });
      } else if (currentHash === 'results') {
        setQuizState((prev) => ({ ...prev, stage: 'results' }));
      } else if (currentHash === 'round-2-rules' || currentHash === 'round-2/rules') {
        setQuizState((prev) => ({ ...prev, stage: 'round-2-rules' }));
      } else if (currentHash === 'round-2' || currentHash === 'round2') {
        setQuizState((prev) => ({ ...prev, stage: 'round-2-play' }));
      } else if (currentHash.startsWith('round2/checkpoint') || currentHash.startsWith('round-2/checkpoint')) {
        setQuizState((prev) => ({ ...prev, stage: 'round-2-checkpoint' }));
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Save changes to storage
  useEffect(() => {
    saveQuizState(quizState);
  }, [quizState]);

  // Auto-detect if logged in participant already qualified for Round 2 or completed Round 1
  useEffect(() => {
    const token = quizState.participant?.token || localStorage.getItem('R2_Token');
    if (!token) return;
    let isMounted = true;

    async function checkStatusAndStage() {
      try {
        // 1. Try checking Round 2 directly
        const r2Res = await fetch(`${API_BASE_URL}/round2/current`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (r2Res.ok && isMounted) {
          const r2Data = await r2Res.json();
          if (r2Data && (r2Data.state === 'PENDING_SOLVE' || r2Data.state === 'TRANSIT' || r2Data.state === 'COMPLETE')) {
            const currentHash = window.location.hash.replace(/^#\/?/, '');
            if (!currentHash || currentHash === 'login' || currentHash === 'round-1') {
              setQuizState((prev) => ({ ...prev, stage: 'round-2-play' }));
              navigateStage('round-2-play');
              return;
            }
          }
        }

        // 2. Also check /api/questions to see if already submitted
        const qRes = await fetch(`${API_BASE_URL}/questions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (qRes.ok && isMounted) {
          const qData = await qRes.json();
          if (qData && (qData.roundStatus === 'ALREADY_SUBMITTED' || qData.alreadySubmitted)) {
            const currentHash = window.location.hash.replace(/^#\/?/, '');
            if (qData.result === 'QUALIFIED') {
              if (!currentHash || currentHash === 'login' || currentHash === 'round-1') {
                setQuizState((prev) => ({ ...prev, stage: 'round-2-play' }));
                navigateStage('round-2-play');
              }
            } else if (qData.result === 'COMPLETED_NOT_QUALIFIED') {
              if (!currentHash || currentHash === 'login' || currentHash === 'round-1') {
                setQuizState((prev) => ({ 
                  ...prev, 
                  stage: 'results', 
                  result: { result: qData.result, rank: qData.rank } 
                }));
                navigateStage('results');
              }
            }
          }
        }
      } catch (err) {
        // Fallback silently if offline
      }
    }

    checkStatusAndStage();
    return () => { isMounted = false; };
  }, [quizState.participant?.token, navigateStage]);

  const handleLogout = () => {
    clearQuizState();
    localStorage.removeItem('R2_Token');
    setQuizState({
      stage: 'login',
      participant: null,
      answers: {},
      result: null,
      rank: null,
      round2: null,
    });
    window.location.hash = '#/login';
    if (onTriggerToast) onTriggerToast('✦ LOGGED OUT SUCCESSFULLY ✦');
  };

  // Allow returning to Round 1 to retry if codeword was incorrect
  const handleRetryRound1 = () => {
    setQuizState((prev) => ({
      ...prev,
      result: null,
      stage: 'round-1',
    }));
    navigateStage('round-1');
  };

  // Login handler: Checks if participant has active Round 2 before defaulting to Round 1
  const handleLoginSuccess = async (participantData) => {
    // 1. Direct check from login metadata
    if (participantData?.isQualified || participantData?.suggestedStage === 'round-2') {
      setQuizState((prev) => ({
        ...prev,
        participant: participantData,
        stage: 'round-2-play',
      }));
      navigateStage('round-2-play');
      if (onTriggerToast) onTriggerToast('✦ ROUND 1 CLEARED · WELCOME TO ROUND 2 ✦');
      return;
    }

    if (participantData?.suggestedStage === 'results') {
      setQuizState((prev) => ({
        ...prev,
        participant: participantData,
        stage: 'results',
        result: {
          result: participantData.submissionStatus || 'COMPLETED_NOT_QUALIFIED',
          rank: participantData.rank
        }
      }));
      navigateStage('results');
      if (onTriggerToast) onTriggerToast('✦ ROUND 1 SUBMISSION COMPLETED ✦');
      return;
    }

    // 2. Fallback check against /round2/current
    try {
      const res = await fetch(`${API_BASE_URL}/round2/current`, {
        headers: { Authorization: `Bearer ${participantData.token}` }
      });
      if (res.ok) {
        const r2Data = await res.json();
        if (r2Data && (r2Data.state === 'PENDING_SOLVE' || r2Data.state === 'TRANSIT' || r2Data.state === 'COMPLETE')) {
          setQuizState((prev) => ({
            ...prev,
            participant: participantData,
            stage: 'round-2-play',
          }));
          navigateStage('round-2-play');
          if (onTriggerToast) onTriggerToast('✦ RESUMING ROUND 2 · EXPEDITION ACTIVE ✦');
          return;
        }
      }
    } catch (e) {
      console.warn('Could not verify Round 2 state upon login', e);
    }

    // 3. Default to Round 1
    setQuizState((prev) => ({
      ...prev,
      participant: participantData,
      stage: 'round-1',
      result: null
    }));
    navigateStage('round-1');
  };

  // Answer selection
  const handleSelectAnswer = (qId, option) => {
    setQuizState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [qId]: option,
      },
    }));
  };

  // Round 1 Submission
  const handleSubmitRound1 = async (finalCode) => {
    if (!quizState.participant || !quizState.participant.token) {
      if (onTriggerToast) onTriggerToast(' SESSION EXPIRED - PLEASE LOGIN AGAIN ');
      navigateStage('login');
      return { success: false, message: 'Session expired' };
    }

    try {
      const resultData = await submitCodeApi(quizState.participant.token, finalCode);
      
      // If code is incorrect, do NOT navigate away! Keep user on Round 1 so they can re-enter
      if (resultData.result === 'INCORRECT') {
        if (onTriggerToast) {
          onTriggerToast(' INCORRECT CODEWORD - THE VAULT REMAINS LOCKED ');
        }
        return {
          success: false,
          error: 'INCORRECT',
          message: resultData.message || 'Incorrect final codeword. Please verify your calculations and try again!'
        };
      }

      setQuizState((prev) => ({
        ...prev,
        result: resultData, // Backend response { result, rank, message }
        rank: resultData.rank,
        stage: 'results',
      }));

      if (onTriggerToast) {
        onTriggerToast(' THE O.W.L. SCROLL IS SEALED & EVALUATED ');
      }

      navigateStage('results');
      return { success: true, result: resultData };
    } catch (err) {
      if (onTriggerToast) {
        onTriggerToast(` SUBMISSION FAILED: ${err.message} `);
      }
      return { success: false, message: err.message };
    }
  };

  // Round 2 Handlers
  const handleProceedToRound2 = () => {
    navigateStage('round-2-rules');
  };

  const handleStartRound2Play = () => {
    setQuizState((prev) => ({
      ...prev,
      round2: prev.round2 || {
        startedAt: Date.now(),
        current: 0,
        unlocked: false,
        cleared: [],
        finished: false,
        elapsedTime: 0,
      },
      stage: 'round-2-play',
    }));
    navigateStage('round-2-play');
  };

  const handleUpdateRound2 = (updatedR2) => {
    setQuizState((prev) => ({
      ...prev,
      round2: {
        ...(prev.round2 || {}),
        ...updatedR2,
      },
    }));
  };

  // Render current active stage
  switch (quizState.stage) {
    case 'login':
      return (
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onBackToHall={onExitToGreatHall}
          onTriggerToast={onTriggerToast}
        />
      );

    case 'round-1':
      return (
        <Round1View
          participant={quizState.participant || { name: 'Seeker', teamId: 'EGT-001' }}
          answers={quizState.answers}
          onSelectAnswer={handleSelectAnswer}
          onSubmitQuiz={handleSubmitRound1}
          onBackToHall={onExitToGreatHall}
          onLogout={handleLogout}
        />
      );

    case 'results':
      return (
        <ResultsDashboard
          participant={quizState.participant || { name: 'Seeker', teamId: 'EGT-001' }}
          result={quizState.result || {}}
          rank={quizState.rank}
          onProceedToRound2={handleProceedToRound2}
          onRetryRound1={handleRetryRound1}
          onBackToHall={onExitToGreatHall}
          onLogout={handleLogout}
        />
      );

    case 'round-2-rules':
      return (
        <Round2RulesView
          participant={quizState.participant || { name: 'Seeker', teamId: 'EGT-001' }}
          onStartRound2={handleStartRound2Play}
          onBackToResults={() => navigateStage('results')}
        />
      );

    case 'round-2-play':
      return (
        <Round2PlayView
          participant={quizState.participant || { name: 'Seeker', teamId: 'TEAM', token: localStorage.getItem('R2_Token') }}
          onBackToHall={onExitToGreatHall}
          onTriggerToast={onTriggerToast}
          onLogout={handleLogout}
        />
      );

    case 'round-2-checkpoint':
      return (
        <Round2CheckpointView
          onBackToHall={onExitToGreatHall}
          onTriggerToast={onTriggerToast}
        />
      );

    default:
      return (
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onBackToHall={onExitToGreatHall}
          onTriggerToast={onTriggerToast}
        />
      );
  }
}
