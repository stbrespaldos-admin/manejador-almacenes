const SUPABASE_URL = 'https://vopaebuizdqhnhaukftw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvcGFlYnVpemRxaG5oYXVrZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzE4NTksImV4cCI6MjA5MjEwNzg1OX0.LQ0hre9pFuD7wQVR0ZRrGaMsQATGde8t81Hi8J1rOtM';

async function test() {
  const url = `${SUPABASE_URL}/rest/v1/onus?select=id,consecutive,model,serial,created_at,boxes(box_number,status,warehouses(name))`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

test();
