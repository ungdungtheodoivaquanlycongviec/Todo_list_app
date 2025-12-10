const cloudinary = require('../config/cloudinary');
const { isImage, getFileExtension } = require('../middlewares/upload');

/**
 * File Service
 * Xử lý upload, delete files với Cloudinary
 */

/**
 * Decode filename from Latin-1 to UTF-8
 * Multer sometimes encodes filenames as Latin-1 instead of UTF-8
 * This function attempts to fix that encoding issue
 */
function decodeFilename(filename) {
  try {
    // Try to decode as if the string was incorrectly encoded as Latin-1
    // Buffer.from with 'latin1' treats each character as a byte value
    // Then we decode it as UTF-8
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');

    // Check if the decoded string looks valid (contains valid UTF-8 sequences)
    // If the original was already UTF-8, this might produce garbage
    // Simple heuristic: if decoded has fewer replacement characters, use it
    if (decoded && !decoded.includes('\ufffd') && decoded !== filename) {
      return decoded;
    }
    return filename;
  } catch (error) {
    return filename;
  }
}

class FileService {
  /**
   * Upload file to Cloudinary
   * @param {Buffer} fileBuffer - File buffer from multer
   * @param {Object} fileInfo - File info (originalname, mimetype, size)
   * @param {String} folder - Cloudinary folder (tasks/comments)
   * @returns {Promise<Object>} File info with URL
   */
  async uploadFile(fileBuffer, fileInfo, folder = 'tasks') {
    try {
      const { originalname, mimetype, size } = fileInfo;

      // Decode filename to fix UTF-8 encoding issues (Vietnamese, etc.)
      const decodedFilename = decodeFilename(originalname);

      // Determine resource type
      const resourceType = isImage(mimetype) ? 'image' : 'raw';

      // Generate unique filename
      const timestamp = Date.now();
      const extension = getFileExtension(mimetype);
      const sanitizedName = this.sanitizeFilename(originalname, true); // Keep extension
      const publicId = `${folder}/${timestamp}_${sanitizedName}`;

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            public_id: publicId,
            folder: folder,
            // For images: auto-optimize
            ...(resourceType === 'image' && {
              transformation: [
                { quality: 'auto', fetch_format: 'auto' }
              ]
            })
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new Error('Upload to Cloudinary failed'));
            } else {
              resolve({
                originalName: decodedFilename,
                filename: decodedFilename,
                url: result.secure_url,
                size: size,
                mimetype: mimetype,
                publicId: result.public_id,
                resourceType: result.resource_type,
                format: result.format
              });
            }
          }
        );

        // Write buffer to stream
        uploadStream.end(fileBuffer);
      });
    } catch (error) {
      console.error('Upload file error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload multiple files
   * @param {Array} files - Array of multer files
   * @param {String} folder - Cloudinary folder
   * @returns {Promise<Array>} Array of uploaded file info
   */
  async uploadMultipleFiles(files, folder = 'tasks') {
    try {
      const uploadPromises = files.map(file =>
        this.uploadFile(file.buffer, {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }, folder)
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Upload multiple files error:', error);
      throw new Error('Failed to upload files');
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {String} publicId - Cloudinary public ID
   * @param {String} resourceType - 'image' or 'raw'
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true
      });

      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error('Failed to delete file from Cloudinary');
      }

      return result;
    } catch (error) {
      console.error('Delete file error:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Delete multiple files
   * @param {Array} files - Array of file objects with publicId and resourceType
   * @returns {Promise<Array>} Array of delete results
   */
  async deleteMultipleFiles(files) {
    try {
      const deletePromises = files.map(file =>
        this.deleteFile(file.publicId, file.resourceType)
      );

      return await Promise.all(deletePromises);
    } catch (error) {
      console.error('Delete multiple files error:', error);
      throw new Error('Failed to delete files');
    }
  }

  /**
   * Sanitize filename to be URL-safe
   * @param {String} filename - Original filename
   * @param {Boolean} keepExtension - Keep file extension (default: false)
   * @returns {String} Sanitized filename
   */
  sanitizeFilename(filename, keepExtension = false) {
    if (keepExtension) {
      // Extract extension
      const extMatch = filename.match(/\.[^/.]+$/);
      const extension = extMatch ? extMatch[0] : '';
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      // Sanitize name and add extension back
      const sanitizedName = nameWithoutExt
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50); // Limit length

      return sanitizedName + extension.toLowerCase();
    } else {
      // Remove extension
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      // Replace special characters with underscore
      return nameWithoutExt
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50); // Limit length
    }
  }

  /**
   * Get file info from URL
   * @param {String} url - Cloudinary URL
   * @returns {Object} File info
   */
  getFileInfoFromUrl(url) {
    try {
      // Extract public_id from URL
      const matches = url.match(/\/([^/]+)\/([^/]+)\/v\d+\/(.+?)\.(\w+)$/);
      if (!matches) return null;

      return {
        resourceType: matches[1],
        folder: matches[2],
        publicId: `${matches[2]}/${matches[3]}`,
        format: matches[4]
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate file size
   * @param {Number} size - File size in bytes
   * @param {Number} maxSize - Max size in bytes
   * @returns {Boolean}
   */
  validateFileSize(size, maxSize) {
    return size <= maxSize;
  }

  /**
   * Format file size to human readable
   * @param {Number} bytes - Size in bytes
   * @returns {String} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
module.exports = new FileService();
