import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all families for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT 
         f.id, f.name, f.description, f.created_at, f.updated_at,
         u.full_name as created_by_name, u.email as created_by_email,
         fm.role, fm.status, fm.joined_at,
         COUNT(DISTINCT fm2.id) FILTER (WHERE fm2.status = 'active') as member_count
       FROM families f
       INNER JOIN family_members fm ON f.id = fm.family_id
       LEFT JOIN users u ON f.created_by = u.id
       LEFT JOIN family_members fm2 ON f.id = fm2.family_id
       WHERE fm.user_id = $1
       GROUP BY f.id, f.name, f.description, f.created_at, f.updated_at,
                u.full_name, u.email, fm.role, fm.status, fm.joined_at
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ families: rows });
  } catch (error) {
    console.error('Error fetching families:', error);
    res.status(500).json({ error: 'Failed to fetch families' });
  }
});

// Get specific family details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is member
    const { rows: memberCheck } = await pool.query(
      'SELECT role, status FROM family_members WHERE family_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this family' });
    }

    // Get family details
    const { rows } = await pool.query(
      `SELECT 
         f.id, f.name, f.description, f.created_at, f.updated_at,
         u.full_name as created_by_name, u.email as created_by_email
       FROM families f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    // Get members
    const { rows: members } = await pool.query(
      `SELECT 
         fm.id, fm.user_id, fm.role, fm.status, fm.joined_at, fm.invited_at,
         u.full_name, u.email,
         inviter.full_name as invited_by_name
       FROM family_members fm
       INNER JOIN users u ON fm.user_id = u.id
       LEFT JOIN users inviter ON fm.invited_by = inviter.id
       WHERE fm.family_id = $1
       ORDER BY 
         CASE fm.role 
           WHEN 'head' THEN 1 
           WHEN 'manager' THEN 2 
           WHEN 'contributor' THEN 3 
           ELSE 4 
         END,
         fm.joined_at ASC`,
      [id]
    );

    res.json({
      family: rows[0],
      members,
      currentUserRole: memberCheck[0].role,
      currentUserStatus: memberCheck[0].status,
      currentUserId: userId
    });
  } catch (error) {
    console.error('Error fetching family details:', error);
    res.status(500).json({ error: 'Failed to fetch family details' });
  }
});

// Create new family
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Family name is required' });
    }

    await client.query('BEGIN');

    // Create family
    const { rows: familyRows } = await client.query(
      `INSERT INTO families (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), description?.trim() || null, userId]
    );

    const family = familyRows[0];

    // Add creator as owner
    await client.query(
      `INSERT INTO family_members (family_id, user_id, role, status, joined_at)
       VALUES ($1, $2, 'head', 'active', CURRENT_TIMESTAMP)`,
      [family.id, userId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Family created successfully',
      family
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating family:', error);
    res.status(500).json({ error: 'Failed to create family' });
  } finally {
    client.release();
  }
});

// Update family
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description } = req.body;

    // Check if user is owner or admin
    const { rows: memberCheck } = await pool.query(
      'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberCheck.length === 0 || !['head', 'manager'].includes(memberCheck[0].role)) {
      return res.status(403).json({ error: 'Only owners and admins can update family details' });
    }

    const { rows } = await pool.query(
      `UPDATE families 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [name?.trim(), description?.trim(), id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    res.json({
      message: 'Family updated successfully',
      family: rows[0]
    });
  } catch (error) {
    console.error('Error updating family:', error);
    res.status(500).json({ error: 'Failed to update family' });
  }
});

// Delete family (owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is owner
    const { rows: memberCheck } = await pool.query(
      'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberCheck.length === 0 || memberCheck[0].role !== 'head') {
      return res.status(403).json({ error: 'Only the owner can delete the family' });
    }

    await pool.query('DELETE FROM families WHERE id = $1', [id]);

    res.json({ message: 'Family deleted successfully' });
  } catch (error) {
    console.error('Error deleting family:', error);
    res.status(500).json({ error: 'Failed to delete family' });
  }
});

// Invite member to family
router.post('/:id/invite', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { email, role = 'contributor' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!['contributor', 'manager', 'observer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if current user can invite
    const { rows: memberCheck } = await pool.query(
      'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberCheck.length === 0 || !['head', 'manager'].includes(memberCheck[0].role)) {
      return res.status(403).json({ error: 'Only owners and admins can invite members' });
    }

    await client.query('BEGIN');

    // Find user by email
    const { rows: userRows } = await client.query(
      'SELECT id, email, full_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found with this email' });
    }

    const invitedUser = userRows[0];

    // Check if already a member
    const { rows: existingMember } = await client.query(
      'SELECT status FROM family_members WHERE family_id = $1 AND user_id = $2',
      [id, invitedUser.id]
    );

    if (existingMember.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: existingMember[0].status === 'pending' 
          ? 'User already has a pending invitation'
          : 'User is already a member'
      });
    }

    // Create invitation
    await client.query(
      `INSERT INTO family_members (family_id, user_id, role, invited_by, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [id, invitedUser.id, role, userId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitedUser: {
        id: invitedUser.id,
        email: invitedUser.email,
        full_name: invitedUser.full_name
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inviting member:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  } finally {
    client.release();
  }
});

// Accept/Decline invitation
router.post('/:id/invitation/:action', authMiddleware, async (req, res) => {
  try {
    const { id, action } = req.params;
    const userId = req.user.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Check if invitation exists
    const { rows: inviteCheck } = await pool.query(
      'SELECT * FROM family_members WHERE family_id = $1 AND user_id = $2 AND status = $3',
      [id, userId, 'pending']
    );

    if (inviteCheck.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (action === 'accept') {
      await pool.query(
        `UPDATE family_members 
         SET status = 'active', joined_at = CURRENT_TIMESTAMP
         WHERE family_id = $1 AND user_id = $2`,
        [id, userId]
      );
      res.json({ message: 'Invitation accepted successfully' });
    } else {
      await pool.query(
        'DELETE FROM family_members WHERE family_id = $1 AND user_id = $2',
        [id, userId]
      );
      res.json({ message: 'Invitation declined' });
    }
  } catch (error) {
    console.error('Error handling invitation:', error);
    res.status(500).json({ error: 'Failed to handle invitation' });
  }
});

// Get pending invitations for current user
router.get('/invitations/pending', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT 
         fm.id, fm.family_id, fm.role, fm.invited_at,
         f.name as family_name, f.description as family_description,
         inviter.full_name as invited_by_name, inviter.email as invited_by_email
       FROM family_members fm
       INNER JOIN families f ON fm.family_id = f.id
       LEFT JOIN users inviter ON fm.invited_by = inviter.id
       WHERE fm.user_id = $1 AND fm.status = 'pending'
       ORDER BY fm.invited_at DESC`,
      [userId]
    );

    res.json({ invitations: rows });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Update member role (owner/admin only)
router.put('/:id/members/:memberId/role', authMiddleware, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;
    const { role } = req.body;

    // Validate role
    if (!['head', 'contributor', 'manager', 'observer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current user info
      const { rows: currentUserCheck } = await client.query(
        'SELECT role, id as member_id FROM family_members WHERE family_id = $1 AND user_id = $2',
        [id, userId]
      );

      if (currentUserCheck.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You are not a member of this family' });
      }

      const currentUserRole = currentUserCheck[0].role;
      const currentMemberId = currentUserCheck[0].member_id;

      // Get target member info
      const { rows: targetMemberCheck } = await client.query(
        'SELECT role, user_id FROM family_members WHERE id = $1 AND family_id = $2',
        [memberId, id]
      );

      if (targetMemberCheck.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Member not found' });
      }

      const targetRole = targetMemberCheck[0].role;

      // Define role hierarchy: head(4) > manager(3) > contributor(2) > observer(1)
      const roleHierarchy = { 'head': 4, 'manager': 3, 'contributor': 2, 'observer': 1 };
      
      // Permission check: Can only modify people with lower role
      if (roleHierarchy[currentUserRole] <= roleHierarchy[targetRole]) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You can only modify members with lower roles than yours' });
      }

      // Cannot assign role equal or higher than your own (except head can transfer)
      if (roleHierarchy[role] >= roleHierarchy[currentUserRole] && role !== 'head') {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You cannot assign a role equal to or higher than yours' });
      }

      // Special case: Transferring head role
      if (role === 'head') {
        if (currentUserRole !== 'head') {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Only the current head can transfer this role' });
        }

        // Demote current head to manager
        await client.query(
          'UPDATE family_members SET role = $1 WHERE id = $2',
          ['manager', currentMemberId]
        );

        // Promote target to head
        await client.query(
          'UPDATE family_members SET role = $1 WHERE id = $2',
          ['head', memberId]
        );

        await client.query('COMMIT');
        return res.json({ 
          message: 'Head role transferred successfully. You are now a manager.',
          transferred: true
        });
      }

      // Normal role change
      await client.query(
        'UPDATE family_members SET role = $1 WHERE id = $2',
        [role, memberId]
      );

      await client.query('COMMIT');
      res.json({ message: 'Member role updated successfully' });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// Remove member from family
router.delete('/:id/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;

    // Get current user role
    const { rows: currentUserCheck } = await pool.query(
      'SELECT role, id as current_member_id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (currentUserCheck.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this family' });
    }

    const currentUserRole = currentUserCheck[0].role;
    const currentMemberId = currentUserCheck[0].current_member_id;

    // Get target member
    const { rows: targetMemberCheck } = await pool.query(
      'SELECT role, user_id FROM family_members WHERE id = $1 AND family_id = $2',
      [memberId, id]
    );

    if (targetMemberCheck.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const targetRole = targetMemberCheck[0].role;

    // Role hierarchy
    const roleHierarchy = { 'head': 4, 'manager': 3, 'contributor': 2, 'observer': 1 };

    // Self-removal (Leave family)
    if (currentMemberId === parseInt(memberId)) {
      if (targetRole === 'head') {
        return res.status(403).json({ error: 'Head cannot leave the family. Transfer head role first or delete the family.' });
      }
      await pool.query('DELETE FROM family_members WHERE id = $1', [memberId]);
      return res.json({ message: 'You have left the family', self: true });
    }

    // Permission check: Can only remove people with lower role
    if (roleHierarchy[currentUserRole] <= roleHierarchy[targetRole]) {
      return res.status(403).json({ error: 'You can only remove members with lower roles than yours' });
    }

    await pool.query('DELETE FROM family_members WHERE id = $1', [memberId]);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Generate invite code for family
router.post('/:id/invite-codes', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { expires_in_days, max_uses, role = 'contributor' } = req.body;

    // Validate role
    if (!['manager', 'contributor', 'observer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be manager, contributor, or observer' });
    }

    // Check permission (head or manager can create invite codes)
    const { rows: memberRows } = await pool.query(
      'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2 AND status = $3',
      [id, userId, 'active']
    );

    if (memberRows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this family' });
    }

    const creatorRole = memberRows[0].role;
    if (creatorRole !== 'head' && creatorRole !== 'manager') {
      return res.status(403).json({ error: 'Only heads and managers can create invite codes' });
    }

    // Generate unique invite code (8 characters)
    const crypto = await import('crypto');
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Calculate expiry date (only if expires_in_days is provided)
    let expiresAt = null;
    if (expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expires_in_days));
    }

    console.log('Creating invite code with params:', {
      family_id: id,
      code: inviteCode,
      created_by: userId,
      expires_at: expiresAt,
      max_uses: max_uses,
      role: role
    });

    // Insert invite code with role
    const { rows } = await pool.query(
      `INSERT INTO family_invite_codes 
       (family_id, code, created_by, expires_at, max_uses, uses_count, role)
       VALUES ($1, $2, $3, $4, $5, 0, $6)
       RETURNING *`,
      [id, inviteCode, userId, expiresAt, max_uses, role]
    );

    console.log('Invite code created successfully:', rows[0]);

    res.status(201).json({
      message: 'Invite code created successfully',
      inviteCode: rows[0]
    });
  } catch (error) {
    console.error('Error creating invite code:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    res.status(500).json({ 
      error: 'Failed to create invite code',
      details: error.message // Show error details for debugging
    });
  }
});

// Get all invite codes for a family
router.get('/:id/invite-codes', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is member
    const { rows: memberRows } = await pool.query(
      'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2 AND status = $3',
      [id, userId, 'active']
    );

    if (memberRows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this family' });
    }

    const role = memberRows[0].role;
    if (role !== 'head' && role !== 'manager') {
      return res.status(403).json({ error: 'Only heads and managers can view invite codes' });
    }

    // Get all active invite codes
    const { rows } = await pool.query(
      `SELECT ic.*, u.full_name as created_by_name, u.email as created_by_email
       FROM family_invite_codes ic
       LEFT JOIN users u ON ic.created_by = u.id
       WHERE ic.family_id = $1 AND ic.is_active = true
       ORDER BY ic.created_at DESC`,
      [id]
    );

    res.json({ inviteCodes: rows });
  } catch (error) {
    console.error('Error fetching invite codes:', error);
    res.status(500).json({ error: 'Failed to fetch invite codes' });
  }
});

// Deactivate invite code
router.delete('/:id/invite-codes/:codeId', authMiddleware, async (req, res) => {
  try {
    const { id, codeId } = req.params;
    const userId = req.user.id;

    // Check permission
    const { rows: memberRows } = await pool.query(
      'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2 AND status = $3',
      [id, userId, 'active']
    );

    if (memberRows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this family' });
    }

    const role = memberRows[0].role;
    if (role !== 'head' && role !== 'manager') {
      return res.status(403).json({ error: 'Only heads and managers can deactivate invite codes' });
    }

    // Deactivate code
    await pool.query(
      'UPDATE family_invite_codes SET is_active = false WHERE id = $1 AND family_id = $2',
      [codeId, id]
    );

    res.json({ message: 'Invite code deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating invite code:', error);
    res.status(500).json({ error: 'Failed to deactivate invite code' });
  }
});

// Join family using invite code (public endpoint)
router.post('/join', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { code } = req.body;
    const userId = req.user.id;

    console.log('=== JOIN FAMILY REQUEST ===');
    console.log('User ID:', userId);
    console.log('Invite Code:', code);

    if (!code) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    await client.query('BEGIN');

    // Find invite code
    const { rows: codeRows } = await client.query(
      `SELECT ic.*, f.name as family_name
       FROM family_invite_codes ic
       JOIN families f ON ic.family_id = f.id
       WHERE ic.code = $1 AND ic.is_active = true`,
      [code.toUpperCase()]
    );

    console.log('Code lookup result:', codeRows.length > 0 ? 'Found' : 'Not found');

    if (codeRows.length === 0) {
      await client.query('ROLLBACK');
      console.log('Error: Code not found or inactive');
      return res.status(404).json({ error: 'Invalid or expired invite code' });
    }

    const inviteCode = codeRows[0];
    const assignedRole = inviteCode.role || 'contributor'; // Default to contributor if role is null
    
    console.log('Invite code details:', {
      family_id: inviteCode.family_id,
      family_name: inviteCode.family_name,
      expires_at: inviteCode.expires_at,
      max_uses: inviteCode.max_uses,
      uses_count: inviteCode.uses_count,
      assigned_role: assignedRole
    });

    // Check if code is expired
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      console.log('Error: Code expired at', inviteCode.expires_at);
      return res.status(400).json({ error: 'This invite code has expired' });
    }

    // Check max uses
    if (inviteCode.max_uses && inviteCode.uses_count >= inviteCode.max_uses) {
      await client.query('ROLLBACK');
      console.log('Error: Code reached max uses');
      return res.status(400).json({ error: 'This invite code has reached its maximum uses' });
    }

    // Check if user is already a member
    const { rows: existingMember } = await client.query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [inviteCode.family_id, userId]
    );

    if (existingMember.length > 0) {
      await client.query('ROLLBACK');
      console.log('Error: User already a member');
      return res.status(400).json({ error: 'You are already a member of this family' });
    }

    // Add user to family with role from invite code
    await client.query(
      `INSERT INTO family_members (family_id, user_id, role, status, joined_at)
       VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP)`,
      [inviteCode.family_id, userId, assignedRole]
    );

    // Increment uses count
    await client.query(
      'UPDATE family_invite_codes SET uses_count = uses_count + 1 WHERE id = $1',
      [inviteCode.id]
    );

    await client.query('COMMIT');

    console.log('Success: User joined family');
    res.json({
      message: 'Successfully joined family',
      family: {
        id: inviteCode.family_id,
        name: inviteCode.family_name
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error joining family:', error);
    res.status(500).json({ error: 'Failed to join family' });
  } finally {
    client.release();
  }
});

export default router;
