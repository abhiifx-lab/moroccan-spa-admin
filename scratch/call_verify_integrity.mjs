import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhgwxqpfeosoxwpspjoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZ3d4cXBmZW9zb3h3cHNwam9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjM4NTQsImV4cCI6MjEwMDUzOTg1NH0.O05S6JEJelbXIx80sjMuH_HcBkdD6g0Y-T5TX38qHxI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRpc() {
  console.log('Testing RPC verify_database_integrity...');
  const { data, error } = await supabase.rpc('verify_database_integrity');
  console.log('RPC Result:', data, error);
}

testRpc();
