export class RepairRequestModel {
  constructor({
    requestId,
    caseCode,
    studentName,
    contactPhone,
    roomNumber,
    allowEntry,
    typeNames,
    description,
    statusId,
    statusName,
    createdAt,
  }) {
    this.requestId = requestId;
    this.caseCode = caseCode;
    this.studentName = studentName;
    this.contactPhone = contactPhone;
    this.roomNumber = roomNumber;
    this.allowEntry = allowEntry;
    this.typeNames = typeNames;
    this.description = description;
    this.statusId = statusId;
    this.statusName = statusName;
    this.createdAt = createdAt;
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

    return new RepairRequestModel({
      requestId: json.request_id,
      caseCode: json.case_code,
      studentName: json.student_name ?? '',
      contactPhone: json.contact_phone ?? '',
      roomNumber: json.room_number ?? '',
      allowEntry: Boolean(json.allow_entry),
      typeNames: parsedTypes,
      description: json.description ?? '',
      statusId: json.progress_status_id ?? 1,
      statusName: json.progress_status_name ?? 'รอตรวจสอบ',
      createdAt: json.report_date,
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