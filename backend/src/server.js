require('dotenv').config();
if (typeof WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
// const db = require('./db'); 

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve Admin Dashboard
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '../test-frontend/admin.html'));
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Node acts as a trusted server

const supabase = createClient(supabaseUrl || 'http://localhost', supabaseKey || 'dummy');

const DESTINATION_RIDDLES = {
  'D1': "No reins to hold me, no roads to roam, \nYet proudly I stand as if heading home.\nMy front legs rise, my spirit flies,\nBeneath the watch of the evening skies.\nWhere the university opens its door,\nFind the steed forever ready to soar.\nWith hooves raised high toward the sky.\nFind me there, and your next clue lies nearby.",
  'D2': "When lectures fade and the day runs long,\nFollow the aroma drifting along.\nWhere adrak and elaichi blend just right,\nYour next clue waits somewhere in sight.",
  'D3': "Where footsteps echo but the sky disappears,\nA hidden passage lies beneath the cheers.\nThere’s a second home where tired boys stay,\nTake the path that runs below to find your way.",
  'D4': "A tower of layers, crowned with a bite,\nWrapped in a bun, yet hidden from sight.\nWhere a Singh stands proud without a crown,\nFind the place where hunger goes down.",
  'D5': "A dream was born far from the stars,\nYet reached beyond the world of ours.\nShe left her mark where few could go,\nChasing a place no feet could know.\nFind where her journey still inspires,\nAnd follow the path that reaches higher.",
  'D6': "A golden maze of squares awaits,\nWhere sweetness hides behind tiny gates.\nBorn where chocolates and castles reign,\nFind this crispy treasure from across the plain."
};

// Middleware: Participant Auth (via Supabase JWT)
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];

  // Verify token with Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }

  // Fetch the team profile from the database
  const { data: team, error: dbError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', user.id)
    .single();

  if (dbError || !team) {
    console.error('Auth error fetching team:', dbError, 'UserID:', user.id, 'SupabaseKey length:', supabaseKey ? supabaseKey.length : 0);
    return res.status(401).json({ error: 'Team profile not found' });
  }

  req.team = team;
  next();
};

// Middleware: Admin Auth (via Supabase JWT)
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized Admin Token' });
  }

  // Verify it's the admin
  if (user.email !== 'admin@treasurehunt.local') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }

  next();
};

// 1. Participant Login proxy
app.post('/api/login', async (req, res) => {
  const { teamId, pass } = req.body;
  const email = `${teamId.toLowerCase()}@treasurehunt.local`;

  // Use a fresh client to avoid modifying the server's global service role session!
  const authClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: pass
  });

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid Team ID or Password' });
  }

  res.json({
    message: 'Login successful',
    token: data.session.access_token, // JWT to send in future requests
    teamId: teamId
  });
});

// Admin Login Proxy
app.post('/api/admin/login', async (req, res) => {
  const { pass } = req.body;

  const authClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data, error } = await authClient.auth.signInWithPassword({
    email: 'admin@treasurehunt.local',
    password: pass
  });

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid Admin Password' });
  }

  res.json({
    message: 'Admin login successful',
    token: data.session.access_token
  });
});

// 2. Fetch Questions
app.get('/api/questions', authenticate, async (req, res) => {
  const teamNum = parseInt(req.team.team_id.replace('TH-', ''), 10);

  const { data: config } = await supabase.from('round_config').select('*').eq('id', 1).single();

  if (config.status !== 'ACTIVE') {
    return res.json({
      roundStatus: config.status,
      timeRemaining: 0,
      questions: [],
      q11: "WAITING FOR ADMIN TO START"
    });
  }

  const { data: hints } = await supabase.from('question_hints').select('*');
  const { data: templates } = await supabase.from('question_templates').select('*').order('id');

  const hintMap = {};
  if (hints) {
    hints.forEach(h => hintMap[h.question_id] = h.enabled);
  }

  const questions = (templates || []).map(q => {
    return {
      id: q.id,
      text: q.question_text,
      hint: hintMap[q.id] ? q.hint : null
    };
  });

  // Fetch the specific Q11 set for this team
  const { data: q11Set } = await supabase.from('q11_sets').select('question_text').eq('id', req.team.q11_set_id).single();

  res.json({
    roundStatus: config.status,
    timeRemaining: Math.max(0, new Date(config.end_time).getTime() - Date.now()),
    questions,
    q11: q11Set ? q11Set.question_text : "Q11 is being prepared."
  });
});

// 3. Final Code Submission
app.post('/api/submit', authenticate, async (req, res) => {
  const { code } = req.body;
  const now = Date.now();

  const { data: config } = await supabase.from('round_config').select('*').eq('id', 1).single();

  if (config.status !== 'ACTIVE' || now > new Date(config.end_time).getTime()) {
    return res.status(403).json({ result: 'TIME_EXPIRED', message: 'Round 1 Time Expired. No further submissions are accepted.' });
  }

  const { data: existing } = await supabase
    .from('submissions')
    .select('*')
    .eq('team_id', req.team.team_id)
    .single();

  if (existing) {
    if (existing.status === 'QUALIFIED') return res.json({ result: 'ALREADY_QUALIFIED', rank: existing.rank });
    return res.json({ result: 'COMPLETED_NOT_QUALIFIED', rank: existing.rank });
  }

  if (code.toUpperCase() !== req.team.correct_code) {
    return res.status(400).json({ result: 'INCORRECT', message: 'Incorrect final code. Please try again.' });
  }

  const { count: qualifiedCount } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'QUALIFIED');

  const { count: totalSubmissions } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true });

  let rank = (totalSubmissions || 0) + 1;
  let status = 'COMPLETED_NOT_QUALIFIED';

  if ((qualifiedCount || 0) < config.max_qualifiers) {
    status = 'QUALIFIED';
    rank = (qualifiedCount || 0) + 1;
  }

  const { data: submission, error } = await supabase.from('submissions').insert({
    team_id: req.team.team_id,
    rank,
    status
  }).select().single();

  if (error) {
    return res.status(400).json({ result: 'ERROR', message: 'Submission already processed' });
  }

  res.json({
    result: status,
    rank,
    message: status === 'QUALIFIED' ? 'ROUND 1 CLEARED' : 'ROUND 1 COMPLETED - Not Qualified'
  });
});


// ------------------------------------------------------------------
// ADMIN APIs
// ------------------------------------------------------------------

app.get('/api/admin/status', authenticateAdmin, async (req, res) => {
  const { data: config } = await supabase.from('round_config').select('*').eq('id', 1).single();
  const { count: qualifiedCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'QUALIFIED');
  const { count: totalSubmissions } = await supabase.from('submissions').select('*', { count: 'exact', head: true });
  const { data: hints } = await supabase.from('question_hints').select('*');
  const { data: qualificationsTable } = await supabase.from('submissions').select('*').order('rank', { ascending: true });

  const hintMap = {};
  if (hints) hints.forEach(h => hintMap[h.question_id] = h.enabled);

  res.json({
    status: config ? config.status : 'UNKNOWN',
    timeRemaining: config ? Math.max(0, new Date(config.end_time).getTime() - Date.now()) : 0,
    qualifiedCount: qualifiedCount || 0,
    maxQualifiers: config ? config.max_qualifiers : 20,
    submissions: totalSubmissions || 0,
    hints: hintMap,
    qualificationsTable: qualificationsTable || []
  });
});

app.post('/api/admin/hints', authenticateAdmin, async (req, res) => {
  const { questionId, enabled } = req.body;
  const { error } = await supabase.from('question_hints').update({ enabled }).eq('question_id', questionId);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: `Hint for ${questionId} set to ${enabled}`, questionId, enabled });
});

app.post('/api/admin/hints/bulk', authenticateAdmin, async (req, res) => {
  const { enabled } = req.body;
  const { error } = await supabase.from('question_hints').update({ enabled }).neq('question_id', 'none');

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: `All hints set to ${enabled}`, enabled });
});

app.post('/api/admin/start', authenticateAdmin, async (req, res) => {
  const durationMins = req.body.durationMins || 20; // fallback to 20
  const durationMs = durationMins * 60 * 1000;
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationMs);

  const { error } = await supabase.from('round_config').update({
    status: 'ACTIVE',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString()
  }).eq('id', 1);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Round 1 has officially started!' });
});

app.post('/api/admin/stop', authenticateAdmin, async (req, res) => {
  const now = new Date().toISOString();
  const { error } = await supabase.from('round_config').update({
    status: 'CLOSED',
    end_time: now
  }).eq('id', 1);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Round 1 has been stopped.' });
});

app.post('/api/admin/reset', authenticateAdmin, async (req, res) => {
  const past = new Date(Date.now() - 3600000).toISOString();

  // 1. Reset timer config
  const { error: configError } = await supabase.from('round_config').update({
    status: 'CLOSED',
    start_time: past,
    end_time: past
  }).eq('id', 1);

  if (configError) return res.status(400).json({ error: configError.message });

  // 2. Delete all submissions to give a clean slate
  await supabase.from('submissions').delete().neq('team_id', 'none');

  // 3. Reset all Round 2 assignments and progress logs
  await supabase.from('round2_team_assignments').update({ current_step: 0, state: 'PENDING_SOLVE', current_question_id: null }).neq('team_id', 'none');
  await supabase.from('round2_progress').delete().neq('team_id', 'none');

  res.json({ message: 'Round 1 and all submissions have been reset.' });
});

app.get('/api/admin/teams', authenticateAdmin, async (req, res) => {
  const { data: teams } = await supabase.from('teams').select('team_id, pass, correct_code').order('team_id');
  res.json(teams || []);
});

// Admin: Get Round 2 Status
app.get('/api/admin/round2/status', authenticateAdmin, async (req, res) => {
  const { data: dests } = await supabase.from('round2_destinations').select('id, name, qr_identifier');
  const destMap = {};
  (dests || []).forEach(d => { destMap[d.id] = d.name; });

  const { data: assignments, error } = await supabase
    .from('round2_team_assignments')
    .select('team_id, current_step, state, round2_paths(checkpoints), teams!inner(team_name)')
    .order('team_id');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const enriched = (assignments || []).map(a => {
    const checkpoints = a.round2_paths?.checkpoints || [];
    const currentDestId = checkpoints[a.current_step] || null;
    return {
      ...a,
      current_dest_id: currentDestId,
      current_dest_name: currentDestId ? (destMap[currentDestId] || currentDestId) : 'Conquered',
      destMap
    };
  });

  res.json(enriched);
});

// Admin: Reset Round 2
app.post('/api/admin/round2/reset', authenticateAdmin, async (req, res) => {
  const { error: resetError } = await supabase
    .from('round2_team_assignments')
    .update({ current_step: 0, state: 'PENDING_SOLVE', current_question_id: null })
    .neq('team_id', 'none'); // Update all

  if (resetError) return res.status(500).json({ error: resetError.message });

  await supabase.from('round2_progress').delete().neq('team_id', 'none');

  res.json({ message: 'Round 2 has been reset to starting state (Initial Cipher Riddle).' });
});
// ------------------------------------------------------------------
// ROUND 2 APIs
// ------------------------------------------------------------------

// Get the current Round 2 state for a team (Gated to QUALIFIED teams only)
app.get('/api/round2/current', authenticate, async (req, res) => {
  const teamId = req.team.team_id;

  // Verify team qualified from Round 1
  const { data: sub } = await supabase
    .from('submissions')
    .select('status')
    .eq('team_id', teamId)
    .eq('status', 'QUALIFIED')
    .maybeSingle();

  if (!sub) {
    return res.status(403).json({ error: 'Team has not qualified for Round 2 yet.', qualified: false });
  }

  const { data: assignment, error } = await supabase
    .from('round2_team_assignments')
    .select('*, round2_paths(checkpoints)')
    .eq('team_id', teamId)
    .single();

  if (error || !assignment) {
    return res.status(404).json({ error: 'No Round 2 assignment found for this team.' });
  }

  const checkpoints = assignment.round2_paths.checkpoints;
  const currentStep = assignment.current_step;
  const totalSteps = checkpoints.length;

  if (assignment.state === 'COMPLETE' || currentStep >= checkpoints.length) {
    return res.json({
      state: 'COMPLETE',
      currentStep: totalSteps,
      totalSteps: totalSteps,
      stepNumber: totalSteps,
      remainingSteps: 0
    });
  }

  const targetDestId = checkpoints[currentStep];
  const { data: targetDest } = await supabase.from('round2_destinations').select('*').eq('id', targetDestId).single();

  let arrivedDestName = null;
  if (currentStep > 0) {
    const arrivedDestId = checkpoints[currentStep - 1];
    const { data: arrivedDest } = await supabase.from('round2_destinations').select('name').eq('id', arrivedDestId).single();
    if (arrivedDest) arrivedDestName = arrivedDest.name;
  }

  const { data: progress } = await supabase
    .from('round2_progress')
    .select('id')
    .eq('team_id', teamId)
    .eq('step_no', currentStep + 1)
    .limit(1);
  const hasScannedCurrentDest = progress && progress.length > 0;
  const displayStep = hasScannedCurrentDest ? currentStep + 1 : currentStep;

  if (assignment.state === 'TRANSIT') {
    return res.json({
      state: 'TRANSIT',
      nextDestination: targetDest ? targetDest.name : 'Next Checkpoint',
      nextRiddle: DESTINATION_RIDDLES[targetDestId] || null,
      currentStep: currentStep,
      displayStep: displayStep,
      totalSteps: totalSteps,
      stepNumber: currentStep,
      remainingSteps: totalSteps - currentStep,
      arrivedDestination: arrivedDestName,
      isInitialStart: currentStep === 0
    });
  }

  // State is PENDING_SOLVE (only active after QR is physically scanned at this checkpoint)
  let qId = assignment.current_question_id;
  if (!qId) {
    const poolDestId = displayStep < checkpoints.length ? checkpoints[displayStep] : null;
    let query = supabase.from('round2_questions').select('id, question_text, difficulty');
    if (poolDestId) {
      query = query.eq('destination_id', poolDestId);
    } else {
      query = query.is('destination_id', null);
    }
    const { data: questions } = await query;

    if (questions && questions.length > 0) {
      let selectedQuestion;
      const rand = Math.random() * 5;
      let cumulative = 0;

      for (const q of questions) {
        const weight = q.difficulty === 'EASY' ? 1.5 : 0.875;
        cumulative += weight;
        if (rand <= cumulative) {
          selectedQuestion = q;
          break;
        }
      }
      if (!selectedQuestion) selectedQuestion = questions[questions.length - 1];
      qId = selectedQuestion.id;
      await supabase.from('round2_team_assignments').update({ current_question_id: qId }).eq('team_id', teamId);
    }
  }

  // Fetch the question text
  const { data: qData } = await supabase.from('round2_questions').select('question_text').eq('id', qId).single();

  res.json({
    state: 'PENDING_SOLVE',
    question: qData ? qData.question_text : 'No question available.',
    currentStep: currentStep,
    displayStep: displayStep,
    totalSteps: totalSteps,
    stepNumber: currentStep,
    remainingSteps: totalSteps - currentStep,
    arrivedDestination: targetDest ? targetDest.name : arrivedDestName,
    currentDestination: targetDest ? targetDest.name : arrivedDestName,
    nextDestination: targetDest ? targetDest.name : null,
    isInitialStart: currentStep === 0
  });
});

app.post('/api/round2/submit', authenticate, async (req, res) => {
  const teamId = req.team.team_id;
  const { answer } = req.body;

  // Verify team qualified from Round 1
  const { data: sub } = await supabase
    .from('submissions')
    .select('status')
    .eq('team_id', teamId)
    .eq('status', 'QUALIFIED')
    .maybeSingle();

  if (!sub) {
    return res.status(403).json({ error: 'Team has not qualified for Round 2 yet.' });
  }

  const { data: assignment } = await supabase
    .from('round2_team_assignments')
    .select('*, round2_paths(checkpoints)')
    .eq('team_id', teamId)
    .single();

  if (!assignment || assignment.state !== 'PENDING_SOLVE' || !assignment.current_question_id) {
    return res.status(400).json({ error: 'Not currently waiting for an answer.' });
  }

  const { data: qData } = await supabase.from('round2_questions').select('*').eq('id', assignment.current_question_id).single();

  const cleanDbAnswer = (qData?.correct_answer || '').trim().toLowerCase();
  const cleanUserAnswer = (answer || '').trim().toLowerCase();

  if (!qData || cleanDbAnswer !== cleanUserAnswer) {
    return res.status(400).json({ error: 'Incorrect answer. Please try again.' });
  }

  const checkpoints = assignment.round2_paths.checkpoints;
  const currentStep = assignment.current_step;
  const totalSteps = checkpoints.length;
  const currentDestId = checkpoints[currentStep];
  const { data: currentDest } = await supabase.from('round2_destinations').select('*').eq('id', currentDestId).single();

  // Check if they actually scanned the QR for this step
  const { data: progress } = await supabase
    .from('round2_progress')
    .select('id')
    .eq('team_id', teamId)
    .eq('step_no', currentStep + 1)
    .limit(1);

  const hasScannedCurrentDest = progress && progress.length > 0;

  let nextStep;
  if (!hasScannedCurrentDest) {
    // This happens for the very first "Initial Riddle" given at the Great Hall before scanning anything.
    nextStep = currentStep;
  } else {
    nextStep = currentStep + 1;
  }

  const isFinalCheckpoint = nextStep >= totalSteps;

  if (isFinalCheckpoint) {
    // All checkpoints and riddles conquered!
    await supabase.from('round2_team_assignments').update({
      state: 'COMPLETE',
      current_step: totalSteps,
      current_question_id: null
    }).eq('team_id', teamId);

    return res.json({
      state: 'COMPLETE',
      message: 'All checkpoints conquered! Sprint to the Fountain!',
      finalDestination: currentDest ? currentDest.name : 'Fountain',
      currentStep: totalSteps,
      totalSteps: totalSteps,
      stepNumber: totalSteps,
      remainingSteps: 0
    });
  }

  // Not the final checkpoint — advance to nextStep and set to TRANSIT
  await supabase.from('round2_team_assignments').update({
    current_step: nextStep,
    state: 'TRANSIT',
    current_question_id: null
  }).eq('team_id', teamId);

  const nextDestId = checkpoints[nextStep];
  const { data: nextDest } = await supabase.from('round2_destinations').select('name').eq('id', nextDestId).single();

  res.json({
    success: true,
    state: 'TRANSIT',
    nextDestination: nextDest ? nextDest.name : 'Next Checkpoint',
    nextRiddle: DESTINATION_RIDDLES[nextDestId] || null,
    currentStep: nextStep,
    displayStep: nextStep,
    totalSteps: totalSteps,
    stepNumber: nextStep,
    remainingSteps: totalSteps - nextStep,
    arrivedDestination: hasScannedCurrentDest ? (currentDest ? currentDest.name : null) : null,
    isInitialStart: nextStep === 0
  });
});


app.post('/api/round2/scan_qr', authenticate, async (req, res) => {
  const teamId = req.team.team_id;
  const { qrCode } = req.body;

  // Verify team qualified from Round 1
  const { data: sub } = await supabase
    .from('submissions')
    .select('status')
    .eq('team_id', teamId)
    .eq('status', 'QUALIFIED')
    .maybeSingle();

  if (!sub) {
    return res.status(403).json({ error: 'Team has not qualified for Round 2 yet.' });
  }

  const { data: dest } = await supabase.from('round2_destinations').select('*').eq('qr_identifier', qrCode).single();
  if (!dest) {
    return res.status(404).json({ error: 'Invalid QR code.' });
  }

  const { data: assignment } = await supabase
    .from('round2_team_assignments')
    .select('*, round2_paths(checkpoints)')
    .eq('team_id', teamId)
    .single();

  if (!assignment || assignment.state === 'COMPLETE') {
    return res.status(400).json({ error: 'Event already completed.' });
  }

  const checkpoints = assignment.round2_paths.checkpoints;
  const expectedDestId = checkpoints[assignment.current_step];

  if (dest.id !== expectedDestId) {
    return res.status(400).json({
      error: `WRONG LOCATION! You scanned "${dest.name}", which is incorrect. You must solve the destination riddle and sprint to the correct campus landmark!`
    });
  }

  // Pick or retrieve question for this NEXT destination
  let qId = assignment.current_question_id;
  if (!qId) {
    const nextDestIndex = assignment.current_step + 1;
    const poolDestId = nextDestIndex < checkpoints.length ? checkpoints[nextDestIndex] : null;
    let query = supabase.from('round2_questions').select('id, question_text, difficulty');
    if (poolDestId) {
      query = query.eq('destination_id', poolDestId);
    } else {
      query = query.is('destination_id', null);
    }
    const { data: questions } = await query;

    if (questions && questions.length > 0) {
      let selectedQuestion;
      const rand = Math.random() * 5;
      let cumulative = 0;

      for (const q of questions) {
        const weight = q.difficulty === 'EASY' ? 1.5 : 0.875;
        cumulative += weight;
        if (rand <= cumulative) {
          selectedQuestion = q;
          break;
        }
      }
      if (!selectedQuestion) selectedQuestion = questions[questions.length - 1];
      qId = selectedQuestion.id;
    }
  }

  // Update assignment state to PENDING_SOLVE for this checkpoint
  await supabase
    .from('round2_team_assignments')
    .update({ state: 'PENDING_SOLVE', current_question_id: qId })
    .eq('team_id', teamId);

  // Log progress scan
  await supabase.from('round2_progress').insert({
    team_id: teamId,
    destination_id: dest.id,
    step_no: assignment.current_step + 1
  });

  const { data: qData } = qId ? await supabase.from('round2_questions').select('question_text').eq('id', qId).single() : { data: null };

  return res.json({
    state: 'PENDING_SOLVE',
    message: `Arrived at ${dest.name}! Decipher the riddle to proceed.`,
    question: qData ? qData.question_text : 'Decipher the cipher keyword for this station.',
    currentStep: assignment.current_step,
    displayStep: assignment.current_step + 1,
    totalSteps: checkpoints.length,
    stepNumber: assignment.current_step,
    remainingSteps: checkpoints.length - assignment.current_step,
    arrivedDestination: dest.name,
    currentDestination: dest.name
  });
});

// ------------------------------------------------------------------
// HEALTH & KEEP-ALIVE (Render Free Tier Anti-Sleep Heartbeat)
// ------------------------------------------------------------------

app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'healthy',
    service: 'egt-2.0-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);

  // Self-Ping Keep-Alive Heartbeat (Every 10 minutes)
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://egt-2-0-day-2-backend.onrender.com';
  if (selfUrl && !selfUrl.includes('localhost')) {
    const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (Render sleeps at 15 mins)
    const pingTarget = `${selfUrl.replace(/\/+$/, '')}/api/health`;
    console.log(`[Keep-Alive] Initialized self-ping loop -> ${pingTarget} (every 10m)`);

    setInterval(async () => {
      try {
        const response = await fetch(pingTarget);
        if (response.ok) {
          console.log(`[Keep-Alive] Heartbeat pulse successful at ${new Date().toLocaleTimeString()}`);
        }
      } catch (e) {
        console.warn(`[Keep-Alive] Heartbeat notice:`, e.message);
      }
    }, PING_INTERVAL_MS);
  }
});
