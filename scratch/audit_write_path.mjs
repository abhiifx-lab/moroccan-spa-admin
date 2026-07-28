import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhgwxqpfeosoxwpspjoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZ3d4cXBmZW9zb3h3cHNwam9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjM4NTQsImV4cCI6MjEwMDUzOTg1NH0.O05S6JEJelbXIx80sjMuH_HcBkdD6g0Y-T5TX38qHxI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAudit() {
  console.log('--- STAGE 1: FETCHING CENTRES FROM SUPABASE ---');
  const { data: centres, error: cErr } = await supabase.from('centres').select('*');
  if (cErr) {
    console.error('Failed to fetch centres:', cErr);
    return;
  }

  const lulu = centres.find(c => c.name.includes('Lulu') || c.code === 'LKO-LULU');
  console.log('Lulu Centre Object:', lulu);

  if (!lulu) {
    console.error('CRITICAL: Lulu centre not found in public.centres!');
    return;
  }

  const testDate = new Date().toISOString().split('T')[0];
  const testRef = `AUDIT-BK-${Date.now()}`;

  console.log('\n--- STAGE 2: CREATING BOOKING IN BOOKINGS TABLE ---');
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .insert([{
      centre_id: lulu.id,
      booking_ref: testRef,
      customer_name: 'Audit Test Customer',
      customer_phone: '9998887770',
      service_id: 'srv_deep_tissue_60',
      service_name: 'Swedish Massage 60 Min',
      service_duration: '60 Mins',
      appointment_date: testDate,
      appointment_time: '14:00:00',
      amount: 4500,
      payment_status: 'Paid',
      payment_method: 'Cash at Desk',
      booking_status: 'Confirmed'
    }])
    .select()
    .single();

  if (bErr) {
    console.error('Booking insert failed:', bErr);
    return;
  }
  console.log('✓ STAGE 1 & 2 SUCCESS: Booking Created:', booking.id, booking.booking_ref);

  console.log('\n--- STAGE 3: RECORDING BUSINESS EVENT ---');
  // 1. Ensure business day exists
  let { data: bDay } = await supabase
    .from('business_days')
    .select('*')
    .eq('centre_id', lulu.id)
    .eq('date', testDate)
    .maybeSingle();

  if (!bDay) {
    console.log('No BusinessDay record exists for Lulu today. Inserting one...');
    const { data: newBD, error: bdInsErr } = await supabase
      .from('business_days')
      .insert([{
        centre_id: lulu.id,
        date: testDate,
        status: 'open',
        opening_cash: 5000,
        actual_cash_counted: 0,
        mismatch_reason: ''
      }])
      .select()
      .single();
    
    if (bdInsErr) {
      console.error('BusinessDay insert failed:', bdInsErr);
    } else {
      bDay = newBD;
    }
  }

  console.log('Business Day Record:', bDay?.id);

  // 2. Insert event
  const { data: event, error: eErr } = await supabase
    .from('business_events')
    .insert([{
      business_day_id: bDay?.id,
      centre_id: lulu.id,
      date: testDate,
      event_type: 'booking_sale',
      payment_method: 'cash',
      amount: 4500,
      booking_id: booking.id,
      customer_name: 'Audit Test Customer',
      customer_phone: '9998887770',
      service_name: 'Swedish Massage 60 Min',
      ref_code: testRef,
      description: 'Audit Test Booking'
    }])
    .select()
    .single();

  if (eErr) {
    console.error('Business Event Insert FAILED:', eErr);
    return;
  }
  console.log('✓ STAGE 3 SUCCESS: Business Event Inserted:', event.id);

  console.log('\n--- STAGE 4 & 5: VERIFYING BUSINESS DAY TRIGGER & AGGREGATION ---');
  const { data: updatedBD } = await supabase
    .from('business_days')
    .select('*')
    .eq('centre_id', lulu.id)
    .eq('date', testDate)
    .single();

  console.log('✓ STAGE 5 RESULT: Updated Business Day totals:', {
    total_sales: updatedBD.total_sales,
    cash_sales: updatedBD.cash_sales,
    upi_sales: updatedBD.upi_sales,
    card_sales: updatedBD.card_sales,
    expected_closing_cash: updatedBD.expected_closing_cash
  });

  console.log('\n--- STAGE 6: VERIFYING GENERAL LEDGER POSTINGS ---');
  const { data: glEntries } = await supabase
    .from('general_ledger')
    .select('*')
    .eq('centre_id', lulu.id)
    .eq('transaction_date', testDate);

  console.log(`✓ STAGE 6 RESULT: General Ledger Entries (${glEntries?.length || 0} entries found):`, glEntries);
}

runAudit();
