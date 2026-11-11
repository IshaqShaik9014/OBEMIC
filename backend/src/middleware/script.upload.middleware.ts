import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve('uploads/scripts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

export const scriptUpload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB per file (accommodates large ZIP archives containing hundreds of script images)
    files: 2000 // Supports large examination bundles (150-1000 scans)
  },
  fileFilter: (req, file, cb) => {
    const name = file.originalname.toLowerCase();

    // Silently ignore OS and system metadata files without failing the batch
    if (
      name.includes('ds_store') ||
      name.includes('thumbs.db') ||
      name.endsWith('.ini') ||
      name.startsWith('._') ||
      name === '.gitkeep'
    ) {
      return cb(null, false);
    }

    // Accept all exam scripts, OMR scans, PDFs, images, archives, and docs
    cb(null, true);
  }
});
