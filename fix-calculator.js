#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndFixCalculator() {
  console.log('🔧 Fixing Calculator Database...')
  console.log('=====================================')
  
  // Check what tables exist
  console.log('📋 Checking existing tables...')
  
  const tables = ['pricing_rates', 'ewa_settings', 'optional_services', 'system_settings', 'space_types']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count(*)')
        .limit(0)
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        console.log(`✅ ${table}: ${count || 0} records`)
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }
  
  // Check if we have the minimum data needed
  console.log('\n🔍 Checking minimum required data...')
  
  try {
    const { data: rates, error: ratesError } = await supabase
      .from('pricing_rates')
      .select('*')
      .limit(5)
    
    if (ratesError || !rates || rates.length === 0) {
      console.log('❌ No pricing rates found - calculator will not work')
      console.log('💡 Solution: Need to create pricing_rates table with data')
    } else {
      console.log(`✅ Found ${rates.length} pricing rates`)
    }
    
    const { data: ewa, error: ewaError } = await supabase
      .from('ewa_settings')
      .select('*')
      .limit(1)
    
    if (ewaError || !ewa || ewa.length === 0) {
      console.log('❌ No EWA settings found - calculator will not work')
      console.log('💡 Solution: Need to create ewa_settings table with data')
    } else {
      console.log('✅ Found EWA settings')
    }
    
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(5)
    
    if (settingsError || !settings || settings.length === 0) {
      console.log('❌ No system settings found - calculator will not work')
      console.log('💡 Solution: Need to create system_settings table with data')
    } else {
      console.log(`✅ Found ${settings.length} system settings`)
    }
    
  } catch (err) {
    console.log('❌ Database connection failed:', err.message)
  }
  
  console.log('\n🎯 DIAGNOSIS:')
  console.log('Your calculator shows "Configure your space to see live pricing" because:')
  console.log('1. Missing pricing_rates table data')
  console.log('2. Missing ewa_settings table data')
  console.log('3. Missing system_settings table data')
  
  console.log('\n🔧 SOLUTION:')
  console.log('Run this SQL in your Supabase Dashboard to fix it:')
  
  console.log(`
-- Fix EWA Settings Table
DROP TABLE IF EXISTS ewa_settings CASCADE;
CREATE TABLE ewa_settings (
  id TEXT PRIMARY KEY,
  house_load_description TEXT NOT NULL,
  dedicated_meter_description TEXT NOT NULL,
  estimated_setup_deposit REAL NOT NULL DEFAULT 0,
  estimated_installation_fee REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO ewa_settings (
  id,
  house_load_description,
  dedicated_meter_description,
  estimated_setup_deposit,
  estimated_installation_fee
) VALUES (
  'ewa-settings-1',
  'Shared electrical connection with estimated monthly charges',
  'Dedicated electrical meter with actual consumption billing',
  500.0,
  1000.0
);

-- Verify tables exist
SELECT 'pricing_rates' as table_name, count(*) as records FROM pricing_rates
UNION ALL
SELECT 'ewa_settings' as table_name, count(*) as records FROM ewa_settings
UNION ALL
SELECT 'system_settings' as table_name, count(*) as records FROM system_settings;
`)
}

checkAndFixCalculator().catch(console.error)
