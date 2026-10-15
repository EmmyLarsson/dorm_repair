// กติกาของหน้าจัดการงานซ่อมแบบมอนิเตอร์: ปุ่มหลัก/ปุ่มกรอง ลำดับความสำคัญ และเคสที่ "ต้องจัดการ"
// เป็นฟังก์ชันล้วน (ไม่แตะ React) แยกไว้เพื่อทดสอบได้ — ธงทั้งหมด (isDueToday, isOverdue, ...) backend คำนวณด้วยเวลา server มาแล้ว
// ที่นี่แค่ประกอบเงื่อนไข ไม่เทียบเวลาที่เครื่องเจ้าหน้าที่เอง (กันนาฬิกาเครื่องเพี้ยน)
//
// หลักการของปุ่มกรอง: ปุ่มย่อยในแถวเดียวกันแบ่งกลุ่มพอดี (ผลรวมเท่าปุ่มแม่) เพื่อไม่ให้ตัวเลขดูซ้อนกัน ยกเว้น "ต้องจัดการ"
// ที่เคสหนึ่งอยู่ได้หลายเรื่อง (เช่น ถูกเร่งและเกินนัด) ตัวเลขรวมของปุ่มนั้นนับเคสไม่ซ้ำ

// ใช้ "ทุกเคส" ไม่ใช้ "ทั้งหมด" เพราะซ้ำกับปุ่มหลัก "ทั้งหมด" (ปุ่มนั้นคือทุกสถานะรวมกัน ปุ่มนี้คือทุกเคสในกลุ่มที่เลือก)
export const ALL_SUB = 'ทุกเคส';

// สถานะ: 1 รอตรวจสอบ, 2 อยู่ระหว่างซ่อม, 3 เสร็จสิ้น (รอ นศ. ยืนยัน), 4 ถูกปฏิเสธ/ยกเลิก, 5 อยู่ระหว่างการแก้ไข,
// 6 สำเร็จ, 7 รอตรวจสอบคำร้อง (อุทธรณ์), 8 ไม่สำเร็จ
const isWorking = (r) => r.statusId === 2 || r.statusId === 5;
const isRushed = (r) => Boolean(r.rushedAt) && isWorking(r);
const hasUnread = (r) => r.studentUnreadCount > 0;

// ช่วงของนัดหมายของเคสซ่อม/แก้ไข แบ่งกลุ่มพอดี เรียงตามลำดับเงื่อนไข: ยังไม่กำหนด (ขาดวันนัดหรือช่าง) › เกินนัดหมาย ›
// นัดวันนี้ (ยังไม่เลยช่วงเวลา เพราะที่เลยแล้วอยู่ "เกินนัดหมาย") › ยังไม่ถึงกำหนด (นัดเป็นวันถัดไป)
// "เกินนัดหมาย" นับเฉพาะเคสที่กำหนดครบแล้ว (ที่ยังไม่ครบอยู่ "ยังไม่กำหนด" แทน ไม่ซ้อนกัน)
function phaseOf(r) {
  if (!isWorking(r)) return null;
  if (r.isUnscheduled) return 'unset';
  if (r.isOverdue) return 'overdue';
  if (r.isDueToday) return 'today';
  return 'future';
}
const inPhase = (phase) => (r) => phaseOf(r) === phase;

const PHASE_SUBS = {
  // ตัด "ยังไม่กำหนด" ออกจากปุ่มย่อยใต้ซ่อม/แก้ไข ตามที่เจ้าหน้าที่ขอ — เคสที่ยังไม่กำหนดไม่อยู่ในซ่อม/แก้ไขอีกแล้ว
  // (ดู test ของ 'fix'/'rev' ใน STATUS_FILTERS) ไปอยู่เฉพาะปุ่มกรอง "ยังไม่กำหนด" ของตัวเอง ผลรวมปุ่มย่อยแถวนี้จึงเท่าปุ่มแม่
  เกินนัดหมาย: inPhase('overdue'),
  นัดวันนี้: inPhase('today'),
  ยังไม่ถึงกำหนด: inPhase('future'),
};

// เรื่องเร่งด่วนที่ "ต้องจัดการ" — แจ้งซ่อมใหม่/ยื่นอุทธรณ์/ยังไม่กำหนด ไม่ใส่ที่นี่ เพราะมีปุ่มของตัวเองใน "ทั้งหมด"
// และการมีอัปเดตจาก นศ. ที่ยังไม่เปิดดูมีตัวเลขแดงบอกอยู่แล้ว ไม่ต้องนับเป็นเรื่องเร่งด่วนซ้ำ
const URGENT_SUBS = {
  เร่งงาน: isRushed,
  เกินนัดหมาย: inPhase('overdue'),
  นัดหมายวันนี้: inPhase('today'),
  'นศ. ค้างยืนยัน': (r) => r.statusId === 3 && r.isStaleUnconfirmed,
};

// "แจ้งเข้ามา" แยก 2 แถว (มิติเดียวต่อแถว): ประเภทคำร้อง กับ ระยะเวลาที่รอ — ถ้าวางเรียงแถวเดียวกัน เคสเดียวจะนับซ้ำหลายปุ่ม
// "เข้ามาใหม่" = รอไม่เกิน 1 วัน เป็นคู่ตรงข้ามของ "รอเกิน 1 วัน" พอดี (ธง isReportedToday ไม่ครอบคลุมเคสที่แจ้งเมื่อวานเย็น)
const NEW_FACETS = [
  { key: 'type', label: 'ประเภท', options: { แจ้งซ่อม: (r) => r.statusId === 1, แจ้งแก้ไข: (r) => r.statusId === 7 } },
  { key: 'age', label: 'ระยะเวลารอ', options: { เข้ามาใหม่: (r) => !r.isWaitingOverDay, 'รอเกิน 1 วัน': (r) => r.isWaitingOverDay } },
];

export const MONITOR_GROUPS = [
  { key: 'todo', label: 'ต้องจัดการ', icon: 'priority_high', subs: URGENT_SUBS },
  { key: 'all', label: 'ทั้งหมด', icon: 'apps' },
];

// ปุ่มกรองของปุ่มหลัก "ทั้งหมด" เรียงตามขั้นตอนของงาน: แจ้งเข้ามา → ยังไม่กำหนด (อนุมัติแล้วรอกำหนดวัน/ช่าง) → ซ่อม → แก้ไข → ปิด
// "ยังไม่กำหนด" เป็นปุ่มกรองข้ามสถานะ (เคสเดียวกันอยู่ใน ซ่อม/แก้ไข ด้วย) จึงผลรวมของปุ่มทั้งแถวไม่เท่ากับ "ทั้งหมด"
// ภายในแบ่งเป็นขั้น: ยังไม่มีวันนัด → (มีวันแล้ว) ยังไม่มีช่าง เคสหนึ่งอยู่ได้ปุ่มเดียว
// หมายเหตุ (แก้ไขภายหลัง): ตอนนี้ "ยังไม่กำหนด" ไม่ใช่ปุ่มกรองข้ามสถานะอีกแล้ว — เคสที่ยังไม่กำหนดไม่ซ้อนอยู่ใน
// ซ่อม/แก้ไข ปุ่ม "ยังไม่กำหนด" + ซ่อม + แก้ไข จึงแบ่งเคสที่กำลังทำงานอยู่ (สถานะ 2, 5) พอดีไม่ซ้ำกัน
export const STATUS_FILTERS = [
  { key: 'new', label: 'แจ้งเข้ามา', icon: 'fiber_new', test: (r) => r.statusId === 1 || r.statusId === 7, facets: NEW_FACETS },
  {
    key: 'unset',
    label: 'ยังไม่กำหนด',
    icon: 'pending_actions',
    test: inPhase('unset'),
    subs: {
      ยังไม่กำหนดนัดซ่อม: (r) => r.statusId === 2 && !r.appointmentDate,
      ยังไม่กำหนดนัดแก้ไข: (r) => r.statusId === 5 && !r.appointmentDate,
      ยังไม่กำหนดช่าง: (r) => isWorking(r) && Boolean(r.appointmentDate) && !r.technicianId,
    },
  },
  // ซ่อม/แก้ไข ไม่รวมเคสที่ยังไม่กำหนดนัด/ช่าง (!r.isUnscheduled) — เคสเหล่านั้นอยู่ปุ่ม "ยังไม่กำหนด" ปุ่มเดียว
  { key: 'fix', label: 'อยู่ระหว่างการซ่อม', icon: 'build', test: (r) => r.statusId === 2 && !r.isUnscheduled, subs: PHASE_SUBS },
  { key: 'rev', label: 'อยู่ระหว่างการแก้ไข', icon: 'edit_note', test: (r) => r.statusId === 5 && !r.isUnscheduled, subs: PHASE_SUBS },
  {
    // "รอ นศ. ยืนยัน" = สถานะ 3 (ค้างยืนยันที่เกินกำหนดอยู่ใน "ต้องจัดการ") ส่วนสำเร็จ/ไม่สำเร็จใช้ไล่ดู feedback ของ นศ.
    key: 'done',
    label: 'เสร็จสิ้น',
    icon: 'task_alt',
    test: (r) => [3, 6, 8].includes(r.statusId),
    subs: {
      'รอ นศ. ยืนยัน': (r) => r.statusId === 3,
      สำเร็จ: (r) => r.statusId === 6,
      ไม่สำเร็จ: (r) => r.statusId === 8,
    },
  },
  {
    key: 'cancel',
    label: 'ยกเลิก',
    icon: 'cancel',
    test: (r) => r.statusId === 4,
    subs: {
      นักศึกษายกเลิก: (r) => r.isStudentCancelled,
      เจ้าหน้าที่ปฏิเสธ: (r) => !r.isStudentCancelled,
    },
  },
];

// ลำดับความสำคัญ 1 = สำคัญที่สุด (ขึ้นบนสุด):
// 1 เร่งด่วน › 2 ถูกเร่ง › 3 มีความเคลื่อนไหวจาก นศ. ที่ยังไม่เปิดดู (รวมอุทธรณ์รอตัดสิน) › 4 เกินนัดหมาย (เฉพาะเคสที่นัดและช่างครบ)
// › 5 ยังไม่กำหนดนัดหมาย/ช่าง (งานค้างที่ต้องจัดการก่อนจะกลายเป็นเกินนัดหมาย) หรือค้างยืนยัน (นศ. เงียบ ต้องตามก่อนระบบปิดเอง) › 6 ที่เหลือ
export function priorityRank(r) {
  if (r.isRushUrgent && isRushed(r)) return 1;
  if (isRushed(r)) return 2;
  if (r.statusId === 7 || hasUnread(r)) return 3;
  if (phaseOf(r) === 'overdue') return 4;
  if (r.isUnscheduled || r.isStaleUnconfirmed) return 5;
  return 6;
}

// ลำดับเรียง: ความสำคัญก่อน แล้ว
// - ลำดับ 1–5 (ต้องลงมือ): ค้างนานสุดก่อน คือวัน-เวลาที่แจ้งเก่าสุดขึ้นก่อน เพื่อไม่ให้เรื่องที่รอนานถูกทับ
// - ลำดับ 6 (ที่เหลือ): วัน-เวลาที่แจ้งล่าสุดขึ้นก่อน
// ถ้าวัน-เวลาเท่ากันเป๊ะ เรียงตามรหัสเคสแบบตัวเลข (ไม่ใช่ตัวอักษร จะได้ 9 ก่อน 10) ทิศทางเดียวกับวัน-เวลาของลำดับนั้น
// createdAt เป็น "YYYY-MM-DD HH:mm:ss" เทียบข้อความแล้วได้ทั้งวันตามด้วยเวลาในตัว
export function compareByPriority(a, b) {
  const rankA = priorityRank(a);
  const rankB = priorityRank(b);
  if (rankA !== rankB) return rankA - rankB;

  const direction = rankA === 6 ? -1 : 1;
  const byDate = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  if (byDate !== 0) return direction * byDate;
  return direction * String(a.caseCode ?? '').localeCompare(String(b.caseCode ?? ''), undefined, { numeric: true });
}

// ตัวเลือกเรียงลำดับของปุ่ม "ทั้งหมด" (กลุ่มอื่นเรียงตามความสำคัญเสมอ) — วันที่แจ้ง = createdAt ("YYYY-MM-DD HH:mm:ss" เทียบข้อความได้)
export const SORT_PRIORITY = 'priority';
export const SORT_OPTIONS = [
  { value: SORT_PRIORITY, label: 'ความสำคัญ (งานค้างก่อน)' },
  { value: 'newest', label: 'วันที่แจ้ง ใหม่สุดก่อน' },
  { value: 'oldest', label: 'วันที่แจ้ง เก่าสุดก่อน' },
];

export function comparatorOfSort(sortValue) {
  const byReportDate = (a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  if (sortValue === 'newest') return (a, b) => byReportDate(b, a);
  if (sortValue === 'oldest') return byReportDate;
  return compareByPriority;
}

// เคสที่ "ต้องจัดการ" = มีอย่างน้อย 1 เรื่องเร่งด่วนใน URGENT_SUBS (นับเคสไม่ซ้ำแม้อยู่หลายเรื่อง)
export function needsAction(r) {
  return Object.values(URGENT_SUBS).some((predicate) => predicate(r));
}

// เคสของปุ่มหลัก: "ต้องจัดการ" = เฉพาะเรื่องเร่งด่วน, "ทั้งหมด" = ทุกเคสทุกสถานะ
export function repairsOfMain(repairs, mainKey) {
  return mainKey === 'todo' ? repairs.filter(needsAction) : repairs;
}

export function repairsOfSub(items, subs, subName) {
  if (subName === ALL_SUB) return items;
  const predicate = subs?.[subName];
  return predicate ? items.filter(predicate) : items;
}

// กรองด้วยปุ่มของแต่ละแถว facet ยกเว้นแถว exceptKey — ใช้นับตัวเลขของแถวหนึ่งตามที่เลือกในอีกแถว (ผลรวมจึงไม่เกินปุ่มแม่เสมอ)
// values = { [facetKey]: ชื่อตัวเลือก | ALL_SUB }
export function repairsOfFacets(items, facets, values, exceptKey = null) {
  return facets.reduce((current, facet) => {
    if (facet.key === exceptKey) return current;
    return repairsOfSub(current, facet.options, values[facet.key] ?? ALL_SUB);
  }, items);
}

// จำนวนเคสที่ยังไม่เปิดดู (ตัวเลขแดงบนปุ่ม) — หายจากล่างขึ้นบน (เปิดการ์ด → ปุ่มกรอง → ปุ่มหลัก) ทุกปุ่มนับเคสไม่ซ้ำ
export function unreadCount(repairs) {
  return repairs.filter(hasUnread).length;
}
