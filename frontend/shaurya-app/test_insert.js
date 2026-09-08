const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testInsert() {
  const { data, error } = await supabase.from('activity_logs').insert([{
    action: 'TEST',
    volunteer_name: 'Test',
    user_name: 'Test User',
    qr_token: 'TEST-123',
    details: 'Testing activity log insertion'
  }]);

  console.log("Error:", error);
  console.log("Data:", data);
}

testInsert();
