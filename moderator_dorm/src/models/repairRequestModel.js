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