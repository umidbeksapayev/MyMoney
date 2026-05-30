-- Add role column to family_invite_codes table
-- This allows invite codes to specify what role new members will get

ALTER TABLE family_invite_codes 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'contributor';

-- Add check constraint to ensure valid roles
ALTER TABLE family_invite_codes
ADD CONSTRAINT family_invite_codes_role_check 
CHECK (role IN ('manager', 'contributor', 'observer'));

-- Update existing codes to have contributor role
UPDATE family_invite_codes 
SET role = 'contributor' 
WHERE role IS NULL;

COMMENT ON COLUMN family_invite_codes.role IS 'Role that will be assigned to users joining via this invite code';

