const http = require('http');
const fs = require('fs');
const path = require('path');
const bp = require('body-parser');
const cors = require("cors");
const express = require('express');
const userAccountModel = require('./models/user_account');
const jwt = require('./libs/jwt');
const dateUtils = require('./libs/date_utils');
const repair_request = require('./models/repair_request');
const repair_request_photo = require('./models/repair_request_photo');
const repair_request_equipment = require('./models/repair_request_equipment');
const progress_status = require('./models/progress_status');
const technician = require('./models/technician');
const repair_timeline = require('./models/repair_timeline');
const personnel = require('./models/personnel');
const equipment = require('./models/equipment');
const equipment_type = require('./models/equipment_type');
const unit = require('./models/unit');
const equipment_photo = require('./models/equipment_photo');
const repair_completion_photo = require('./models/repair_completion_photo');
const repair_evaluation = require('./models/repair_evaluation');
const repair_complaint = require('./models/repair_complaint');
const db_pool = require('./libs/db_pool');
const { uploadRepairPhoto, uploadEquipmentPhoto, uploadProfilePhoto, uploadCompletionPhoto, uploadEvaluationPhoto, uploadComplaintPhoto } = require('./libs/upload');

const app = express();
app.use(bp.urlencoded({ extended: true}));
app.use(cors());
app.use(bp.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const hostname = "127.0.0.1";
const port = 3000;

const checkAccessToken = (req, res, next) => {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    } else {
        token = req.body.token;
    }

    jwt.verify(token)
        .then((decoded) => {
            req.decoded = decoded;
            next();
        }, (err) => {
            res.json({
                isError: false,
                result: false,
                errorMessage: "ยังไม่ได้เข้าสู่ระบบ"
            });
        });
}

const requireRole = (allowedRoleIds) => (req, res, next) => {
    if (!allowedRoleIds.includes(req.decoded?.role_id)) {
        return res.json({
            isError: true,
            data: "",
            errorMessage: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้"
        });
    }
    next();
}

app.get("/api/users", (req, res) => {
    var response = {
        isError: true,
        errorMessage: "You are not logged in"
    };

    res.send(JSON.stringify(response));
});

app.get("/api/user/:accountId", async (req, res) => {
  const accountId = req.params.accountId;
  const response = await userAccountModel.getUserAccountById(accountId);
  res.send(JSON.stringify(response));
});

app.post("/api/authen/authen_request", async (req, res) => {
    console.log(req.body.authen_request);
    const authenRequest = req.body.authen_request;
    const result = await userAccountModel.checkAuthenRequest(authenRequest);
    console.log(result);

    if (result.isError) {
        response = { isError: true, data: "", errorMessage: result.errorMessage };    
    } else {
        var payload = { username: result.data[0].username };
        const authenToken = jwt.sign(payload);
        response = {
            isError: false,
            data: authenToken,
            errorMessage: ""
        }
    }
    
    res.send(JSON.stringify(response));
});

app.post("/api/authen/access_request", async (req, res) => {
    const authenSignature = req.body.authen_signature;
    const authenToken = req.body.authen_token;
    const expectedRoleId = req.body.expected_role_id;

    var decoded = jwt.verify(authenToken);

    let response;

    if (decoded) {
        const result = await userAccountModel.checkAccessRequest(authenSignature, authenToken);
        console.log(result);

        if (result.isError) {
        response = { isError: true, data: "", errorMessage: result.errorMessage };
        } else if (expectedRoleId !== undefined && expectedRoleId !== null && Number(expectedRoleId) !== Number(result.data[0].role_id)) {
            response = { isError: true, data: "", errorMessage: "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบนี้" };
        } else {
            var payload = {
                user_id: result.data[0].account_id,
                username: result.data[0].username,
                image_url: result.data[0].profile_image,
                role_id: result.data[0].role_id,
                date: dateUtils.getCurrentDateForToken()
            };

            const accessToken = jwt.sign(payload);
            response = {
                isError: false,
                data: {
                    access_token: accessToken,
                    image_url: result.data[0].profile_image
                },
                errorMessage: ""
            }
        }
    } else {
        response = {
            isError: true,
            data: "",
            errorMessage: "ข้อมูลไม่ถูกต้อง"
        };
    }
    res.send(JSON.stringify(response));
});

app.get("/api/profile/me", checkAccessToken, async (req, res) => {
    const accountId = req.decoded.user_id;
    const response = await userAccountModel.getStudentProfile(accountId);
    res.json(response);
});

app.post("/api/profile/update", checkAccessToken, async (req, res) => {
    const accountId = req.decoded.user_id;
    const phone = req.body.phone;
    const roomNumber = req.body.room_number;

    const response = await userAccountModel.updateStudentProfile(accountId, phone, roomNumber);
    res.json(response);
});

app.post("/api/profile/photo", checkAccessToken, (req, res, next) => {
    uploadProfilePhoto.single('photo')(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const accountId = req.decoded.user_id;

    if (!req.file) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาแนบไฟล์รูปภาพ" });
    }

    const photoPath = `/uploads/profile_photos/${req.file.filename}`;
    const response = await userAccountModel.updateProfileImage(accountId, photoPath);
    res.json(response);
});

app.get("/api/progress_status/get_all", checkAccessToken, async (req, res) => {
    const response = await progress_status.getAllProgressStatus();
    res.json(response);
});

app.get("/api/repair_request/get_all", checkAccessToken, async (req, res) => {
    const response = await repair_request.getAllRepairRequest();
    res.json(response);
});

app.get("/api/repair_request/get_summary", checkAccessToken, async (req, res) => {
    const response = await repair_request.getRepairSummary();
    res.json(response);
});

app.get("/api/repair_request/get_by_id/:request_id", checkAccessToken, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_request.getRepairRequestById(requestId);

    if (!response.isError && response.data && response.data.progress_status_id === 1 && await userAccountModel.isModerator(req.decoded.user_id)) {
        const conn = await db_pool.getConnection();
        try {
            const alreadyReviewing = await repair_timeline.hasStep(conn, requestId, 'reviewing');
            if (!alreadyReviewing) {
                await repair_timeline.insertTimelineStep(conn, requestId, 'reviewing', null);
            }
        } finally {
            conn.release();
        }
    }

    res.json(response);
});

app.get("/api/repair_request/get_timeline/:request_id", checkAccessToken, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_timeline.getTimelineByRequestId(requestId);
    res.json(response);
});

app.get("/api/repair_request/get_all_by_user", checkAccessToken, async (req, res) => {
    console.log(req.decoded);
    const accountId = req.decoded.user_id;
    const response = await repair_request.getAllRepairRequestbyUser(accountId);
    console.log(response);
    res.json(response);
});

app.post("/api/repair_request/create", checkAccessToken, async (req, res) => {
    const studentId = req.decoded.user_id;
    const name = req.body.name;
    const phone = req.body.phone;
    const roomNumber = req.body.room_number;
    const repairTypeIds = req.body.repair_type_ids;
    const description = req.body.description;
    const allowEntry = req.body.allow_entry;

    const response = await repair_request.createRepairRequest(studentId, name, phone, roomNumber, repairTypeIds, description, allowEntry);
    res.json(response);
});

app.post("/api/repair_request/:request_id/photos", checkAccessToken, (req, res, next) => {
    uploadRepairPhoto.array('photos', 6)(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const requestId = req.params.request_id;

    // keep_urls = รายชื่อรูปเดิมที่ผู้ใช้ไม่ได้กด ✕ ลบ (ส่งมาเป็น JSON string array)
    // ตอนแนบครั้งแรก (create) จะไม่มีค่านี้เลย ถือเป็น [] ปกติ
    let keepUrls = [];
    if (req.body.keep_urls) {
        try {
            keepUrls = JSON.parse(req.body.keep_urls);
            if (!Array.isArray(keepUrls)) keepUrls = [];
        } catch (e) {
            keepUrls = [];
        }
    }

    const newUrls = (req.files || []).map(file => `/uploads/repair_photos/${file.filename}`);

    if (keepUrls.length + newUrls.length > 6) {
        return res.json({ isError: true, data: "", errorMessage: "แนบรูปภาพได้สูงสุด 6 รูป" });
    }

    const photoUrls = [...keepUrls, ...newUrls];
    const response = await repair_request_photo.replacePhotos(requestId, photoUrls);

    // ลบไฟล์รูปเก่าที่ไม่ได้ถูก "เก็บไว้" ออกจาก disk แบบ best-effort
    if (!response.isError && response.data.removedUrls) {
        for (const oldUrl of response.data.removedUrls) {
            fs.unlink(path.join(__dirname, oldUrl), () => {});
        }
    }

    res.json(response);
});

app.get("/api/repair_request/:request_id/photos", checkAccessToken, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_request_photo.getPhotosByRequestId(requestId);
    res.json(response);
});

app.post("/api/repair_request/update", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;
    const studentId = req.decoded.user_id;
    const name = req.body.name;
    const phone = req.body.phone;
    const roomNumber = req.body.room_number;
    const repairTypeIds = req.body.repair_type_ids;
    const description = req.body.description;
    const allowEntry = req.body.allow_entry;

    const response = await repair_request.updateRepairRequest(requestId, studentId, name, phone, roomNumber, repairTypeIds, description, allowEntry);
    res.json(response);
});

app.post("/api/repair_request/approve", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;
    const accountId = req.decoded.user_id;

    const response = await repair_request.approveRepairRequest(requestId, accountId);
    res.json(response);
});

app.post("/api/repair_request/reject", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;
    const reason = req.body.reason;
    const accountId = req.decoded.user_id;

    const response = await repair_request.rejectRepairRequest(requestId, accountId, reason);
    res.json(response);
});

app.post("/api/repair_request/assign_technician", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;
    const technicianId = req.body.technician_id;
    const appointmentDate = req.body.appointment_date;
    const notes = req.body.notes;
    const equipmentUsage = req.body.equipment_usage;

    const response = await repair_request.assignTechnician(requestId, technicianId, appointmentDate, notes, equipmentUsage);
    res.json(response);
});

app.get("/api/repair_request/:request_id/equipment", checkAccessToken, requireRole([2]), async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_request_equipment.getByRequestId(requestId);
    res.json(response);
});

app.post("/api/repair_request/complete", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;

    const response = await repair_request.completeRepairRequest(requestId);
    res.json(response);
});

app.post("/api/repair_request/cancel_appointment", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;

    const response = await repair_request.cancelAppointment(requestId);
    res.json(response);
});

app.post("/api/repair_request/accept_completion", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;
    const studentId = req.decoded.user_id;

    if (!(await isOwnRequest(requestId, studentId))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์ยืนยันเคสนี้" });
    }

    const response = await repair_request.acceptRepairCompletion(requestId);
    res.json(response);
});

app.post("/api/repair_request/complaint", checkAccessToken, (req, res, next) => {
    uploadComplaintPhoto.array('photos', 6)(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const requestId = req.body.request_id;
    const studentId = req.decoded.user_id;

    if (!(await isOwnRequest(requestId, studentId))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์ยื่นคำร้องสำหรับเคสนี้" });
    }

    const complaintText = (req.body.complaint_text || '').trim();
    if (!complaintText) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาระบุรายละเอียดปัญหา" });
    }

    const photoUrls = (req.files || []).map((file) => `/uploads/repair_complaint_photos/${file.filename}`);
    const response = await repair_complaint.createComplaint(requestId, complaintText, photoUrls);
    res.json(response);
});

app.post("/api/repair_request/complaint/decide", checkAccessToken, async (req, res) => {
    const { complaint_id, request_id, decision } = req.body;

    if (decision !== 'approved' && decision !== 'rejected') {
        return res.json({ isError: true, data: "", errorMessage: "decision ต้องเป็น approved หรือ rejected เท่านั้น" });
    }

    const response = await repair_complaint.decideComplaint(complaint_id, request_id, decision);
    res.json(response);
});

app.get("/api/repair_request/:request_id/complaints", checkAccessToken, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_complaint.getByRequestId(requestId);
    res.json(response);
});

app.post("/api/repair_request/:request_id/report", checkAccessToken, (req, res, next) => {
    uploadCompletionPhoto.array('photos', 6)(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const requestId = req.params.request_id;
    const reportText = req.body.report_text;

    const reportResponse = await repair_request.saveRepairReport(requestId, reportText);
    if (reportResponse.isError) {
        return res.json(reportResponse);
    }

    if (req.files && req.files.length > 0) {
        const photoUrls = req.files.map((file) => `/uploads/repair_completion_photos/${file.filename}`);
        const photoResponse = await repair_completion_photo.replacePhotos(requestId, photoUrls);
        return res.json(photoResponse);
    }

    res.json(reportResponse);
});

app.get("/api/repair_request/:request_id/completion_photos", checkAccessToken, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_completion_photo.getPhotosByRequestId(requestId);
    res.json(response);
});

// เช็คว่า request นี้เป็นของนักศึกษาคนที่ล็อกอินอยู่จริง (ก่อนแก้ไข/ลบผลประเมิน)
// mirror pattern เดิมของไฟล์นี้ที่ใช้ req.decoded.user_id เทียบตรงๆ กับ student_id
async function isOwnRequest(requestId, studentId) {
    const conn = await db_pool.getConnection();
    try {
        const rows = await conn.query("SELECT student_id FROM repair_request WHERE request_id = ?", [requestId]);
        return rows.length > 0 && rows[0].student_id === studentId;
    } finally {
        conn.release();
    }
}

// ดึงสถานะปัจจุบันของ request มาเช็คก่อนอนุญาตทำ action ที่ผูกกับสถานะเฉพาะ (เช่น ประเมินได้ก็ต่อเมื่อ
// เคส "สำเร็จ"(6) แล้วเท่านั้น) — ตัวเลข 6 มาจาก progress_status ที่ผู้ใช้ยืนยัน id จริงไว้แล้ว
async function getRequestStatus(requestId) {
    const conn = await db_pool.getConnection();
    try {
        const rows = await conn.query("SELECT progress_status_id FROM repair_request WHERE request_id = ?", [requestId]);
        return rows.length > 0 ? rows[0].progress_status_id : null;
    } finally {
        conn.release();
    }
}

function parseValidRating(rawRating) {
    const rating = Number(rawRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return null;
    }
    return rating;
}

app.post("/api/repair_request/:request_id/evaluation", checkAccessToken, (req, res, next) => {
    uploadEvaluationPhoto.array('photos', 6)(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const requestId = req.params.request_id;
    const rating = parseValidRating(req.body.rating);

    if (rating === null) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาให้คะแนน 1-5 ดาว" });
    }

    // ประเมินได้ก็ต่อเมื่อเคส "สำเร็จ"(6) แล้วเท่านั้น — ก่อนหน้านี้ไม่เคยเช็คสถานะเลย ใครก็ประเมินเคส
    // ไหนก็ได้ทุกสถานะ (ช่องโหว่ที่พบตอนวางแผนฟีเจอร์ยอมรับ/แจ้งแก้ไขงานซ่อม)
    const currentStatus = await getRequestStatus(requestId);
    if (currentStatus !== 6) {
        return res.json({ isError: true, data: "", errorMessage: "ประเมินได้เฉพาะเคสที่นักศึกษายืนยันเสร็จสิ้นแล้วเท่านั้น" });
    }

    const photoUrls = (req.files || []).map((file) => `/uploads/repair_evaluation_photos/${file.filename}`);
    const response = await repair_evaluation.createEvaluation(requestId, rating, req.body.feedback || null, photoUrls);
    res.json(response);
});

app.get("/api/repair_request/:request_id/evaluation", checkAccessToken, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_evaluation.getByRequestId(requestId);
    res.json(response);
});

app.post("/api/repair_request/evaluation/update", checkAccessToken, (req, res, next) => {
    uploadEvaluationPhoto.array('photos', 6)(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const requestId = req.body.request_id;
    const studentId = req.decoded.user_id;

    if (!(await isOwnRequest(requestId, studentId))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์แก้ไขการประเมินนี้" });
    }

    const rating = parseValidRating(req.body.rating);
    if (rating === null) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาให้คะแนน 1-5 ดาว" });
    }

    // keep_urls = รายชื่อรูปเดิมที่ยังอยากเก็บไว้ (JSON string array) — mirror pattern เดียวกับ
    // POST /repair_request/:request_id/photos แต่แก้จุดลบไฟล์ให้เช็ค keepUrls ก่อน (ของเดิมลบทุกไฟล์
    // เก่าทั้งหมดโดยไม่เช็ค ทำให้รูปที่ตั้งใจเก็บไว้ไฟล์จริงหายไปจาก disk)
    let keepUrls = [];
    if (req.body.keep_urls) {
        try {
            keepUrls = JSON.parse(req.body.keep_urls);
            if (!Array.isArray(keepUrls)) keepUrls = [];
        } catch (e) {
            keepUrls = [];
        }
    }

    const newUrls = (req.files || []).map((file) => `/uploads/repair_evaluation_photos/${file.filename}`);

    if (keepUrls.length + newUrls.length > 6) {
        return res.json({ isError: true, data: "", errorMessage: "แนบรูปภาพได้สูงสุด 6 รูป" });
    }

    const photoUrls = [...keepUrls, ...newUrls];
    const response = await repair_evaluation.updateEvaluation(requestId, rating, req.body.feedback || null, photoUrls);

    if (!response.isError && response.data.removedUrls) {
        for (const oldPath of response.data.removedUrls) {
            if (!keepUrls.includes(oldPath)) {
                fs.unlink(path.join(__dirname, oldPath), () => {});
            }
        }
    }

    res.json(response);
});

app.post("/api/repair_request/evaluation/delete", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;
    const studentId = req.decoded.user_id;

    if (!(await isOwnRequest(requestId, studentId))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์ลบการประเมินนี้" });
    }

    const response = await repair_evaluation.deleteByRequestId(requestId);

    if (!response.isError && response.data.removedUrls) {
        for (const oldPath of response.data.removedUrls) {
            fs.unlink(path.join(__dirname, oldPath), () => {});
        }
    }

    res.json(response);
});

app.get("/api/technician/get_all", checkAccessToken, async (req, res) => {
    const response = await technician.getAllTechnicians();
    res.json(response);
});

app.post("/api/repair_request/delete", checkAccessToken, async (req, res) => {
    const requestIds = req.body.request_ids ?? req.body.requestId;

    const response = await repair_request.deleteRepairRequest(requestIds);
    res.json(response);
});

app.get("/api/role/get_all", checkAccessToken, async (req, res) => {
    const response = await personnel.getAllRoles();
    res.json(response);
});

app.get("/api/position/get_all", checkAccessToken, async (req, res) => {
    const response = await personnel.getAllPositions();
    res.json(response);
});

app.get("/api/specialty/get_all", checkAccessToken, async (req, res) => {
    const response = await personnel.getAllSpecialties();
    res.json(response);
});

app.get("/api/personnel/get_all", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await personnel.getAllPersonnel();
    res.json(response);
});

app.post("/api/personnel/create_student", checkAccessToken, requireRole([2]), async (req, res) => {
    const { firstname, lastname, phone, username, password, room_number } = req.body;
    const response = await personnel.createStudent(firstname, lastname, phone, username, password, room_number);
    res.json(response);
});

app.post("/api/personnel/create_moderator", checkAccessToken, requireRole([2]), async (req, res) => {
    const { firstname, lastname, phone, username, password, position_id } = req.body;
    const response = await personnel.createModerator(firstname, lastname, phone, username, password, position_id);
    res.json(response);
});

app.post("/api/personnel/create_technician", checkAccessToken, requireRole([2]), async (req, res) => {
    const { firstname, lastname, phone, specialty_id } = req.body;
    const response = await personnel.createTechnician(firstname, lastname, phone, specialty_id);
    res.json(response);
});

app.post("/api/personnel/update_student", checkAccessToken, requireRole([2]), async (req, res) => {
    // username/password ไม่บังคับ — ส่งมาก็ต่อเมื่อเจ้าหน้าที่ตั้งใจจะเปลี่ยนค่านั้นจริงๆ (เว้นว่างไว้ =
    // ไม่แตะบัญชีเดิมเลย) เพราะแต่ก่อนฟังก์ชันนี้ไม่เคยรับ/อัปเดตตาราง account เลยสักบรรทัด
    const { person_id, firstname, lastname, phone, room_number, username, password } = req.body;
    const response = await personnel.updateStudent(person_id, firstname, lastname, phone, room_number, username, password);
    res.json(response);
});

app.post("/api/personnel/update_moderator", checkAccessToken, requireRole([2]), async (req, res) => {
    const { person_id, firstname, lastname, phone, position_id, username, password } = req.body;
    const response = await personnel.updateModerator(person_id, firstname, lastname, phone, position_id, username, password);
    res.json(response);
});

app.post("/api/personnel/update_technician", checkAccessToken, requireRole([2]), async (req, res) => {
    const { person_id, firstname, lastname, phone, specialty_id } = req.body;
    const response = await personnel.updateTechnician(person_id, firstname, lastname, phone, specialty_id);
    res.json(response);
});

app.post("/api/personnel/delete", checkAccessToken, requireRole([2]), async (req, res) => {
    const personIds = req.body.person_ids;
    const response = await personnel.deletePersonnel(personIds);
    res.json(response);
});

app.get("/api/equipment/get_all", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await equipment.getAllEquipment();
    res.json(response);
});

app.get("/api/equipment/get_type", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await equipment_type.getAllEquipmentType();
    res.json(response);
});

app.get("/api/equipment/get_unit", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await unit.getAllUnit();
    res.json(response);
});

app.post("/api/equipment/create", checkAccessToken, requireRole([2]), async (req, res) => {
    const name = (req.body.equipment_name || "").trim();
    const equipmentTypeId = req.body.equipment_type_id;
    const unitId = req.body.unit_id;
    const quantity = Number(req.body.quantity);
    const lowStockThreshold = Number(req.body.low_stock_threshold);

    if (!name || !equipmentTypeId || !unitId ||
        !Number.isInteger(quantity) || quantity < 0 ||
        !Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
        return res.json({ isError: true, data: "", errorMessage: "ข้อมูลไม่ถูกต้อง กรุณากรอกข้อมูลให้ครบและถูกต้อง" });
    }

    const response = await equipment.createEquipment(name, equipmentTypeId, unitId, quantity, lowStockThreshold);
    res.json(response);
});

app.post("/api/equipment/update", checkAccessToken, requireRole([2]), async (req, res) => {
    const equipmentId = req.body.equipment_id;
    const name = (req.body.equipment_name || "").trim();
    const equipmentTypeId = req.body.equipment_type_id;
    const unitId = req.body.unit_id;
    const quantity = Number(req.body.quantity);
    const lowStockThreshold = Number(req.body.low_stock_threshold);

    if (!equipmentId || !name || !equipmentTypeId || !unitId ||
        !Number.isInteger(quantity) || quantity < 0 ||
        !Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
        return res.json({ isError: true, data: "", errorMessage: "ข้อมูลไม่ถูกต้อง กรุณากรอกข้อมูลให้ครบและถูกต้อง" });
    }

    const response = await equipment.updateEquipment(equipmentId, name, equipmentTypeId, unitId, quantity, lowStockThreshold);
    res.json(response);
});

app.post("/api/equipment/delete", checkAccessToken, requireRole([2]), async (req, res) => {
    const equipmentIds = req.body.equipment_ids;
    const response = await equipment.deleteEquipment(equipmentIds);
    res.json(response);
});

// ครุภัณฑ์มีได้แค่รูปเดียวเสมอ — endpoint นี้ทำหน้าที่ทั้ง "เพิ่ม", "เปลี่ยน" (ส่งไฟล์ photo มา)
// และ "ลบ" (ส่ง remove=1 มาโดยไม่มีไฟล์) ในตัวเดียวกัน แทนที่รูปเดิมเสมอ ไม่สะสมหลายรูป
app.post("/api/equipment/:equipment_id/photos", checkAccessToken, requireRole([2]), (req, res, next) => {
    uploadEquipmentPhoto.single('photo')(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const equipmentId = req.params.equipment_id;

    if (!req.file && req.body.remove !== '1') {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาแนบไฟล์รูปภาพ" });
    }

    const newPhotoPath = req.file ? `/uploads/equipment_photos/${req.file.filename}` : null;
    const response = await equipment_photo.replacePhoto(equipmentId, newPhotoPath);

    // ลบไฟล์รูปเก่าออกจาก disk แบบ best-effort
    if (!response.isError && response.data.oldPhotoPaths) {
        for (const oldPath of response.data.oldPhotoPaths) {
            fs.unlink(path.join(__dirname, oldPath), () => {});
        }
    }

    res.json(response);
});

app.get("/api/equipment/:equipment_id/photos", checkAccessToken, requireRole([2]), async (req, res) => {
    const equipmentId = req.params.equipment_id;
    const response = await equipment_photo.getPhotosByEquipmentId(equipmentId);
    res.json(response);
});

app.listen(port, () => {
    console.log("Server is running");
});