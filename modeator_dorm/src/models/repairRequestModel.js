export class RepairRequestModel {
  constructor({
    requestId,
    caseCode,
    typeNames,
    description,
    statusId,
    statusName,
    createdAt,
  }) {
    this.requestId = requestId;
    this.caseCode = caseCode;
    this.typeNames = typeNames;       // array ของ string
    this.description = description;
    this.statusId = statusId;
    this.statusName = statusName;
    this.createdAt = createdAt;       // string ดิบจาก backend เช่น "07-02-2569 10:30:00"
  }

  /** เทียบเท่า getRepairRequestDateTime() ใน Dart */
  getRepairRequestDate() {
    // รูปแบบ backend: "dd-MM-yyyy HH:mm:ss"
    const [datePart, timePart] = this.createdAt.split(' ');
    const [day, month, year] = datePart.split('-').map(Number);
    const [hour, minute, second] = (timePart || '00:00:00')
      .split(':')
      .map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  /** เทียบเท่า factory fromJson() ใน Dart */
  static fromJson(json) {
    const rawTypes = json.type_names ?? '';
    const parsedTypes = rawTypes
      ? rawTypes.split(',').map((t) => t.trim())
      : [];

    return new RepairRequestModel({
      requestId: json.request_id,
      caseCode: json.case_code,
      typeNames: parsedTypes,
      description: json.description ?? '',
      statusId: json.progress_status_id ?? 1,
      statusName: json.progress_status_name ?? 'รอตรวจสอบ',
      createdAt: json.report_date,
    });
  }
}

/**
 * RepairRequestResponse
 * เทียบเท่ากับ RepairRequestResponse.dart — envelope ของผลลัพธ์ API
 */
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