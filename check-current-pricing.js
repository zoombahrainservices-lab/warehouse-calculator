const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentPricing() {
  console.log('=== CHECKING CURRENT PRICING DATA ===\n');

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

    console.log('CURRENT PRICING RATES:');
    console.log('=====================\n');

    // Group by space type
    const groundFloor = pricingRates.filter(p => p.space_type === 'Ground Floor');
    const mezzanine = pricingRates.filter(p => p.space_type === 'Mezzanine');

    console.log('GROUND FLOOR PRICING:');
    console.log('--------------------');
    groundFloor.forEach(rate => {
      console.log(`${rate.area_band_name} (${rate.area_band_min}-${rate.area_band_max || '∞'} m²)`);
      console.log(`  ${rate.tenure}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
      console.log(`  Daily: ${rate.daily_rate_per_sqm} BHD/m²/day`);
      console.log(`  Min chargeable: ${rate.min_chargeable_area} m²`);
      console.log(`  Package starting: ${rate.package_starting_bhd} BHD`);
      console.log('');
    });

    console.log('MEZZANINE PRICING:');
    console.log('-----------------');
    mezzanine.forEach(rate => {
      console.log(`${rate.area_band_name} (${rate.area_band_min}-${rate.area_band_max || '∞'} m²)`);
      console.log(`  ${rate.tenure}: ${rate.monthly_rate_per_sqm} BHD/m²/month`);
      console.log(`  Daily: ${rate.daily_rate_per_sqm} BHD/m²/day`);
      console.log(`  Min chargeable: ${rate.min_chargeable_area} m²`);
      console.log(`  Package starting: ${rate.package_starting_bhd} BHD`);
      console.log('');
    });

    // Compare Ground Floor vs Mezzanine for same area/tenure
    console.log('PRICING COMPARISON (Ground Floor vs Mezzanine):');
    console.log('===============================================');
    
    const comparison = [];
    groundFloor.forEach(gf => {
      const matchingMezzanine = mezzanine.find(m => 
        m.area_band_name === gf.area_band_name && 
        m.tenure === gf.tenure
      );
      
      if (matchingMezzanine) {
        const discount = ((gf.monthly_rate_per_sqm - matchingMezzanine.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm) * 100;
        comparison.push({
          area: gf.area_band_name,
          tenure: gf.tenure,
          groundFloor: gf.monthly_rate_per_sqm,
          mezzanine: matchingMezzanine.monthly_rate_per_sqm,
          discount: discount.toFixed(1)
        });
      }
    });

    comparison.forEach(comp => {
      console.log(`${comp.area} - ${comp.tenure}:`);
      console.log(`  Ground Floor: ${comp.groundFloor} BHD/m²`);
      console.log(`  Mezzanine: ${comp.mezzanine} BHD/m²`);
      console.log(`  Discount: ${comp.discount}% (should be 20%)`);
      console.log('');
    });

    // Check if mezzanine is actually cheaper
    const isMezzanineCheaper = comparison.every(comp => comp.mezzanine < comp.groundFloor);
    const correctDiscount = comparison.every(comp => Math.abs(parseFloat(comp.discount) - 20) < 1);

    console.log('ANALYSIS:');
    console.log('=========');
    console.log(`Is mezzanine cheaper than ground floor? ${isMezzanineCheaper ? '✅ YES' : '❌ NO'}`);
    console.log(`Is discount approximately 20%? ${correctDiscount ? '✅ YES' : '❌ NO'}`);

    if (!isMezzanineCheaper || !correctDiscount) {
      console.log('\n❌ PRICING ISSUE DETECTED!');
      console.log('Mezzanine should be 20% cheaper than Ground Floor');
      console.log('Need to restore original hardcoded prices');
    } else {
      console.log('\n✅ PRICING IS CORRECT!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCurrentPricing();

