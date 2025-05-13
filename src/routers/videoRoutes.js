const express = require("express");
const multer = require("multer");
const fs = require('fs');
const cloudinary = require("cloudinary").v2;
const path = require('path');
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer and Cloudinary Storage Configuration
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "videos", // Folder in Cloudinary to store videos
        resource_type: "video", // Specify that this is a video
    },
});

const upload = multer({ storage });

// Multer and Cloudinary Storage Configuration for CV
const CVstorage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdir('./uploads/', (err) => {
            cb(null, './uploads/');
        });
        // cb(null, 'uploads/'); // Destination folder for the file
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname); // Unique filename
    }
});

const uploadCv = multer({ storage: CVstorage })


// Multer and Cloudinary Storage Configuration
const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "images", // Folder in Cloudinary to store videos
        allowed_formats: ["jpg", "jpeg", "png"],
        resource_type: "image",
    },
});

const uploadImage = multer({ imageStorage });

// Upload Video Endpoint
router.post("/upload", upload.single("video"), async (req, res) => {
    try {
        const file = req.file;
        console.log("==== file", file)
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Log the full file object to understand the structure
        console.log("Uploaded file details:", file);

        res.status(200).json({
            message: "Video uploaded successfully",
            file: req.file,
        });
    } catch (error) {
        console.error("Error uploading video:", error);
        res.status(500).json({ message: "Error uploading video", error });
    }
});

// Upload image Endpoint
router.post("/upload-image", uploadImage.single("image"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "No image uploaded" });
        }

        // Upload the file buffer to Cloudinary
        const result = await cloudinary.uploader.upload_stream(
            { resource_type: "image" },
            (error, result) => {
                if (error) {
                    return res.status(500).json({ message: "Error uploading image", error });
                }

                // Send response with the URL of the uploaded image
                return res.status(200).json({
                    message: "Image uploaded successfully",
                    url: result.secure_url,
                });
            }
        );

        // Pipe the file buffer to Cloudinary's upload stream
        result.end(file.buffer);
    } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).json({ message: "Error uploading image", error });
    }
});

// Upload API
router.post("/upload-cv", uploadCv.single('file'), async (req, res) => {
    console.log("=== req", req.file)
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    try {
        const filePath = req.file.path;
        console.log("file path", filePath)

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'raw',   // Very important for PDF
            folder: 'cv_files',     // Optional: organize under a folder
            public_id: path.parse(req.file.originalname).name, // Name without extension
        });

        res.json({
            success: true,
            url: result.secure_url,
        });
    } catch (error) {
        console.log("Error uploading cv:", error);
        console.error(error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});


module.exports = router;
