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

const uploadMiddleware = function (fieldNames) {
  return function(req, res, next) {
    let uploadHandler;

    if (typeof fieldNames === 'string') {
      uploadHandler = upload.single(fieldNames);
    } else if (Array.isArray(fieldNames)) {
      uploadHandler = upload.fields(fieldNames.map(name => ({ name, maxCount: 1 })));
    } else {
      return res.status(400).json({ error: "Invalid field names." });
    }

    uploadHandler(req, res, function(err) {
      if (err) {
        console.error('Error in uploadHandler:', err);
        return res.status(500).json({ error: err.message });
      }

      let filesArray = [];
      if(Array.isArray(fieldNames)){
        for(let field of fieldNames){
          if(req.files[field]){
            filesArray = [...filesArray, ...req.files[field]];
          }
        }
      } else if(typeof fieldNames === 'string'){
        if(req.file){
          filesArray = [req.file];
        }
      }

      const uploads = filesArray.map(file => {
        return new Promise((resolve, reject) => {
          const upload = s3Stream.upload({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${Date.now()}-${file.originalname}`,
          });

          upload.on('error', function (error) {
            console.error(error);
            reject(error);
          });

          upload.on('uploaded', function (details) {
            file.location = details.Key;
            resolve();
          });

          // convert buffer to stream
          const fileStream = new Readable();
          fileStream.push(file.buffer);
          fileStream.push(null);

          fileStream.pipe(upload);
        });
      });

      Promise.all(uploads)
        .then(() => next())
        .catch(err => res.status(500).send(err));
    });
  }
};

module.exports = uploadMiddleware;
