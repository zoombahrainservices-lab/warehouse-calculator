-- Create table for occupant cost overrides
-- This allows admins to set custom costs for specific occupants

CREATE TABLE IF NOT EXISTS occupant_cost_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occupant_id UUID NOT NULL REFERENCES warehouse_occupants(id) ON DELETE CASCADE,
    
    -- Custom cost fields
    custom_monthly_cost DECIMAL(10,2),
    custom_total_cost DECIMAL(10,2),
    custom_rate_per_sqm DECIMAL(10,2),
    
    -- Override reason and metadata
    override_reason TEXT,
    notes TEXT,
    
    -- Admin who set the override
    created_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one override per occupant
    UNIQUE(occupant_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_occupant_cost_overrides_occupant_id ON occupant_cost_overrides(occupant_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_occupant_cost_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_occupant_cost_overrides_updated_at
    BEFORE UPDATE ON occupant_cost_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_occupant_cost_overrides_updated_at();

-- Insert some sample overrides for testing
INSERT INTO occupant_cost_overrides (occupant_id, custom_monthly_cost, custom_total_cost, custom_rate_per_sqm, override_reason, created_by)
SELECT 
    wo.id,
    CASE 
        WHEN wo.name = 'JDS' THEN 2000.00  -- Custom higher rate for JDS
        WHEN wo.name = 'charlie odiyan' AND wo.space_occupied = 100 THEN 500.00  -- Custom rate for small space
        ELSE NULL
    END,
    CASE 
        WHEN wo.name = 'JDS' THEN 28000.00  -- Custom total for JDS
        WHEN wo.name = 'charlie odiyan' AND wo.space_occupied = 100 THEN 3500.00  -- Custom total for small space
        ELSE NULL
    END,
    CASE 
        WHEN wo.name = 'JDS' THEN 4.50  -- Custom rate per sqm for JDS
        WHEN wo.name = 'charlie odiyan' AND wo.space_occupied = 100 THEN 5.00  -- Custom rate for small space
        ELSE NULL
    END,
    CASE 
        WHEN wo.name = 'JDS' THEN 'Premium client - negotiated rate'
        WHEN wo.name = 'charlie odiyan' AND wo.space_occupied = 100 THEN 'Special pricing for small space'
        ELSE NULL
    END,
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
FROM warehouse_occupants wo
WHERE (wo.name = 'JDS' OR (wo.name = 'charlie odiyan' AND wo.space_occupied = 100))
ON CONFLICT (occupant_id) DO NOTHING;

-- Show the created overrides
SELECT 
    oco.id,
    wo.name as occupant_name,
    wo.space_occupied,
    oco.custom_monthly_cost,
    oco.custom_total_cost,
    oco.custom_rate_per_sqm,
    oco.override_reason,
    u.name as created_by_name
FROM occupant_cost_overrides oco
JOIN warehouse_occupants wo ON oco.occupant_id = wo.id
LEFT JOIN users u ON oco.created_by = u.id;




