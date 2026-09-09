require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data, error } = await supabase
    .from('round2_team_assignments')
    .update({ current_question_id: null })
    .eq('team_id', 'TH-002');
  console.log("Fixed TH-002:", error ? error : "Success");
}

fix();
