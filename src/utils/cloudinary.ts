import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({
  path: envFile,
});

console.log("Cloudinary Config:", {
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure: true,
});

export default cloudinary;
