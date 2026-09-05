require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // ========== STEP 1: Add Fountain destination ==========
  console.log('Step 1: Adding D7 (Fountain) destination...');
  const { error: destError } = await supabase
    .from('round2_destinations')
    .upsert({ id: 'D7', name: 'Fountain', qr_identifier: 'qr_fountain_d7' }, { onConflict: 'id' });

  if (destError) {
    console.error('ERROR adding destination:', destError.message);
    process.exit(1);
  }
  console.log('  ✅ D7 (Fountain) added.');

  // ========== STEP 2: Insert 5 Knapsack questions for D7 ==========
  console.log('Step 2: Inserting 5 Knapsack questions for D7...');

  const questions = [
    {
      destination_id: 'D7',
      question_text: `Hermione finds six magical objects. Her enchanted bag can carry at most 13 units of weight. She wants to maximize the total magical power she can carry.\nObject — Magical Power — Weight\nWand — 9 — 2\nCloak — 14 — 6\nTime Turner — 11 — 5\nMarauder's Map — 24 — 4\nPotion — 14 — 7\nPhoenix Feather — 7 — 4\nEach object can either be taken once or not taken at all.\nWhat is the maximum total magical power Hermione can carry without exceeding the weight limit?`,
      correct_answer: '47',
      difficulty: 'OTHER'
    },
    {
      destination_id: 'D7',
      question_text: `Hermione finds six magical objects. Her enchanted bag can carry at most 14 units of weight. She wants to maximize the total magical power she can carry.\nObject — Magical Power — Weight\nWand — 25 — 4\nCloak — 22 — 2\nTime Turner — 9 — 7\nMarauder's Map — 18 — 5\nPotion — 24 — 2\nPhoenix Feather — 12 — 6\nEach object can either be taken once or not taken at all.\nWhat is the maximum total magical power Hermione can carry without exceeding the weight limit?`,
      correct_answer: '89',
      difficulty: 'OTHER'
    },
    {
      destination_id: 'D7',
      question_text: `Hermione finds six magical objects. Her enchanted bag can carry at most 12 units of weight. She wants to maximize the total magical power she can carry.\nObject — Magical Power — Weight\nWand — 12 — 4\nCloak — 17 — 7\nTime Turner — 19 — 2\nMarauder's Map — 8 — 7\nPotion — 16 — 4\nPhoenix Feather — 25 — 6\nEach object can either be taken once or not taken at all.\nWhat is the maximum total magical power Hermione can carry without exceeding the weight limit?`,
      correct_answer: '60',
      difficulty: 'OTHER'
    },
    {
      destination_id: 'D7',
      question_text: `Hermione finds six magical objects. Her enchanted bag can carry at most 11 units of weight. She wants to maximize the total magical power she can carry.\nObject — Magical Power — Weight\nWand — 19 — 3\nCloak — 16 — 5\nTime Turner — 18 — 7\nMarauder's Map — 15 — 5\nPotion — 23 — 7\nPhoenix Feather — 10 — 7\nEach object can either be taken once or not taken at all.\nWhat is the maximum total magical power Hermione can carry without exceeding the weight limit?`,
      correct_answer: '42',
      difficulty: 'OTHER'
    },
    {
      destination_id: 'D7',
      question_text: `Hermione finds six magical objects. Her enchanted bag can carry at most 15 units of weight. She wants to maximize the total magical power she can carry.\nObject — Magical Power — Weight\nWand — 25 — 4\nCloak — 24 — 4\nTime Turner — 15 — 3\nMarauder's Map — 18 — 5\nPotion — 23 — 6\nPhoenix Feather — 6 — 6\nEach object can either be taken once or not taken at all.\nWhat is the maximum total magical power Hermione can carry without exceeding the weight limit?`,
      correct_answer: '72',
      difficulty: 'OTHER'
    }
  ];

  const { data: insertedQs, error: qError } = await supabase
    .from('round2_questions')
    .insert(questions)
    .select('id, destination_id, correct_answer');

  if (qError) {
    console.error('ERROR inserting questions:', qError.message);
    process.exit(1);
  }
  console.log(`  ✅ Inserted ${insertedQs.length} questions:`, insertedQs.map(q => `ID:${q.id} (ans:${q.correct_answer})`).join(', '));

  // ========== STEP 3: Append D7 to all paths ==========
  console.log('Step 3: Appending D7 to all paths...');

  const { data: paths, error: pathFetchErr } = await supabase
    .from('round2_paths')
    .select('id, checkpoints')
    .order('id');

  if (pathFetchErr) {
    console.error('ERROR fetching paths:', pathFetchErr.message);
    process.exit(1);
  }

  let updatedCount = 0;
  for (const path of paths) {
    const checkpoints = path.checkpoints;
    if (checkpoints[checkpoints.length - 1] === 'D7') {
      console.log(`  ⏭️  ${path.id} already ends with D7, skipping.`);
      continue;
    }
    const newCheckpoints = [...checkpoints, 'D7'];
    const { error: updateErr } = await supabase
      .from('round2_paths')
      .update({ checkpoints: newCheckpoints })
      .eq('id', path.id);

    if (updateErr) {
      console.error(`  ERROR updating ${path.id}:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }
  console.log(`  ✅ Updated ${updatedCount} paths (appended D7).`);

  // ========== VERIFICATION ==========
  console.log('\n--- VERIFICATION ---');

  const { data: d7 } = await supabase.from('round2_destinations').select('*').eq('id', 'D7').single();
  console.log('D7 destination:', d7);

  const { data: d7Qs } = await supabase.from('round2_questions').select('id, correct_answer').eq('destination_id', 'D7');
  console.log(`D7 questions: ${d7Qs.length} (IDs: ${d7Qs.map(q=>q.id).join(', ')})`);

  const { data: verifyPaths } = await supabase.from('round2_paths').select('id, checkpoints').order('id');
  const allEndWithD7 = verifyPaths.every(p => p.checkpoints[p.checkpoints.length - 1] === 'D7');
  const allHave7 = verifyPaths.every(p => p.checkpoints.length === 7);
  console.log(`All paths end with D7: ${allEndWithD7}`);
  console.log(`All paths have 7 checkpoints: ${allHave7}`);

  if (allEndWithD7 && allHave7 && d7Qs.length === 5) {
    console.log('\n🎉 ALL DONE! Fountain is ready as the final checkpoint.');
  } else {
    console.log('\n⚠️  Something may need attention. Check the output above.');
  }

  process.exit(0);
}

main();
