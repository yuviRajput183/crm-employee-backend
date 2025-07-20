import multer from "multer";
import path from "path";

const sliderStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/sliders/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-slider-${file.fieldname}${path.extname(file.originalname)}`);
  },
});

export const sliderUpload = multer({
  storage: sliderStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 5 MB limit
}).fields([
  { name: "slider1", maxCount: 1 },
  { name: "slider2", maxCount: 1 },
  { name: "slider3", maxCount: 1 },
  { name: "slider4", maxCount: 1 },
  { name: "slider5", maxCount: 1 },
]);
