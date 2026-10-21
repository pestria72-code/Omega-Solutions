-- Add a dedicated least-privilege role for POS salespeople.
-- Keep enum alteration separate from permission seeding so PostgreSQL commits
-- the new enum value before another migration references it.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'salesperson';
