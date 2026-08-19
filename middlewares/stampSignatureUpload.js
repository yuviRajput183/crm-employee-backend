import multer from "multer";
import path from "path";

const stampSignStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "stampAndSign") {
      cb(null, "uploads/stamps/");
    }
  },

  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);
  },
});

export const uploadStampAndSign = multer({
  storage: stampSignStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("stampAndSign");