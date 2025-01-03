// import multer from 'multer';
// import path from 'path';
// // import prisma from '../shared/prisma';
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     // cb(null, path.join( "/var/www/uploads"));
//     cb(null, path.join(process.cwd(), 'uploads'));
//   },
//   filename: async function (req, file, cb) {
//     cb(null, file.originalname);
//   },
// });

// const upload = multer({ storage: storage });

// // upload single image
// const uploadprofileImage = upload.single('profileImage');
// const uploadGalleryImage = upload.array('gallery', 5);

// // upload multiple image
// const uploadmultipeImage = upload.fields([
//   { name: 'gallery', maxCount: 5 },
//   { name: 'vehicleInsuranceImage', maxCount: 1 },
//   { name: 'drivingLicenceImage', maxCount: 1 },
// ]);

// export const fileUploader = {
//   upload,
//   uploadprofileImage,
//   uploadGalleryImage,
//   uploadmultipeImage,
// };

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // cb(null, path.join("/var/www", "uploads"));
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

interface UploadResponse {
  Location: string; // This will store the formatted URL with "https://"
  Bucket: string;
  Key: string;
  ETag?: string;
}
interface UploadResponse {
  Location: string; // This will store the formatted URL with "https://"
  Bucket: string;
  Key: string;
  ETag?: string;
}
const upload = multer({ storage: storage });

// upload single image
// upload single image
const uploadprofileImage = upload.single('profileImage');
const uploadGalleryImage = upload.array('gallery', 5);

// upload multiple image
const uploadmultipeImage = upload.fields([
  { name: 'gallery', maxCount: 5 },
  { name: 'vehicleInsuranceImage', maxCount: 1 },
  { name: 'drivingLicenceImage', maxCount: 1 },
]);

// Configure DigitalOcean Spaces
const s3Client = new S3Client({
  region: 'us-east-1', // Replace with your region if necessary
  endpoint: process.env.DO_SPACE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACE_ACCESS_KEY || '',
    secretAccessKey: process.env.DO_SPACE_SECRET_KEY || '',
  },
});

// Helper function to remove file from local storage
const removeFile = async (filePath: string) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete file: ${filePath}`, error);
  }
};
// Upload file to DigitalOcean Spaces
const uploadToDigitalOcean = async (
  file: Express.Multer.File,
): Promise<UploadResponse> => {
  if (!file) {
    throw new Error('File is required for uploading.');
  }

  try {
    // Ensure the file exists before attempting to upload it
    await fs.access(file.path);

    const Key = `dating/${Date.now()}_${file.originalname}`;
    const uploadParams = {
      Bucket: process.env.DO_SPACE_BUCKET || '',
      Key,
      Body: await fs.readFile(file.path),
      ACL: 'public-read' as ObjectCannedACL,
      ContentType: file.mimetype,
    };

    // Upload file to DigitalOcean Space
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Safely remove the file from local storage after upload
    await removeFile(file.path);

    // Format the URL to include "https://"
    const fileURL = `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/${Key}`;
    return {
      Location: fileURL,
      Bucket: process.env.DO_SPACE_BUCKET || '',
      Key,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
export const fileUploader = {
  upload,
  uploadprofileImage,
  uploadGalleryImage,
  uploadmultipeImage,
  uploadToDigitalOcean,
};
