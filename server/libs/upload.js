const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_MB = 10; // sync กับ _maxFileMb ฝั่ง student_dorm/lib/screen/report_submit_screen.dart

const repairPhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'repair_photos'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        cb(null, safeName);
    }
});

function imageFileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('รองรับเฉพาะไฟล์ JPG, WEBP เท่านั้น'));
    }
    cb(null, true);
}

const uploadRepairPhoto = multer({
    storage: repairPhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

const equipmentPhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'equipment_photos'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        cb(null, safeName);
    }
});

const uploadEquipmentPhoto = multer({
    storage: equipmentPhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

const profilePhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'profile_photos'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        cb(null, safeName);
    }
});

const uploadProfilePhoto = multer({
    storage: profilePhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

const completionPhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'repair_completion_photos'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        cb(null, safeName);
    }
});

const uploadCompletionPhoto = multer({
    storage: completionPhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

const evaluationPhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'repair_evaluation_photos'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        cb(null, safeName);
    }
});

const uploadEvaluationPhoto = multer({
    storage: evaluationPhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

const complaintPhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'repair_complaint_photos'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        cb(null, safeName);
    }
});

const uploadComplaintPhoto = multer({
    storage: complaintPhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

module.exports = { uploadRepairPhoto, uploadEquipmentPhoto, uploadProfilePhoto, uploadCompletionPhoto, uploadEvaluationPhoto, uploadComplaintPhoto };
