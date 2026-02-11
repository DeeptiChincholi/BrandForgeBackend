const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

require("dotenv").config();

/* ✅ Cloudinary Config */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ✅ Storage Setup */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "brandforge_logos", // folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"], // only these
  },
});

/* ✅ Multer Upload Middleware */
const upload = multer({ storage });

module.exports = upload;
