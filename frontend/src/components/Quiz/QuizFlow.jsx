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

  // Sync hash with stage on mount and whenever URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash.replace(/^#\/?/, '');
      if (currentHash === 'login') {
        setQuizState((prev) => ({ ...prev, stage: 'login' }));
      } else if (currentHash === 'round-1') {
        setQuizState((prev) => ({ ...prev, stage: 'round-1', result: null }));
      } else if (currentHash === 'results') {
        setQuizState((prev) => ({ ...prev, stage: 'results' }));
      } else if (currentHash === 'round-2-rules') {
        setQuizState((prev) => ({ ...prev, stage: 'round-2-rules' }));
      } else if (currentHash === 'round-2') {
        setQuizState((prev) => ({ ...prev, stage: 'round-2-play' }));
      } else if (currentHash.startsWith('round2/checkpoint')) {
        setQuizState((prev) => ({ ...prev, stage: 'round-2-checkpoint' }));
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Save changes to sessionStorage
  useEffect(() => {
    saveQuizState(quizState);
  }, [quizState]);

  // Stage change helper that also updates window hash
  const navigateStage = useCallback((nextStage) => {
    setQuizState((prev) => ({ ...prev, stage: nextStage }));
    const hashMap = {
      login: '#/login',
      'round-1': '#/round-1',
      results: '#/results',
      'round-2-rules': '#/round-2/rules',
      'round-2-play': '#/round-2',
    };
    if (hashMap[nextStage]) {
      window.location.hash = hashMap[nextStage];
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLogout = () => {
    setQuizState({
      stage: 'login',
      participant: null,
      answers: {},
      result: null,
      rank: null,
      round2: null,
    });
    sessionStorage.removeItem('egt2_wizarding_hunt_v2');
    window.location.hash = '#/login';
    if (onTriggerToast) onTriggerToast(' LOGGED OUT SUCCESSFULLY ');
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

  // Login handler
  const handleLoginSuccess = (participantData) => {
    setQuizState((prev) => ({
      ...prev,
      participant: participantData,
      stage: 'round-1',
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
          participant={quizState.participant}
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
