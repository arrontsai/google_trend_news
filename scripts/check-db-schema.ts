import { supabase } from '../src/lib/supabase';

async function check() {
  const { data, error } = await supabase
    .from('daily_trends_summary')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No data found to infer columns.');
  }
}

check();
