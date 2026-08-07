const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      let isPdf = file.mimetype === 'application/pdf';
      let pubId = Date.now() + '-' + Math.round(Math.random() * 1E9);
      if (isPdf) {
        pubId += '.pdf';
      }
      return {
        folder: folderName,
        resource_type: isPdf ? 'raw' : 'auto',
        public_id: pubId,
      };
    },
  });
};

module.exports = { cloudinary, getStorage };
