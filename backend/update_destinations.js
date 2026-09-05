require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const updates = [
  { id: 'D1', name: 'Behind A3' },
  { id: 'D2', name: 'Chai churi' },
  { id: 'D3', name: 'Underpass' },
  { id: 'D4', name: 'FR- Burger Singh' },
  { id: 'D5', name: 'Kalpana chawla Rockets' },
  { id: 'D6', name: 'Belgium waffles' }
];

async function updateDestinations() {
  console.log('Updating destinations in Supabase...');
  for (const dest of updates) {
    const { data, error } = await supabase
      .from('round2_destinations')
      .update({ name: dest.name })
      .eq('id', dest.id);
      
    if (error) {
      console.error(`Error updating ${dest.id}:`, error.message);
    } else {
      console.log(`Successfully updated ${dest.id} to ${dest.name}`);
    }
  }
  console.log('Update complete.');
  process.exit(0);
}

updateDestinations();
