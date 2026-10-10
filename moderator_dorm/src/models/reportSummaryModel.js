// ชื่อช่วงเวลาเป็นข้อความแสดงผลฝั่งหน้าเว็บ ส่วนชื่อสถานะและการจัดกลุ่มผลสุดท้าย backend เป็นผู้กำหนด (libs/report_summary.js)
const SLOT_LABELS = {
  '09-11': '09:00–11:00',
  '13-15': '13:00–15:00',
  '15-17': '15:00–17:00',
};

const toNumber = (value) => Number(value) || 0;
const toNumberOrNull = (value) => (value == null ? null : Number(value));

export class ReportSummaryModel {
  constructor({
    range,
    today,
    total,
    cards,
    outcomes,
    repairTypes,
    appeal,
    appealReasons,
    slots,
    equipment,
    daily,
    todayAppointments,
    overdue,
  }) {
    this.range = range;
    this.today = today;
    this.total = total;
    this.cards = cards;
    this.outcomes = outcomes;
    this.repairTypes = repairTypes;
    this.appeal = appeal;
    this.appealReasons = appealReasons;
    this.slots = slots;
    this.equipment = equipment;
    this.daily = daily;
    this.todayAppointments = todayAppointments;
    this.overdue = overdue;
  }

  // กราฟวงกลม 3 ชิ้นของผลสุดท้ายที่จบแล้ว: สำเร็จ / ไม่สำเร็จ / ยกเลิก (ยกเลิกมีรายการย่อยนักศึกษา/เจ้าหน้าที่)
  getOutcomeSlices() {
    const { success, failed, cancelled } = this.outcomes;

    return [
      { key: 'success', label: success.name, total: success.total, items: [] },
      { key: 'failed', label: failed.name, total: failed.total, items: [] },
      { key: 'cancelled', label: 'ยกเลิก', total: cancelled.total, items: cancelled.items },
    ];
  }

  // เปอร์เซ็นต์ต่อเคสที่จบแล้ว (ปัดเป็นจำนวนเต็ม) — 0 เมื่อยังไม่มีเคสที่จบ กันหารศูนย์
  getPercent(count) {
    return this.outcomes.closedTotal > 0 ? Math.round((count / this.outcomes.closedTotal) * 100) : 0;
  }

  getSlotLabel(slotKey) {
    return SLOT_LABELS[slotKey] ?? slotKey;
  }

  // เคสที่จบแล้วและนับในแท่งเทียบยืนยันครั้งแรก/อุทธรณ์ (ไม่รวมเคสที่ยังอุทธรณ์ค้าง)
  getClosedAppealTotal() {
    return this.appeal.firstAccepted + this.appeal.appealSucceeded + this.appeal.appealFailed;
  }

  // ไม่มีเคสเลยในช่วงที่เลือก — ให้หน้าแสดงสถานะ "ไม่มีข้อมูล" แทนกราฟว่างทั้งหน้า
  isEmpty() {
    return this.total === 0;
  }

  static fromJson(json) {
    const status = (s) => ({ id: s?.id ?? null, name: s?.name ?? '', total: toNumber(s?.total) });

    return new ReportSummaryModel({
      range: json.range ?? '30',
      today: json.today ?? '',
      total: toNumber(json.total),
      cards: {
        reportedToday: toNumber(json.cards?.reportedToday),
        reportedInRange: toNumber(json.cards?.reportedInRange),
        avgRating: toNumberOrNull(json.cards?.avgRating),
        ratingCount: toNumber(json.cards?.ratingCount),
        avgRepairDays: toNumberOrNull(json.cards?.avgRepairDays),
        avgApproveHours: toNumberOrNull(json.cards?.avgApproveHours),
      },
      outcomes: {
        closedTotal: toNumber(json.outcomes?.closedTotal),
        inProgressTotal: toNumber(json.outcomes?.inProgressTotal),
        success: status(json.outcomes?.success),
        failed: status(json.outcomes?.failed),
        cancelled: {
          total: toNumber(json.outcomes?.cancelled?.total),
          items: (json.outcomes?.cancelled?.items ?? []).map((item) => ({
            key: item.key ?? null,
            name: item.name ?? '',
            total: toNumber(item.total),
          })),
        },
      },
      repairTypes: (json.repairTypes ?? []).map((t) => ({ id: t.id, name: t.name ?? '', total: toNumber(t.total) })),
      appeal: {
        firstAccepted: toNumber(json.appeal?.firstAccepted),
        appealSucceeded: toNumber(json.appeal?.appealSucceeded),
        appealFailed: toNumber(json.appeal?.appealFailed),
        appealPending: toNumber(json.appeal?.appealPending),
      },
      appealReasons: (json.appealReasons ?? []).map((r) => ({ name: r.name ?? '', total: toNumber(r.total) })),
      slots: (json.slots ?? []).map((s) => ({ key: s.key, total: toNumber(s.total) })),
      equipment: (json.equipment ?? []).map((e) => ({
        id: e.id,
        name: e.name ?? '',
        unit: e.unit ?? '',
        type: e.type ?? '',
        total: toNumber(e.total),
      })),
      daily: (json.daily ?? []).map((d) => ({ date: d.date, repair: toNumber(d.repair), revision: toNumber(d.revision) })),
      todayAppointments: {
        repair: toNumber(json.todayAppointments?.repair),
        revision: toNumber(json.todayAppointments?.revision),
      },
      overdue: (json.overdue ?? []).map((o) => ({
        requestId: o.requestId,
        caseCode: o.caseCode ?? '',
        roomNumber: o.roomNumber ?? '',
        typeNames: o.typeNames ?? '',
        statusId: o.statusId,
        statusName: o.statusName ?? '',
        daysOpen: toNumber(o.daysOpen),
      })),
    });
  }
}

export class ReportSummaryResponse {
  constructor({ isError, data, errorMessage }) {
    this.isError = isError;
    this.data = data;               // ReportSummaryModel (null เมื่อ isError)
    this.errorMessage = errorMessage;
  }

  static fromJson(json) {
    return new ReportSummaryResponse({
      isError: json.isError,
      data: json.isError || !json.data ? null : ReportSummaryModel.fromJson(json.data),
      errorMessage: json.errorMessage ?? '',
    });
  }
}
