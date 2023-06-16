const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const s3Stream = require('s3-upload-stream')(new AWS.S3());
const { Readable } = require('stream');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images with .jpeg, .jpg, or .png extensions are allowed.'));
  },
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB
  },
});

const uploadMiddleware = function (req, res, next) {
  upload.single('file')(req, res, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const upload = s3Stream.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${Date.now()}-${req.file.originalname}`,
    });

    upload.on('error', function (error) {
      console.error(error);
      return res.status(500).send(error);
    });

    upload.on('uploaded', function (details) {
      req.file.location = details.Location;
      next();
    });

    // convert buffer to stream
    const fileStream = new Readable();
    fileStream.push(req.file.buffer);
    fileStream.push(null);

    fileStream.pipe(upload);
  });
};

module.exports = uploadMiddleware;
