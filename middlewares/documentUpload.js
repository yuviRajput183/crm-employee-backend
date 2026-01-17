import multer from "multer";
import path from "path";
import fs from "fs";

const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/documents/";
    // Ensure directory exists, create recursively if it doesn't
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-document-${file.originalname}`);
  },
});

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).array('documents');  // should match frontend 'documents' key
