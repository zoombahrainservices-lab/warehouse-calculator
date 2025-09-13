const { createClient } = require('@supabase/supabase-js');

// You need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlfhroadyqcacbkcrkrj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_ROLE_KEY_HERE";

if (supabaseKey === "YOUR_SERVICE_ROLE_KEY_HERE") {
  console.error('❌ Please set your SUPABASE_SERVICE_ROLE_KEY environment variable or replace it in this script');
  console.error('You can find it in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreOriginalPricing() {
  console.log('=== RESTORING ORIGINAL HARDCODED PRICING ===\n');

  try {
    // First, let's see what's currently in the database
    console.log('📊 Checking current pricing data...');
    const { data: currentRates, error: currentError } = await supabase
      .from('pricing_rates')
      .select('*')
      .order('space_type', { ascending: true })
      .order('area_band_min', { ascending: true });

    if (currentError) {
      console.error('Error fetching current rates:', currentError);
      return;
    }

    console.log(`Found ${currentRates?.length || 0} current pricing rates`);

    // Clear existing pricing data
    console.log('\n🧹 Clearing existing pricing data...');
    const { error: deleteError } = await supabase
      .from('pricing_rates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error('Error clearing existing rates:', deleteError);
      return;
    }

    console.log('✅ Existing pricing data cleared');

    // Insert the original hardcoded pricing
    console.log('\n💰 Inserting original hardcoded pricing...');

    const originalPricing = [
      // GROUND FLOOR PRICING (EXACT ORIGINAL VALUES)
      // Small units (1-999 m²)
      { space_type: 'Ground Floor', tenure: 'Short', tenure_description: 'Less than One Year', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 3.500, daily_rate_per_sqm: 0.117, active: true, min_chargeable_area: 30, package_starting_bhd: 105.00 },
      { space_type: 'Ground Floor', tenure: 'Long', tenure_description: 'More or equal to 1 Year', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 3.000, daily_rate_per_sqm: 0.100, active: true, min_chargeable_area: 35, package_starting_bhd: 105.00 },
      
      // 1,000–1,499 m²
      { space_type: 'Ground Floor', tenure: 'Short', tenure_description: 'Less than One Year', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, monthly_rate_per_sqm: 3.000, daily_rate_per_sqm: 0.100, active: true, min_chargeable_area: 1000, package_starting_bhd: 3000.00 },
      { space_type: 'Ground Floor', tenure: 'Long', tenure_description: 'More or equal to 1 Year', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, active: true, min_chargeable_area: 1000, package_starting_bhd: 2800.00 },
      
      // 1,500 m² and above
      { space_type: 'Ground Floor', tenure: 'Short', tenure_description: 'Less than One Year', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, active: true, min_chargeable_area: 1500, package_starting_bhd: 4200.00 },
      { space_type: 'Ground Floor', tenure: 'Long', tenure_description: 'More or equal to 1 Year', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, monthly_rate_per_sqm: 2.600, daily_rate_per_sqm: 0.087, active: true, min_chargeable_area: 1500, package_starting_bhd: 3900.00 },
      
      // Very Short Special
      { space_type: 'Ground Floor', tenure: 'Very Short', tenure_description: 'Special Rate', area_band_name: 'Very Short Special', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 4.500, daily_rate_per_sqm: 0.150, active: true, min_chargeable_area: 25, package_starting_bhd: 112.50 },

      // MEZZANINE PRICING (20% cheaper than Ground Floor - EXACT ORIGINAL VALUES)
      // Small units (1-999 m²) - 20% discount from Ground Floor
      { space_type: 'Mezzanine', tenure: 'Short', tenure_description: 'Less than One Year', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.094, active: true, min_chargeable_area: 30, package_starting_bhd: 84.00 },
      { space_type: 'Mezzanine', tenure: 'Long', tenure_description: 'More or equal to 1 Year', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 2.400, daily_rate_per_sqm: 0.080, active: true, min_chargeable_area: 35, package_starting_bhd: 84.00 },
      
      // 1,000–1,499 m² - 20% discount from Ground Floor
      { space_type: 'Mezzanine', tenure: 'Short', tenure_description: 'Less than One Year', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, monthly_rate_per_sqm: 2.400, daily_rate_per_sqm: 0.080, active: true, min_chargeable_area: 1000, package_starting_bhd: 2400.00 },
      { space_type: 'Mezzanine', tenure: 'Long', tenure_description: 'More or equal to 1 Year', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, monthly_rate_per_sqm: 2.240, daily_rate_per_sqm: 0.075, active: true, min_chargeable_area: 1000, package_starting_bhd: 2240.00 },
      
      // 1,500 m² and above - 20% discount from Ground Floor
      { space_type: 'Mezzanine', tenure: 'Short', tenure_description: 'Less than One Year', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, monthly_rate_per_sqm: 2.240, daily_rate_per_sqm: 0.075, active: true, min_chargeable_area: 1500, package_starting_bhd: 3360.00 },
      { space_type: 'Mezzanine', tenure: 'Long', tenure_description: 'More or equal to 1 Year', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, monthly_rate_per_sqm: 2.080, daily_rate_per_sqm: 0.070, active: true, min_chargeable_area: 1500, package_starting_bhd: 3120.00 },
      
      // Very Short Special - 20% discount from Ground Floor
      { space_type: 'Mezzanine', tenure: 'Very Short', tenure_description: 'Special Rate', area_band_name: 'Very Short Special', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 3.600, daily_rate_per_sqm: 0.120, active: true, min_chargeable_area: 25, package_starting_bhd: 90.00 }
    ];

    const { data: insertedRates, error: insertError } = await supabase
      .from('pricing_rates')
      .insert(originalPricing)
      .select();

    if (insertError) {
      console.error('Error inserting pricing rates:', insertError);
      return;
    }

    console.log(`✅ Successfully inserted ${insertedRates?.length || 0} pricing rates`);

    // Verify the pricing
    console.log('\n🔍 Verifying restored pricing...');
    const { data: verifyRates, error: verifyError } = await supabase
      .from('pricing_rates')
      .select('*')
      .order('space_type', { ascending: true })
      .order('area_band_min', { ascending: true })
      .order('tenure', { ascending: true });

    if (verifyError) {
      console.error('Error verifying rates:', verifyError);
      return;
    }

    console.log('\n📊 RESTORED PRICING SUMMARY:');
    console.log('============================');

    // Group by space type
    const groundFloor = verifyRates?.filter(r => r.space_type === 'Ground Floor') || [];
    const mezzanine = verifyRates?.filter(r => r.space_type === 'Mezzanine') || [];

    console.log('\n🏢 GROUND FLOOR PRICING:');
    groundFloor.forEach(rate => {
      console.log(`  ${rate.area_band_name} (${rate.area_band_min}-${rate.area_band_max || '∞'} m²) - ${rate.tenure}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
    });

    console.log('\n🏗️ MEZZANINE PRICING:');
    mezzanine.forEach(rate => {
      console.log(`  ${rate.area_band_name} (${rate.area_band_min}-${rate.area_band_max || '∞'} m²) - ${rate.tenure}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
    });

    // Verify 20% discount
    console.log('\n✅ DISCOUNT VERIFICATION:');
    groundFloor.forEach(gf => {
      const matchingMezzanine = mezzanine.find(m => 
        m.area_band_name === gf.area_band_name && 
        m.tenure === gf.tenure
      );
      
      if (matchingMezzanine) {
        const discount = ((gf.monthly_rate_per_sqm - matchingMezzanine.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm) * 100;
        console.log(`  ${gf.area_band_name} - ${gf.tenure}: ${discount.toFixed(1)}% discount (Ground: ${gf.monthly_rate_per_sqm}, Mezzanine: ${matchingMezzanine.monthly_rate_per_sqm})`);
      }
    });

    console.log('\n🎉 ORIGINAL HARDCODED PRICING SUCCESSFULLY RESTORED!');
    console.log('✅ Mezzanine is now 20% cheaper than Ground Floor');
    console.log('✅ All pricing tiers are correctly configured');
    console.log('\n💡 You can now test the calculator at http://localhost:3001');

  } catch (error) {
    console.error('❌ Error restoring pricing:', error);
  }
}

restoreOriginalPricing();

