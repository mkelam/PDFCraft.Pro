-- pdflab.pro Plan Limits Trigger
-- Automatically set conversion limits when plan changes

DELIMITER $$

-- Trigger to update conversion limits when plan changes
CREATE TRIGGER IF NOT EXISTS update_plan_limits_on_plan_change
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    -- Only update if plan has changed
    IF NEW.plan != OLD.plan THEN
        CASE NEW.plan
            WHEN 'free' THEN
                SET NEW.conversions_limit = 3;
            WHEN 'starter' THEN
                SET NEW.conversions_limit = 100;
            WHEN 'pro' THEN
                SET NEW.conversions_limit = -1;  -- Unlimited
            WHEN 'enterprise' THEN
                SET NEW.conversions_limit = -1;  -- Unlimited
        END CASE;
    END IF;
END$$

DELIMITER ;

-- One-time update: Fix any existing users with incorrect limits
UPDATE users SET conversions_limit = 3 WHERE plan = 'free' AND conversions_limit != 3;
UPDATE users SET conversions_limit = 100 WHERE plan = 'starter' AND conversions_limit != 100;
UPDATE users SET conversions_limit = -1 WHERE plan = 'pro' AND conversions_limit != -1;
UPDATE users SET conversions_limit = -1 WHERE plan = 'enterprise' AND conversions_limit != -1;
