export class RepairRequestModel {
  constructor({
    requestId,
    caseCode,
    studentName,
    studentProfileImage,
    contactPhone,
    roomNumber,
    allowEntry,
    typeNames,
    repairTypes,
    description,
    statusId,
    statusName,
    technicianId,
    technicianName,
    appointmentDate,
    createdAt,
    maxComplaints,
    rushedAt,
    rushCount,
    rushReasonName,
    rushReasonNote,
    isRushUrgent,
    complaintCount,
    appealFiledAt,
    appealReasonName,
    studentUnreadCount,
    unreadEventTypes,
    isDueToday,
    isOverdue,
    isUnscheduled,
    isReportedToday,
    isWaitingOverDay,
    isStaleUnconfirmed,
    autoCloseAt,
    isStudentCancelled,
    evaluationRating,
    evaluationFeedback,
    declineReason,
  }) {
    this.requestId = requestId;
    this.caseCode = caseCode;
    this.studentName = studentName;
    // path รูปโปรไฟล์ของนักศึกษา — backend ส่งมาเฉพาะเคสที่แจ้งด้วยข้อมูลเดิมของโปรไฟล์ (null = เคสที่กรอกข้อมูลใหม่)
    this.studentProfileImage = studentProfileImage;
    this.contactPhone = contactPhone;
    this.roomNumber = roomNumber;
    this.allowEntry = allowEntry;
    this.typeNames = typeNames;
    // repairTypes: [{id, name}] — มี id กำกับแต่ละอาการ (typeNames ข้างบนมีแค่ชื่อรวมเป็น string หา id
    // ไม่ได้) ใช้สร้างการ์ดรายงานผลซ่อมแยกรายรายการในหน้าจัดการงานซ่อม
    this.repairTypes = repairTypes;
    this.description = description;
    this.statusId = statusId;
    this.statusName = statusName;
    this.technicianId = technicianId;
    this.technicianName = technicianName;
    this.appointmentDate = appointmentDate;
    this.createdAt = createdAt;
    // จำนวนครั้งที่นักศึกษายื่นอุทธรณ์ได้ของเคสนี้ (repair_request.max_complaints) เจ้าหน้าที่ปรับรายเคสได้ 1-5
    this.maxComplaints = maxComplaints;
    // ข้อมูลการเร่งงานของ นศ. (rushedAt มีค่า = ยังรอเจ้าหน้าที่ตอบสนอง ถูกล้างเมื่อเลื่อนนัด/ส่งงาน) เหตุผลคือของครั้งล่าสุด
    // isRushUrgent = เหตุผลนั้นติดธงเร่งด่วน (rush_reason.is_urgent) — ใช้ทำป้ายและเรียงเคสขึ้นก่อน
    this.rushedAt = rushedAt;
    this.rushCount = rushCount;
    this.rushReasonName = rushReasonName;
    this.rushReasonNote = rushReasonNote;
    this.isRushUrgent = isRushUrgent;
    // คำร้องอุทธรณ์ที่รอตัดสิน (สถานะ 7): ครั้งที่เท่าไหร่ ยื่นเมื่อไหร่ เหตุผลหมวดไหน
    this.complaintCount = complaintCount;
    this.appealFiledAt = appealFiledAt;
    this.appealReasonName = appealReasonName;
    // จำนวนแจ้งเตือนที่เจ้าหน้าที่ยังไม่อ่านของเคสนี้ → ป้าย "มีอัปเดตใหม่จากนักศึกษา" บนการ์ด
    this.studentUnreadCount = studentUnreadCount;
    // event_type ทุกเรื่อง (ไม่ซ้ำ) ที่ยังไม่ได้อ่าน (new_request, appeal_filed, rush_requested, ...) ใช้แยกบอกทีละหัวข้อบนป้าย
    this.unreadEventTypes = unreadEventTypes;
    // ธงหัวข้อย่อยของหน้าจัดการงานซ่อม (backend คำนวณด้วยเวลา server): นัดหมายวันนี้ / เลยช่วงนัด / ยังไม่มีนัดหรือช่าง /
    // แจ้งวันนี้ / แจ้งแล้วรอเกิน 1 วัน
    this.isDueToday = isDueToday;
    this.isOverdue = isOverdue;
    this.isUnscheduled = isUnscheduled;
    this.isReportedToday = isReportedToday;
    this.isWaitingOverDay = isWaitingOverDay;
    // ค้างยืนยัน = สถานะ 3 ที่ นศ. ยังไม่กดยอมรับ/ไม่ยอมรับเกินกำหนด (backend คำนวณ) autoCloseAt = เวลาที่ระบบจะปิดอัตโนมัติ
    // isStudentCancelled = สถานะ 4 ที่ นศ. ยกเลิกเอง (ไม่ใช่เจ้าหน้าที่ปฏิเสธ)
    this.isStaleUnconfirmed = isStaleUnconfirmed;
    this.autoCloseAt = autoCloseAt;
    this.isStudentCancelled = isStudentCancelled;
    // feedback ของนักศึกษา: คะแนน/ข้อความประเมิน (เคสสำเร็จ) และเหตุผลที่ไม่ยอมรับผลซ่อม (เคสไม่สำเร็จ) — แสดงย่อบนการ์ด
    this.evaluationRating = evaluationRating;
    this.evaluationFeedback = evaluationFeedback;
    this.declineReason = declineReason;
  }

  getAppointmentDateLabel() {
    if (!this.appointmentDate) {
      return '';
    }

    const [datePart, timePart] = this.appointmentDate.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00:00').split(':').map(Number);
    const date = new Date(year, month - 1, day, hour, minute);

    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ' ' + `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} น.`;
  }

  getRepairRequestDate() {
    const [datePart, timePart] = this.createdAt.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = (timePart || '00:00:00')
      .split(':')
      .map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  getRepairRequestDateLabel() {
    return this.getRepairRequestDate().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  static fromJson(json) {
    const rawTypes = json.type_names ?? '';
    const parsedTypes = rawTypes
      ? rawTypes.split(',').map((t) => t.trim())
      : [];

    // repair_types_json มาจาก JSON_ARRAYAGG ฝั่ง SQL — mariadb driver (v3.x) รู้จักชนิดคอลัมน์ JSON
    // อยู่แล้ว เลย "แปลงเป็น array ของ JS ให้เองล่วงหน้า" ไม่ได้ส่งมาเป็น string เหมือนที่เข้าใจตอนแรก
    // ถ้าไป JSON.parse() ซ้ำอีกรอบ (parse ของที่แปลงมาให้แล้ว) จะ error แล้วร่วงไป catch เงียบๆ ทำให้
    // repairTypes ว่างเปล่าตลอด การ์ดรายงานเลยไม่มีวันโผล่มาเลยสักใบ — เช็คชนิดก่อนว่าเป็น string จริง
    // ไหมค่อย parse ถ้าเป็น array/object อยู่แล้วก็ใช้ตรงๆ เผื่อ driver คนละเวอร์ชันพฤติกรรมต่างกัน
    let repairTypes = [];
    try {
      const raw = json.repair_types_json;
      const rawRepairTypes = (typeof raw === 'string' ? JSON.parse(raw || '[]') : raw) ?? [];
      repairTypes = rawRepairTypes
        .filter((t) => t && t.repair_type_id != null)
        .map((t) => ({ id: t.repair_type_id, name: t.repair_type_name }));
    } catch (e) {
      repairTypes = [];
    }

    return new RepairRequestModel({
      requestId: json.request_id,
      caseCode: json.case_code,
      studentName: json.student_name ?? '',
      studentProfileImage: json.student_profile_image ?? null,
      contactPhone: json.contact_phone ?? '',
      roomNumber: json.room_number ?? '',
      allowEntry: Boolean(json.allow_entry),
      typeNames: parsedTypes,
      repairTypes,
      description: json.description ?? '',
      statusId: json.progress_status_id ?? 1,
      statusName: json.progress_status_name ?? 'รอตรวจสอบ',
      technicianId: json.technician_id ?? null,
      technicianName: json.technician_name ?? '',
      appointmentDate: json.appointment_date ?? null,
      createdAt: json.report_date,
      maxComplaints: json.max_complaints ?? 2,
      rushedAt: json.rushed_at ?? null,
      rushCount: Number(json.rush_count) || 0,
      rushReasonName: json.rush_reason_name ?? '',
      rushReasonNote: json.rush_reason_note ?? '',
      // MariaDB ส่ง boolean เป็น 0/1 (หรือ null) — แปลงเป็น boolean จริงกัน truthy ผิดพลาด
      isRushUrgent: Boolean(Number(json.is_rush_urgent)),
      complaintCount: Number(json.complaint_count) || 0,
      appealFiledAt: json.appeal_filed_at ?? null,
      appealReasonName: json.appeal_reason_name ?? '',
      studentUnreadCount: Number(json.student_unread_count) || 0,
      unreadEventTypes: (json.unread_event_types ?? '').split(',').filter(Boolean),
      isDueToday: Boolean(Number(json.is_due_today)),
      isOverdue: Boolean(Number(json.is_overdue)),
      isUnscheduled: Boolean(Number(json.is_unscheduled)),
      isReportedToday: Boolean(Number(json.is_reported_today)),
      isWaitingOverDay: Boolean(Number(json.is_waiting_over_day)),
      isStaleUnconfirmed: Boolean(Number(json.is_stale_unconfirmed)),
      autoCloseAt: json.auto_close_at ?? null,
      isStudentCancelled: Boolean(Number(json.is_student_cancelled)),
      evaluationRating: json.evaluation_rating == null ? null : Number(json.evaluation_rating),
      evaluationFeedback: json.evaluation_feedback ?? '',
      declineReason: json.decline_reason ?? '',
    });
  }
}

export class RepairRequestResponse {
  constructor({ isError, data, errorMessage }) {
    this.isError = isError;
    this.data = data;               // array ของ RepairRequestModel
    this.errorMessage = errorMessage;
  }

  static fromJson(json) {
    return new RepairRequestResponse({
      isError: json.isError,
      data: (json.data ?? []).map((item) => RepairRequestModel.fromJson(item)),
      errorMessage: json.errorMessage ?? '',
    });
  }
}