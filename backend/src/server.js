require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const db = require('./db'); 

const app = express();
app.use(cors());
app.use(bodyParser.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Node acts as a trusted server

const supabase = createClient(supabaseUrl || 'http://localhost', supabaseKey || 'dummy');

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
  res.json({ message: `Hint for ${questionId} set to ${enabled}` });
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

  res.json({ message: 'Round 1 and all submissions have been reset.' });
});

app.get('/api/admin/teams', authenticateAdmin, async (req, res) => {
    const { data: teams } = await supabase.from('teams').select('team_id, pass, correct_code').order('team_id');
    res.json(teams || []);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
