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

async function verifyPricingAccuracy() {
  console.log('=== VERIFYING PRICING ACCURACY - 20% MEZZANINE DISCOUNT ===\n');

  try {
    // Get all pricing rates
    const { data: pricingRates, error } = await supabase
      .from('pricing_rates')
      .select('*')
      .order('space_type', { ascending: true })
      .order('area_band_min', { ascending: true })
      .order('tenure', { ascending: true });

    if (error) {
      console.error('Error fetching pricing rates:', error);
      return;
    }

    if (!pricingRates || pricingRates.length === 0) {
      console.log('❌ No pricing rates found in database!');
      console.log('Please run the reverse engineering script first.');
      return;
    }

    console.log(`📊 Found ${pricingRates.length} pricing rates in database\n`);

    // Group by space type
    const groundFloor = pricingRates.filter(p => p.space_type === 'Ground Floor');
    const mezzanine = pricingRates.filter(p => p.space_type === 'Mezzanine');

    console.log('🏢 GROUND FLOOR PRICING:');
    console.log('========================');
    groundFloor.forEach(rate => {
      console.log(`  ${rate.area_band_name} (${rate.area_band_min}-${rate.area_band_max || '∞'} m²)`);
      console.log(`    ${rate.tenure}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
      console.log(`    Daily: ${rate.daily_rate_per_sqm} BHD/m²/day`);
      console.log(`    Min chargeable: ${rate.min_chargeable_area} m²`);
      console.log('');
    });

    console.log('🏗️ MEZZANINE PRICING:');
    console.log('=====================');
    mezzanine.forEach(rate => {
      console.log(`  ${rate.area_band_name} (${rate.area_band_min}-${rate.area_band_max || '∞'} m²)`);
      console.log(`    ${rate.tenure}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
      console.log(`    Daily: ${rate.daily_rate_per_sqm} BHD/m²/day`);
      console.log(`    Min chargeable: ${rate.min_chargeable_area} m²`);
      console.log('');
    });

    // Verify 20% discount
    console.log('🔍 DISCOUNT VERIFICATION:');
    console.log('=========================');
    
    const verificationResults = [];
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

        const result = {
          area: gf.area_band_name,
          tenure: gf.tenure,
          groundFloor: gf.monthly_rate_per_sqm,
          mezzanine: matchingMezzanine.monthly_rate_per_sqm,
          actualDiscount: actualDiscount,
          expectedMezzanine: expectedMezzanineRate,
          isCorrect: isCorrect
        };

        verificationResults.push(result);

        console.log(`${gf.area_band_name} - ${gf.tenure}:`);
        console.log(`  Ground Floor: ${gf.monthly_rate_per_sqm} BHD/m²`);
        console.log(`  Mezzanine: ${matchingMezzanine.monthly_rate_per_sqm} BHD/m²`);
        console.log(`  Actual Discount: ${actualDiscount.toFixed(1)}%`);
        console.log(`  Expected Mezzanine: ${expectedMezzanineRate} BHD/m²`);
        console.log(`  Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
        console.log('');
      }
    });

    // Summary
    console.log('📋 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`Total comparisons: ${totalComparisons}`);
    console.log(`Correct comparisons: ${correctComparisons}`);
    console.log(`Incorrect comparisons: ${totalComparisons - correctComparisons}`);
    console.log(`Overall accuracy: ${((correctComparisons / totalComparisons) * 100).toFixed(1)}%`);
    console.log(`All mezzanine rates are 20% lower: ${allCorrect ? '✅ YES' : '❌ NO'}`);

    // Show any incorrect rates
    const incorrectRates = verificationResults.filter(r => !r.isCorrect);
    if (incorrectRates.length > 0) {
      console.log('\n❌ INCORRECT RATES FOUND:');
      console.log('=========================');
      incorrectRates.forEach(rate => {
        console.log(`${rate.area} - ${rate.tenure}:`);
        console.log(`  Current mezzanine: ${rate.mezzanine} BHD/m²`);
        console.log(`  Should be: ${rate.expectedMezzanine} BHD/m²`);
        console.log(`  Current discount: ${rate.actualDiscount.toFixed(1)}%`);
        console.log(`  Should be: 20.0%`);
        console.log('');
      });
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    if (allCorrect) {
      console.log('✅ All pricing is correct! No action needed.');
      console.log('✅ Your warehouse calculator will show proper 20% mezzanine discount.');
    } else {
      console.log('❌ Pricing needs to be corrected.');
      console.log('🔧 Run the reverse engineering script to fix the pricing:');
      console.log('   node reverse-engineer-pricing.js');
      console.log('   OR run the SQL script: REVERSE_ENGINEER_PRICING.sql');
    }

    // Test scenarios
    console.log('\n🧪 TEST SCENARIOS:');
    console.log('==================');
    console.log('Test these scenarios in your calculator:');
    console.log('1. 100m², Short term, Ground Floor vs Mezzanine');
    console.log('2. 1000m², Long term, Ground Floor vs Mezzanine');
    console.log('3. 1500m², Short term, Ground Floor vs Mezzanine');
    console.log('4. 50m², Very Short term, Ground Floor vs Mezzanine');
    console.log('');
    console.log('Expected results: Mezzanine should always be 20% cheaper');

  } catch (error) {
    console.error('❌ Error verifying pricing:', error);
  }
}

verifyPricingAccuracy();

