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
const repair_type = require('./models/repair_type');
const rush_reason = require('./models/rush_reason');
const technician = require('./models/technician');
const repair_timeline = require('./models/repair_timeline');
const personnel = require('./models/personnel');
const equipment = require('./models/equipment');
const equipment_type = require('./models/equipment_type');
const unit = require('./models/unit');
const equipment_photo = require('./models/equipment_photo');
const repair_completion_item = require('./models/repair_completion_item');
const repair_evaluation = require('./models/repair_evaluation');
const repair_complaint = require('./models/repair_complaint');
const notification = require('./models/notification');
const dashboard = require('./models/dashboard');
const { buildReportSummary } = require('./libs/report_summary');
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

// ใช้กับ route ที่ระบุคนด้วย :person_id — เจ้าหน้าที่ (role 2) ทำกับใครก็ได้ ส่วนบทบาทอื่นทำได้เฉพาะ
// person_id ของบัญชีตัวเอง ต้องวางก่อน multer เสมอ ไม่งั้นคำขอที่ไม่มีสิทธิ์จะทิ้งไฟล์ค้างบน disk
const requireModeratorOrSelf = async (req, res, next) => {
    if (req.decoded?.role_id === 2) {
        return next();
    }

    const personId = parseInt(req.params.person_id, 10);
    const ownPerson = await userAccountModel.getPersonIdByAccountId(req.decoded?.user_id);

    if (ownPerson.isError || !Number.isInteger(personId) || personId !== ownPerson.data) {
        return res.json({
            isError: true,
            data: "",
            errorMessage: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้"
        });
    }
    next();
}

// ตรวจที่ขอบ API ไม่ใช่แค่ฟอร์มฝั่ง client — รับเฉพาะเบอร์มือถือตัวเลขล้วน 10 หลักที่ขึ้นต้น 06/08/09
// (คอลัมน์ person.phone เป็น varchar(10) เก็บขีดไม่ได้ ฝั่ง client ตัดขีดออกก่อนส่งแล้ว)
const requireValidPhone = (req, res, next) => {
    const phone = req.body.phone;
    if (typeof phone !== 'string' || !/^0[689]\d{8}$/.test(phone)) {
        return res.json({
            isError: true,
            data: "",
            errorMessage: "หมายเลขโทรศัพท์ไม่ถูกต้อง"
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

// ต้องล็อกอิน และดูได้เฉพาะบัญชีตัวเองหรือเจ้าหน้าที่ (role 2) — เดิมไม่ตรวจโทเค็นเลย ใครก็วนเลข id ดึงรหัสนักศึกษา
// (username) กับรูปโปรไฟล์ของทุกคนได้ ซึ่งเป็นข้อมูลส่วนบุคคลตาม PDPA (ตอนนี้ไม่มี client ไหนเรียก route นี้)
app.get("/api/user/:accountId", checkAccessToken, async (req, res) => {
  const accountId = parseInt(req.params.accountId, 10);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return res.json({ isError: true, errorMessage: "รหัสบัญชีไม่ถูกต้อง" });
  }
  if (accountId !== req.decoded.user_id && req.decoded.role_id !== 2) {
    return res.json({ isError: true, errorMessage: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
  }

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

// โปรไฟล์ของเจ้าหน้าที่ที่ล็อกอินอยู่เท่านั้น (หาจาก account_id ใน token ไม่รับรหัสจาก client) — ใช้แสดงชื่อ/ตำแหน่ง/รูป
// ที่ topbar ของพอร์ทัล ส่วน /api/profile/me ข้างล่างเป็นของนักศึกษา (JOIN ตาราง student)
app.get("/api/moderator/me", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await userAccountModel.getModeratorProfile(req.decoded.user_id);
    res.json(response);
});

app.get("/api/profile/me", checkAccessToken, async (req, res) => {
    const accountId = req.decoded.user_id;
    const response = await userAccountModel.getStudentProfile(accountId);
    res.json(response);
});

app.post("/api/profile/update", checkAccessToken, requireValidPhone, async (req, res) => {
    const accountId = req.decoded.user_id;
    const phone = req.body.phone;
    const roomNumber = req.body.room_number;

    const response = await userAccountModel.updateStudentProfile(accountId, phone, roomNumber);
    res.json(response);
});

app.get("/api/progress_status/get_all", checkAccessToken, async (req, res) => {
    const response = await progress_status.getAllProgressStatus();
    res.json(response);
});

// รายการประเภทงานซ่อมจากตาราง repair_type ให้แอปใช้ชื่อตรงกับ backend (ไม่ฮาร์ดโค้ด) — ข้อมูลไม่ใช่ข้อมูลส่วนบุคคล
app.get("/api/repair_type/get_all", checkAccessToken, async (req, res) => {
    const response = await repair_type.getAllRepairType();
    res.json(response);
});

// เจ้าหน้าที่เท่านั้น — ผลลัพธ์มีข้อมูลส่วนบุคคลของนักศึกษาทุกคน (ชื่อ ห้อง รูปโปรไฟล์) ตาม PDPA ต้องเห็นเฉพาะบทบาท
// ที่จำเป็น; แอปนักศึกษาไม่ได้เรียก route นี้ (ใช้ get_all_by_user ของตัวเอง) จึงไม่กระทบ
app.get("/api/repair_request/get_all", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await repair_request.getAllRepairRequest();
    res.json(response);
});

app.get("/api/repair_request/get_summary", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await repair_request.getRepairSummary();
    res.json(response);
});

// หน้ารายงานสรุปของเจ้าหน้าที่ — range รับแค่ 7 | 30 | all (whitelist) ค่าอื่นปฏิเสธก่อนถึง SQL ผลลัพธ์เป็นตัวเลขรวม
// และรหัสเคส/ห้อง/ประเภท ไม่มีชื่อหรือเบอร์นักศึกษา (PDPA) ข้อผิดพลาดจากฐานข้อมูลไม่ส่งข้อความดิบกลับไปที่หน้าเว็บ
const REPORT_RANGE_DAYS = { '7': 7, '30': 30, 'all': null };
app.get("/api/dashboard/summary", checkAccessToken, requireRole([2]), async (req, res) => {
    const rangeKey = req.query.range;
    if (typeof rangeKey !== 'string' || !Object.prototype.hasOwnProperty.call(REPORT_RANGE_DAYS, rangeKey)) {
        return res.json({ isError: true, data: "", errorMessage: "ช่วงเวลาไม่ถูกต้อง (เลือกได้ 7, 30 หรือ all)" });
    }

    const response = await dashboard.getReportSummary(REPORT_RANGE_DAYS[rangeKey]);
    if (response.isError) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่สามารถโหลดรายงานสรุปได้ กรุณาลองใหม่อีกครั้ง" });
    }

    res.json({ isError: false, data: buildReportSummary(response.data, rangeKey), errorMessage: "" });
});

// ระบบแจ้งเตือนฝั่งเจ้าหน้าที่ — feed เดียวใช้ร่วมกันทุกคน (ไม่แยกตามคน ตามที่ตกลงกัน) เห็นเฉพาะสิทธิ์
// เจ้าหน้าที่ (requireRole([2])) เพราะเป็นเรื่องภายในของทีมงาน ไม่ใช่ข้อมูลที่นักศึกษาควรเห็น
app.get("/api/notifications", checkAccessToken, requireRole([2]), async (req, res) => {
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : 20;

    const response = await notification.getRecent(limit);
    res.json(response);
});

app.post("/api/notifications/:id/read", checkAccessToken, requireRole([2]), async (req, res) => {
    const notificationId = req.params.id;
    const response = await notification.markAsRead(notificationId);
    res.json(response);
});

// เจ้าหน้าที่เปิดเคส → ล้างป้าย "มีอัปเดตใหม่จากนักศึกษา" ของเคสนั้น
app.post("/api/notifications/read-by-request/:requestId", checkAccessToken, requireRole([2]), async (req, res) => {
    const requestId = parseInt(req.params.requestId, 10);
    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "รหัสเคสไม่ถูกต้อง" });
    }

    const response = await notification.markReadByRequest(requestId);
    res.json(response);
});

app.post("/api/notifications/read-all", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await notification.markAllAsRead();
    res.json(response);
});

app.get("/api/repair_request/get_by_id/:request_id", checkAccessToken, requireCaseAccess, async (req, res) => {
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

app.get("/api/repair_request/get_timeline/:request_id", checkAccessToken, requireCaseAccess, async (req, res) => {
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

app.post("/api/repair_request/create", checkAccessToken, requireValidPhone, async (req, res) => {
    // user_id ใน token คือ account_id (ไม่ใช่ student_id) — model แปลงเป็น student_id ให้เอง
    const accountId = req.decoded.user_id;
    const name = req.body.name;
    const phone = req.body.phone;
    const roomNumber = req.body.room_number;
    const repairTypeIds = req.body.repair_type_ids;
    const description = req.body.description;
    const allowEntry = req.body.allow_entry;

    const response = await repair_request.createRepairRequest(accountId, name, phone, roomNumber, repairTypeIds, description, allowEntry);
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

app.get("/api/repair_request/:request_id/photos", checkAccessToken, requireCaseAccess, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_request_photo.getPhotosByRequestId(requestId);
    res.json(response);
});

app.post("/api/repair_request/update", checkAccessToken, requireValidPhone, async (req, res) => {
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

app.post("/api/repair_request/approve", checkAccessToken, requireRole([2]), async (req, res) => {
    const requestId = req.body.request_id;
    const accountId = req.decoded.user_id;

    const response = await repair_request.approveRepairRequest(requestId, accountId);
    res.json(response);
});

app.post("/api/repair_request/reject", checkAccessToken, requireRole([2]), async (req, res) => {
    const requestId = req.body.request_id;
    const reason = req.body.reason;
    const accountId = req.decoded.user_id;

    const response = await repair_request.rejectRepairRequest(requestId, accountId, reason);
    res.json(response);
});

// เจ้าหน้าที่ยกเลิกงานที่อยู่ระหว่างซ่อมและยังไม่ส่งงาน (สถานะ 2) — แยกจาก /reject ที่รับเฉพาะคำร้องสถานะ 1 เหตุผลบังคับ
// เพราะนักศึกษาเห็นในไทม์ไลน์ว่าทำไมงานถูกยกเลิก (สถานะของเคสตรวจซ้ำใน model ภายใต้ล็อก ไม่เชื่อสถานะที่หน้าจอเห็น)
app.post("/api/repair_request/cancel_in_progress", checkAccessToken, requireRole([2]), async (req, res) => {
    const requestId = parseInt(req.body.request_id, 10);
    const reason = (typeof req.body.reason === 'string' ? req.body.reason : '').trim();

    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "รหัสเคสไม่ถูกต้อง" });
    }
    if (!reason) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาระบุเหตุผลที่ยกเลิกงานซ่อม" });
    }
    if (reason.length > 500) {
        return res.json({ isError: true, data: "", errorMessage: "เหตุผลต้องไม่เกิน 500 ตัวอักษร" });
    }

    const response = await repair_request.cancelInProgressRepairRequest(requestId, req.decoded.user_id, reason);
    res.json(response);
});

app.post("/api/repair_request/assign_technician", checkAccessToken, requireRole([2]), async (req, res) => {
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

// มินิปฏิทินเช็คคิวนัดหมายตอนเจ้าหน้าที่นัดหมายเอง (แท็บ "นัดหมาย") — start ต้องเป็น YYYY-MM-DD,
// days จำกัดไว้ 1-30 กันขอช่วงยาวเกินจำเป็น, exclude_request_id กันนัดเดิมของเคสเดียวกัน (ตอนเลื่อนนัด)
// มาแย่งที่ตัวเอง ตรงกับ logic เดียวกับ countSlotBookings ที่ใช้ตอนจัดคิวอัตโนมัติ
app.get("/api/repair_request/slot_availability", checkAccessToken, requireRole([2]), async (req, res) => {
    const start = req.query.start;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '')) {
        return res.json({ isError: true, data: "", errorMessage: "รูปแบบวันที่ไม่ถูกต้อง" });
    }

    const days = parseInt(req.query.days, 10) || 7;
    if (!Number.isInteger(days) || days < 1 || days > 30) {
        return res.json({ isError: true, data: "", errorMessage: "จำนวนวันต้องอยู่ระหว่าง 1-30" });
    }

    const excludeRequestId = req.query.exclude_request_id ? parseInt(req.query.exclude_request_id, 10) : undefined;

    const response = await repair_request.getSlotAvailability(start, days, excludeRequestId);
    res.json(response);
});

app.post("/api/repair_request/complete", checkAccessToken, requireRole([2]), async (req, res) => {
    const requestId = req.body.request_id;

    const response = await repair_request.completeRepairRequest(requestId);
    res.json(response);
});

app.post("/api/repair_request/cancel_appointment", checkAccessToken, requireRole([2]), async (req, res) => {
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

// ตัวเลือกเหตุผลใน dropdown ของป๊อปอัปเร่งงาน (is_urgent ใช้ฝั่งเจ้าหน้าที่ แอปนักศึกษาไม่ต้องใช้)
app.get("/api/rush_reason/get_all", checkAccessToken, async (req, res) => {
    const response = await rush_reason.getAllRushReason();
    res.json(response);
});

// นักศึกษายกเลิกคำร้องเอง — เฉพาะเจ้าของเคส และทำได้เฉพาะสถานะ "รอตรวจสอบ" (model ตรวจซ้ำภายใต้ล็อก);
// เหตุผลไม่บังคับ (ถ้าว่าง model ใส่ข้อความเริ่มต้นให้) ไม่เกิน 500 ตัวอักษรเหมือนเหตุผลที่ไม่ยอมรับผลซ่อม
app.post("/api/repair_request/cancel_by_student", checkAccessToken, async (req, res) => {
    const requestId = parseInt(req.body.request_id, 10);
    const reason = (typeof req.body.reason === 'string' ? req.body.reason : '').trim();

    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "รหัสเคสไม่ถูกต้อง" });
    }
    if (!(await isOwnRequest(requestId, req.decoded.user_id))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์ยกเลิกเคสนี้" });
    }
    if (reason.length > 500) {
        return res.json({ isError: true, data: "", errorMessage: "เหตุผลต้องไม่เกิน 500 ตัวอักษร" });
    }

    const response = await repair_request.cancelRepairRequestByStudent(requestId, reason);
    res.json(response);
});

// นักศึกษากด "เร่งการจัดการงาน" — เฉพาะเจ้าของเคส; เงื่อนไขเวลา/สถานะ/cooldown ตรวจใน model ภายใต้ล็อกอีกชั้น
app.post("/api/repair_request/rush", checkAccessToken, async (req, res) => {
    const requestId = parseInt(req.body.request_id, 10);
    const reasonId = parseInt(req.body.reason_id, 10);
    const reasonNote = (typeof req.body.reason_note === 'string' ? req.body.reason_note : '').trim();

    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "รหัสเคสไม่ถูกต้อง" });
    }
    if (!(await isOwnRequest(requestId, req.decoded.user_id))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์เร่งงานของเคสนี้" });
    }
    if (!Number.isInteger(reasonId) || reasonId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาเลือกเหตุผลที่ขอเร่ง" });
    }
    if (reasonNote.length > 200) {
        return res.json({ isError: true, data: "", errorMessage: "ข้อความเหตุผลต้องไม่เกิน 200 ตัวอักษร" });
    }

    const response = await repair_request.rushRepairRequest(requestId, reasonId, reasonNote);
    res.json(response);
});

// กระดิ่งแจ้งเตือนของนักศึกษา — เฉพาะเคสของตัวเอง (กรองด้วย user_id จาก token ไม่รับ id จาก client)
app.get("/api/student/notifications", checkAccessToken, async (req, res) => {
    const response = await repair_request.getStudentNotifications(req.decoded.user_id);
    res.json(response);
});

app.post("/api/repair_request/mark_all_seen", checkAccessToken, async (req, res) => {
    const response = await repair_request.markAllSeen(req.decoded.user_id);
    res.json(response);
});

// นักศึกษาเปิดดูเคส → ล้างจุดแดง "มีอัปเดตใหม่" ของเคสนั้น (เฉพาะเจ้าของเคส)
app.post("/api/repair_request/mark_seen", checkAccessToken, async (req, res) => {
    const requestId = parseInt(req.body.request_id, 10);
    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "รหัสเคสไม่ถูกต้อง" });
    }
    if (!(await isOwnRequest(requestId, req.decoded.user_id))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์เข้าถึงเคสนี้" });
    }

    const response = await repair_request.markSeen(requestId);
    res.json(response);
});

// นักศึกษากด "ไม่ยอมรับ" ผลซ่อม (เฉพาะตอนยื่นคำร้องครบสิทธิ์แล้ว — backend ตรวจใน declineRepairCompletion)
// ขั้นนี้แค่ปิดเคสเป็น "ซ่อมไม่สำเร็จ" ส่วนเหตุผล/รูปให้นักศึกษาส่งเป็นการประเมินแบบไม่มีดาว (POST /:request_id/evaluation
// สถานะ 8) เหมือนที่งานสำเร็จปิดเคสก่อนแล้วค่อยประเมิน — reason ตรงนี้จึงไม่บังคับ (แอปเวอร์ชันเก่าที่ยังส่งมาก็เก็บลง
// step_detail ของ timeline 'declined' ตามเดิม)
app.post("/api/repair_request/decline_completion", checkAccessToken, async (req, res) => {
    const requestId = req.body.request_id;
    const studentId = req.decoded.user_id;
    const reason = (req.body.reason || '').trim();

    if (!(await isOwnRequest(requestId, studentId))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์ตัดสินเคสนี้" });
    }
    if (reason.length > 500) {
        return res.json({ isError: true, data: "", errorMessage: "เหตุผลต้องไม่เกิน 500 ตัวอักษร" });
    }

    const response = await repair_request.declineRepairCompletion(requestId, reason || null);
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

    // ตรวจแค่รูปแบบ (เป็นเลขจำนวนเต็มบวก) ที่นี่ — ตรวจว่า id นี้มีอยู่จริงในตาราง complaint_reason
    // ที่ repair_complaint.createComplaint (ต้องใช้ conn เดียวกับ transaction)
    const complaintReasonId = parseInt(req.body.complaint_reason_id, 10);
    if (!Number.isInteger(complaintReasonId) || complaintReasonId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาเลือกหมวดหมู่เหตุผล" });
    }

    // '0'/'1' เท่านั้น — ไม่รับค่าอื่น (เช่นเว้นว่าง) เพราะบังคับให้นักศึกษาเลือกก่อนส่งเสมอ
    if (req.body.allow_entry !== '0' && req.body.allow_entry !== '1') {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาเลือกว่าอนุญาตให้ช่างเข้าห้องหรือไม่" });
    }
    const allowEntry = req.body.allow_entry === '1' ? 1 : 0;

    const photoUrls = (req.files || []).map((file) => `/uploads/repair_complaint_photos/${file.filename}`);
    const response = await repair_complaint.createComplaint(requestId, complaintText, complaintReasonId, allowEntry, photoUrls);
    res.json(response);
});

app.post("/api/repair_request/complaint/edit", checkAccessToken, (req, res, next) => {
    uploadComplaintPhoto.array('photos', 6)(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const requestId = req.body.request_id;
    const complaintId = req.body.complaint_id;
    const studentId = req.decoded.user_id;

    if (!(await isOwnRequest(requestId, studentId))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์แก้ไขคำร้องสำหรับเคสนี้" });
    }

    const complaintText = (req.body.complaint_text || '').trim();
    if (!complaintText) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาระบุรายละเอียดปัญหา" });
    }

    const complaintReasonId = parseInt(req.body.complaint_reason_id, 10);
    if (!Number.isInteger(complaintReasonId) || complaintReasonId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาเลือกหมวดหมู่เหตุผล" });
    }

    if (req.body.allow_entry !== '0' && req.body.allow_entry !== '1') {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาเลือกว่าอนุญาตให้ช่างเข้าห้องหรือไม่" });
    }
    const allowEntry = req.body.allow_entry === '1' ? 1 : 0;

    let existingPhotoUrls = [];
    if (req.body.existing_photo_urls) {
        try {
            existingPhotoUrls = JSON.parse(req.body.existing_photo_urls);
            if (!Array.isArray(existingPhotoUrls)) existingPhotoUrls = [];
        } catch (e) { existingPhotoUrls = []; }
    }
    const newPhotoUrls = (req.files || []).map((file) => `/uploads/repair_complaint_photos/${file.filename}`);
    if (existingPhotoUrls.length + newPhotoUrls.length > 6) {
        return res.json({ isError: true, data: "", errorMessage: "แนบรูปภาพได้สูงสุด 6 รูป" });
    }
    const photoUrls = [...existingPhotoUrls, ...newPhotoUrls];

    const response = await repair_complaint.editComplaint(complaintId, requestId, complaintText, complaintReasonId, allowEntry, photoUrls);
    res.json(response);
});

// เจ้าหน้าที่เปิดดูคำร้องที่รอตัดสินใจ — บันทึกการ์ด "กำลังตรวจสอบ" ใน timeline (ไม่ซ้ำถ้าเรียกหลายครั้ง)
app.post("/api/repair_request/complaint/reviewing", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await repair_complaint.markReviewing(req.body.request_id);
    res.json(response);
});

// เดิมไม่มี requireRole — นักศึกษาที่มี token ก็ยิงตัดสินคำร้องตัวเองได้ ตัดสินใจคำร้องเป็นสิทธิ์เจ้าหน้าที่เท่านั้น
app.post("/api/repair_request/complaint/decide", checkAccessToken, requireRole([2]), async (req, res) => {
    const { complaint_id, request_id, decision } = req.body;

    if (decision !== 'approved' && decision !== 'rejected') {
        return res.json({ isError: true, data: "", errorMessage: "decision ต้องเป็น approved หรือ rejected เท่านั้น" });
    }

    // ปฏิเสธต้องระบุเหตุผลเสมอ (นักศึกษาจะเห็นในไทม์ไลน์)
    const reason = (req.body.reason || '').trim();
    if (decision === 'rejected') {
        if (!reason) {
            return res.json({ isError: true, data: "", errorMessage: "กรุณาระบุเหตุผลที่ปฏิเสธคำร้อง" });
        }
        if (reason.length > 500) {
            return res.json({ isError: true, data: "", errorMessage: "เหตุผลต้องไม่เกิน 500 ตัวอักษร" });
        }
    }

    const response = await repair_complaint.decideComplaint(complaint_id, request_id, decision, decision === 'rejected' ? reason : null);
    res.json(response);
});

// เจ้าหน้าที่ปรับจำนวนครั้งที่นักศึกษายื่นอุทธรณ์ได้ของ "เคสนี้" (1-5, ค่าเริ่มต้น 2) — เป็นสิทธิ์เจ้าหน้าที่เท่านั้น
// ตรวจข้อมูลที่ทางเข้า (ไม่พึ่งแค่หน้าจอ): ชนิด/ช่วงของตัวเลข และไม่รับ field เกิน ส่วนกติกาข้อมูลของเคส
// (ปิดแล้วห้ามแก้ / ห้ามต่ำกว่าที่ยื่นไปแล้ว) ตรวจใน repair_complaint.setMaxComplaints
const MIN_COMPLAINT_LIMIT = 1;
const MAX_COMPLAINT_LIMIT = 5;
app.post("/api/repair_request/complaint/limit", checkAccessToken, requireRole([2]), async (req, res) => {
    const { request_id, max_complaints, ...extraFields } = req.body;

    if (Object.keys(extraFields).length > 0) {
        return res.json({ isError: true, data: "", errorMessage: "ข้อมูลที่ส่งมามีฟิลด์ที่ไม่รองรับ" });
    }
    if (!Number.isInteger(request_id) || request_id <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "รหัสเคสไม่ถูกต้อง" });
    }
    if (!Number.isInteger(max_complaints) || max_complaints < MIN_COMPLAINT_LIMIT || max_complaints > MAX_COMPLAINT_LIMIT) {
        return res.json({
            isError: true,
            data: "",
            errorMessage: `จำนวนครั้งที่ยื่นอุทธรณ์ต้องเป็นจำนวนเต็ม ${MIN_COMPLAINT_LIMIT}-${MAX_COMPLAINT_LIMIT}`
        });
    }

    const response = await repair_complaint.setMaxComplaints(request_id, max_complaints);
    res.json(response);
});

app.get("/api/repair_request/:request_id/complaints", checkAccessToken, requireCaseAccess, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_complaint.getByRequestId(requestId);
    res.json(response);
});

// รายงานผลซ่อมแยกตามรายการงานซ่อม (repair_type) ของเคส — ใช้ทั้งฝั่ง moderator เปิด "จัดการ"
// และฝั่งนักศึกษาดูผลซ่อม
app.get("/api/repair_request/:request_id/completion_items", checkAccessToken, requireCaseAccess, async (req, res) => {
    const requestId = req.params.request_id;
    const response = await repair_completion_item.getByRequestId(requestId);
    res.json(response);
});

// บันทึกรายงาน+รูปของ "1 รายการงานซ่อม" — moderator กด "บันทึก" ทีละการ์ด
app.post("/api/repair_request/:request_id/completion_items/:repair_type_id/report", checkAccessToken, requireRole([2]), (req, res, next) => {
    uploadCompletionPhoto.array('photos', 6)(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const requestId = req.params.request_id;
    const repairTypeId = req.params.repair_type_id;
    const reportText = req.body.report_text;

    // existing_photo_urls = รายชื่อรูปเดิมที่ยังอยากเก็บไว้ (JSON string array) — mirror pattern เดียวกับ
    // จุดอื่นๆ ในไฟล์นี้ที่รองรับแก้ไขรูปแบบ "เก็บบางรูป + เพิ่มรูปใหม่"
    let existingPhotoUrls = [];
    if (req.body.existing_photo_urls) {
        try {
            existingPhotoUrls = JSON.parse(req.body.existing_photo_urls);
            if (!Array.isArray(existingPhotoUrls)) existingPhotoUrls = [];
        } catch (e) {
            existingPhotoUrls = [];
        }
    }

    const newPhotoUrls = (req.files || []).map((file) => `/uploads/repair_completion_photos/${file.filename}`);

    if (existingPhotoUrls.length + newPhotoUrls.length > 6) {
        return res.json({ isError: true, data: "", errorMessage: "แนบรูปภาพได้สูงสุด 6 รูป" });
    }

    const photoUrls = [...existingPhotoUrls, ...newPhotoUrls];
    const response = await repair_completion_item.saveOneItemReport(requestId, repairTypeId, reportText, photoUrls);
    res.json(response);
});

// เช็คว่า request นี้เป็นของนักศึกษาคนที่ล็อกอินอยู่จริง (ก่อนแก้ไข/ลบผลประเมิน)
// ส่ง req.decoded.user_id (account_id) เข้าไป — isOwnRequest แปลงเป็นเจ้าของเคสให้เอง
// ตรวจสิทธิ์อ่านข้อมูลเคสรายตัว (รูป ไทม์ไลน์ รายงาน คำร้อง รีวิว) — ผ่านเมื่อเป็นเจ้าหน้าที่ (role 2) หรือเป็นนักศึกษา
// (role 1) เจ้าของเคสนั้นเท่านั้น; เดิมแค่ล็อกอินก็อ่านเคสของคนอื่นได้ถ้ารู้ id ซึ่งเป็นเลขเรียงเดาง่าย ข้อมูลมีชื่อ เบอร์ ห้อง
// เช็ก role ร่วมด้วย ไม่พึ่งการเทียบ user_id กับ student_id อย่างเดียว (id ของเจ้าหน้าที่อาจบังเอิญตรงกับ id นักศึกษา)
async function requireCaseAccess(req, res, next) {
    const requestId = parseInt(req.params.request_id, 10);
    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.json({ isError: true, data: "", errorMessage: "รหัสเคสไม่ถูกต้อง" });
    }

    const roleId = req.decoded?.role_id;
    if (roleId === 2 || (roleId === 1 && (await isOwnRequest(requestId, req.decoded.user_id)))) {
        return next();
    }

    return res.json({ isError: true, data: "", errorMessage: "คุณไม่มีสิทธิ์เข้าถึงเคสนี้" });
}

// accountId = req.decoded.user_id (account_id ใน token ไม่ใช่ student_id) — เทียบผ่าน account → person → student
// ไม่เทียบเลขตรงๆ เพราะ student_id กับ account_id นับแยกกัน ตรงกันแค่บังเอิญในบัญชีแรกๆ บัญชีที่เจ้าหน้าที่
// สร้างทีหลังเลขจะไม่ตรง ทำให้ถูกมองว่าไม่ใช่เจ้าของเคสตัวเอง
async function isOwnRequest(requestId, accountId) {
    const conn = await db_pool.getConnection();
    try {
        const rows = await conn.query(
            "SELECT 1 FROM repair_request rr " +
            "JOIN student s ON s.student_id = rr.student_id " +
            "JOIN account a ON a.person_id = s.person_id " +
            "WHERE rr.request_id = ? AND a.account_id = ?",
            [requestId, accountId]
        );
        return rows.length > 0;
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

// กติกาการประเมินแยกตามสถานะของเคส (ใช้ทั้งตอนสร้างและแก้ไข):
//   6 สำเร็จ        → ต้องมีดาว 1-5 ข้อความไม่บังคับ
//   8 ซ่อมไม่สำเร็จ → ไม่มีดาว (ปฏิเสธถ้าส่งมา) และต้องมีข้อความเหตุผล เพราะไม่มีดาวให้บอกอะไร ข้อความคือข้อมูลเดียว
// คืน { rating, feedback } หรือ { errorMessage } — ไม่ throw เพื่อให้ route ตอบรูปแบบ isError เดียวกับที่อื่น
const FAILED_FEEDBACK_MAX_LENGTH = 500;
function validateEvaluationInput(status, rawRating, rawFeedback) {
    const feedback = (rawFeedback || '').trim();

    if (status === 6) {
        const rating = parseValidRating(rawRating);
        if (rating === null) {
            return { errorMessage: "กรุณาให้คะแนน 1-5 ดาว" };
        }
        return { rating, feedback: feedback || null };
    }

    if (status === 8) {
        if (rawRating !== undefined && rawRating !== null && String(rawRating).trim() !== '') {
            return { errorMessage: "เคสที่ซ่อมไม่สำเร็จไม่มีการให้ดาว" };
        }
        if (!feedback) {
            return { errorMessage: "กรุณาระบุเหตุผลที่ไม่ยอมรับผลการซ่อม" };
        }
        if (feedback.length > FAILED_FEEDBACK_MAX_LENGTH) {
            return { errorMessage: `เหตุผลต้องไม่เกิน ${FAILED_FEEDBACK_MAX_LENGTH} ตัวอักษร` };
        }
        return { rating: null, feedback };
    }

    return { errorMessage: "ประเมินได้เฉพาะเคสที่ปิดแล้ว (สำเร็จหรือซ่อมไม่สำเร็จ) เท่านั้น" };
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
    const studentId = req.decoded.user_id;

    // ก่อนหน้านี้ route นี้ไม่เช็คเจ้าของเคส (ตรวจแค่สถานะ) นักศึกษาคนอื่นที่รู้ id ประเมินแทนกันได้ — เพิ่มเช็คแบบเดียวกับ update/delete
    if (!(await isOwnRequest(requestId, studentId))) {
        return res.json({ isError: true, data: "", errorMessage: "ไม่มีสิทธิ์ประเมินเคสนี้" });
    }

    // ประเมินได้เมื่อเคสปิดแล้วเท่านั้น: สำเร็จ (6) ให้ดาว / ซ่อมไม่สำเร็จ (8) ไม่มีดาวแต่ต้องมีข้อความ (ดู validateEvaluationInput)
    const currentStatus = await getRequestStatus(requestId);
    const input = validateEvaluationInput(currentStatus, req.body.rating, req.body.feedback);
    if (input.errorMessage) {
        return res.json({ isError: true, data: "", errorMessage: input.errorMessage });
    }

    const photoUrls = (req.files || []).map((file) => `/uploads/repair_evaluation_photos/${file.filename}`);
    const response = await repair_evaluation.createEvaluation(requestId, input.rating, input.feedback, photoUrls);
    res.json(response);
});

// ต้องประกาศก่อน route ที่มี :request_id ไม่เช่นนั้น Express อาจตีความ "get_all_by_user" เป็นพารามิเตอร์
app.get("/api/repair_evaluation/get_all_by_user", checkAccessToken, async (req, res) => {
    const response = await repair_evaluation.getAllByStudent(req.decoded.user_id);
    res.json(response);
});

app.get("/api/repair_request/:request_id/evaluation", checkAccessToken, requireCaseAccess, async (req, res) => {
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

    // กติกาเดียวกับตอนสร้าง และเพิ่มการตรวจสถานะ (ก่อนหน้านี้ route แก้ไขไม่ตรวจสถานะเลย)
    const currentStatus = await getRequestStatus(requestId);
    const input = validateEvaluationInput(currentStatus, req.body.rating, req.body.feedback);
    if (input.errorMessage) {
        return res.json({ isError: true, data: "", errorMessage: input.errorMessage });
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
    const response = await repair_evaluation.updateEvaluation(requestId, input.rating, input.feedback, photoUrls);

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

    // ลบได้เฉพาะเคสที่ปิดแล้ว (สำเร็จ/ซ่อมไม่สำเร็จ) เหมือนกติกาสร้าง/แก้ไข
    const currentStatus = await getRequestStatus(requestId);
    if (currentStatus !== 6 && currentStatus !== 8) {
        return res.json({ isError: true, data: "", errorMessage: "ลบการประเมินได้เฉพาะเคสที่ปิดแล้วเท่านั้น" });
    }

    const response = await repair_evaluation.deleteByRequestId(requestId);

    if (!response.isError && response.data.removedUrls) {
        for (const oldPath of response.data.removedUrls) {
            fs.unlink(path.join(__dirname, oldPath), () => {});
        }
    }

    res.json(response);
});

app.get("/api/technician/get_all", checkAccessToken, requireRole([2]), async (req, res) => {
    const response = await technician.getAllTechnicians();
    res.json(response);
});

app.post("/api/repair_request/delete", checkAccessToken, requireRole([2]), async (req, res) => {
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

app.post("/api/personnel/create_student", checkAccessToken, requireRole([2]), requireValidPhone, async (req, res) => {
    const { firstname, lastname, phone, username, password, room_number } = req.body;
    const response = await personnel.createStudent(firstname, lastname, phone, username, password, room_number);
    res.json(response);
});

app.post("/api/personnel/create_moderator", checkAccessToken, requireRole([2]), requireValidPhone, async (req, res) => {
    const { firstname, lastname, phone, username, password, position_id } = req.body;
    const response = await personnel.createModerator(firstname, lastname, phone, username, password, position_id);
    res.json(response);
});

app.post("/api/personnel/create_technician", checkAccessToken, requireRole([2]), requireValidPhone, async (req, res) => {
    const { firstname, lastname, phone, specialty_id } = req.body;
    const response = await personnel.createTechnician(firstname, lastname, phone, specialty_id);
    res.json(response);
});

app.post("/api/personnel/update_student", checkAccessToken, requireRole([2]), requireValidPhone, async (req, res) => {
    // username/password ไม่บังคับ — ส่งมาก็ต่อเมื่อเจ้าหน้าที่ตั้งใจจะเปลี่ยนค่านั้นจริงๆ (เว้นว่างไว้ =
    // ไม่แตะบัญชีเดิมเลย) เพราะแต่ก่อนฟังก์ชันนี้ไม่เคยรับ/อัปเดตตาราง account เลยสักบรรทัด
    const { person_id, firstname, lastname, phone, room_number, username, password } = req.body;
    const response = await personnel.updateStudent(person_id, firstname, lastname, phone, room_number, username, password);
    res.json(response);
});

app.post("/api/personnel/update_moderator", checkAccessToken, requireRole([2]), requireValidPhone, async (req, res) => {
    const { person_id, firstname, lastname, phone, position_id, username, password } = req.body;
    const response = await personnel.updateModerator(person_id, firstname, lastname, phone, position_id, username, password);
    res.json(response);
});

app.post("/api/personnel/update_technician", checkAccessToken, requireRole([2]), requireValidPhone, async (req, res) => {
    const { person_id, firstname, lastname, phone, specialty_id } = req.body;
    const response = await personnel.updateTechnician(person_id, firstname, lastname, phone, specialty_id);
    res.json(response);
});

// ตั้งรูปโปรไฟล์ตาม person_id — เจ้าหน้าที่ตั้งให้ได้ทุกบทบาท (นักศึกษา/เจ้าหน้าที่/ช่าง ซึ่งช่างไม่มีบัญชี
// จึงต้องระบุด้วย person_id) ส่วนนักศึกษาเปลี่ยนรูปตัวเองผ่าน route เดียวกันนี้ด้วย person_id ของตัวเอง
// (แทน /api/profile/photo เดิมที่หาคนจาก account_id) เพื่อให้มีเส้นทางอัปโหลดรูปเส้นเดียว
app.post("/api/personnel/:person_id/photo", checkAccessToken, requireModeratorOrSelf, (req, res, next) => {
    uploadProfilePhoto.single('photo')(req, res, (err) => {
        if (err) {
            return res.json({ isError: true, data: "", errorMessage: err.message || "อัปโหลดรูปภาพไม่สำเร็จ" });
        }
        next();
    });
}, async (req, res) => {
    const personId = parseInt(req.params.person_id, 10);

    // ไฟล์ถูกเขียนลง disk โดย multer ไปแล้วก่อนถึงตรงนี้ จึงต้องลบทิ้งเองถ้าปฏิเสธคำขอ ไม่ให้เหลือไฟล์ค้าง
    const discardUploadedFile = () => {
        if (req.file) fs.unlink(req.file.path, () => {});
    };

    if (!Number.isInteger(personId) || personId <= 0) {
        discardUploadedFile();
        return res.json({ isError: true, data: "", errorMessage: "รหัสบุคลากรไม่ถูกต้อง" });
    }
    if (!req.file) {
        return res.json({ isError: true, data: "", errorMessage: "กรุณาแนบไฟล์รูปภาพ" });
    }

    const photoPath = `/uploads/profile_photos/${req.file.filename}`;
    const response = await personnel.updateProfileImage(personId, photoPath);

    if (response.isError) {
        discardUploadedFile();
        return res.json(response);
    }

    if (response.data.previous_url) {
        fs.unlink(path.join(__dirname, response.data.previous_url), () => {});
    }

    res.json({ isError: false, data: response.data.photo_url, errorMessage: "" });
});

app.post("/api/personnel/delete", checkAccessToken, requireRole([2]), async (req, res) => {
    const personIds = req.body.person_ids;

    if (!Array.isArray(personIds) || personIds.length === 0 ||
        !personIds.every((id) => Number.isInteger(id) && id > 0)) {
        return res.json({ isError: true, data: "", errorMessage: "ข้อมูลที่ส่งมาไม่ถูกต้อง" });
    }

    // ห้ามลบบัญชีของตัวเองที่กำลังล็อกอินอยู่ — ปฏิเสธทั้งคำขอ ไม่ลบเฉพาะคนอื่นให้ เพื่อไม่ให้ผู้ใช้ไม่รู้ว่าอะไร
    // ถูกลบบ้าง ปิดแบบ fail closed: ถ้าหา person_id ของตัวเองไม่ได้ก็ไม่ยอมลบ ดีกว่าเสี่ยงลบตัวเองโดยไม่รู้ตัว
    const ownPerson = await userAccountModel.getPersonIdByAccountId(req.decoded.user_id);
    if (ownPerson.isError) {
        return res.json({ isError: true, data: "", errorMessage: "ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองใหม่" });
    }
    if (personIds.includes(ownPerson.data)) {
        return res.json({
            isError: true,
            data: "",
            errorMessage: "ไม่สามารถลบบัญชีของตัวเองที่กำลังเข้าสู่ระบบอยู่ได้"
        });
    }

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

// ปิดงานอัตโนมัติ: รันตอนเริ่ม server 1 ครั้ง แล้วทุก 1 ชั่วโมง (ไม่ใช้ library เพิ่ม) — flag running กันรอบซ้อนกันถ้ารอบก่อน
// ยังไม่จบ; ถ้า server ดับนานแล้วเปิดใหม่ เคสที่ครบกำหนดค้างอยู่จะถูกปิดพร้อมกันในรอบแรก จึงบันทึกจำนวนไว้ใน log
let autoCloseRunning = false;
async function runAutoClose() {
    if (autoCloseRunning) return;
    autoCloseRunning = true;
    try {
        const closed = await repair_request.autoCloseStaleRequests();
        if (closed > 0) {
            console.log(`ปิดงานอัตโนมัติ ${closed} เคส`);
        }
    } catch (error) {
        console.log("ปิดงานอัตโนมัติไม่สำเร็จ");
    } finally {
        autoCloseRunning = false;
    }
}
runAutoClose();
setInterval(runAutoClose, 60 * 60 * 1000);