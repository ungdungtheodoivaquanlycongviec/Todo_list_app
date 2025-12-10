const User = require('../models/User.model');

/**
 * Initialize super admin account
 * Creates super admin if it doesn't exist
 */
const initSuperAdmin = async () => {
  try {
    const superAdminEmail = 'nguyenngochuyenz17012001@gmail.com';
    const superAdminPassword = 'SuperAdmin@2024'; // Default password - should be changed after first login
    
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ 
      email: superAdminEmail,
      role: 'super_admin'
    });
    
    if (existingSuperAdmin) {
      console.log('✅ Super admin already exists');
      return { success: true, message: 'Super admin already exists', user: existingSuperAdmin };
    }
    
    // Create super admin
    const superAdmin = await User.create({
      email: superAdminEmail,
      password: superAdminPassword, // Will be hashed by pre-save middleware
      name: 'Super Admin',
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true
    });
    
    console.log('✅ Super admin created successfully');
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log('   ⚠️  Please change the password after first login!');
    
    return { 
      success: true, 
      message: 'Super admin created successfully',
      user: superAdmin.toSafeObject()
    };
  } catch (error) {
    // If error is due to duplicate email (different role), log it but don't fail
    if (error.code === 11000 && error.keyPattern?.email) {
      console.log('⚠️  User with this email already exists with different role');
      return { success: false, message: 'User with this email already exists' };
    }
    
    console.error('❌ Error initializing super admin:', error.message);
    return { success: false, message: error.message, error };
  }
};

module.exports = { initSuperAdmin };

