import multer from "multer";
import path from "path";

const stampSignStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "stamp") {
      cb(null, "uploads/stamps/");
    } else if (file.fieldname === "sign") {
      cb(null, "uploads/signatures/");
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
}).fields([
  { name: "stamp", maxCount: 1 },
  { name: "sign", maxCount: 1 },
]);