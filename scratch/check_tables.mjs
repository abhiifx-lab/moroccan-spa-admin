import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhgwxqpfeosoxwpspjoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZ3d4cXBmZW9zb3h3cHNwam9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjM4NTQsImV4cCI6MjEwMDUzOTg1NH0.O05S6JEJelbXIx80sjMuH_HcBkdD6g0Y-T5TX38qHxI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  const tables = ['bookings', 'centres', 'business_days', 'business_events', 'general_ledger', 'daily_closing', 'daily_registers', 'expenses', 'customers', 'memberships', 'gift_cards'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ Table '${t}': ERROR -> ${error.message} (${error.code})`);
    } else {
      console.log(`✓ Table '${t}': OK (${data.length} rows returned)`);
    }
  }
}

checkTables();
