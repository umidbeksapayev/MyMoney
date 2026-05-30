/**
 * Migration: Update family member roles
 * Changes: owner->head, admin->manager, member->contributor, viewer->observer
 */

import pool from '../config/database.js';

async function migrateFamilyRoles() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting family roles migration...');
    
    await client.query('BEGIN');
    
    // Drop old CHECK constraint
    console.log('Dropping old role constraint...');
    await client.query(`
      ALTER TABLE family_members 
      DROP CONSTRAINT IF EXISTS family_members_role_check
    `);
    
    // Update role names in family_members table
    console.log('Updating role names in family_members table...');
    
    await client.query(`
      UPDATE family_members 
      SET role = CASE 
        WHEN role = 'owner' THEN 'head'
        WHEN role = 'admin' THEN 'manager'
        WHEN role = 'member' THEN 'contributor'
        WHEN role = 'viewer' THEN 'observer'
        ELSE role
      END
      WHERE role IN ('owner', 'admin', 'member', 'viewer')
    `);
    
    // Add new CHECK constraints
    console.log('Adding new role constraints...');
    await client.query(`
      ALTER TABLE family_members 
      ADD CONSTRAINT family_members_role_check 
      CHECK (role IN ('head', 'manager', 'contributor', 'observer'))
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Family roles migration completed successfully!');
    
    // Show updated counts
    const result = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM family_members 
      GROUP BY role
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Updated role distribution:');
    result.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateFamilyRoles()
  .then(() => {
    console.log('\n✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });
