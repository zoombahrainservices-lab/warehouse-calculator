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

// Reverse engineered pricing structure with guaranteed 20% mezzanine discount
const reverseEngineeredPricing = {
  groundFloor: [
    // Small units (1-999 m²)
    { tenure: 'Short', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 3.500, daily_rate_per_sqm: 0.117, min_chargeable_area: 30, package_starting_bhd: 105.00 },
    { tenure: 'Long', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 3.000, daily_rate_per_sqm: 0.100, min_chargeable_area: 35, package_starting_bhd: 105.00 },
    
    // 1,000–1,499 m²
    { tenure: 'Short', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, monthly_rate_per_sqm: 3.000, daily_rate_per_sqm: 0.100, min_chargeable_area: 1000, package_starting_bhd: 3000.00 },
    { tenure: 'Long', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, min_chargeable_area: 1000, package_starting_bhd: 2800.00 },
    
    // 1,500 m² and above
    { tenure: 'Short', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, min_chargeable_area: 1500, package_starting_bhd: 4200.00 },
    { tenure: 'Long', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, monthly_rate_per_sqm: 2.600, daily_rate_per_sqm: 0.087, min_chargeable_area: 1500, package_starting_bhd: 3900.00 },
    
    // Very Short Special
    { tenure: 'Very Short', area_band_name: 'Very Short Special', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 4.500, daily_rate_per_sqm: 0.150, min_chargeable_area: 25, package_starting_bhd: 112.50 }
  ]
};

// Calculate mezzanine rates (exactly 20% lower than ground floor)
function calculateMezzanineRates(groundFloorRates) {
  return groundFloorRates.map(rate => ({
    ...rate,
    monthly_rate_per_sqm: Math.round(rate.monthly_rate_per_sqm * 0.8 * 1000) / 1000, // 20% discount, rounded to 3 decimal places
    daily_rate_per_sqm: Math.round(rate.daily_rate_per_sqm * 0.8 * 1000) / 1000, // 20% discount, rounded to 3 decimal places
    package_starting_bhd: Math.round(rate.package_starting_bhd * 0.8 * 100) / 100 // 20% discount, rounded to 2 decimal places
  }));
}

async function reverseEngineerPricing() {
  console.log('=== REVERSE ENGINEERING WAREHOUSE PRICING ===\n');

  try {
    // 1. Clear existing pricing data
    console.log('🧹 Clearing existing pricing data...');
    const { error: deleteError } = await supabase
      .from('pricing_rates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error('Error clearing existing rates:', deleteError);
      return;
    }

    console.log('✅ Existing pricing data cleared');

    // 2. Calculate mezzanine rates (20% lower than ground floor)
    console.log('\n💰 Calculating mezzanine rates (20% lower than ground floor)...');
    const mezzanineRates = calculateMezzanineRates(reverseEngineeredPricing.groundFloor);

    // 3. Prepare all pricing data for insertion
    const allPricingData = [
      // Ground Floor rates
      ...reverseEngineeredPricing.groundFloor.map(rate => ({
        space_type: 'Ground Floor',
        tenure_description: rate.tenure === 'Short' ? 'Less than One Year' : 
                           rate.tenure === 'Long' ? 'More or equal to 1 Year' : 'Special Rate',
        ...rate
      })),
      // Mezzanine rates
      ...mezzanineRates.map(rate => ({
        space_type: 'Mezzanine',
        tenure_description: rate.tenure === 'Short' ? 'Less than One Year' : 
                           rate.tenure === 'Long' ? 'More or equal to 1 Year' : 'Special Rate',
        ...rate
      }))
    ];

    // 4. Insert all pricing data
    console.log('📊 Inserting reverse engineered pricing...');
    const { data: insertedRates, error: insertError } = await supabase
      .from('pricing_rates')
      .insert(allPricingData)
      .select();

    if (insertError) {
      console.error('Error inserting pricing rates:', insertError);
      return;
    }

    console.log(`✅ Successfully inserted ${insertedRates?.length || 0} pricing rates`);

    // 5. Verify the 20% discount
    console.log('\n🔍 Verifying 20% discount calculation...');
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

    // Group rates by space type
    const groundFloor = verifyRates?.filter(r => r.space_type === 'Ground Floor') || [];
    const mezzanine = verifyRates?.filter(r => r.space_type === 'Mezzanine') || [];

    console.log('\n📊 PRICING COMPARISON WITH DISCOUNT VERIFICATION:');
    console.log('================================================');

    let allCorrect = true;
    groundFloor.forEach(gf => {
      const matchingMezzanine = mezzanine.find(m => 
        m.area_band_name === gf.area_band_name && 
        m.tenure === gf.tenure
      );
      
      if (matchingMezzanine) {
        const actualDiscount = ((gf.monthly_rate_per_sqm - matchingMezzanine.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm) * 100;
        const expectedMezzanineRate = Math.round(gf.monthly_rate_per_sqm * 0.8 * 1000) / 1000;
        const isCorrect = Math.abs(actualDiscount - 20) < 0.1 && matchingMezzanine.monthly_rate_per_sqm === expectedMezzanineRate;
        
        if (!isCorrect) allCorrect = false;
        
        console.log(`${gf.area_band_name} - ${gf.tenure}:`);
        console.log(`  Ground Floor: ${gf.monthly_rate_per_sqm} BHD/m²`);
        console.log(`  Mezzanine: ${matchingMezzanine.monthly_rate_per_sqm} BHD/m²`);
        console.log(`  Actual Discount: ${actualDiscount.toFixed(1)}%`);
        console.log(`  Expected Mezzanine: ${expectedMezzanineRate} BHD/m²`);
        console.log(`  Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
        console.log('');
      }
    });

    // 6. Show complete pricing structure
    console.log('🏢 GROUND FLOOR PRICING:');
    console.log('========================');
    groundFloor.forEach(rate => {
      console.log(`  ${rate.area_band_name} (${rate.area_band_min}-${rate.area_band_max || '∞'} m²) - ${rate.tenure}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
    });

    console.log('\n🏗️ MEZZANINE PRICING:');
    console.log('=====================');
    mezzanine.forEach(rate => {
      console.log(`  ${rate.area_band_name} (${rate.area_band_min}-${rate.area_band_max || '∞'} m²) - ${rate.tenure}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
    });

    // 7. Final summary
    console.log('\n📋 PRICING TIER SUMMARY:');
    console.log('========================');
    console.log('Small units (1-999m²):');
    console.log('  Ground Floor: Short: 3.500 BHD/m², Long: 3.000 BHD/m², Very Short: 4.500 BHD/m²');
    console.log('  Mezzanine: Short: 2.800 BHD/m², Long: 2.400 BHD/m², Very Short: 3.600 BHD/m²');
    console.log('');
    console.log('1,000–1,499 m²:');
    console.log('  Ground Floor: Short: 3.000 BHD/m², Long: 2.800 BHD/m²');
    console.log('  Mezzanine: Short: 2.400 BHD/m², Long: 2.240 BHD/m²');
    console.log('');
    console.log('1,500 m² and above:');
    console.log('  Ground Floor: Short: 2.800 BHD/m², Long: 2.600 BHD/m²');
    console.log('  Mezzanine: Short: 2.240 BHD/m², Long: 2.080 BHD/m²');

    console.log('\n🎯 FINAL VERIFICATION:');
    console.log('======================');
    console.log(`Total pricing rates: ${verifyRates?.length || 0}`);
    console.log(`Ground Floor rates: ${groundFloor.length}`);
    console.log(`Mezzanine rates: ${mezzanine.length}`);
    console.log(`All mezzanine rates are 20% lower: ${allCorrect ? '✅ YES' : '❌ NO'}`);

    if (allCorrect) {
      console.log('\n🎉 REVERSE ENGINEERING COMPLETE!');
      console.log('✅ All mezzanine prices are exactly 20% lower than ground floor prices');
      console.log('✅ Pricing structure is mathematically correct');
      console.log('✅ Calculator will now show proper 20% mezzanine discount');
    } else {
      console.log('\n❌ REVERSE ENGINEERING FAILED!');
      console.log('Some mezzanine rates are not exactly 20% lower');
    }

  } catch (error) {
    console.error('❌ Error during reverse engineering:', error);
  }
}

reverseEngineerPricing();

