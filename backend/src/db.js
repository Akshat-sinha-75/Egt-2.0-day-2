const crypto = require('crypto');

// Generate 40 mock teams
const teams = [];
for (let i = 1; i <= 40; i++) {
  const teamIdStr = i.toString().padStart(3, '0');
  const teamId = `TH-${teamIdStr}`;
  // For testing, password is PASS-xxx
  const pass = `PASS-${teamIdStr}`; 
  // Generate a mock 10-letter code. e.g. AABBCCDDEE
  const correctCode = crypto.createHash('md5').update(teamId).digest('hex').substring(0, 10).toUpperCase();

  teams.push({
    teamId,
    teamName: `Team ${teamIdStr}`,
    pass,
    instanceId: `I${teamIdStr}`,
    correctCode
  });
}

// Round Config
const roundConfig = {
  status: 'ACTIVE', // ACTIVE, CLOSED
  startTime: Date.now(),
  endTime: Date.now() + 60 * 60 * 1000, // 1 hour from now
  maxQualifiers: 20
};

// 10 Mock Questions (Templates)
// The "instance" value will be derived from the team's instance ID
const questionTemplates = [
  { id: 'Q1', text: "Calculate the base value. Your base factor is X.", formula: (teamNum) => teamNum * 10, hint: "Multiply your team number by 10." },
  { id: 'Q2', text: "Add 50 to your base factor.", formula: (teamNum) => teamNum * 10 + 50, hint: "Just add 50." },
  { id: 'Q3', text: "What is the square of your team number?", formula: (teamNum) => teamNum * teamNum, hint: "Multiply the number by itself." },
  { id: 'Q4', text: "Divide the previous answer by your team number.", formula: (teamNum) => teamNum, hint: "It brings you back to the start." },
  { id: 'Q5', text: "Multiply by 3.", formula: (teamNum) => teamNum * 3, hint: "Triple it." },
  { id: 'Q6', text: "Subtract 10.", formula: (teamNum) => (teamNum * 3) - 10, hint: "Minus ten." },
  { id: 'Q7', text: "What is the remainder when divided by 2?", formula: (teamNum) => ((teamNum * 3) - 10) % 2, hint: "Modulo 2." },
  { id: 'Q8', text: "Add 100 to your team number.", formula: (teamNum) => teamNum + 100, hint: "Add one hundred." },
  { id: 'Q9', text: "Multiply by 2.", formula: (teamNum) => (teamNum + 100) * 2, hint: "Double it." },
  { id: 'Q10', text: "Final numerical check: subtract your team number.", formula: (teamNum) => ((teamNum + 100) * 2) - teamNum, hint: "Subtract team number." }
];

// Q11 transformation instructions
const q11Text = "Take your 10 numerical answers. In this mock, use the special algorithm provided to generate your 10-letter code. (For testing, your correct code is the MD5 hash of your Team ID, first 10 uppercase chars).";

// Hint states (Admin controlled)
const hintState = {};
for (let i = 1; i <= 10; i++) {
  hintState[`Q${i}`] = false; // Initially all hints are disabled
}

// Submissions (to track qualifications)
// Format: { teamId, timestamp, rank, status: 'QUALIFIED' | 'COMPLETED_NOT_QUALIFIED' }
const submissions = [];

module.exports = {
  teams,
  roundConfig,
  questionTemplates,
  q11Text,
  hintState,
  submissions
};
