/* =========================================================================
   QUIZ DATA & SERVICES · EGT 2.0 WIZARDING EDITION
   Centralized source of truth for:
   - Round 1 questions (20 questions from official spec)
   - Round 2 rules (6 cards) & checkpoints (5 stations)
   - Mock tournament leaderboard data
   - O.W.L. grading & rank computation
   - Storage persistence
   ========================================================================= */

export const ROUND1_QUESTIONS = [
  {
    id: 1,
    question: 'Which magical transport carries first-year students to Hogwarts for the very first time?',
    options: ['The Hogwarts Express', 'The Knight Bus', 'A flying Ford Anglia', 'A Thestral-drawn carriage'],
    correctAnswer: 'The Hogwarts Express',
  },
  {
    id: 2,
    question: 'What is the name of the enchanted map that reveals every person wandering the castle grounds?',
    options: ['The Trace Parchment', 'The Marauder’s Map', 'The Fidelius Chart', 'The Goblet Scroll'],
    correctAnswer: 'The Marauder’s Map',
  },
  {
    id: 3,
    question: 'How many balls are in play during a match of Quidditch?',
    options: ['Two', 'Three', 'Four', 'Five'],
    correctAnswer: 'Four',
  },
  {
    id: 4,
    question: 'What forms the core of Harry Potter’s wand?',
    options: ['Dragon heartstring', 'Unicorn hair', 'Phoenix feather', 'Veela hair'],
    correctAnswer: 'Phoenix feather',
  },
  {
    id: 5,
    question: 'Which charm kindles light at the end of a wand?',
    options: ['Nox', 'Lumos', 'Incendio', 'Aguamenti'],
    correctAnswer: 'Lumos',
  },
  {
    id: 6,
    question: 'Which potion lets the drinker assume the appearance of another person?',
    options: ['Felix Felicis', 'Veritaserum', 'Polyjuice Potion', 'Amortentia'],
    correctAnswer: 'Polyjuice Potion',
  },
  {
    id: 7,
    question: 'What is the name of the three-headed dog guarding the trapdoor corridor?',
    options: ['Norbert', 'Fluffy', 'Fang', 'Crookshanks'],
    correctAnswer: 'Fluffy',
  },
  {
    id: 8,
    question: 'Whose common room lies hidden beneath the Black Lake?',
    options: ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'],
    correctAnswer: 'Slytherin',
  },
  {
    id: 9,
    question: 'What position does Harry play on his house Quidditch team?',
    options: ['Keeper', 'Chaser', 'Seeker', 'Beater'],
    correctAnswer: 'Seeker',
  },
  {
    id: 10,
    question: 'Which enchanted basin stores memories so they may be revisited?',
    options: ['The Pensieve', 'The Mirror of Erised', 'The Goblet of Fire', 'The Sorting Hat'],
    correctAnswer: 'The Pensieve',
  },
  {
    id: 11,
    question: 'What is the incantation of the Disarming Charm?',
    options: ['Stupefy', 'Expelliarmus', 'Petrificus Totalus', 'Rictusempra'],
    correctAnswer: 'Expelliarmus',
  },
  {
    id: 12,
    question: 'Who teaches Potions at Hogwarts for the majority of Harry’s school years?',
    options: ['Horace Slughorn', 'Severus Snape', 'Filius Flitwick', 'Remus Lupin'],
    correctAnswer: 'Severus Snape',
  },
  {
    id: 13,
    question: 'What manner of creature is Aragog?',
    options: ['A basilisk', 'A centaur', 'An Acromantula', 'A blast-ended skrewt'],
    correctAnswer: 'An Acromantula',
  },
  {
    id: 14,
    question: 'What does the spell Alohomora accomplish?',
    options: ['It conjures ropes', 'It unlocks doors', 'It silences sound', 'It repairs broken objects'],
    correctAnswer: 'It unlocks doors',
  },
  {
    id: 15,
    question: 'What is the name of the hippogriff that Harry first rides?',
    options: ['Buckbeak', 'Fawkes', 'Errol', 'Norberta'],
    correctAnswer: 'Buckbeak',
  },
  {
    id: 16,
    question: 'What is Lord Voldemort’s true birth name?',
    options: ['Salazar Riddle', 'Tom Marvolo Riddle', 'Marvolo Gaunt', 'Cadogan Black'],
    correctAnswer: 'Tom Marvolo Riddle',
  },
  {
    id: 17,
    question: 'What does the charm Expecto Patronum summon?',
    options: ['A Patronus', 'A thunderstorm', 'The Dark Mark', 'A shield of flame'],
    correctAnswer: 'A Patronus',
  },
  {
    id: 18,
    question: 'Which wizarding bank is guarded and run by goblins?',
    options: ['Borgin and Burkes', 'Ollivanders', 'Gringotts', 'Flourish and Blotts'],
    correctAnswer: 'Gringotts',
  },
  {
    id: 19,
    question: 'How many Horcruxes did Voldemort deliberately create?',
    options: ['Five', 'Six', 'Seven', 'Eight'],
    correctAnswer: 'Six',
  },
  {
    id: 20,
    question: 'Which phrase activates the Marauder’s Map and reveals its secrets?',
    options: [
      '“Mischief Managed”',
      '“I solemnly swear that I am up to no good”',
      '“Open, in the name of the Marauders”',
      '“Wand-light, guide my way”',
    ],
    correctAnswer: '“I solemnly swear that I am up to no good”',
  },
];

export const TOTAL_QUESTIONS = ROUND1_QUESTIONS.length;

/* ── Round 2 Rules (6 cards from spec) ─────────────────────────────────── */
export const ROUND2_RULES = [
  {
    id: 1,
    icon: '🎯',
    title: 'THE OBJECTIVE',
    points: [
      'Race through a predefined route of magical checkpoints hidden across the grounds.',
      'Unlock every station with its rune code, answer its challenge, and reach the Final Vault before the timer burns out.',
    ],
  },
  {
    id: 2,
    icon: '🗺️',
    title: 'HOW THE ROUND WORKS',
    points: [
      'Each team receives a unique route — checkpoints must be cleared strictly in order.',
      'The map reveals one station at a time; the next appears only after the previous is cleared.',
    ],
  },
  {
    id: 3,
    icon: '🔎',
    title: 'WHAT YOU MUST DO',
    points: [
      'Find the physical station, then enter the rune code posted there.',
      'Answer the checkpoint’s question correctly to advance the hunt.',
    ],
  },
  {
    id: 4,
    icon: '⚠️',
    title: 'RESTRICTIONS',
    points: [
      'No skipping stations — sequence is enforced by the tournament server.',
      'Codes are valid only for your team’s route. Your whole team must stay together.',
      'One attempt window per station — a wrong answer briefly jams the lock.',
    ],
  },
  {
    id: 5,
    icon: '🏆',
    title: 'SCORING & WINNING',
    points: [
      'Every cleared checkpoint advances your progress along the route.',
      'Final ranking is decided by server completion timestamps — the fastest complete route claims the vault.',
    ],
  },
  {
    id: 6,
    icon: '⏳',
    title: 'TIME & ATTEMPTS',
    points: [
      'The 30-minute vault timer ignites the moment you start.',
      'A wrong answer locks the station for 30 seconds. When the timer dies, the hunt ends.',
    ],
  },
];

/* ── Round 2 Checkpoints (5 stations) ──────────────────────────────────── */
export const ROUND2_CHECKPOINTS = [
  {
    id: 1,
    name: 'THE OWLERY',
    sigil: '🦉',
    code: 'HEDWIG',
    hint: 'The name of Harry’s own snowy owl',
    question: 'What do Hogwarts owls deliver to young witches and wizards each summer?',
    options: ['Their wand receipt', 'Their acceptance letter', 'Their Quidditch ticket', 'Their house badge'],
    correctAnswer: 'Their acceptance letter',
  },
  {
    id: 2,
    name: 'THE GREENHOUSES',
    sigil: '🌿',
    code: 'MANDRAKE',
    hint: 'The crying root whose draught cures petrification',
    question: 'Who teaches Herbology and tends the shrieking Mandrakes?',
    options: ['Professor McGonagall', 'Professor Sprout', 'Professor Trelawney', 'Madam Hooch'],
    correctAnswer: 'Professor Sprout',
  },
  {
    id: 3,
    name: 'THE LIBRARY',
    sigil: '📜',
    code: 'RESTRICTED',
    hint: 'The section that needs special permission to enter',
    question: 'Who guards the Restricted Section of the Hogwarts library?',
    options: ['Madam Pince', 'Madam Pomfrey', 'Professor Binns', 'Nearly Headless Nick'],
    correctAnswer: 'Madam Pince',
  },
  {
    id: 4,
    name: 'THE GREAT HALL',
    sigil: '🕯️',
    code: 'SORTING',
    hint: 'The ceremony that chooses your house',
    question: 'What object decides which house each new student joins?',
    options: ['The Goblet of Fire', 'The Sorting Hat', 'The House Hourglass', 'The Golden Snitch'],
    correctAnswer: 'The Sorting Hat',
  },
  {
    id: 5,
    name: 'THE FINAL VAULT',
    sigil: '🗝️',
    code: 'MARAUDERS',
    hint: 'The makers of the map — mischief itself',
    question: 'Which phrase seals the Marauder’s Map when the mischief is done?',
    options: ['“Nox and farewell”', '“The vault is sealed”', '“Mischief Managed”', '“Lumos, be gone”'],
    correctAnswer: '“Mischief Managed”',
  },
];

export const ROUND2_TIME_LIMIT = 30 * 60; // 30 mins
export const ROUND2_RETRY_LOCK = 30; // 30 seconds lock on wrong rune

/* ── Tournament Leaderboard Mock Standings ───────────────────────────────── */
export const INITIAL_LEADERBOARD = [];

/* ── Evaluation & Grading Logic ─────────────────────────────────────────── */
const normalize = (v) => String(v == null ? '' : v).trim().toLowerCase();

export function evaluateRound1(answers) {
  let score = 0;
  const review = ROUND1_QUESTIONS.map((q) => {
    const given = answers[q.id] != null ? answers[q.id] : null;
    const isCorrect = given != null && normalize(given) === normalize(q.correctAnswer);
    if (isCorrect) score += 1;
    return {
      id: q.id,
      question: q.question,
      userAnswer: given,
      correctAnswer: q.correctAnswer,
      isCorrect,
    };
  });

  const total = TOTAL_QUESTIONS;
  const percent = Math.round((score / total) * 100);
  const isPerfect = score === total;
  // Per rule: Round 2 opens for a perfect score (20/20)
  const isQualified = score >= 20;

  return {
    score,
    total,
    percent,
    isPerfect,
    isQualified,
    review,
    submittedAt: Date.now(),
  };
}

export function owlGrade(score) {
  if (score >= 20) return { grade: 'O', label: 'Outstanding' };
  if (score >= 16) return { grade: 'E', label: 'Exceeds Expectations' };
  if (score >= 12) return { grade: 'A', label: 'Acceptable' };
  if (score >= 8) return { grade: 'P', label: 'Poor' };
  return { grade: 'D', label: 'Dreadful' };
}

/**
 * Rank service — single integration point.
 * In live mode, this will call the backend API endpoint.
 */
export async function getRound1Rank(participant, score) {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 600));

  let hash = 7;
  const seed = (participant?.name || '') + '::' + (participant?.teamId || '');
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  // If score is 20, assign top 1–5 rank; else relative to score
  if (score >= 20) {
    return 1 + (hash % 5);
  } else if (score >= 16) {
    return 6 + (hash % 10);
  } else {
    return 16 + (hash % 20);
  }
}

/* ── Session Storage Helpers ────────────────────────────────────────────── */
const STORAGE_KEY = 'egt2_wizarding_hunt_v2';

export function loadQuizState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read session state', e);
    return null;
  }
}

export function saveQuizState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not persist session state', e);
  }
}

export function clearQuizState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
