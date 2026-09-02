require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const db = require('./src/db'); // We will read the mock data one last time to seed it

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPass = process.env.ADMIN_SECRET; // NO HARDCODED FALLBACK!

if (!supabaseUrl || !supabaseKey || !adminPass || supabaseUrl.includes('YOUR_')) {
  console.error("Please configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_SECRET in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting Full DB seed (Supabase Auth + Questions)...");

  // 1. Seed Admin User
  console.log("Creating Admin user...");
  const adminEmail = 'admin@treasurehunt.local';
  let { data: adminUser, error: adminErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPass,
    email_confirm: true
  });
  
  if (adminErr && adminErr.status === 422) { 
    console.log("Admin user probably already exists.");
  } else if (adminErr) {
    console.error("Error creating admin:", adminErr.message);
  } else {
    console.log("Created Admin user successfully.");
  }

  // 1.5 Seed Q11 Sets (Must be done before teams due to foreign key)
  console.log("Seeding Q11 Sets...");
  const setsToInsert = db.q11Sets.map(s => ({
    id: s.id,
    set_name: s.setName,
    question_text: s.text,
    codeword: s.codeword
  }));
  const { error: setErr } = await supabase.from('q11_sets').upsert(setsToInsert, { onConflict: 'id' });
  if (setErr) console.error("Error seeding Q11 sets:", setErr.message);
  else console.log("Seeded Q11 Sets.");

  // 2. Seed Teams
  console.log("Creating Team Auth users and Profiles...");
  for (const t of db.teams) {
    const teamEmail = `${t.teamId.toLowerCase()}@treasurehunt.local`;
    let userId = null;

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: teamEmail,
      password: t.pass,
      email_confirm: true,
      user_metadata: { role: 'team', teamId: t.teamId }
    });

    if (authErr && authErr.status === 422) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers.users.find(u => u.email === teamEmail);
      if (existing) userId = existing.id;
    } else if (authErr) {
      console.error(`Error creating auth for ${t.teamId}:`, authErr.message);
      continue;
    } else {
      userId = authData.user.id;
    }

    if (userId) {
      const { error: profileErr } = await supabase.from('teams').upsert({
        id: userId,
        team_id: t.teamId,
        team_name: t.teamName,
        pass: t.pass,
        instance_id: t.instanceId,
        q11_set_id: t.q11SetId,
        correct_code: t.correctCode
      }, { onConflict: 'id' });

      if (profileErr) console.error(`Error creating profile for ${t.teamId}:`, profileErr.message);
    }
  }
  console.log("Seeded teams and auth users.");

  // 3. Seed Round Config (Default to CLOSED, times in past so timer is 0)
  const roundConfigToInsert = {
    id: 1,
    status: 'CLOSED',
    start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    end_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    max_qualifiers: 20
  };
  await supabase.from('round_config').upsert(roundConfigToInsert, { onConflict: 'id' });

  // 4. Seed Questions (NEW)
  const templatesToInsert = db.questionTemplates.map(q => ({
    id: q.id,
    question_text: q.text,
    formula: "", // Not used anymore for these static questions
    hint: q.hint
  }));
  const { error: qtErr } = await supabase.from('question_templates').upsert(templatesToInsert, { onConflict: 'id' });
  if (qtErr) console.error("Error seeding question templates:", qtErr.message);
  else console.log("Seeded question templates.");

  // 5. Seed Question Hints
  const hintsToInsert = Object.keys(db.hintState).map(qId => ({
    question_id: qId,
    enabled: db.hintState[qId]
  }));
  const { error: hintsErr } = await supabase.from('question_hints').upsert(hintsToInsert, { onConflict: 'question_id' });
  if (hintsErr) console.error("Error seeding hints:", hintsErr.message);
  else console.log(`Seeded hints.`);

  console.log("Seed complete.");
}

seed();
