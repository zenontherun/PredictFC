import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://esewifusdgrjlpdbtbjg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5ZzY3cMR5I0-3d3QczCxlw_L0sgnbsU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role');

  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('--- Database Profiles ---');
    console.table(data);
  }
}

checkProfiles();
