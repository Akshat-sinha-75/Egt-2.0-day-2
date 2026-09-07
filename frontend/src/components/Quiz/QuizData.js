/* =========================================================================
   QUIZ DATA & SERVICES · EGT 2.0 WIZARDING EDITION
   Centralized source of truth for:
   - Round 2 rules (6 cards)
   - Tournament Leaderboard State
   - Storage persistence & session helpers
   ========================================================================= */

/* ── Round 2 Rules (6 cards from spec) ─────────────────────────────────── */
export const ROUND2_RULES = [
  {
    id: 1,
    icon: 'target',
    title: 'THE OBJECTIVE',
    points: [
      'Race through a predefined route of magical checkpoints hidden across the grounds.',
      'Unlock every station with its QR marker, solve its challenge, and reach the Final Vault before the timer burns out.',
    ],
  },
  {
    id: 2,
    icon: 'map',
    title: 'HOW THE ROUND WORKS',
    points: [
      'Each team receives a unique route — checkpoints must be cleared strictly in order.',
      'The map reveals one station at a time; the next appears only after the previous is cleared.',
    ],
  },
  {
    id: 3,
    icon: 'timer',
    title: 'TIME & SCORING',
    points: [
      'The entire round is timed. The clock starts the moment you view your first destination.',
      'Ranks are decided by: fewest checkpoints remaining, then fastest completion time.',
    ],
  },
  {
    id: 4,
    icon: 'shield',
    title: 'STRICT PROTOCOLS',
    points: [
      'Checkpoints must be physically visited — scanning stations remotely will void your entry.',
      'Incorrect location scans will not open the riddle and will display location warnings.',
    ],
  },
  {
    id: 5,
    icon: 'vault',
    title: 'THE FINAL VAULT',
    points: [
      'The last station contains the Grand Vault. Clear its riddle to finish the tournament.',
      'Once the vault is unlocked, your official completion time is recorded and sealed.',
    ],
  },
  {
    id: 6,
    icon: 'trophy',
    title: 'VICTORY & HONORS',
    points: [
      'The top teams on the global board will claim the EGT 2.0 Champion Trophy.',
      'All participants who complete the course receive certified tournament honors.',
    ],
  },
];

/* ── Tournament Leaderboard Standings ───────────────────────────────────── */
export const INITIAL_LEADERBOARD = [];

/* ── Storage Helpers with Multi-Tier Fallback ──────────────────────────── */
const STORAGE_KEY = 'egt2_wizarding_hunt_v2';

export function loadQuizState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read session state', e);
    return null;
  }
}

export function saveQuizState(state) {
  try {
    const serialized = JSON.stringify(state);
    sessionStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(STORAGE_KEY, serialized);
    if (state?.participant?.token) {
      localStorage.setItem('R2_Token', state.participant.token);
    }
  } catch (e) {
    console.warn('Could not persist session state', e);
  }
}

export function clearQuizState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('R2_Token');
  } catch (e) {}
}
