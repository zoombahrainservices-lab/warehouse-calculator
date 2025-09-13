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

// DEFINITIVE 20% MEZZANINE DISCOUNT STRUCTURE
// Based on reverse engineering of the original hardcoded pricing
const definitivePricing = {
  groundFloor: [
    // Small units (1-999 m²) - Base rates
    { tenure: 'Short', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 3.500, daily_rate_per_sqm: 0.117, min_chargeable_area: 30, package_starting_bhd: 105.00 },
    { tenure: 'Long', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 3.000, daily_rate_per_sqm: 0.100, min_chargeable_area: 35, package_starting_bhd: 105.00 },
    { tenure: 'Very Short', area_band_name: 'Very Short Special', area_band_min: 1, area_band_max: 999, monthly_rate_per_sqm: 4.500, daily_rate_per_sqm: 0.150, min_chargeable_area: 25, package_starting_bhd: 112.50 },
    
    // 1,000–1,499 m² - Base rates
    { tenure: 'Short', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, monthly_rate_per_sqm: 3.000, daily_rate_per_sqm: 0.100, min_chargeable_area: 1000, package_starting_bhd: 3000.00 },
    { tenure: 'Long', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, min_chargeable_area: 1000, package_starting_bhd: 2800.00 },
    
    // 1,500 m² and above - Base rates
    { tenure: 'Short', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, min_chargeable_area: 1500, package_starting_bhd: 4200.00 },
    { tenure: 'Long', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, monthly_rate_per_sqm: 2.600, daily_rate_per_sqm: 0.087, min_chargeable_area: 1500, package_starting_bhd: 3900.00 }
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

async function applyDefinitive20PercentFix() {
  console.log('=== APPLYING DEFINITIVE 20% MEZZANINE DISCOUNT RULE ===\n');

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
    const mezzanineRates = calculateMezzanineRates(definitivePricing.groundFloor);

    // 3. Prepare all pricing data for insertion
    const allPricingData = [
      // Ground Floor rates
      ...definitivePricing.groundFloor.map(rate => ({
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
    console.log('📊 Inserting definitive pricing with 20% mezzanine discount...');
    const { data: insertedRates, error: insertError } = await supabase
      .from('pricing_rates')
      .insert(allPricingData)
      .select();

    if (insertError) {
      console.error('Error inserting pricing rates:', insertError);
      return;
    }

    console.log(`✅ Successfully inserted ${insertedRates?.length || 0} pricing rates`);

    // 5. Verify the 20% discount across ALL terms
    console.log('\n🔍 Verifying 20% discount across ALL leasing terms...');
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

    console.log('\n📊 PRICING COMPARISON WITH 20% DISCOUNT VERIFICATION:');
    console.log('=====================================================');

    let allCorrect = true;
    let totalComparisons = 0;
    let correctComparisons = 0;

    groundFloor.forEach(gf => {
      const matchingMezzanine = mezzanine.find(m => 
        m.area_band_name === gf.area_band_name && 
        m.tenure === gf.tenure
      );
      
      if (matchingMezzanine) {
        totalComparisons++;
        
        // Calculate actual discount percentage
        const actualDiscount = ((gf.monthly_rate_per_sqm - matchingMezzanine.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm) * 100;
        
        // Calculate expected mezzanine rate (20% lower)
        const expectedMezzanineRate = Math.round(gf.monthly_rate_per_sqm * 0.8 * 1000) / 1000;
        
        // Check if the discount is exactly 20% (within 0.1% tolerance)
        const isDiscountCorrect = Math.abs(actualDiscount - 20) < 0.1;
        
        // Check if the mezzanine rate matches the expected rate
        const isRateCorrect = Math.abs(matchingMezzanine.monthly_rate_per_sqm - expectedMezzanineRate) < 0.001;
        
        const isCorrect = isDiscountCorrect && isRateCorrect;
        if (isCorrect) correctComparisons++;
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

    // 6. Show pricing structure by leasing term
    console.log('📋 PRICING STRUCTURE BY LEASING TERM:');
    console.log('=====================================');

    // Short Term
    console.log('\n🕐 SHORT TERM PRICING (< 12 months):');
    const shortTermRates = verifyRates?.filter(r => r.tenure === 'Short') || [];
    shortTermRates.forEach(rate => {
      console.log(`  ${rate.space_type} - ${rate.area_band_name}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
    });

    // Long Term
    console.log('\n📅 LONG TERM PRICING (12+ months):');
    const longTermRates = verifyRates?.filter(r => r.tenure === 'Long') || [];
    longTermRates.forEach(rate => {
      console.log(`  ${rate.space_type} - ${rate.area_band_name}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
    });

    // Very Short Term
    console.log('\n⚡ VERY SHORT TERM PRICING (Special rates):');
    const veryShortTermRates = verifyRates?.filter(r => r.tenure === 'Very Short') || [];
    veryShortTermRates.forEach(rate => {
      console.log(`  ${rate.space_type} - ${rate.area_band_name}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
    });

    // 7. Example calculations for 100m² (as requested)
    console.log('\n🧮 EXAMPLE CALCULATIONS FOR 100m²:');
    console.log('===================================');

    // Short Term (6 months)
    console.log('\n📊 SHORT TERM (6 months) - 100m²:');
    console.log('  Ground Floor: 100m² × 3.500 BHD/m² × 6 months = 2,100 BHD total (350 BHD/month)');
    console.log('  Mezzanine: 100m² × 2.800 BHD/m² × 6 months = 1,680 BHD total (280 BHD/month)');
    console.log('  Discount: 2,100 - 1,680 = 420 BHD (20% savings)');

    // Long Term (12 months)
    console.log('\n📊 LONG TERM (12 months) - 100m²:');
    console.log('  Ground Floor: 100m² × 3.000 BHD/m² × 12 months = 3,600 BHD total (300 BHD/month)');
    console.log('  Mezzanine: 100m² × 2.400 BHD/m² × 12 months = 2,880 BHD total (240 BHD/month)');
    console.log('  Discount: 3,600 - 2,880 = 720 BHD (20% savings)');

    // Very Short Term (7 days)
    console.log('\n📊 VERY SHORT TERM (7 days) - 100m²:');
    console.log('  Ground Floor: 100m² × 0.150 BHD/m² × 7 days = 105 BHD total (15 BHD/day)');
    console.log('  Mezzanine: 100m² × 0.120 BHD/m² × 7 days = 84 BHD total (12 BHD/day)');
    console.log('  Discount: 105 - 84 = 21 BHD (20% savings)');

    // 8. Final summary
    console.log('\n📋 FINAL VERIFICATION SUMMARY:');
    console.log('==============================');
    console.log(`Total pricing rates: ${verifyRates?.length || 0}`);
    console.log(`Ground Floor rates: ${groundFloor.length}`);
    console.log(`Mezzanine rates: ${mezzanine.length}`);
    console.log(`Short term rates: ${shortTermRates.length}`);
    console.log(`Long term rates: ${longTermRates.length}`);
    console.log(`Very short term rates: ${veryShortTermRates.length}`);
    console.log(`Total comparisons: ${totalComparisons}`);
    console.log(`Correct comparisons: ${correctComparisons}`);
    console.log(`Overall accuracy: ${((correctComparisons / totalComparisons) * 100).toFixed(1)}%`);
    console.log(`All mezzanine rates are 20% lower: ${allCorrect ? '✅ YES' : '❌ NO'}`);

    if (allCorrect) {
      console.log('\n🎉 DEFINITIVE 20% MEZZANINE DISCOUNT RULE APPLIED SUCCESSFULLY!');
      console.log('✅ All three leasing terms (Short, Long, Very Short) follow the 20% rule');
      console.log('✅ Pricing structure is mathematically correct and consistent');
      console.log('✅ Your warehouse calculator will now show proper 20% mezzanine discount');
      console.log('\n💡 Test these scenarios in your calculator:');
      console.log('   • 100m², Short term: Ground Floor vs Mezzanine');
      console.log('   • 100m², Long term: Ground Floor vs Mezzanine');
      console.log('   • 100m², Very Short term: Ground Floor vs Mezzanine');
    } else {
      console.log('\n❌ DEFINITIVE FIX FAILED!');
      console.log('Some mezzanine rates are not exactly 20% lower');
    }

  } catch (error) {
    console.error('❌ Error applying definitive 20% fix:', error);
  }
}

applyDefinitive20PercentFix();

