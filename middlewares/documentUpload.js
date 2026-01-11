import multer from "multer";
import path from "path";

const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/documents/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-document-${file.originalname}`);
  },
});

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).array('documents');  // should match frontend 'documents' key
