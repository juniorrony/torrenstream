#!/usr/bin/env node

/**
 * Script to create the initial admin user
 * Usage: node scripts/create-admin-user.js
 */

import Database from './database.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

async function createAdminUser() {
  const db = new Database();
  
  try {
    console.log('🔧 Initializing database...');
    await db.init();
    
    // Default admin credentials
    const adminData = {
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@torrentstream.local',
      password: process.env.ADMIN_PASSWORD || 'TorrentStream2024!',
      role: 'admin',
      status: 'active',
      emailVerified: true
    };
    
    // Check if admin already exists
    const existingAdmin = await db.getUserByEmail(adminData.email);
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email:', adminData.email);
      console.log('💡 To reset admin password, delete the user first or use a different email');
      return;
    }
    
    const existingUsername = await db.getUserByUsername(adminData.username);
    if (existingUsername) {
      console.log('⚠️  User already exists with username:', adminData.username);
      return;
    }
    
    console.log('🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(adminData.password, SALT_ROUNDS);
    
    console.log('👤 Creating admin user...');
    const result = await db.createUser({
      username: adminData.username,
      email: adminData.email,
      passwordHash,
      role: adminData.role,
      status: adminData.status,
      emailVerified: adminData.emailVerified
    });
    
    // Create admin profile
    console.log('📝 Creating admin profile...');
    await db.createUserProfile(result.id, {
      displayName: 'Administrator',
      bio: 'System Administrator',
      preferences: {
        theme: 'dark',
        notifications: true,
        defaultQuality: 'auto'
      },
      storageQuotaGb: 1000 // 1TB for admin
    });
    
    // Log the admin creation
    await db.logAction({
      userId: result.id,
      action: 'admin_user_created',
      resourceType: 'user',
      resourceId: result.id.toString(),
      details: {
        username: adminData.username,
        email: adminData.email,
        createdBy: 'system_script'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'AdminCreationScript/1.0'
    });
    
    console.log('\n✅ Admin user created successfully!');
    console.log('═══════════════════════════════════════');
    console.log(`👤 Username: ${adminData.username}`);
    console.log(`📧 Email: ${adminData.email}`);
    console.log(`🔑 Password: ${adminData.password}`);
    console.log(`🎭 Role: ${adminData.role}`);
    console.log(`📊 User ID: ${result.id}`);
    console.log('═══════════════════════════════════════');
    console.log('\n🚨 IMPORTANT SECURITY NOTES:');
    console.log('1. Change the default password immediately after first login');
    console.log('2. Store these credentials securely');
    console.log('3. Consider setting up environment variables for production');
    console.log('\n💡 Environment variables for production:');
    console.log('   ADMIN_USERNAME=your_admin_username');
    console.log('   ADMIN_EMAIL=admin@yourdomain.com');
    console.log('   ADMIN_PASSWORD=your_secure_password');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Additional utility functions
async function resetAdminPassword() {
  const db = new Database();
  
  try {
    await db.init();
    
    const email = process.argv[3] || process.env.ADMIN_EMAIL || 'admin@torrentstream.local';
    const newPassword = process.argv[4] || crypto.randomBytes(16).toString('hex');
    
    const user = await db.getUserByEmail(email);
    if (!user) {
      console.log('❌ Admin user not found with email:', email);
      return;
    }
    
    console.log('🔒 Generating new password hash...');
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await db.updateUser(user.id, {
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    });
    
    // Log the password reset
    await db.logAction({
      userId: user.id,
      action: 'admin_password_reset',
      resourceType: 'user',
      resourceId: user.id.toString(),
      details: {
        email: user.email,
        resetBy: 'system_script'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'AdminResetScript/1.0'
    });
    
    console.log('\n✅ Admin password reset successfully!');
    console.log('═══════════════════════════════════════');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log('═══════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

async function listUsers() {
  const db = new Database();
  
  try {
    await db.init();
    
    const users = await db.getAllUsers();
    
    console.log('\n📋 All Users:');
    console.log('═══════════════════════════════════════');
    
    if (users.length === 0) {
      console.log('No users found.');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id} | ${user.username} | ${user.email} | ${user.role} | ${user.status}`);
      });
    }
    
    console.log(`\nTotal users: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'create':
  case undefined:
    createAdminUser();
    break;
  case 'reset':
    resetAdminPassword();
    break;
  case 'list':
    listUsers();
    break;
  case 'help':
    console.log(`
📚 Admin User Management Script

Usage:
  node scripts/create-admin-user.js [command] [options]

Commands:
  create (default)    Create initial admin user
  reset [email] [pwd] Reset admin password
  list                List all users
  help                Show this help

Examples:
  node scripts/create-admin-user.js
  node scripts/create-admin-user.js reset admin@domain.com newPassword123
  node scripts/create-admin-user.js list

Environment Variables:
  ADMIN_USERNAME      Default admin username (default: admin)
  ADMIN_EMAIL         Default admin email (default: admin@torrentstream.local)
  ADMIN_PASSWORD      Default admin password (default: TorrentStream2024!)
`);
    break;
  default:
    console.log(`❌ Unknown command: ${command}`);
    console.log('Use "help" for available commands');
    process.exit(1);
}