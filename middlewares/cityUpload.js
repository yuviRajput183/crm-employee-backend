import multer from "multer";
import path from "path";

// used to access the city and state name data from excel file.

const cityStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/cities/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-city-${file.originalname}`);
  },
});

export const uploadCity = multer({
  storage: cityStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
}).single('file');  
