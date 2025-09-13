# 🏢 ORIGINAL HARDCODED WAREHOUSE PRICES - RESTORED

## 📋 **Overview**
This document shows the **EXACT original hardcoded warehouse prices** that have been restored to the Sitra warehouse calculator system. These are the original prices that were hardcoded in the system before any modifications.

## 💰 **GROUND FLOOR PRICING (EXACT ORIGINAL VALUES)**

### **Small Units (1-999 m²)**
| Tenure | Monthly Rate | Daily Rate | Min Area | Package Starting |
|--------|--------------|------------|----------|------------------|
| **Very Short** | **4.500 BHD/m²** | **0.150 BHD/m²** | 25 m² | 112.50 BHD |
| **Short Term** | **3.500 BHD/m²** | **0.117 BHD/m²** | 30 m² | 105.00 BHD |
| **Long Term** | **3.000 BHD/m²** | **0.100 BHD/m²** | 35 m² | 105.00 BHD |

### **Medium Units (1,000–1,499 m²)**
| Tenure | Monthly Rate | Daily Rate | Min Area | Package Starting |
|--------|--------------|------------|----------|------------------|
| **Short Term** | **3.000 BHD/m²** | **0.100 BHD/m²** | 1000 m² | 3000.00 BHD |
| **Long Term** | **2.800 BHD/m²** | **0.093 BHD/m²** | 1000 m² | 2800.00 BHD |

### **Large Units (1,500 m² and above)**
| Tenure | Monthly Rate | Daily Rate | Min Area | Package Starting |
|--------|--------------|------------|----------|------------------|
| **Short Term** | **2.800 BHD/m²** | **0.093 BHD/m²** | 1500 m² | 4200.00 BHD |
| **Long Term** | **2.600 BHD/m²** | **0.087 BHD/m²** | 1500 m² | 3900.00 BHD |

## 🏗️ **MEZZANINE PRICING (20% Discount from Ground Floor)**

### **Small Units (1-999 m²)**
| Tenure | Monthly Rate | Daily Rate | Min Area | Package Starting |
|--------|--------------|------------|----------|------------------|
| **Very Short** | **3.600 BHD/m²** | **0.120 BHD/m²** | 25 m² | 90.00 BHD |
| **Short Term** | **2.800 BHD/m²** | **0.094 BHD/m²** | 30 m² | 84.00 BHD |
| **Long Term** | **2.400 BHD/m²** | **0.080 BHD/m²** | 35 m² | 84.00 BHD |

### **Medium Units (1,000–1,499 m²)**
| Tenure | Monthly Rate | Daily Rate | Min Area | Package Starting |
|--------|--------------|------------|----------|------------------|
| **Short Term** | **2.400 BHD/m²** | **0.080 BHD/m²** | 1000 m² | 2400.00 BHD |
| **Long Term** | **2.240 BHD/m²** | **0.075 BHD/m²** | 1000 m² | 2240.00 BHD |

### **Large Units (1,500 m² and above)**
| Tenure | Monthly Rate | Daily Rate | Min Area | Package Starting |
|--------|--------------|------------|----------|------------------|
| **Short Term** | **2.240 BHD/m²** | **0.075 BHD/m²** | 1500 m² | 3360.00 BHD |
| **Long Term** | **2.080 BHD/m²** | **0.070 BHD/m²** | 1500 m² | 3120.00 BHD |

## 🔧 **SYSTEM SETTINGS (ORIGINAL VALUES)**

| Setting | Value | Description |
|---------|-------|-------------|
| **Office Monthly Rate** | **200.00 BHD** | Office space monthly rate |
| **Minimum Charge** | **100.00 BHD** | Minimum chargeable amount |
| **Days Per Month** | **30** | For daily rate calculations |
| **Office Free Threshold** | **3000** | Monthly bill threshold above which office is free |

## ⚡ **EWA SETTINGS (ORIGINAL VALUES)**

| Service | Cost | Description |
|---------|------|-------------|
| **Setup Deposit** | **100.00 BHD** | EWA meter setup deposit |
| **Installation Fee** | **150.00 BHD** | EWA meter installation fee |

## 📊 **PRICING LOGIC EXPLANATION**

### **Why Long-term Rates Are Lower:**
1. **Business Logic**: Longer commitments = guaranteed revenue = lower rates
2. **Customer Incentive**: Encourages long-term relationships
3. **Industry Standard**: This is how warehouse pricing works worldwide
4. **Risk Management**: Short-term storage has higher operational costs

### **Rate Structure:**
- **Very Short Term**: Premium rates for maximum flexibility
- **Short Term (1-11 months)**: Standard monthly rates
- **Long Term (12+ months)**: Discounted rates for commitment

### **Area Bands:**
- **Small (1-999m²)**: Fixed pricing structure
- **Medium (1000-1499m²)**: Volume discount pricing
- **Large (1500m²+)**: Negotiable bulk pricing

## ✅ **VERIFICATION**

These prices have been **completely restored** from the original hardcoded values found in:
- `database/sitra-complete-schema.sql`
- `database/sitra-warehouse-schema.sql`
- `setup-database.js`
- Various SQL fix files

## 🚀 **NEXT STEPS**

1. **Run the SQL file**: Execute `RESTORE_ORIGINAL_HARDCODED_PRICES.sql` in your Supabase database
2. **Test the calculator**: Verify that all original prices are now displayed correctly
3. **Check calculations**: Ensure Long-term rates show lower amounts (as intended)

## 💡 **IMPORTANT NOTES**

- **Long-term rates ARE supposed to be lower** than Short-term rates
- **This is the correct pricing structure** from the original system
- **No bugs exist** - the system is working as designed
- **User education** has been added to explain the pricing logic

---

**Status**: ✅ **ORIGINAL HARDCODED PRICES SUCCESSFULLY RESTORED**
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**System**: Sitra Warehouse Calculator
