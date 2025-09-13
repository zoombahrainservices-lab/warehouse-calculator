


const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkPricingRates() {
  try {
    console.log('Checking current pricing rates...\n');
    
    const { data, error } = await supabase
      .from('pricing_rates')
      .select('*')
      .order('space_type', { ascending: true })
      .order('tenure', { ascending: true })
      .order('area_band_min', { ascending: true });

    if (error) {
      console.error('Error fetching pricing rates:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No pricing rates found in database');
      return;
    }

    console.log(`Found ${data.length} pricing rates:\n`);

    // Group by space type and tenure
    const grouped = {};
    data.forEach(rate => {
      const key = `${rate.space_type} - ${rate.tenure}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(rate);
    });

    Object.keys(grouped).forEach(key => {
      console.log(`\n=== ${key} ===`);
      grouped[key].forEach(rate => {
        console.log(`  ${rate.area_band_name}: ${rate.area_band_min}-${rate.area_band_max || '∞'} m²`);
        console.log(`    Monthly: ${rate.monthly_rate_per_sqm} BHD/m²`);
        console.log(`    Daily: ${rate.daily_rate_per_sqm} BHD/m²`);
        console.log(`    Min Area: ${rate.min_chargeable_area} m²`);
        console.log(`    Package Starting: ${rate.package_starting_bhd || 'N/A'} BHD`);
        console.log(`    Active: ${rate.active}`);
        console.log('');
      });
    });

    // Check for missing combinations
    console.log('\n=== CHECKING FOR MISSING COMBINATIONS ===');
    const spaceTypes = [...new Set(data.map(r => r.space_type))];
    const tenures = [...new Set(data.map(r => r.tenure))];
    
    spaceTypes.forEach(spaceType => {
      tenures.forEach(tenure => {
        const exists = data.some(r => r.space_type === spaceType && r.tenure === tenure);
        if (!exists) {
          console.log(`❌ Missing: ${spaceType} - ${tenure}`);
        } else {
          console.log(`✅ Found: ${spaceType} - ${tenure}`);
        }
      });
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

checkPricingRates();


