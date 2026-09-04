import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './LoginView';
import Round1View from './Round1View';
import ResultsDashboard from './ResultsDashboard';
import Round2RulesView from './Round2RulesView';
import Round2PlayView from './Round2PlayView';
import {
  evaluateRound1,
  getRound1Rank,
  loadQuizState,
  saveQuizState,
} from './QuizData';
import './Quiz.css';

export default function QuizFlow({ onExitToGreatHall, onTriggerToast }) {
  // Restore persisted state or start fresh
  const [quizState, setQuizState] = useState(() => {
    const saved = loadQuizState();
    if (saved) return saved;
    return {
      stage: 'login', // 'login' | 'round-1' | 'results' | 'round-2-rules' | 'round-2-play'
      participant: null,
      answers: {},
      result: null,
      rank: null,
      round2: null,
    };
  });

  // Sync hash with stage
  useEffect(() => {
    const currentHash = window.location.hash.replace(/^#\/?/, '');
    if (currentHash === 'login' && quizState.stage !== 'login' && !quizState.participant) {
      setQuizState((prev) => ({ ...prev, stage: 'login' }));
    } else if (currentHash === 'round-1' && quizState.participant && !quizState.result) {
      setQuizState((prev) => ({ ...prev, stage: 'round-1' }));
    } else if (currentHash === 'results' && quizState.result) {
      setQuizState((prev) => ({ ...prev, stage: 'results' }));
    } else if (currentHash === 'round-2-rules') {
      setQuizState((prev) => ({ ...prev, stage: 'round-2-rules' }));
    } else if (currentHash === 'round-2') {
      setQuizState((prev) => ({ ...prev, stage: 'round-2-play' }));
    }
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
  const handleSubmitRound1 = async () => {
    const evaluation = evaluateRound1(quizState.answers);
    const calculatedRank = await getRound1Rank(
      quizState.participant,
      evaluation.score
    );

    setQuizState((prev) => ({
      ...prev,
      result: evaluation,
      rank: calculatedRank,
      stage: 'results',
    }));

    if (onTriggerToast) {
      onTriggerToast(' THE O.W.L. SCROLL IS SEALED & EVALUATED ');
    }

    navigateStage('results');
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
        />
      );

    case 'results':
      return (
        <ResultsDashboard
          participant={quizState.participant || { name: 'Seeker', teamId: 'EGT-001' }}
          result={quizState.result || evaluateRound1({})}
          rank={quizState.rank}
          onProceedToRound2={handleProceedToRound2}
          onBackToHall={onExitToGreatHall}
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
          participant={quizState.participant || { name: 'Seeker', teamId: 'EGT-001' }}
          round2State={quizState.round2}
          onUpdateRound2={handleUpdateRound2}
          onBackToHall={onExitToGreatHall}
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
