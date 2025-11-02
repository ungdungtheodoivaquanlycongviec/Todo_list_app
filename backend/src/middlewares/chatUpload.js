const multer = require('multer');
const { CHAT_CONFIG } = require('../config/environment');
const {
  ALLOWED_FILE_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES
} = require('./upload');

const storage = multer.memoryStorage();

const maxFileSize = CHAT_CONFIG?.maxAttachmentSizeBytes || 26214400;
const maxFiles = CHAT_CONFIG?.maxAttachmentsPerMessage || 5;

const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(
    new Error(
      `File type ${file.mimetype} is not allowed. Allowed: images (${ALLOWED_IMAGE_TYPES.join(', ')}), documents (${ALLOWED_DOCUMENT_TYPES.join(', ')})`
    ),
    false
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: maxFiles
  },
  fileFilter
});

const uploadChatAttachments = upload.array('files', maxFiles);

const handleChatUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Max size: ${Math.floor(maxFileSize / (1024 * 1024))}MB`
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Max ${maxFiles} attachments per message`
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field. Use "files" for attachments'
      });
    }
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Attachment upload failed'
    });
  }

  next();
};

module.exports = {
  uploadChatAttachments,
  handleChatUploadError
};
