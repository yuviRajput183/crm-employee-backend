import multer from "multer";
import path from "path";

const payoutStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/payouts/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-payout${path.extname(file.originalname)}`);
  },
});

export const payoutUpload = multer({
  storage: payoutStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});
