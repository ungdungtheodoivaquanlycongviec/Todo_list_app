const cloudinary = require('cloudinary').v2;
const { cloudinary: cloudinaryConfig } = require('./environment');

/**
 * Cloudinary Configuration
 * Setup cloud storage for file uploads
 */

cloudinary.config({
  cloud_name: cloudinaryConfig.cloudName,
  api_key: cloudinaryConfig.apiKey,
  api_secret: cloudinaryConfig.apiSecret,
  secure: true
});

/**
 * Validate Cloudinary configuration
 */
const validateCloudinaryConfig = () => {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
    console.warn('⚠️  Cloudinary configuration is incomplete. File upload features will be disabled.');
    return false;
  }
  console.log('✅ Cloudinary configured successfully');
  return true;
};

// Validate on startup
validateCloudinaryConfig();

module.exports = cloudinary;
