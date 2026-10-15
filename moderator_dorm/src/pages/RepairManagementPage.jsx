import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import BaseModal from '../components/BaseModal';
import PhotoLightbox from '../components/PhotoLightbox';
import { InfoRow } from '../components/ui/InfoRow';
import StatusPill from '../components/StatusPill';
import RepairCard from '../components/RepairCard.jsx';
import RepairDetailModal from '../components/RepairDetailModal';
import RejectReasonModal from '../components/RejectReasonModal';
import EquipmentPickerModal from '../components/EquipmentPickerModal';
import CompletionItemReportCard from '../components/CompletionItemReportCard';
import { AppAPI } from '../utils/appApi';
import { photoFullUrl } from '../utils/photoUtil';
import { appointmentToastLabel } from '../utils/appointmentLabel';
import { RepairRequestModel } from '../models/repairRequestModel';
import { InventoryModel } from '../models/inventoryModel';
import { markCaseNotificationsRead } from '../utils/caseNotification';
import {
  ALL_SUB,
  MONITOR_GROUPS,
  SORT_OPTIONS,
  SORT_PRIORITY,
  STATUS_FILTERS,
  comparatorOfSort,
  repairsOfFacets,
  repairsOfMain,
  repairsOfSub,
  unreadCount,
} from '../utils/repairMonitor';

const CARDS_PER_PAGE = 6;

function mapRepairRequestRow(row) {
  const model = RepairRequestModel.fromJson(row);

  return {
    id: model.requestId,
    caseCode: model.caseCode,
    studentName: model.studentName,
    studentProfileImage: model.studentProfileImage,
    contactPhone: model.contactPhone,
    roomNumber: model.roomNumber,
    allowEntry: model.allowEntry,
    typeNames: model.typeNames,
    repairTypes: model.repairTypes,
    description: model.description,
    reportDate: model.getRepairRequestDateLabel(),
    statusId: model.statusId,
    statusName: model.statusName,
    technicianId: model.technicianId,
    technicianName: model.technicianName,
    appointmentDate: model.appointmentDate,
    appointmentDateLabel: model.getAppointmentDateLabel(),
    maxComplaints: model.maxComplaints,
    rushedAt: model.rushedAt,
    rushCount: model.rushCount,
    rushReasonName: model.rushReasonName,
    rushReasonNote: model.rushReasonNote,
    isRushUrgent: model.isRushUrgent,
    complaintCount: model.complaintCount,
    appealFiledAt: model.appealFiledAt,
    appealReasonName: model.appealReasonName,
    studentUnreadCount: model.studentUnreadCount,
    unreadEventTypes: model.unreadEventTypes,
    isDueToday: model.isDueToday,
    isOverdue: model.isOverdue,
    isUnscheduled: model.isUnscheduled,
    isReportedToday: model.isReportedToday,
    isWaitingOverDay: model.isWaitingOverDay,
    isStaleUnconfirmed: model.isStaleUnconfirmed,
    autoCloseAt: model.autoCloseAt,
    isStudentCancelled: model.isStudentCancelled,
    evaluationRating: model.evaluationRating,
    evaluationFeedback: model.evaluationFeedback,
    declineReason: model.declineReason,
    createdAt: model.createdAt,
  };
}

async function getAllRepairRequests() {
  const response = await AppAPI.get("/repair_request/get_all");
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map(mapRepairRequestRow);
}

async function approveRepairRequest(requestId) {
  const response = await AppAPI.post("/repair_request/approve", {
    request_id: requestId,
  });

  return response.json();
}

async function rejectRepairRequest(requestId, reason) {
  const response = await AppAPI.post("/repair_request/reject", {
    request_id: requestId,
    reason,
  });

  return response.json();
}

// ยกเลิกงานที่อนุมัติแล้วแต่ยังไม่ส่งงาน (สถานะ 2) — คนละ endpoint กับ /reject ที่ใช้ตอนตรวจสอบคำร้องสถานะ 1
async function cancelInProgressRepairRequest(requestId, reason) {
  const response = await AppAPI.post("/repair_request/cancel_in_progress", {
    request_id: requestId,
    reason,
  });

  return response.json();
}

async function getRepairRequestDetail(requestId) {
  const response = await AppAPI.get(`/repair_request/get_by_id/${requestId}`);
  const json = await response.json();
  const model = RepairRequestModel.fromJson(json.data);

  return {
    id: model.requestId,
    caseCode: model.caseCode,
    studentName: model.studentName,
    contactPhone: model.contactPhone,
    roomNumber: model.roomNumber,
    allowEntry: model.allowEntry,
    typeNames: model.typeNames,
    description: model.description,
    statusId: model.statusId,
    statusName: model.statusName,
    technicianId: model.technicianId,
    technicianName: model.technicianName,
    appointmentDate: model.appointmentDate,
    reportDate: model.getRepairRequestDateLabel(),
  };
}

async function getRepairTimeline(requestId) {
  const response = await AppAPI.get(`/repair_request/get_timeline/${requestId}`);
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    stepCode: row.step_code,
    eventDetail: row.event_detail,
    eventDate: row.event_date,
  }));
}

// ผลประเมินงานซ่อมของนักศึกษา (ดาว+ข้อความ+รูป) — คืน null ถ้ายังไม่ได้ประเมิน (เคสยังไม่ถึงสถานะ 6 หรือ
// ยังไม่กดประเมิน) ใช้ endpoint เดิมที่มีอยู่แล้ว (นักศึกษาเรียกใช้ตอนกดประเมิน) แต่ก่อนหน้านี้ฝั่งเจ้าหน้าที่
// ไม่เคยเรียกเลย แท็บ "ผลการประเมิน" จึงเป็นข้อความตายตัวมาตลอด
async function getEvaluation(requestId) {
  const response = await AppAPI.get(`/repair_request/${requestId}/evaluation`);
  const json = await response.json();

  if (json.isError || !json.data) return null;

  return {
    rating: json.data.rating,
    feedback: json.data.feedback,
    evaluatedAt: json.data.evaluated_at,
    photos: (Array.isArray(json.data.photos) ? json.data.photos : []).map((p) => ({
      photoId: p.evaluation_photo_id,
      photoUrl: p.photo_url,
    })),
  };
}

async function cancelAppointment(requestId) {
  const response = await AppAPI.post("/repair_request/cancel_appointment", {
    request_id: requestId,
  });

  return response.json();
}

async function deleteRepairRequests(requestIds) {
  const response = await AppAPI.post("/repair_request/delete", {
    request_ids: Array.isArray(requestIds) ? requestIds : [requestIds],
  });

  return response.json();
}

async function getTechnicianList() {
  const response = await AppAPI.get("/technician/get_all");
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    id: row.technician_id,
    name: row.full_name,
    specialtyName: row.specialty_name,
  }));
}

async function assignTechnician(requestId, technicianId, appointmentDate, notes, equipmentUsage) {
  const response = await AppAPI.post("/repair_request/assign_technician", {
    request_id: requestId,
    technician_id: technicianId,
    appointment_date: appointmentDate,
    notes,
    equipment_usage: equipmentUsage,
  });

  return response.json();
}

async function getAllEquipment() {
  const response = await AppAPI.get('/equipment/get_all');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map(InventoryModel.fromJson);
}

async function getEquipmentTypeList() {
  const response = await AppAPI.get('/equipment/get_type');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    equipmentTypeId: row.equipment_type_id,
    equipmentTypeName: row.equipment_type_name,
  }));
}

async function getRepairEquipmentUsage(requestId) {
  const response = await AppAPI.get(`/repair_request/${requestId}/equipment`);
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    equipmentId: row.equipment_id,
    equipmentCode: row.equipment_code,
    equipmentName: row.equipment_name,
    unitName: row.unit_name,
    quantity: row.quantity_used,
    // รอบที่เบิกใช้: 0 = ซ่อม, 1-2 = แก้ไขครั้งที่ 1-2 (backend คืนมาทุกรอบเพื่อแสดงประวัติ)
    revisionRound: row.revision_round ?? 0,
  }));
}

// ครุภัณฑ์ที่ใช้ของ "หนึ่งรอบ" แสดงอย่างเดียว (ประวัติ) — ใช้ทั้งในมุมมองรอบที่ผ่านไปแล้วและสรุปรอบก่อนหน้าตอนนัดรอบแก้ไข
function EquipmentUsageHistory({ items, emptyText }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li
          key={item.equipmentId}
          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        >
          <span className="font-bold text-slate-800 truncate">{item.equipmentName}</span>
          <span className="shrink-0 text-xs font-semibold text-slate-500">
            {item.quantity} {item.unitName}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function completeRepairRequest(requestId) {
  const response = await AppAPI.post("/repair_request/complete", {
    request_id: requestId,
  });

  return response.json();
}

// รายงานผลซ่อมแยกตามรายการงานซ่อม (repair_type) ของเคส
async function getCompletionItems(requestId) {
  const response = await AppAPI.get(`/repair_request/${requestId}/completion_items`);
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    completionItemId: row.completion_item_id,
    repairTypeId: row.repair_type_id,
    repairTypeName: row.repair_type_name,
    // 0 = รายงานการซ่อม (ซ่อมรอบแรก), 1-2 = รายงานการแก้ไขครั้งที่ 1-2 (อุทธรณ์ได้สูงสุด 2 รอบ)
    revisionRound: row.revision_round ?? 0,
    reportText: row.report_text || '',
    photos: (Array.isArray(row.photos) ? row.photos : []).map((p) => ({
      photoId: p.completion_item_photo_id,
      photoUrl: p.photo_url,
    })),
  }));
}

// ชื่อเมนูใหญ่ของแต่ละรอบ: 0 = "ซ่อม" ส่วน 1-2 = "แก้ไขครั้งที่ N"
function roundLabel(round) {
  return round === 0 ? 'ซ่อม' : `แก้ไขครั้งที่ ${round}`;
}
function roundReportTitle(round) {
  return round === 0 ? 'รายงานการซ่อม' : `รายงานการแก้ไขครั้งที่ ${round}`;
}


// บันทึกรายงาน+รูปของ "1 รายการงานซ่อม" — เจ้าหน้าที่กด "บันทึก" ทีละการ์ด
async function saveCompletionItemReport(requestId, repairTypeId, reportText, existingPhotoUrls, newPhotoFiles) {
  const response = await AppAPI.postFormData(`/repair_request/${requestId}/completion_items/${repairTypeId}/report`, {
    files: newPhotoFiles,
    fieldName: 'photos',
    fields: {
      report_text: reportText || '',
      existing_photo_urls: JSON.stringify(existingPhotoUrls || []),
    },
  });

  return response.json();
}

async function getComplaints(requestId) {
  const response = await AppAPI.get(`/repair_request/${requestId}/complaints`);
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    complaintId: row.complaint_id,
    complaintText: row.complaint_text,
    // เคสเก่าก่อนมีฟีเจอร์นี้จะเป็น null (LEFT JOIN ฝั่ง backend กับตาราง complaint_reason)
    reasonCategoryName: row.complaint_reason_name,
    // เคสเก่าก่อนมีฟีเจอร์นี้เป็น null (ไม่รู้ค่า) ต่างจาก false (เลือก "ไม่อนุญาต" จริงๆ)
    allowEntry: row.allow_entry === null ? null : row.allow_entry === 1,
    decision: row.decision,
    filedAt: row.filed_at,
    decidedAt: row.decided_at,
    // มีค่า = นักศึกษาแก้ไขคำร้องนี้แล้ว 1 ครั้ง (แก้ได้ครั้งเดียวและแก้ไม่ได้หลังเจ้าหน้าที่เริ่มตรวจ) — เจ้าหน้าที่
    // ควรรู้ว่าข้อความที่อ่านอยู่เป็นฉบับที่ถูกแก้ไขแล้ว
    editedAt: row.edited_at,
    photos: (Array.isArray(row.photos) ? row.photos : []).map((p) => ({
      photoId: p.complaint_photo_id,
      photoUrl: p.photo_url,
    })),
  }));
}

// มินิปฏิทินเช็คคิวนัดหมาย (แท็บ "นัดหมาย") — excludeRequestId กันนัดเดิมของเคสที่กำลังแก้ไขอยู่มา
// แย่งที่ตัวเอง (ตอนเลื่อนนัด/แก้ไขนัดของเคสเดียวกัน) ตรงกับ excludeRequestId ที่ backend ใช้ตอนจัดคิวอัตโนมัติ
async function getSlotAvailability(startDate, days, excludeRequestId) {
  const params = new URLSearchParams({ start: startDate, days: String(days) });
  if (excludeRequestId) params.set('exclude_request_id', String(excludeRequestId));
  const response = await AppAPI.get(`/repair_request/slot_availability?${params.toString()}`);
  const json = await response.json();
  return json.isError ? {} : json.data;
}

// แจ้ง backend ว่าเจ้าหน้าที่เปิดดูคำร้องแล้ว (ขึ้น timeline "กำลังตรวจสอบ" ให้นักศึกษา) — ไม่บล็อก UI ถ้าล้มเหลว
async function markComplaintReviewing(requestId) {
  try {
    await AppAPI.post('/repair_request/complaint/reviewing', { request_id: requestId });
  } catch (e) {
    // เงียบไว้ได้ เพราะแค่การ์ดแจ้งความคืบหน้า ไม่กระทบการตัดสินใจคำร้อง
  }
}

// ปรับจำนวนครั้งที่นักศึกษายื่นอุทธรณ์ได้ของ "เคสนี้" (backend ตรวจช่วง 1-5 และกติกาเคสซ้ำอีกชั้น)
const MIN_COMPLAINT_LIMIT = 1;
const MAX_COMPLAINT_LIMIT = 5;

async function updateComplaintLimit(requestId, maxComplaints) {
  const response = await AppAPI.post('/repair_request/complaint/limit', {
    request_id: requestId,
    max_complaints: maxComplaints,
  });

  return response.json();
}

async function decideComplaint(complaintId, requestId, decision, reason) {
  const response = await AppAPI.post('/repair_request/complaint/decide', {
    complaint_id: complaintId,
    request_id: requestId,
    decision,
    reason: reason || '',
  });

  return response.json();
}

const SLOT_DEFS = [
  { key: '09-11', label: '09:00-11:00' },
  { key: '13-15', label: '13:00-15:00' },
  { key: '15-17', label: '15:00-17:00' },
];

const THAI_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function addDaysToDateStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  // ประกอบวันที่ตามเวลาเครื่องเอง — toISOString() แปลงเป็น UTC ทำให้เขตเวลา UTC+7 ถอยหลังไป 1 วัน
  // (เที่ยงคืนวันที่ 12 กลายเป็น 11) มินิปฏิทินจึงเริ่มจาก "เมื่อวาน" และเลือกวันที่ผ่านไปแล้วได้
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatThaiDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${THAI_WEEKDAYS[d.getDay()]} ${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// มินิปฏิทินเช็คคิวนัดหมาย 7 วันล่วงหน้า × 3 ช่วงเวลา — คลิกช่องเพื่อเลือกวันที่/ช่วงเวลาแทนช่อง
// input วันที่ + select ช่วงเวลาแบบเดิม (mockup 2 แบบเทียบกันแล้ว ผู้ใช้เลือกแบบนี้เพราะเห็นภาพรวม
// หลายวันพร้อมกัน มีประโยชน์เวลาต้องหาวันว่างสำหรับเคสที่ไม่อนุญาตเข้าห้อง/เคสเลื่อนนัด)
function SlotAvailabilityCalendar({ minDate, availability, selectedDate, selectedTimeslot, onPick, isRevisionRound = false }) {
  if (!minDate) return null;

  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateStr(minDate, i));
  const selectedSlot = availability?.[selectedDate]?.[selectedTimeslot];

  // ช่วงของวันนี้ที่เริ่มไปแล้ว (ชั่วโมงเริ่ม <= ชั่วโมงปัจจุบัน) เลือกไม่ได้ — เกณฑ์เดียวกับที่ backend
  // (assignTechnician / findNextAvailableAppointment) ใช้ ใช้วันที่ตามเวลาเครื่องไม่ใช่ UTC
  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-sm font-bold">{isRevisionRound ? 'นัดหมายวันแก้ไข + ช่วงเวลา' : 'นัดหมายวันซ่อม + ช่วงเวลา'}</label>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-50 border-[1.5px] border-emerald-300 inline-block" />ว่าง</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border-[1.5px] border-amber-300 inline-block" />จองบางส่วน</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border-[1.5px] border-red-300 inline-block" />เต็ม</span>
        </div>
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `84px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((date) => {
          const d = new Date(date + 'T00:00:00');
          return (
            <div key={date} className="text-center py-1">
              <div className="text-[10px] text-slate-400 font-semibold">{THAI_WEEKDAYS[d.getDay()]}</div>
              <div className="text-xs font-extrabold text-slate-700">{d.getDate()}/{d.getMonth() + 1}</div>
            </div>
          );
        })}

        {SLOT_DEFS.map((slotDef) => (
          <React.Fragment key={slotDef.key}>
            <div className="flex items-center text-[11px] font-bold text-slate-500 pr-1">{slotDef.label}</div>
            {days.map((date) => {
              const slot = availability?.[date]?.[slotDef.key] || { count: 0, isRevisionLocked: false, cases: [] };
              const isFull = slot.isRevisionLocked || slot.count >= 3;
              const isPartial = !isFull && slot.count > 0;
              const isSelected = selectedDate === date && selectedTimeslot === slotDef.key;
              const isPast = date === todayLocal && Number(slotDef.key.split('-')[0]) <= now.getHours();
              const colorClasses = isPast
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : isFull
                ? 'bg-red-100 border-red-300 text-red-800'
                : isPartial
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800';
              const caseTitle = slot.cases.length > 0
                ? slot.cases.map((c) => `${c.caseCode}${c.typeNames ? ` (${c.typeNames})` : ''}`).join(', ')
                : 'ว่าง';

              return (
                <button
                  key={date + slotDef.key}
                  type="button"
                  title={isPast ? 'ช่วงเวลานี้ผ่านไปแล้ว' : caseTitle}
                  disabled={isPast}
                  onClick={() => onPick(date, slotDef.key)}
                  className={`rounded-lg border-[1.5px] py-2 text-[11px] font-extrabold min-h-11 ${colorClasses} ${
                    isSelected ? 'ring-2 ring-blue-700 ring-offset-1' : ''
                  }`}
                >
                  {isPast ? 'ผ่านแล้ว' : slot.isRevisionLocked ? 'เต็ม' : `${slot.count}/3`}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {selectedSlot && selectedSlot.cases.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500">เคสที่จองช่วงนี้แล้ว:</span>
          {selectedSlot.cases.map((c) => (
            <span key={c.caseCode} className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-600">
              {c.caseCode}{c.typeNames ? ` · ${c.typeNames}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ปุ่มกรองเล็กของหน้านี้ (ปุ่มกรองสถานะ/เรื่องเร่งด่วน/ตัวกรองย่อย) — ใช้เฉพาะหน้านี้จึงไม่ย้ายไป components/ จนกว่าหน้าอื่นจะใช้
// unread = จำนวนเคสที่ยังไม่เปิดดู แสดงเป็นป้ายแดงเล็ก "ในปุ่ม" ต่อจากจำนวนรวม (0 = ไม่แสดง) ไม่ลอยทับมุมปุ่ม เพื่อไม่ให้ซ้อนกับ
// ปุ่มข้างๆ — ปุ่มตัวกรองย่อย (small) แสดงเฉพาะตัวเลข ส่วนปุ่มชั้นบนมีคำว่า "ใหม่" ต่อท้ายให้เข้าใจความหมาย; เกิน 9 แสดง "9+"
function FilterChip({ label, icon, count, unread = 0, isActive, small = false, onClick }) {
  const sizeClass = small ? 'px-3.5 py-1.5 text-[13px]' : 'px-4 py-2 text-sm';
  const toneClass = isActive
    ? 'border-slate-900 bg-slate-900 text-white'
    : `border-slate-200 bg-white hover:bg-slate-50 ${count === 0 ? 'text-slate-400' : 'text-slate-600'}`;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border-[1.5px] font-semibold transition ${sizeClass} ${toneClass}`}
    >
      {icon && <span className="material-symbols-outlined text-lg">{icon}</span>}
      {label}
      <span className="text-xs opacity-75">{count}</span>
      {unread > 0 && (
        <span className="rounded-full bg-rose-600 px-1.5 py-px text-[11px] font-extrabold text-white">
          {unread > 9 ? '9+' : unread}
          {!small && ' ใหม่'}
        </span>
      )}
    </button>
  );
}

function RepairManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [repairData, setRepairData] = useState([]);
  const [technicianList, setTechnicianList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // ปุ่มหลัก (ต้องจัดการ / ทั้งหมด) — เปิดหน้ามาที่ "ต้องจัดการ" ก่อนเสมอ (เรื่องเร่งด่วนเรียงตามความสำคัญ)
  // ใต้ "ต้องจัดการ" subName คือเรื่องเร่งด่วน; ใต้ "ทั้งหมด" filterKey คือปุ่มกรองสถานะ (null = ทุกสถานะ) และ subName/facetValues
  // คือตัวกรองย่อยของปุ่มนั้น (facetValues ใช้กับ "แจ้งเข้ามา" ที่แยก 2 แถว)
  const [mainKey, setMainKey] = useState('todo');
  const [filterKey, setFilterKey] = useState(null);
  const [subName, setSubName] = useState(ALL_SUB);
  const [facetValues, setFacetValues] = useState({});
  // ตัวเลือกเรียง/ประเภทงานใช้เฉพาะปุ่ม "ทั้งหมด" (กลุ่มอื่นมีปุ่มย่อยของตัวเอง) — ค่าว่าง = ทุกประเภท
  const [sortValue, setSortValue] = useState(SORT_PRIORITY);
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [toast, setToast] = useState('');

  // Modal 1: Inspect (ใช้ component กลางร่วมกับหน้า Home)
  const [inspectRequestId, setInspectRequestId] = useState(null);

  // เปิด modal "ดูรายละเอียด" (ทั้งจากกดการ์ดและจากกดแจ้งเตือน) → ล้างแจ้งเตือนของเคสนั้น (ป้าย "มีอัปเดตใหม่")
  useEffect(() => {
    if (inspectRequestId) markCaseNotificationsRead(inspectRequestId);
  }, [inspectRequestId]);

  // ปฏิเสธงานที่รอตรวจสอบ (กดจากปุ่มบนการ์ดโดยตรง)
  const [rejectingRepair, setRejectingRepair] = useState(null);
  // คำร้องอุทธรณ์ที่กำลังจะปฏิเสธ (รอกรอกเหตุผลในหน้าต่างก่อนส่งจริง)
  const [rejectingComplaintId, setRejectingComplaintId] = useState(null);

  // Modal 2: Manage (นัดหมาย/มอบหมายช่าง + รายงานผลการซ่อม — 2 แท็บในโมดัลเดียวกัน)
  const [manageRequestId, setManageRequestId] = useState(null);
  const [manageTab, setManageTab] = useState('schedule');
  const [manageForm, setManageForm] = useState({ date: '', timeslot: '09-11', technicianId: '', notes: '' });
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentTypeList, setEquipmentTypeList] = useState([]);
  const [pendingEquipmentUsage, setPendingEquipmentUsage] = useState([]);
  // ครุภัณฑ์ที่เบิกใช้ของ "ทุกรอบ" ของเคสที่เปิดอยู่ (ประวัติ อ่านอย่างเดียว) — pendingEquipmentUsage ด้านบนคือชุดของรอบปัจจุบัน
  // ที่กำลังแก้ไขเท่านั้น (backend แทนที่เฉพาะรอบปัจจุบัน รอบเก่าเก็บไว้ไม่ถูกคืนสต็อก)
  const [allEquipmentUsage, setAllEquipmentUsage] = useState([]);
  const [manageFormSnapshot, setManageFormSnapshot] = useState(null);
  // วันที่เร็วที่สุดที่นัดหมายได้ (YYYY-MM-DD) — ห้ามย้อนหลัง: ต้องไม่ก่อนวันนี้ และไม่ก่อนวันที่
  // เจ้าหน้าที่อนุมัติล่าสุด (คำร้องแจ้งซ่อมครั้งแรก หรือคำร้องอุทธรณ์รอบแก้ไข)
  const [manageMinDate, setManageMinDate] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // มินิปฏิทินเช็คคิว: { "YYYY-MM-DD": { "09-11": {count, isRevisionLocked, cases}, "13-15": {...}, "15-17": {...} } }
  const [slotAvailability, setSlotAvailability] = useState({});
  // เปิด popup เลือกวันที่/ช่วงเวลาซ้อนบน popup "จัดการงานซ่อม" (รูปแบบเดียวกับ RejectReasonModal
  // ที่เปิดซ้อนอยู่แล้ว) แทนที่จะฝังตารางปฏิทินไว้ในหน้าเดิมตลอด เพื่อไม่ให้ popup หลักรกเกินไป
  const [isSlotPickerOpen, setIsSlotPickerOpen] = useState(false);
  // itemReports: [{ repairTypeId, repairTypeName, reportText, existingPhotos, newPhotos }]
  // หนึ่งแถวต่อหนึ่งรายการงานซ่อมของเคส (มาจาก r.repairTypes) — แทนที่ reportText/photos ก้อนเดียวแบบเดิม
  const [itemReports, setItemReports] = useState([]);
  const [itemReportsSnapshot, setItemReportsSnapshot] = useState([]);
  const [caseComplaints, setCaseComplaints] = useState([]);
  // ค่าที่กำลังปรับในตัวปรับ "จำนวนครั้งที่ยื่นอุทธรณ์ได้" ของเคสที่เปิดอยู่ (ยังไม่บันทึกจนกว่าจะกดปุ่ม)
  const [limitDraft, setLimitDraft] = useState(2);
  // เมนูใหญ่ที่กำลังดู: 0 = ซ่อม, 1-2 = แก้ไขครั้งที่ N (รอบปัจจุบัน = จำนวนคำร้องที่อนุมัติแล้ว)
  // allCompletionItems = รายงานของทุกรอบ ไว้แสดงรอบเก่าแบบอ่านอย่างเดียว (itemReports ด้านบนคือช่องกรอกของ
  // รอบปัจจุบันเท่านั้น) / manageTimeline = ไว้แสดงประวัตินัดหมายของรอบเก่า
  const [manageRound, setManageRound] = useState(0);
  const [allCompletionItems, setAllCompletionItems] = useState([]);
  const [manageTimeline, setManageTimeline] = useState([]);
  // popup ดูรูปแบบขยาย (mirror ของ RepairDetailModal.jsx) — { photos: [{photo_id, photo_url}], index }
  const [lightboxState, setLightboxState] = useState(null);

  // Modal 3: Review
  const [reviewRequestId, setReviewRequestId] = useState(null);
  const [reviewTab, setReviewTab] = useState('report');
  const [reviewCompletionItems, setReviewCompletionItems] = useState([]);
  // ผลประเมินจริงของเคส (null = ยังไม่ได้ประเมิน) และเหตุผลไม่ยอมรับตอนสถานะ "ซ่อมไม่สำเร็จ" (8) —
  // ทั้งคู่โผล่ในแท็บเดียวกัน ("ผลการประเมิน") แยกกันตามสถานะของเคส
  const [reviewEvaluation, setReviewEvaluation] = useState(null);
  const [reviewDeclineReason, setReviewDeclineReason] = useState(null);
  const [reviewEditLocked, setReviewEditLocked] = useState(false);

  // ยกเลิกงานที่อยู่ระหว่างซ่อม
  const [cancelingRepair, setCancelingRepair] = useState(null);

  // เลือกการ์ด/ลบรายการแจ้งซ่อม (เฉพาะหน้านี้)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), 2800);
  }

  async function fetchAll(silent = false) {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError('');

      const [repairs, technicians, equipments, equipmentTypes] = await Promise.all([
        getAllRepairRequests(),
        getTechnicianList(),
        getAllEquipment(),
        getEquipmentTypeList(),
      ]);

      setRepairData(Array.isArray(repairs) ? repairs : []);
      setTechnicianList(Array.isArray(technicians) ? technicians : []);
      setEquipmentList(Array.isArray(equipments) ? equipments : []);
      setEquipmentTypeList(Array.isArray(equipmentTypes) ? equipmentTypes : []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'ไม่สามารถโหลดข้อมูลได้',
      );
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchAll();

    // อัปเดตรายการแจ้งซ่อมอัตโนมัติ ไม่ต้องรอให้เจ้าหน้าที่รีเฟรชหน้าเอง
    const intervalId = window.setInterval(() => fetchAll(true), 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  // มาจากการคลิกแจ้งเตือนใน MainLayout (navigate มาพร้อม state.autoOpen) — เปิด modal ที่เกี่ยวข้องทันที
  // เคลียร์ state ทิ้งหลังใช้ ไม่งั้นถ้าเจ้าหน้าที่กดย้อนกลับ/รีเฟรชหน้านี้ modal จะเด้งขึ้นมาเองซ้ำอีก
  useEffect(() => {
    const autoOpen = location.state?.autoOpen;
    if (!autoOpen) return;

    // openManageModal ต้องหาเคสจาก repairData ก่อน — ถ้ามาถึงหน้านี้ก่อน fetchAll โหลดเสร็จ
    // (เช่นคลิกแจ้งเตือนจากหน้า home) ให้รอ effect นี้ทำงานใหม่ตอน repairData มาถึงแทนที่จะเงียบๆ ไม่เปิด
    if (autoOpen.modal === 'manage' && !findCase(autoOpen.requestId)) return;

    if (autoOpen.modal === 'inspect') setInspectRequestId(autoOpen.requestId);
    else if (autoOpen.modal === 'manage') openManageModal(autoOpen.requestId);
    else if (autoOpen.modal === 'review') openReviewModal(autoOpen.requestId, autoOpen.tab);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, repairData]);

  function findCase(requestId) {
    return repairData.find((r) => r.id === requestId);
  }

  /* ─── ปุ่มหลัก/ปุ่มกรอง + ค้นหา + เรียงตามความสำคัญ + Pagination ─── */
  const activeGroup = MONITOR_GROUPS.find((group) => group.key === mainKey) ?? MONITOR_GROUPS[0];
  const activeFilter = mainKey === 'all' ? STATUS_FILTERS.find((filter) => filter.key === filterKey) ?? null : null;

  // จำนวนและตัวเลขแดงของปุ่มหลักทั้งสองปุ่ม (คำนวณจากทุกเคส ไม่ขึ้นกับช่องค้นหา เจ้าหน้าที่จะได้เห็นว่าอีกปุ่มมีอะไรรออยู่)
  const groupSummaries = useMemo(
    () =>
      MONITOR_GROUPS.map((group) => {
        const items = repairsOfMain(repairData, group.key);
        return { group, count: items.length, unread: unreadCount(items) };
      }),
    [repairData],
  );

  const mainItems = useMemo(() => repairsOfMain(repairData, mainKey), [repairData, mainKey]);
  const activeGroupCount = mainItems.length;

  // ปุ่มกรองแถวที่ 2: "ต้องจัดการ" = เรื่องเร่งด่วน / "ทั้งหมด" = สถานะ (เรียงตามขั้นตอนของงาน) พร้อมจำนวนและตัวเลขแดง
  const chipSummaries = useMemo(() => {
    if (mainKey === 'todo') {
      return Object.keys(activeGroup.subs).map((name) => {
        const items = repairsOfSub(mainItems, activeGroup.subs, name);
        return { key: name, label: name, count: items.length, unread: unreadCount(items) };
      });
    }
    return STATUS_FILTERS.map((filter) => {
      const items = mainItems.filter(filter.test);
      return { key: filter.key, label: filter.label, icon: filter.icon, count: items.length, unread: unreadCount(items) };
    });
  }, [mainKey, activeGroup, mainItems]);

  // ปุ่มกรองแถวที่ 3 ของปุ่มสถานะที่เลือก — ปุ่มที่แบ่งกลุ่มพอดี (subs) หรือ 2 แถวอิสระ (facets ของ "แจ้งเข้ามา") ที่ตัวเลขแถวหนึ่ง
  // เปลี่ยนตามที่เลือกในอีกแถว จึงไม่นับเคสเดียวซ้ำหลายปุ่ม
  const filterItems = useMemo(
    () => (activeFilter ? mainItems.filter(activeFilter.test) : mainItems),
    [mainItems, activeFilter],
  );

  const subSummaries = useMemo(() => {
    if (!activeFilter?.subs) return [];
    return Object.keys(activeFilter.subs).map((name) => {
      const items = repairsOfSub(filterItems, activeFilter.subs, name);
      return { name, count: items.length, unread: unreadCount(items) };
    });
  }, [activeFilter, filterItems]);

  const facetSummaries = useMemo(() => {
    if (!activeFilter?.facets) return [];
    return activeFilter.facets.map((facet) => {
      const base = repairsOfFacets(filterItems, activeFilter.facets, facetValues, facet.key);
      return {
        key: facet.key,
        label: facet.label,
        options: [
          { name: ALL_SUB, count: base.length, unread: unreadCount(base) },
          ...Object.keys(facet.options).map((name) => {
            const items = repairsOfSub(base, facet.options, name);
            return { name, count: items.length, unread: unreadCount(items) };
          }),
        ],
      };
    });
  }, [activeFilter, filterItems, facetValues]);

  // เปลี่ยนปุ่มหลัก/ปุ่มกรองแล้วล้างตัวกรองย่อยที่เลือกไว้ (ไม่ค้างค่าของปุ่มเดิมที่ไม่มีให้เห็นแล้ว) และกลับหน้าแรกของรายการ
  function selectMain(key) {
    setMainKey(key);
    setFilterKey(null);
    setSubName(ALL_SUB);
    setFacetValues({});
    setCurrentPage(1);
  }

  // "ต้องจัดการ" ปุ่มกรองคือเรื่องเร่งด่วน (เก็บใน subName) / "ทั้งหมด" ปุ่มกรองคือสถานะ (เก็บใน filterKey)
  function selectChip(key) {
    if (mainKey === 'todo') {
      setSubName(key);
    } else {
      setFilterKey(key);
      setSubName(ALL_SUB);
      setFacetValues({});
    }
    setCurrentPage(1);
  }

  // ประเภทงานที่มีในข้อมูลตอนนี้ พร้อมจำนวนเคส (เคสที่มีหลายประเภทนับในทุกประเภทที่เกี่ยวข้อง) ใช้กับเมนูของปุ่ม "ทั้งหมด"
  // TODO: 🔌 ดึงจาก /api/repair_type/get_all ถ้าต้องการให้ขึ้นครบทุกประเภทแม้ยังไม่มีเคส
  const typeOptions = useMemo(() => {
    const counts = new Map();
    repairData.forEach((r) => (r.typeNames ?? []).forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1)));
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, 'th')).map(([name, count]) => ({ name, count }));
  }, [repairData]);

  // เรียงลำดับ/ประเภทงานแสดงและมีผลเฉพาะตอนเลือก "ทั้งหมด" + "ทุกสถานะ" (ปุ่มกรองอื่นเรียงตามความสำคัญและมีตัวกรองของตัวเองอยู่แล้ว)
  const isAllGroup = mainKey === 'all' && filterKey === null;

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    // "ต้องจัดการ" กรองด้วยเรื่องเร่งด่วนที่เลือก; "ทั้งหมด" กรองด้วยปุ่มสถานะ แล้วตามด้วยปุ่มย่อยหรือ facet ของปุ่มนั้น
    let items = mainItems;
    if (mainKey === 'todo') {
      items = repairsOfSub(items, activeGroup.subs, subName);
    } else if (activeFilter) {
      items = repairsOfFacets(items.filter(activeFilter.test), activeFilter.facets ?? [], facetValues);
      items = repairsOfSub(items, activeFilter.subs, subName);
    }

    return items
      .filter(
        (r) =>
          term === '' ||
          r.caseCode.toLowerCase().includes(term) ||
          r.studentName.toLowerCase().includes(term) ||
          r.roomNumber.toLowerCase().includes(term),
      )
      .filter((r) => !isAllGroup || typeFilter === '' || (r.typeNames ?? []).includes(typeFilter))
      .sort(comparatorOfSort(isAllGroup ? sortValue : SORT_PRIORITY));
  }, [mainItems, mainKey, activeGroup, activeFilter, facetValues, searchTerm, subName, isAllGroup, sortValue, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / CARDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleRepairs = filteredData.slice(
    (safePage - 1) * CARDS_PER_PAGE,
    (safePage - 1) * CARDS_PER_PAGE + CARDS_PER_PAGE,
  );

  /* ─── Modal 1: Inspect ─── */
  async function handleApprove(detail) {
    const response = await approveRepairRequest(detail.id);

    if (response.isError) {
      alert(response.errorMessage || 'อนุมัติไม่สำเร็จ');
      return;
    }

    setInspectRequestId(null);
    const autoAppointmentDate = response.data?.appointmentDate;
    showToast(
      autoAppointmentDate
        ? `อนุมัติ Case ${detail.caseCode} สำเร็จ — ระบบจัดนัดหมายให้ ${appointmentToastLabel(autoAppointmentDate)}`
        : `อนุมัติ Case ${detail.caseCode} สำเร็จ — ย้ายไปสถานะ "อยู่ระหว่างซ่อม"`,
    );
    await fetchAll();
  }

  async function handleReject(detail, reason) {
    const response = await rejectRepairRequest(detail.id, reason);

    if (response.isError) {
      alert(response.errorMessage || 'ปฏิเสธไม่สำเร็จ');
      return false;
    }

    setInspectRequestId(null);
    showToast(`ปฏิเสธ Case ${detail.caseCode} เรียบร้อย`);
    await fetchAll();
    // คืนผลให้ RejectReasonModal ปิดหน้าต่างเฉพาะเมื่อสำเร็จ (ล้มเหลว = เปิดค้างไว้ ข้อความเหตุผลไม่หาย)
    return true;
  }

  /* ─── ยกเลิกงานที่อยู่ระหว่างซ่อม ─── */
  async function handleCancelInProgress(reason) {
    const repair = cancelingRepair;
    const response = await cancelInProgressRepairRequest(repair.id, reason);

    if (response.isError) {
      alert(response.errorMessage || 'ยกเลิกไม่สำเร็จ');
      return false;
    }

    showToast(`ยกเลิก Case ${repair.caseCode} เรียบร้อย`);
    await fetchAll();
    return true;
  }

  /* ─── Modal 2: Manage ─── */
  async function openManageModal(requestId) {
    const r = findCase(requestId);
    if (!r) return;
    markCaseNotificationsRead(requestId);
    setManageRequestId(requestId);
    setLimitDraft(r.maxComplaints);
    if (r.statusId === 7) {
      markComplaintReviewing(requestId);
    }
    // เปิดตรงแท็บ "รายงานผลการซ่อม" เลยถ้า: มีคำร้องค้างอยู่ (สถานะ 7 รอตัดสินใจ) หรือเคสถูกส่งงาน
    // ไปแล้ว (สถานะ 3 — กดเข้ามาจากปุ่ม "แก้ไข" ใน modal ตรวจสอบ ก็ต้องการแก้รายงาน ไม่ใช่ตารางนัด)
    setManageTab(r.statusId === 3 || r.statusId === 7 ? 'report' : 'schedule');

    const [savedItems, complaints, timeline] = await Promise.all([
      getCompletionItems(requestId),
      getComplaints(requestId),
      getRepairTimeline(requestId),
    ]);

    // ขั้นต่ำของวันนัดหมาย = วันที่เจ้าหน้าที่อนุมัติล่าสุด (คำร้องอุทธรณ์ที่อนุมัติล่าสุด ถ้ามี ไม่งั้นใช้วัน
    // อนุมัติคำร้องแจ้งซ่อมครั้งแรกจาก timeline) แต่ไม่ให้ก่อนวันนี้ — backend เช็คซ้ำอีกชั้นแล้ว
    const toDateOnly = (sqlDateTime) => (sqlDateTime ? sqlDateTime.slice(0, 10) : '');
    const todayLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const latestApprovedComplaint = [...complaints].reverse().find((c) => c.decision === 'approved');
    const firstApprovalStep = [...timeline].reverse().find((s) => s.stepCode === 'approved');
    const approvalFloor = toDateOnly(latestApprovedComplaint?.decidedAt) || toDateOnly(firstApprovalStep?.eventDate);
    const minDate = approvalFloor && approvalFloor > todayLocal ? approvalFloor : todayLocal;
    setManageMinDate(minDate);
    // โหลดมินิปฏิทินเช็คคิว 7 วันเริ่มจากขั้นต่ำที่นัดได้ — exclude ตัวเองกันนัดเดิมของเคสนี้มาแย่งที่ตัวเอง
    getSlotAvailability(minDate, 7, requestId).then(setSlotAvailability);
    // รอบปัจจุบัน = จำนวนคำร้องที่อนุมัติแล้ว (ต้องตรงกับที่ backend คำนวณ) เปิดมาที่เมนูของรอบนี้ทันที
    const currentRound = complaints.filter((c) => c.decision === 'approved').length;
    setManageRound(currentRound);
    setAllCompletionItems(savedItems);
    setManageTimeline(timeline);
    // left-join: ทุกรายการงานซ่อมของเคส (r.repairTypes) ต้องมีการ์ดของตัวเอง แม้ยังไม่เคยมีรายงานเลย
    // (savedItems จะมีแค่รายการที่เคยกด "บันทึก" ไปแล้วเท่านั้น) — เอาเฉพาะรายงานของรอบปัจจุบันเป็นช่องกรอก
    // ช่องกรอกของรอบแก้ไขจึงเริ่มว่าง ไม่ดึงข้อความของรอบก่อนมาใส่
    const itemReportsForCase = (r.repairTypes || []).map((type) => {
      const saved = savedItems.find((item) => item.repairTypeId === type.id && item.revisionRound === currentRound);
      return {
        repairTypeId: type.id,
        repairTypeName: type.name,
        reportText: saved?.reportText || '',
        existingPhotos: saved?.photos || [],
        newPhotos: [],
      };
    });
    setItemReports(itemReportsForCase);
    // เก็บ snapshot ไว้เทียบตอนเช็คว่ามีอะไรพิมพ์ไว้แต่ยังไม่บันทึกไหม (ใช้ตอนกดอนุมัติ/ปฏิเสธคำร้อง)
    setItemReportsSnapshot(itemReportsForCase);
    setCaseComplaints(complaints);

    let initialForm = { date: '', timeslot: '09-11', technicianId: '', notes: '' };
    let initialEquipment = [];

    // ดึงครุภัณฑ์ที่เบิกใช้ของทุกรอบเสมอ (แม้รอบปัจจุบันยังไม่มีนัดหมาย) เพื่อแสดงเป็นประวัติของรอบก่อนหน้า
    const equipmentUsageAllRounds = await getRepairEquipmentUsage(requestId);
    setAllEquipmentUsage(equipmentUsageAllRounds);

    // ถ้ามีนัดหมายอยู่แล้ว ให้ดึงข้อมูลมาเติมในฟอร์มเพื่อแก้ไข (รวมครุภัณฑ์ที่เคยเบิกไว้ด้วย)
    if (r.appointmentDate) {
      const detail = await getRepairRequestDetail(requestId);
      // ฟอร์มแก้ไขใช้เฉพาะชุดของรอบปัจจุบัน — ถ้าเอารอบก่อนหน้ามาด้วย บันทึกแล้วจะเบิกซ้ำและสต็อกหักเบิ้ล
      const equipmentUsage = equipmentUsageAllRounds.filter((u) => u.revisionRound === currentRound);

      const [datePart, timePart] = (detail.appointmentDate || '').split(' ');
      const hour = Number((timePart || '09:00:00').split(':')[0]);
      const timeslot = hour < 13 ? '09-11' : hour < 15 ? '13-15' : '15-17';
      const lastAppointmentStep = [...timeline].reverse().find((s) => s.stepCode === 'appointment');

      initialForm = {
        date: datePart || '',
        timeslot,
        technicianId: detail.technicianId ? String(detail.technicianId) : '',
        notes: lastAppointmentStep?.eventDetail?.match(/\(([^)]*)\)$/)?.[1] || '',
      };
      initialEquipment = equipmentUsage;
    }

    setManageForm(initialForm);
    setPendingEquipmentUsage(initialEquipment);
    // เก็บ snapshot ค่าตั้งต้นไว้เทียบ — ถ้าฟอร์มไม่มีอะไรเปลี่ยนจากตรงนี้เลย ปุ่มบันทึกจะกดไม่ได้
    setManageFormSnapshot({ form: initialForm, equipment: initialEquipment });
  }

  function hasScheduleChanges() {
    if (!manageFormSnapshot) return true;
    const formChanged = JSON.stringify(manageForm) !== JSON.stringify(manageFormSnapshot.form);
    const equipmentChanged = JSON.stringify(pendingEquipmentUsage) !== JSON.stringify(manageFormSnapshot.equipment);
    return formChanged || equipmentChanged;
  }

  function handleAddEquipmentUsage(item, quantity) {
    setPendingEquipmentUsage((prev) => {
      const existing = prev.find((u) => u.equipmentId === item.equipmentId);
      if (existing) {
        return prev.map((u) => (u.equipmentId === item.equipmentId ? { ...u, quantity } : u));
      }
      return [
        ...prev,
        {
          equipmentId: item.equipmentId,
          equipmentCode: item.equipmentCode,
          equipmentName: item.equipmentName,
          unitName: item.unitName,
          quantity,
        },
      ];
    });
    showToast(`เพิ่ม "${item.equipmentName}" จำนวน ${quantity} ${item.unitName} เข้าสู่เคสแล้ว`);
  }

  function handleRemoveEquipmentUsage(equipmentId) {
    setPendingEquipmentUsage((prev) => prev.filter((u) => u.equipmentId !== equipmentId));
  }

  async function handleDeleteAppointment() {
    const repair = findCase(manageRequestId);
    if (!repair) return;

    const confirmed = window.confirm(`ยืนยันการลบกำหนดนัดหมาย Case ${repair.caseCode}?`);
    if (!confirmed) return;

    const response = await cancelAppointment(manageRequestId);

    if (response.isError) {
      alert(response.errorMessage || 'ลบกำหนดนัดหมายไม่สำเร็จ');
      return;
    }

    setManageRequestId(null);
    showToast(`ลบกำหนดนัดหมาย Case ${repair.caseCode} เรียบร้อย`);
    await fetchAll();
  }

  /* ─── เลือก/ลบรายการแจ้งซ่อม ─── */
  function toggleSelect(repair) {
    setSelectedIds((prev) =>
      prev.includes(repair.id) ? prev.filter((id) => id !== repair.id) : [...prev, repair.id],
    );
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(`คุณจะลบรายการซ่อมที่เลือกไว้ ${selectedIds.length} รายการใช่หรือไม่?`);
    if (!confirmed) return;

    const response = await deleteRepairRequests(selectedIds);

    if (response.isError) {
      alert(response.errorMessage || 'ลบรายการไม่สำเร็จ');
      return;
    }

    setSelectMode(false);
    setSelectedIds([]);
    showToast('ลบรายการที่เลือกเรียบร้อย');
    await fetchAll();
  }

  function enterSelectMode() {
    setSelectMode(true);
  }

  function cancelSelectMode() {
    setSelectMode(false);
    setSelectedIds([]);
  }

  function toggleSelectAll() {
    const allIds = filteredData.map((r) => r.id);
    const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(isAllSelected ? [] : allIds);
  }

  async function handleSaveManage() {
    const repair = findCase(manageRequestId);
    // กันไว้อีกชั้นแม้ปุ่มจะถูกปิดอยู่ (backend ปฏิเสธซ้ำอยู่แล้ว) — เคสปิดงาน/รออุทธรณ์ห้ามบันทึกการมอบหมาย
    if (isManageScheduleLocked) return;

    // attribute min ของ input วันที่ยังพิมพ์เลขวันย้อนหลังด้วยคีย์บอร์ดทะลุได้ เลยเช็คซ้ำตอนกดบันทึก
    // เช็คเฉพาะตอนวันนัดถูกเปลี่ยนจากค่าตั้งต้น — บันทึกครุภัณฑ์/หมายเหตุของนัดเดิมที่ผ่านไปแล้วต้องทำได้
    const dateChanged = manageForm.date !== (manageFormSnapshot?.form?.date ?? '');
    if (dateChanged && manageForm.date && manageMinDate && manageForm.date < manageMinDate) {
      alert(`นัดหมายวันซ่อมย้อนหลังไม่ได้ (เลือกได้ตั้งแต่วันที่ ${manageMinDate} เป็นต้นไป)`);
      return;
    }

    const startHour = manageForm.timeslot.split('-')[0].padStart(2, '0');
    const appointmentDate = manageForm.date ? `${manageForm.date} ${startHour}:00:00` : null;

    const response = await assignTechnician(
      manageRequestId,
      manageForm.technicianId || null,
      appointmentDate,
      manageForm.notes || null,
      pendingEquipmentUsage.map((u) => ({ equipment_id: u.equipmentId, quantity: u.quantity })),
    );

    if (response.isError) {
      alert(response.errorMessage || 'บันทึกการมอบหมายงานไม่สำเร็จ');
      return;
    }

    setManageRequestId(null);
    showToast(`บันทึกการมอบหมายงาน Case ${repair?.caseCode} สำเร็จ`);
    await fetchAll();
  }

  // แก้ค่าในการ์ดรายการเดียว (ยังไม่ save — แค่พิมพ์/เลือกรูปไว้ในฟอร์ม)
  function handleItemReportTextChange(repairTypeId, value) {
    setItemReports((prev) => prev.map((item) => (
      item.repairTypeId === repairTypeId ? { ...item, reportText: value } : item
    )));
  }

  function handleAddItemPhotos(repairTypeId, files) {
    setItemReports((prev) => prev.map((item) => (
      item.repairTypeId === repairTypeId ? { ...item, newPhotos: [...item.newPhotos, ...files] } : item
    )));
  }

  function handleRemoveItemNewPhoto(repairTypeId, index) {
    setItemReports((prev) => prev.map((item) => (
      item.repairTypeId === repairTypeId
        ? { ...item, newPhotos: item.newPhotos.filter((_, i) => i !== index) }
        : item
    )));
  }

  function handleRemoveItemExistingPhoto(repairTypeId, photoId) {
    setItemReports((prev) => prev.map((item) => (
      item.repairTypeId === repairTypeId
        ? { ...item, existingPhotos: item.existingPhotos.filter((p) => p.photoId !== photoId) }
        : item
    )));
  }

  // บันทึกรายงาน+รูปของ "1 รายการ" — กดทีละการ์ด ไม่ใช่ครั้งเดียวทั้งเคส
  async function handleSaveItemReport(repairTypeId) {
    const item = itemReports.find((i) => i.repairTypeId === repairTypeId);
    if (!item) return;

    const response = await saveCompletionItemReport(
      manageRequestId,
      repairTypeId,
      item.reportText,
      item.existingPhotos.map((p) => p.photoUrl),
      item.newPhotos,
    );

    if (response.isError) {
      alert(response.errorMessage || 'บันทึกรายงานไม่สำเร็จ');
      return;
    }

    const refreshedItems = await getCompletionItems(manageRequestId);
    setAllCompletionItems(refreshedItems);
    // backend เขียนลงรอบปัจจุบันเสมอ (จำนวนคำร้องที่อนุมัติแล้ว) — หารายการที่เพิ่งบันทึกจากรอบเดียวกันนี้
    const savedRound = caseComplaints.filter((c) => c.decision === 'approved').length;
    const refreshed = refreshedItems.find((i) => i.repairTypeId === repairTypeId && i.revisionRound === savedRound);
    const updateSavedItem = (i) => (
      i.repairTypeId === repairTypeId
        ? { ...i, reportText: refreshed?.reportText || '', existingPhotos: refreshed?.photos || [], newPhotos: [] }
        : i
    );
    setItemReports((prev) => prev.map(updateSavedItem));
    // sync snapshot ของรายการที่เพิ่ง save ด้วย ไม่งั้นจะโดนนับว่า "ยังไม่บันทึก" ค้างอยู่ตลอด
    setItemReportsSnapshot((prev) => prev.map(updateSavedItem));
    showToast(`บันทึกรายงาน "${item.repairTypeName}" สำเร็จ`);
  }

  // แท็บ B ของ Modal 2: ส่งงานให้นักศึกษาตรวจสอบ — ยังไม่ใช่จุดจบจริง นักศึกษาต้องกด "ยอมรับ" เอง
  // (หรือยื่นคำร้องแจ้งแก้ไข) ถึงจะปิดเคสจริง — ปุ่มนี้เป็นแค่ "ส่งให้ นศ ดู" เท่านั้น ไม่ใช่ปิดงาน
  // เดิมบังคับให้กด "บันทึกรายการนี้" ทีละการ์ดก่อนถึงจะกดปุ่มนี้ได้ ทำให้พลาดง่าย (ลืมกดบันทึกแล้วส่งงาน
  // ไปเลย ข้อมูลเลยไม่ถูกเก็บจริง) — เปลี่ยนเป็นให้ "ส่งงาน" บันทึกทุกการ์ดให้อัตโนมัติในตัวเดียวแทน
  // ไม่ต้องกดบันทึกทีละใบเองแล้ว แค่กรอกให้ครบทุกรายการก่อนกดปุ่มนี้พอ
  async function handleCloseJob() {
    const repair = findCase(manageRequestId);

    const missingItem = itemReports.find((item) => item.reportText.trim().length === 0);
    if (missingItem) {
      alert(`กรุณากรอกรายงานผลการซ่อมของรายการ "${missingItem.repairTypeName}" ก่อนส่งงาน`);
      return;
    }

    const confirmed = window.confirm(`ส่งงาน Case ${repair?.caseCode} ให้นักศึกษาตรวจสอบ? นักศึกษาจะเห็นรายงานผลซ่อมแล้วเลือกยอมรับหรือแจ้งแก้ไขได้`);
    if (!confirmed) return;

    // บันทึกทุกรายการให้อัตโนมัติก่อนเปลี่ยนสถานะ — กันเคสลืมกด "บันทึกรายการนี้" มาก่อน
    for (const item of itemReports) {
      const saveResponse = await saveCompletionItemReport(
        manageRequestId,
        item.repairTypeId,
        item.reportText,
        item.existingPhotos.map((p) => p.photoUrl),
        item.newPhotos,
      );
      if (saveResponse.isError) {
        alert(`บันทึกรายงาน "${item.repairTypeName}" ไม่สำเร็จ: ${saveResponse.errorMessage || ''}`);
        return;
      }
    }

    const response = await completeRepairRequest(manageRequestId);

    if (response.isError) {
      alert(response.errorMessage || 'ส่งงานไม่สำเร็จ');
      return;
    }

    setManageRequestId(null);
    showToast(`ส่งงาน Case ${repair?.caseCode} ให้นักศึกษาตรวจสอบเรียบร้อยแล้ว`);
    await fetchAll();
  }

  // moderator ตัดสินใจคำร้องที่นักศึกษายื่นมา — อนุมัติ (ไปซ่อมรอบใหม่) หรือ ปฏิเสธ (กลับไปให้นักศึกษาตัดสิน:
  // ยื่นใหม่ถ้ายังมีสิทธิ์ ไม่งั้นเลือกยอมรับ/ไม่ยอมรับ ไม่มีการปิดเคสอัตโนมัติ)
  async function handleDecideComplaint(complaintId, decision, reason) {
    // ปุ่มอนุมัติ/ปฏิเสธคำร้องอยู่แท็บเดียวกับช่องพิมพ์รายงานผลซ่อม+แนบรูป ถ้าเจ้าหน้าที่พิมพ์/แนบ
    // ไว้แล้วแต่ยังไม่ได้กด "ส่งงาน" (ยังไม่ save) การกดปุ่มนี้จะปิด modal ทันทีทำให้ข้อมูลที่พิมพ์
    // ไว้หายไปเงียบๆ — เตือนก่อนเสมอถ้ามีการเปลี่ยนแปลงที่ยังไม่บันทึก
    // เทียบกับ snapshot ตอนเปิด modal / ตอน save ล่าสุด — ถ้ามีรายการไหนข้อความหรือรูปยังไม่ตรงกับที่
    // บันทึกไว้ล่าสุด ถือว่ามีของค้างไม่ได้ save
    const hasUnsavedReport = itemReports.some((item) => {
      const saved = itemReportsSnapshot.find((s) => s.repairTypeId === item.repairTypeId);
      return item.reportText !== (saved?.reportText || '') || item.newPhotos.length > 0;
    });
    if (hasUnsavedReport) {
      const confirmedDiscard = window.confirm(
        'คุณมีรายงานผลซ่อม/รูปที่พิมพ์หรือแนบไว้แต่ยังไม่ได้กด "ส่งงาน" ถ้าดำเนินการต่อ ข้อมูลที่ยังไม่บันทึกจะหายไป ต้องการดำเนินการต่อหรือไม่?'
      );
      if (!confirmedDiscard) return false;
    }

    // ปฏิเสธต้องกรอกเหตุผลในหน้าต่างก่อน (ปุ่มปฏิเสธเปิดหน้าต่างนั้น ไม่ได้เรียกฟังก์ชันนี้ตรงๆ) หน้าต่างนั้นทำหน้าที่
    // ยืนยันด้วยในตัว จึงไม่ต้อง window.confirm ซ้ำอีก
    const response = await decideComplaint(complaintId, manageRequestId, decision, reason);

    if (response.isError) {
      alert(response.errorMessage || 'ดำเนินการไม่สำเร็จ');
      return false;
    }

    const refreshedComplaints = await getComplaints(manageRequestId);
    setCaseComplaints(refreshedComplaints);
    setManageRequestId(null);
    const autoAppointmentDate = response.data?.appointmentDate;
    const approvedMessage = autoAppointmentDate
      ? `อนุมัติคำร้องแล้ว เคสกลับไปเป็น "รอแก้ไข" — ระบบจัดนัดหมายให้ ${appointmentToastLabel(autoAppointmentDate)}`
      : 'อนุมัติคำร้องแล้ว เคสกลับไปเป็น "รอแก้ไข"';
    showToast(decision === 'approved' ? approvedMessage : 'ปฏิเสธคำร้องแล้ว');
    await fetchAll();
    // คืนผลให้ผู้เรียก: จุดปฏิเสธคำร้องปิดหน้าต่างเหตุผลเฉพาะเมื่อสำเร็จ (ล้มเหลว = เปิดค้างไว้ ข้อความไม่หาย)
    return true;
  }

  // สถานะ 7 = มีคำร้องอุทธรณ์ค้างรอตัดสินใจ — ล็อกทั้งแท็บนัดหมายและแท็บรายงาน จนกว่าจะอนุมัติ/ปฏิเสธ
  const manageStatusId = findCase(manageRequestId)?.statusId;
  const isManageLockedByComplaint = manageStatusId === 7;

  // ตัวปรับจำนวนครั้งที่ยื่นอุทธรณ์ได้: เคสที่ปิดแล้ว (4 ปฏิเสธ/ยกเลิก, 6 สำเร็จ, 8 ซ่อมไม่สำเร็จ) ปรับไม่ได้ และ
  // ตั้งต่ำกว่าจำนวนที่นักศึกษายื่นไปแล้วไม่ได้ (backend ตรวจซ้ำอีกชั้น)
  const isManageCaseClosed = manageStatusId === 4 || manageStatusId === 6 || manageStatusId === 8;
  // แท็บนัดหมาย/ครุภัณฑ์ล็อกเมื่อ ปิดงานแล้ว (4, 6, 8) หรือยื่นอุทธรณ์รอตัดสิน (7) — สถานะ 3 ยังแก้ได้ (เบิกครุภัณฑ์เพิ่มหลังซ่อมเสร็จ)
  // backend ตรวจซ้ำอีกชั้น (SCHEDULE_LOCKED_STATUS_IDS ใน server/models/repair_request.js)
  const isManageScheduleLocked = isManageLockedByComplaint || isManageCaseClosed;
  const manageSavedLimit = findCase(manageRequestId)?.maxComplaints;
  const complaintLimitMin = Math.max(MIN_COMPLAINT_LIMIT, caseComplaints.length);

  async function handleSaveComplaintLimit() {
    const response = await updateComplaintLimit(manageRequestId, limitDraft);

    if (response.isError) {
      alert(response.errorMessage || 'บันทึกจำนวนครั้งที่ยื่นอุทธรณ์ไม่สำเร็จ');
      return;
    }

    showToast(`ตั้งจำนวนครั้งที่ยื่นอุทธรณ์ของ Case ${findCase(manageRequestId)?.caseCode} เป็น ${limitDraft} ครั้งเรียบร้อย`);
    await fetchAll(true);
  }

  // รอบปัจจุบัน = จำนวนคำร้องที่อนุมัติแล้ว (ตรงกับ backend) / ยื่นทั้งหมดมากกว่ารอบปัจจุบัน = มีคำร้องยื่นต่อรายงาน
  // รอบนี้ไปแล้ว (รอตัดสินหรือถูกปฏิเสธ) หรือนักศึกษายอมรับแล้ว (สถานะ 6) → รายงานรอบปัจจุบันล็อก
  const manageCurrentRound = caseComplaints.filter((c) => c.decision === 'approved').length;
  const isCurrentReportLocked = caseComplaints.length > manageCurrentRound || manageStatusId === 6;
  // กรอก/บันทึก/ส่งงานได้เฉพาะตอนดูเมนูของรอบปัจจุบัน และรายงานรอบนั้นยังไม่ถูกล็อก
  const isViewingPastRound = manageRound !== manageCurrentRound;
  const isViewedReportEditable = !isViewingPastRound && !isCurrentReportLocked;

  // การ์ดรายงานของรอบที่กำลังดู: รอบปัจจุบัน = ช่องกรอก (itemReports) / รอบเก่า = รายงานที่บันทึกไว้ของรอบนั้น (อ่านอย่างเดียว)
  const viewedReportItems = isViewingPastRound
    ? allCompletionItems
        .filter((i) => i.revisionRound === manageRound)
        .map((i) => ({
          repairTypeId: i.repairTypeId,
          repairTypeName: i.repairTypeName,
          reportText: i.reportText,
          existingPhotos: i.photos,
          newPhotos: [],
        }))
    : itemReports;

  // ประวัตินัดหมายของรอบที่กำลังดู (จาก timeline): รอบของการ์ดนัดหมาย = จำนวนการ์ด complaint_approved ที่เกิดก่อนหน้านั้น
  // (ใช้แสดงในเมนูย่อย "นัดหมาย" ของรอบเก่า เพราะฐานข้อมูลเก็บนัดหมายปัจจุบันไว้ค่าเดียว)
  const roundAppointments = (() => {
    let round = 0;
    const list = [];
    for (const step of manageTimeline) {
      if (step.stepCode === 'complaint_approved') round += 1;
      else if (step.stepCode === 'appointment' && round === manageRound) list.push(step);
    }
    return list;
  })();

  // มีคำร้องที่ต้องแสดงในแท็บของรอบที่กำลังดูไหม — ใช้ซ่อนหัวข้อ "ประวัติคำร้องจากนักศึกษา" ทั้งก้อนเมื่อรอบนี้ไม่มีใบให้แสดง
  // (เดิมหัวข้อขึ้นทุกครั้งที่เคสมีคำร้องใดๆ จึงเหลือหัวข้อลอยๆ ไม่มีรายการในแท็บ "ซ่อม") กติกาต้องตรงกับ isRelevant ในรายการคำร้องด้านล่าง
  const hasComplaintForViewedRound = caseComplaints.some((complaint, index) => {
    const roundOfComplaint = caseComplaints.slice(0, index).filter((c) => c.decision === 'approved').length;
    return (
      (roundOfComplaint === manageRound && complaint.decision !== 'approved') ||
      (roundOfComplaint === manageRound - 1 && complaint.decision === 'approved')
    );
  });

  /* ─── Modal 3: Review ─── */
  const reviewRepair = reviewRequestId ? findCase(reviewRequestId) : null;

  async function openReviewModal(requestId, initialTab = 'report') {
    markCaseNotificationsRead(requestId);
    setReviewRequestId(requestId);
    setReviewTab(initialTab);
    const [items, complaints, evaluation, timeline] = await Promise.all([
      getCompletionItems(requestId),
      getComplaints(requestId),
      getEvaluation(requestId),
      getRepairTimeline(requestId),
    ]);
    setReviewCompletionItems(items);
    // ยื่นคำร้องมากกว่าที่อนุมัติ = มีคำร้องยื่นต่อรายงานล่าสุดไปแล้ว (รอตัดสิน/ถูกปฏิเสธ) → ห้ามแก้รายงานย้อนหลัง
    setReviewEditLocked(complaints.length > complaints.filter((c) => c.decision === 'approved').length);
    setReviewEvaluation(evaluation);
    // อาจไม่ยอมรับได้แค่ครั้งเดียวต่อเคส แต่หาแบบ "ล่าสุด" ไว้กันเหนียว
    const declinedStep = [...timeline].reverse().find((s) => s.stepCode === 'declined');
    setReviewDeclineReason(declinedStep?.eventDetail || null);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Repair Management
          </p>
          <h2 className="text-2xl font-extrabold">จัดการงานซ่อม</h2>
        </div>
      </div>

      {/* Search */}
      <div className="flex">
        <div className="relative w-full max-w-[460px] flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-slate-400 text-xl">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="ค้นหาหมายเลข Case, ชื่อผู้แจ้ง หรือห้อง..."
            className="w-full py-3.5 pl-11.5 pr-4 border-[1.5px] border-slate-300 rounded-2xl text-sm bg-white focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
          />
        </div>
      </div>

      {/* ปุ่มหลัก 2 ปุ่ม (ต้องจัดการ / ทั้งหมด) → ปุ่มกรองของปุ่มที่เลือก → ตัวกรองย่อยของปุ่มกรองนั้น
          ตัวเลขแดงมุมปุ่ม = จำนวนเคสที่ยังไม่เปิดดู (แทนจุดแดงเดิม) */}
      <div className="flex flex-wrap items-center gap-3">
        {groupSummaries.map(({ group, count, unread }, index) => (
          <Fragment key={group.key}>
            {index === 1 && <span className="h-8 w-px bg-slate-300" />}
            <StatusPill
              icon={group.icon}
              label={group.label}
              count={count}
              isActive={mainKey === group.key}
              unreadCount={unread}
              onClick={() => selectMain(group.key)}
            />
          </Fragment>
        ))}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <FilterChip
          label={mainKey === 'todo' ? 'ทุกเรื่อง' : 'ทุกสถานะ'}
          icon="view_list"
          count={activeGroupCount}
          unread={unreadCount(mainItems)}
          isActive={mainKey === 'todo' ? subName === ALL_SUB : filterKey === null}
          onClick={() => selectChip(mainKey === 'todo' ? ALL_SUB : null)}
        />
        {chipSummaries.map((chip) => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            icon={chip.icon}
            count={chip.count}
            unread={chip.unread}
            isActive={mainKey === 'todo' ? subName === chip.key : filterKey === chip.key}
            onClick={() => selectChip(chip.key)}
          />
        ))}
      </div>

      {/* "ต้องจัดการ": เคสหนึ่งอยู่ได้หลายเรื่อง ตัวเลขรวมจึงนับไม่ซ้ำและอาจน้อยกว่าผลรวมของปุ่มเรื่องเร่งด่วน */}
      {mainKey === 'todo' && (
        <p className="-mt-3 text-xs text-slate-500">เคสหนึ่งอยู่ได้หลายเรื่อง (เช่น ถูกเร่งและเกินนัด) ตัวเลข "ต้องจัดการ" นับเคสไม่ซ้ำ</p>
      )}

      {subSummaries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[{ name: ALL_SUB, count: filterItems.length, unread: unreadCount(filterItems) }, ...subSummaries].map(
            ({ name, count, unread }) => (
              <FilterChip
                key={name}
                small
                label={name}
                count={count}
                unread={unread}
                isActive={subName === name}
                onClick={() => { setSubName(name); setCurrentPage(1); }}
              />
            ),
          )}
        </div>
      )}

      {facetSummaries.map((facet) => (
        <div key={facet.key} className="flex flex-wrap items-center gap-2">
          <span className="min-w-20 text-[13px] font-bold text-slate-500">{facet.label}</span>
          {facet.options.map(({ name, count, unread }) => (
            <FilterChip
              key={name}
              small
              label={name === ALL_SUB ? 'ทั้งหมด' : name}
              count={count}
              unread={unread}
              isActive={(facetValues[facet.key] ?? ALL_SUB) === name}
              onClick={() => { setFacetValues((values) => ({ ...values, [facet.key]: name })); setCurrentPage(1); }}
            />
          ))}
        </div>
      ))}

      {/* เรียงลำดับ + ประเภทงาน ใช้เฉพาะ "ทั้งหมด" + "ทุกสถานะ" */}
      {isAllGroup && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-500">
            เรียงตาม
            <select
              value={sortValue}
              onChange={(e) => { setSortValue(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-800/10"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-500">
            ประเภทงาน
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-800/10"
            >
              <option value="">ทุกประเภท ({activeGroupCount})</option>
              {typeOptions.map(({ name, count }) => (
                <option key={name} value={name}>{name} ({count})</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* แถบลบรายการแจ้งซ่อม (เฉพาะหน้านี้) */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[13.5px] font-semibold text-slate-500">
            พบ <strong className="text-blue-800">{filteredData.length}</strong> เคส
            {selectMode && (
              <>
                {' '}· เลือกไว้ <strong className="text-blue-800">{selectedIds.length}</strong> เคส
              </>
            )}
          </p>

          <div className="flex items-center gap-2.5 flex-wrap">
          {selectMode ? (
            <>
              <button
                type="button"
                onClick={cancelSelectMode}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-base">close</span>
                ยกเลิกการเลือก
              </button>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-100 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-200"
              >
                <span className="material-symbols-outlined text-base">
                  {filteredData.length > 0 && filteredData.every((r) => selectedIds.includes(r.id))
                    ? 'deselect'
                    : 'select_all'}
                </span>
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                ลบ{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enterSelectMode}
              className="flex items-center gap-1.5 rounded-xl bg-white border-[1.5px] border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base">checklist</span>
              เลือก
            </button>
          )}
          </div>
        </div>
      )}

      {/* Repair grid */}
      <section>
        {visibleRepairs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
            <span className="material-symbols-outlined text-5xl opacity-40">search_off</span>
            <p className="text-sm font-semibold">ไม่พบรายการงานซ่อมที่ตรงกับเงื่อนไข</p>
          </div>
        ) : (
          <div className="grid gap-4.5 md:grid-cols-2 xl:grid-cols-3">
            {visibleRepairs.map((repair) => (
              <RepairCard
                key={repair.id}
                repair={repair}
                onView={(r) => setInspectRequestId(r.id)}
                onApprove={handleApprove}
                onReject={setRejectingRepair}
                onManage={(r) => openManageModal(r.id)}
                onReview={(r) => openReviewModal(r.id)}
                onCancel={setCancelingRepair}
                selectable={selectMode}
                isSelected={selectedIds.includes(repair.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(safePage - 1)}
              className="h-9.5 w-9.5 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
              <button
                type="button"
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-9.5 min-w-9.5 px-3 rounded-xl border font-bold text-[13.5px] ${
                  page === safePage ? 'bg-blue-800 border-blue-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="h-9.5 w-9.5 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        )}
      </section>

      {/* ═══════ MODAL 1: รายละเอียดคำร้อง (ใช้ RepairDetailModal ร่วมกับหน้า Home) ═══════ */}
      <RepairDetailModal
        repairId={inspectRequestId}
        onClose={() => setInspectRequestId(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* ═══════ MODAL 2: จัดการงานซ่อม (นัดหมาย/มอบหมายช่าง + รายงานผลการซ่อม) ═══════ */}
      <BaseModal
        isOpen={!!manageRequestId}
        onClose={() => setManageRequestId(null)}
        title="จัดการงานซ่อม"
        maxWidth="max-w-4xl"
        footer={
          manageTab === 'schedule' ? (
            <div className="flex gap-3 ml-auto items-center">
              {findCase(manageRequestId)?.appointmentDate && !isManageScheduleLocked && !isViewingPastRound && (
                <button onClick={handleDeleteAppointment} className="h-11.5 px-6 rounded-full text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">event_busy</span> ลบกำหนดนัดหมาย
                </button>
              )}
              <button onClick={() => setManageRequestId(null)} className="h-11.5 px-6 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
                ยกเลิก
              </button>
              <button
                onClick={handleSaveManage}
                disabled={!hasScheduleChanges() || isManageScheduleLocked || isViewingPastRound}
                className="h-11.5 px-6 rounded-full text-sm font-bold text-white bg-blue-700 shadow-md hover:brightness-110 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
              >
                <span className="material-symbols-outlined text-lg">save</span> บันทึกการมอบหมาย
              </button>
            </div>
          ) : (
            <div className="flex gap-3 ml-auto items-center">
              <button onClick={() => setManageRequestId(null)} className="h-11.5 px-6 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
                ยกเลิก
              </button>
              {/* สถานะ 7 = มีคำร้องค้าง รอเจ้าหน้าที่ตัดสินใจ — ห้ามส่งงานทับคำร้องที่ยังไม่ตัดสินใจ
                  (เดิมกดได้ตรงๆ ทำให้เคสข้ามขั้นตอนอนุมัติ/ปฏิเสธคำร้องไปเลย) ต้องตัดสินใจคำร้องก่อน
                  ถึงจะกลับมาแก้ไข/ส่งงานได้ */}
              {/* ส่งงานได้เฉพาะตอนดูรอบปัจจุบันที่ยังไม่ถูกล็อก (isViewedReportEditable ครอบคลุมสถานะ 7 อยู่แล้ว
                  เพราะสถานะ 7 = มีคำร้องยื่นต่อรายงานรอบนี้ = ล็อก) */}
              {isViewedReportEditable && (
                <button
                  onClick={handleCloseJob}
                  className="h-11.5 px-6 rounded-full text-sm font-bold text-white bg-blue-700 shadow-md hover:brightness-110 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">send</span> ส่งงาน
                </button>
              )}
            </div>
          )
        }
      >
        {/* ปรับจำนวนครั้งที่นักศึกษายื่นอุทธรณ์ได้ของเคสนี้ (ค่าเริ่มต้น 2, ตั้งได้ 1-5) — ปรับได้เฉพาะเคสที่ยังไม่ปิด */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-bold">จำนวนครั้งที่ยื่นอุทธรณ์ได้</p>
            <p className="text-xs text-slate-500">
              {isManageCaseClosed
                ? 'เคสนี้ปิดแล้ว ปรับไม่ได้'
                : `นักศึกษายื่นแล้ว ${caseComplaints.length} ครั้ง · ตั้งได้ ${MIN_COMPLAINT_LIMIT}–${MAX_COMPLAINT_LIMIT} ครั้ง`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLimitDraft((v) => Math.max(complaintLimitMin, v - 1))}
              disabled={isManageCaseClosed || limitDraft <= complaintLimitMin}
              className="w-9 h-9 rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              −
            </button>
            <span className="min-w-8 text-center text-xl font-extrabold text-blue-800">{limitDraft}</span>
            <button
              type="button"
              onClick={() => setLimitDraft((v) => Math.min(MAX_COMPLAINT_LIMIT, v + 1))}
              disabled={isManageCaseClosed || limitDraft >= MAX_COMPLAINT_LIMIT}
              className="w-9 h-9 rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleSaveComplaintLimit}
              disabled={isManageCaseClosed || limitDraft === manageSavedLimit}
              className="h-9 px-4 rounded-full text-sm font-bold text-white bg-blue-700 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              บันทึก
            </button>
          </div>
        </div>

        {/* เมนูใหญ่: ซ่อม / แก้ไขครั้งที่ 1 / แก้ไขครั้งที่ 2 ... — โผล่เฉพาะเคสที่เคยอนุมัติคำร้องอุทธรณ์แล้ว
            (จำนวนเมนูรอบแก้ไข = จำนวนคำร้องที่อนุมัติแล้ว ไม่เกินสิทธิ์ของเคส) รอบเก่าเปิดดูได้แต่กรอก/แก้ไม่ได้ */}
        {manageCurrentRound > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {Array.from({ length: manageCurrentRound + 1 }, (_, round) => (
              <button
                key={round}
                onClick={() => setManageRound(round)}
                className={`px-5 py-2 rounded-xl text-sm font-bold border ${
                  manageRound === round
                    ? 'bg-blue-800 border-blue-800 text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {roundLabel(round)}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-slate-100 rounded-full p-1 w-fit">
          <button
            onClick={() => setManageTab('schedule')}
            className={`px-6.5 py-2.5 rounded-full text-sm font-bold ${manageTab === 'schedule' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-black/5'}`}
          >
            นัดหมาย
          </button>
          <button
            onClick={() => setManageTab('report')}
            className={`px-6.5 py-2.5 rounded-full text-sm font-bold ${manageTab === 'report' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-black/5'}`}
          >
            รายงาน
          </button>
        </div>

        {manageTab === 'schedule' && isViewingPastRound ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            ประวัตินัดหมายของ "{roundLabel(manageRound)}" — รอบนี้ผ่านไปแล้ว ดูได้อย่างเดียว
          </p>
          {roundAppointments.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              ไม่มีประวัตินัดหมายในรอบนี้
            </div>
          ) : (
            roundAppointments.map((step, index) => (
              <div key={index} className="rounded-xl border-[1.5px] border-slate-200 p-4 text-sm">
                <div className="text-xs font-bold text-slate-500">{step.eventDate}</div>
                <div className="mt-1 text-slate-800">{step.eventDetail || 'นัดหมาย'}</div>
              </div>
            ))
          )}

          <div className="flex flex-col gap-2 pt-2">
            <label className="text-sm font-bold">ครุภัณฑ์ที่ใช้ใน "{roundLabel(manageRound)}"</label>
            <EquipmentUsageHistory
              items={allEquipmentUsage.filter((u) => u.revisionRound === manageRound)}
              emptyText="ไม่มีการใช้ครุภัณฑ์ในรอบนี้"
            />
          </div>
        </div>
        ) : manageTab === 'schedule' ? (
        <fieldset disabled={isManageScheduleLocked} className="min-w-0 border-0 p-0 m-0 flex flex-col gap-4">
        {isManageCaseClosed && (
          <div className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
            เคสนี้ปิดงานแล้ว — แก้ไขนัดหมายและครุภัณฑ์ไม่ได้ (ดูย้อนหลังอย่างเดียว)
          </div>
        )}
        {isManageLockedByComplaint && (
          <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            เคสนี้มีคำร้องจากนักศึกษารอตัดสินใจ — แก้ไขนัดหมายไม่ได้จนกว่าจะอนุมัติหรือปฏิเสธคำร้อง (ดูที่แท็บ "รายงานผลการซ่อม")
          </div>
        )}
        {/* แทนช่องวันที่+ช่วงเวลาเดิมด้วยปุ่มสรุปสั้นๆ กดแล้วเปิดมินิปฏิทินเป็น popup ซ้อนขึ้นมาแทน
            (รูปแบบเดียวกับ RejectReasonModal ที่ซ้อนบน popup นี้อยู่แล้ว) กันไม่ให้ popup หลักรกเกินไป */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold">{manageRound > 0 ? 'นัดหมายวันแก้ไข + ช่วงเวลา' : 'นัดหมายวันซ่อม + ช่วงเวลา'}</label>
          <button
            type="button"
            onClick={() => setIsSlotPickerOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
          >
            <span className="material-symbols-outlined text-slate-400 text-lg">calendar_month</span>
            <span className="flex-grow text-left font-semibold text-slate-800">
              {manageForm.date
                ? `${formatThaiDateShort(manageForm.date)} · ${SLOT_DEFS.find((s) => s.key === manageForm.timeslot)?.label} น.`
                : 'ยังไม่ได้เลือกวันที่/ช่วงเวลา'}
            </span>
            <span className="text-xs font-bold text-blue-700 whitespace-nowrap">เปลี่ยน / เลือกดูคิวว่าง</span>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ฝั่งซ้าย: ช่างผู้รับผิดชอบ */}
          <div className="flex flex-col gap-4.5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold">ช่างผู้รับผิดชอบ</label>
              <select
                value={manageForm.technicianId}
                onChange={(e) => setManageForm((f) => ({ ...f, technicianId: e.target.value }))}
                className="w-full px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
              >
                <option value="">-- เลือกช่างผู้รับผิดชอบ --</option>
                {technicianList.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name} ({technician.specialtyName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ฝั่งขวา: รายการครุภัณฑ์ที่ใช้ + หมายเหตุ */}
          <div className="flex flex-col gap-4.5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold">รายการครุภัณฑ์ที่ใช้</label>
              {pendingEquipmentUsage.length === 0 ? (
                <div className="w-full min-h-15 px-4 py-3 border-[1.5px] border-dashed border-slate-300 rounded-xl text-sm text-slate-400 flex items-center">
                  ยังไม่มีรายการที่เลือก
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingEquipmentUsage.map((item) => (
                    <div
                      key={item.equipmentId}
                      className="flex items-center justify-between gap-2 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 px-4 py-2.5"
                    >
                      <span className="text-sm font-bold text-slate-800 truncate">{item.equipmentName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-slate-500">
                          {item.quantity} {item.unitName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipmentUsage(item.equipmentId)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="w-fit flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span> เพิ่มครุภัณฑ์ที่ใช้
              </button>
            </div>

            {/* ตอนนัดรอบแก้ไข: ดูย้อนหลังว่ารอบก่อนหน้าใช้ครุภัณฑ์อะไรไปแล้วบ้าง (อ่านอย่างเดียว ไม่นับรวมกับรายการด้านบน) */}
            {manageRound > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <label className="text-sm font-bold text-slate-700">ครุภัณฑ์ที่ใช้ไปแล้วในรอบก่อนหน้า</label>
                {Array.from({ length: manageRound }, (_, round) => round).map((round) => (
                  <div key={round} className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">{roundLabel(round)}</span>
                    <EquipmentUsageHistory
                      items={allEquipmentUsage.filter((u) => u.revisionRound === round)}
                      emptyText="ไม่มีการใช้ครุภัณฑ์"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold">หมายเหตุ</label>
              <textarea
                value={manageForm.notes}
                onChange={(e) => setManageForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="ระบุรายละเอียดเพิ่มเติม..."
                className="w-full min-h-22.5 px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
              />
            </div>
          </div>
        </div>
        </fieldset>
        ) : (
        <div className="flex flex-col gap-6">
          {hasComplaintForViewedRound && (
            <div className="order-3 flex flex-col gap-3">
              <label className="text-sm font-bold">ประวัติคำร้องจากนักศึกษา</label>
              {caseComplaints
                .map((complaint, index) => {
                  // รอบของคำร้องใบนี้ = จำนวนคำร้อง "ที่อนุมัติแล้ว" ก่อนหน้าใบนี้ (นับจาก prefix ของลิสต์)
                  // ไม่ใช้ index ตรงๆ เพราะถ้ามีคำร้องถูกปฏิเสธคั่นอยู่ก่อนหน้า index จะไม่ตรงกับรอบจริง
                  // (บัคเดิม: คำร้องใบที่ 2 หายไปจากหน้าจอถ้าใบแรกถูกปฏิเสธ เพราะ manageRound ค้างที่ 0
                  // แต่ index ของใบที่ 2 คือ 1 ไม่ตรงเงื่อนไขไหนเลย)
                  const roundOfComplaint = caseComplaints.slice(0, index).filter((c) => c.decision === 'approved').length;
                  // โชว์เฉพาะคำร้องที่เกี่ยวกับรอบนี้: ใบที่ทำให้เกิดรอบนี้ (อนุมัติแล้ว รอบ = รอบปัจจุบัน-1)
                  // และใบที่ยื่นต่อรายงานรอบนี้ (รอบ = รอบปัจจุบัน ไม่ว่าจะ pending/approved/rejected)
                  // แก้ไขภายหลัง: คำร้องที่ "อนุมัติ" แล้วคือคำร้องแก้ไขที่ทำให้เกิดรอบแก้ไข จึงโชว์เฉพาะในแท็บรอบแก้ไขที่มันทำให้เกิด
                  // ไม่โชว์ปนในแท็บ "ซ่อม" ส่วนคำร้องที่รอตัดสิน/ถูกปฏิเสธยังโชว์ในแท็บรอบที่ยื่นต่อรายงาน (ต้องเห็นเพื่อตัดสินใจ)
                  const isRelevant =
                    (roundOfComplaint === manageRound && complaint.decision !== 'approved') ||
                    (roundOfComplaint === manageRound - 1 && complaint.decision === 'approved');
                  return { complaint, index, isRelevant };
                })
                .filter((entry) => entry.isRelevant)
                // เรียงใบล่าสุด (ยื่นทีหลัง) ขึ้นบนสุดเสมอ — กลับลำดับจากที่ caseComplaints เรียง
                // เก่า→ใหม่ (ORDER BY complaint_id ASC จาก backend) ให้แสดงใหม่→เก่าแทน
                .reverse()
                .map(({ complaint, index }) => (
                <div
                  key={complaint.complaintId}
                  className={`rounded-xl border-[1.5px] p-4 flex flex-col gap-2 ${
                    complaint.decision === 'pending'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      คำร้องที่ {index + 1} — {complaint.filedAt}
                      {complaint.editedAt && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          นักศึกษาแก้ไขแล้ว {complaint.editedAt}
                        </span>
                      )}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
                        complaint.decision === 'pending'
                          ? 'bg-orange-200 text-orange-800'
                          : complaint.decision === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {complaint.decision === 'pending' ? 'รอตัดสินใจ' : complaint.decision === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {complaint.reasonCategoryName && (
                      <span className="w-fit px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-700">
                        เหตุผลที่ไม่พอใจ: {complaint.reasonCategoryName}
                      </span>
                    )}
                    {complaint.allowEntry !== null && (
                      <span
                        className={`w-fit px-2.5 py-1 rounded-lg text-xs font-bold ${
                          complaint.allowEntry ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {complaint.allowEntry ? 'อนุญาตให้ช่างเข้าห้อง' : 'ไม่อนุญาตให้ช่างเข้าห้อง'}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{complaint.complaintText}</p>

                  {complaint.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {complaint.photos.map((photo, photoIndex) => (
                        <button
                          key={photo.photoId}
                          type="button"
                          onClick={() => setLightboxState({
                            photos: complaint.photos.map((p) => ({ photo_id: p.photoId, photo_url: p.photoUrl })),
                            index: photoIndex,
                          })}
                          className="aspect-square w-full"
                        >
                          <img
                            src={photoFullUrl(photo.photoUrl)}
                            alt="รูปประกอบคำร้อง"
                            className="h-full w-full rounded-lg object-cover border border-slate-200"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {complaint.decision === 'pending' && (
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => handleDecideComplaint(complaint.complaintId, 'approved')}
                        className="flex-1 h-9 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-800"
                      >
                        อนุมัติคำร้อง
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingComplaintId(complaint.complaintId)}
                        className="flex-1 h-9 rounded-lg text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        ปฏิเสธคำร้อง
                      </button>
                    </div>
                  )}
                </div>
                ))}
            </div>
          )}

          {/* ครุภัณฑ์ที่ใช้ในรอบที่กำลังดู — แสดงในแท็บรายงานด้วย เพื่อให้รายงานผลของรอบบอกว่าใช้อะไรไปบ้าง */}
          <div className="order-2 flex flex-col gap-2">
            <label className="text-sm font-bold">ครุภัณฑ์ที่ใช้ใน "{roundLabel(manageRound)}"</label>
            <EquipmentUsageHistory
              items={allEquipmentUsage.filter((u) => u.revisionRound === manageRound)}
              emptyText="ไม่มีการใช้ครุภัณฑ์ในรอบนี้"
            />
          </div>

          {/* order-1: การ์ดรายงานอยู่บนสุดของแท็บ ไม่ต้องเลื่อนผ่านประวัติคำร้อง (สลับลำดับด้วย flex order ไม่ย้ายโค้ด) */}
          <div className="order-1 flex flex-col gap-3">
            <label className="text-sm font-bold">
              {roundReportTitle(manageRound)} (แยกตามรายการงานซ่อม)
              {!isViewedReportEditable && (
                <span className="ml-2 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  ดูอย่างเดียว
                </span>
              )}
            </label>
            {viewedReportItems.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                ไม่มีรายงานในรอบนี้
              </div>
            )}
            {viewedReportItems.map((item) => (
              <CompletionItemReportCard
                key={item.repairTypeId}
                item={item}
                onReportTextChange={handleItemReportTextChange}
                onAddPhotos={handleAddItemPhotos}
                onRemoveNewPhoto={handleRemoveItemNewPhoto}
                onRemoveExistingPhoto={handleRemoveItemExistingPhoto}
                onSave={handleSaveItemReport}
                onViewPhoto={(photos, index) => setLightboxState({ photos, index })}
                readOnly={!isViewedReportEditable}
              />
            ))}
          </div>
        </div>
        )}
      </BaseModal>

      {/* ═══════ popup ซ้อน: เลือกวันที่/ช่วงเวลานัดหมาย (มินิปฏิทินเช็คคิว) ═══════ */}
      <BaseModal
        isOpen={isSlotPickerOpen}
        onClose={() => setIsSlotPickerOpen(false)}
        title="เลือกวันที่และช่วงเวลานัดหมาย"
        maxWidth="max-w-3xl"
      >
        <SlotAvailabilityCalendar
          minDate={manageMinDate}
          availability={slotAvailability}
          selectedDate={manageForm.date}
          selectedTimeslot={manageForm.timeslot}
          isRevisionRound={manageRound > 0}
          onPick={(date, timeslot) => {
            setManageForm((f) => ({ ...f, date, timeslot }));
            setIsSlotPickerOpen(false);
          }}
        />
      </BaseModal>

      {/* Lightbox แยกอยู่นอก BaseModal (ต้องอยู่ z-index สูงกว่า) — mirror pattern ของ RepairDetailModal.jsx */}
      <AnimatePresence>
        {lightboxState && (
          <PhotoLightbox
            key="completion-item-lightbox"
            photos={lightboxState.photos}
            initialIndex={lightboxState.index}
            caseCode={findCase(manageRequestId)?.caseCode}
            onClose={() => setLightboxState(null)}
          />
        )}
      </AnimatePresence>

      <EquipmentPickerModal
        isOpen={isPickerOpen}
        equipmentList={equipmentList}
        equipmentTypes={equipmentTypeList}
        selectedUsage={pendingEquipmentUsage}
        onAdd={handleAddEquipmentUsage}
        onClose={() => setIsPickerOpen(false)}
      />

      {/* ═══════ MODAL 3: ตรวจสอบและเสร็จสิ้นงาน (Review) ═══════ */}
      <BaseModal
        isOpen={!!reviewRepair}
        onClose={() => setReviewRequestId(null)}
        title="ตรวจสอบงานซ่อม"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-3 ml-auto">
            {/* แก้ไขได้เฉพาะตอนสถานะ "เสร็จสิ้น"(3) เท่านั้น — คือช่วงที่นักศึกษายังไม่ได้กดยอมรับหรือ
                ยื่นคำร้องเลย พอนักศึกษายื่นคำร้อง สถานะจะเปลี่ยนเป็น "รอตรวจสอบคำร้อง"(7) ไปเอง
                (ไม่ใช่ 3 อีกต่อไป) เช็คแค่ statusId===3 ตรงๆ ก็เพียงพอ */}
            {reviewRepair?.statusId === 3 && !reviewEditLocked && (
              <button
                onClick={() => {
                  setReviewRequestId(null);
                  openManageModal(reviewRequestId);
                }}
                className="h-11.5 px-6 rounded-full text-sm font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">edit</span> แก้ไข
              </button>
            )}
          </div>
        }
      >
        {reviewRepair && (
          <>
            <div className="grid sm:grid-cols-2 gap-3 -mt-2">
              <InfoRow variant="card" label="หมายเลข Case" value={reviewRepair.caseCode} />
              <InfoRow variant="card" label="วันที่แจ้ง" value={reviewRepair.reportDate} />
            </div>

            <div className="flex gap-1 bg-slate-100 rounded-full p-1 w-fit">
              <button
                onClick={() => setReviewTab('report')}
                className={`px-6.5 py-2.5 rounded-full text-sm font-bold ${reviewTab === 'report' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-black/5'}`}
              >
                รายงานการซ่อม
              </button>
              <button
                onClick={() => setReviewTab('review')}
                className={`px-6.5 py-2.5 rounded-full text-sm font-bold ${reviewTab === 'review' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-black/5'}`}
              >
                ผลการประเมิน
              </button>
            </div>

            {reviewTab === 'report' ? (
              <div className="flex flex-col gap-4">
                {reviewCompletionItems.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 text-sm text-slate-500">
                    ยังไม่มีรายงาน
                  </div>
                ) : (
                  reviewCompletionItems.map((item, itemIndex) => (
                    <div key={item.completionItemId} className="flex flex-col gap-2">
                      {/* หัวข้อรอบ: โชว์เมื่อขึ้นรอบใหม่ (รายงานการซ่อม / รายงานการแก้ไขครั้งที่ N) แยกรายงานแต่ละรอบไม่ให้ปนกัน */}
                      {(itemIndex === 0 || reviewCompletionItems[itemIndex - 1].revisionRound !== item.revisionRound) && (
                        <h4 className="mt-2 text-sm font-extrabold text-slate-800 border-b border-slate-200 pb-1">
                          {roundReportTitle(item.revisionRound)}
                        </h4>
                      )}
                    <div className="rounded-xl border-[1.5px] border-slate-200 p-4 flex flex-col gap-2">
                      <span className="text-sm font-bold text-blue-700">{item.repairTypeName}</span>
                      <div className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 text-sm min-h-12 whitespace-pre-wrap">
                        {item.reportText || 'ยังไม่มีรายงาน'}
                      </div>
                      {item.photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {item.photos.map((photo) => (
                            <img
                              key={photo.photoId}
                              src={photoFullUrl(photo.photoUrl)}
                              alt="รูปหลักฐานหน้างาน"
                              className="aspect-square w-full rounded-xl object-cover border border-slate-200"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
                  ))
                )}
              </div>
            ) : reviewRepair?.statusId === 8 ? (
              // สถานะ "ซ่อมไม่สำเร็จ" ไม่มีดาว: เหตุผล/รูปที่นักศึกษาส่งเป็นการประเมินแบบไม่มีดาว (repair_evaluation)
              // ถอยไปใช้เหตุผลใน timeline step 'declined' สำหรับเคสที่ปิดจากแอปเวอร์ชันเก่าซึ่งส่งเหตุผลมาตอนกด "ไม่ยอมรับ"
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-red-700">เหตุผลที่นักศึกษาไม่ยอมรับผลการซ่อม</label>
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 text-sm min-h-12 whitespace-pre-wrap">
                  {reviewEvaluation?.feedback || reviewDeclineReason || 'ไม่ได้ระบุเหตุผล'}
                </div>
                {reviewEvaluation?.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {reviewEvaluation.photos.map((photo) => (
                      <img
                        key={photo.photoId}
                        src={photoFullUrl(photo.photoUrl)}
                        alt="รูปประกอบเหตุผลที่ไม่ยอมรับ"
                        className="aspect-square w-full rounded-xl object-cover border border-slate-200"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : reviewEvaluation ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-sm font-bold">คะแนนความพึงพอใจ</label>
                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={`material-symbols-outlined text-2xl ${n <= reviewEvaluation.rating ? 'text-amber-500' : 'text-slate-300'}`}
                          style={{ fontVariationSettings: n <= reviewEvaluation.rating ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      ))}
                      <span className="ml-1 text-sm font-bold text-slate-700">{reviewEvaluation.rating} / 5</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold">ข้อเสนอแนะเพิ่มเติม</label>
                    <div className="mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 text-sm min-h-12 whitespace-pre-wrap">
                      {reviewEvaluation.feedback || 'ยังไม่มีข้อเสนอแนะ'}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold">รูปภาพผลลัพธ์หลังซ่อมเสร็จ</label>
                  {reviewEvaluation.photos.length === 0 ? (
                    <div className="aspect-square mt-2 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-4xl opacity-50">photo_camera</span>
                      <p className="text-sm font-semibold">ไม่มีรูปภาพแนบ</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {reviewEvaluation.photos.map((photo) => (
                        <img
                          key={photo.photoId}
                          src={photoFullUrl(photo.photoUrl)}
                          alt="รูปผลลัพธ์หลังซ่อมเสร็จ"
                          className="aspect-square w-full rounded-xl object-cover border border-slate-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 text-sm text-slate-500">
                ยังไม่มีการประเมิน (นักศึกษายังไม่ได้กดยืนยัน/ประเมินงานซ่อม)
              </div>
            )}
          </>
        )}
      </BaseModal>

      {/* ═══════ ปฏิเสธงานที่รอตรวจสอบ (จากปุ่มบนการ์ด) ═══════ */}
      <RejectReasonModal
        isOpen={!!rejectingRepair}
        caseCode={rejectingRepair?.caseCode}
        onClose={() => setRejectingRepair(null)}
        onConfirm={async (reason) => {
          const succeeded = await handleReject(rejectingRepair, reason);
          if (succeeded) {
            setRejectingRepair(null);
          }
        }}
      />

      {/* ═══════ ปฏิเสธคำร้องอุทธรณ์ของนักศึกษา (ต้องระบุเหตุผล นักศึกษาจะเห็นใน timeline) ═══════ */}
      <RejectReasonModal
        isOpen={!!rejectingComplaintId}
        caseCode={findCase(manageRequestId)?.caseCode}
        title="ระบุเหตุผลที่ปฏิเสธคำร้อง"
        placeholder="ระบุเหตุผลที่ปฏิเสธคำร้อง เช่น ตรวจสอบแล้วงานซ่อมเรียบร้อยตามมาตรฐาน..."
        note='นักศึกษาจะเห็นเหตุผลนี้ใน timeline หลังปฏิเสธ เคสกลับไปให้นักศึกษาตัดสิน: ยื่นคำร้องใหม่ได้ถ้ายังมีสิทธิ์ ถ้าใช้สิทธิ์ครบแล้วนักศึกษาต้องเลือก "ยอมรับ" หรือ "ไม่ยอมรับ" ผลซ่อม'
        onClose={() => setRejectingComplaintId(null)}
        onConfirm={async (reason) => {
          const succeeded = await handleDecideComplaint(rejectingComplaintId, 'rejected', reason);
          if (succeeded) {
            setRejectingComplaintId(null);
          }
        }}
      />

      {/* ═══════ ยกเลิกงานที่อยู่ระหว่างซ่อม ═══════ */}
      <RejectReasonModal
        isOpen={!!cancelingRepair}
        caseCode={cancelingRepair?.caseCode}
        title="ระบุเหตุผลที่ยกเลิกงานซ่อม"
        placeholder="เช่น แจ้งซ้ำ / นักศึกษาย้ายออก / ปัญหาหายไปแล้ว..."
        note="นักศึกษาจะเห็นเหตุผลนี้ในไทม์ไลน์ ครุภัณฑ์ที่เบิกไว้จะถูกคืนเข้าคลัง และยกเลิกแล้วย้อนกลับไม่ได้"
        onClose={() => setCancelingRepair(null)}
        onConfirm={async (reason) => {
          const succeeded = await handleCancelInProgress(reason);
          if (succeeded) {
            setCancelingRepair(null);
          }
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[200] flex items-center gap-2.5 bg-slate-900 text-white px-5.5 py-3.5 rounded-2xl text-[13.5px] font-semibold shadow-xl">
          <span className="material-symbols-outlined text-green-400 text-xl">check_circle</span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default RepairManagementPage;
