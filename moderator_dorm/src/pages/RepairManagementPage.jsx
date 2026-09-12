import React, { useEffect, useMemo, useState } from 'react';
import BaseModal from '../components/BaseModal';
import { InfoRow } from '../components/ui/InfoRow';
import StatusPill from '../components/StatusPill';
import RepairCard from '../components/RepairCard.jsx';
import RepairDetailModal from '../components/RepairDetailModal';
import RejectReasonModal from '../components/RejectReasonModal';
import EquipmentPickerModal from '../components/EquipmentPickerModal';
import { AppAPI } from '../utils/appApi';
import { photoFullUrl } from '../utils/photoUtil';
import { RepairRequestModel } from '../models/repairRequestModel';
import { InventoryModel } from '../models/inventoryModel';

const CARDS_PER_PAGE = 6;

function mapRepairRequestRow(row) {
  const model = RepairRequestModel.fromJson(row);

  return {
    id: model.requestId,
    caseCode: model.caseCode,
    studentName: model.studentName,
    contactPhone: model.contactPhone,
    roomNumber: model.roomNumber,
    allowEntry: model.allowEntry,
    typeNames: model.typeNames,
    description: model.description,
    reportDate: model.getRepairRequestDateLabel(),
    statusId: model.statusId,
    statusName: model.statusName,
    technicianId: model.technicianId,
    technicianName: model.technicianName,
    appointmentDate: model.appointmentDate,
    appointmentDateLabel: model.getAppointmentDateLabel(),
    repairReport: model.repairReport,
    hasPendingComplaint: model.hasPendingComplaint,
  };
}

async function getAllRepairRequests() {
  const response = await AppAPI.get("/repair_request/get_all");
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map(mapRepairRequestRow);
}

async function getProgressStatusList() {
  const response = await AppAPI.get("/progress_status/get_all");
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    id: row.progress_status_id,
    name: row.progress_status_name,
  }));
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
    repairReport: model.repairReport,
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
  }));
}

async function completeRepairRequest(requestId) {
  const response = await AppAPI.post("/repair_request/complete", {
    request_id: requestId,
  });

  return response.json();
}

async function saveRepairReport(requestId, reportText, photoFiles) {
  const response = await AppAPI.postFormData(`/repair_request/${requestId}/report`, {
    files: photoFiles,
    fieldName: 'photos',
    fields: { report_text: reportText || '' },
  });

  return response.json();
}

async function getCompletionPhotos(requestId) {
  const response = await AppAPI.get(`/repair_request/${requestId}/completion_photos`);
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    photoId: row.completion_photo_id,
    photoUrl: row.photo_url,
  }));
}

async function getComplaints(requestId) {
  const response = await AppAPI.get(`/repair_request/${requestId}/complaints`);
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    complaintId: row.complaint_id,
    complaintText: row.complaint_text,
    decision: row.decision,
    filedAt: row.filed_at,
    photos: (Array.isArray(row.photos) ? row.photos : []).map((p) => ({
      photoId: p.complaint_photo_id,
      photoUrl: p.photo_url,
    })),
  }));
}

async function decideComplaint(complaintId, requestId, decision) {
  const response = await AppAPI.post('/repair_request/complaint/decide', {
    complaint_id: complaintId,
    request_id: requestId,
    decision,
  });

  return response.json();
}

function RepairManagementPage() {
  const [repairData, setRepairData] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [technicianList, setTechnicianList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [toast, setToast] = useState('');

  // Modal 1: Inspect (ใช้ component กลางร่วมกับหน้า Home)
  const [inspectRequestId, setInspectRequestId] = useState(null);

  // ปฏิเสธงานที่รอตรวจสอบ (กดจากปุ่มบนการ์ดโดยตรง)
  const [rejectingRepair, setRejectingRepair] = useState(null);

  // Modal 2: Manage (นัดหมาย/มอบหมายช่าง + รายงานผลการซ่อม — 2 แท็บในโมดัลเดียวกัน)
  const [manageRequestId, setManageRequestId] = useState(null);
  const [manageTab, setManageTab] = useState('schedule');
  const [manageForm, setManageForm] = useState({ date: '', timeslot: '09-11', technicianId: '', notes: '' });
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentTypeList, setEquipmentTypeList] = useState([]);
  const [pendingEquipmentUsage, setPendingEquipmentUsage] = useState([]);
  const [manageFormSnapshot, setManageFormSnapshot] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [existingReportPhotos, setExistingReportPhotos] = useState([]);
  const [reportNewPhotos, setReportNewPhotos] = useState([]);
  const [caseComplaints, setCaseComplaints] = useState([]);

  // Modal 3: Review
  const [reviewRequestId, setReviewRequestId] = useState(null);
  const [reviewTab, setReviewTab] = useState('report');
  const [reviewCompletionPhotos, setReviewCompletionPhotos] = useState([]);

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

      const [repairs, statuses, technicians, equipments, equipmentTypes] = await Promise.all([
        getAllRepairRequests(),
        getProgressStatusList(),
        getTechnicianList(),
        getAllEquipment(),
        getEquipmentTypeList(),
      ]);

      setRepairData(Array.isArray(repairs) ? repairs : []);
      setStatusList(Array.isArray(statuses) ? statuses : []);
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

  function findCase(requestId) {
    return repairData.find((r) => r.id === requestId);
  }

  /* ─── Filter + Pagination ─── */
  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return repairData.filter((r) => {
      const matchesSearch =
        term === '' ||
        r.caseCode.toLowerCase().includes(term) ||
        r.studentName.toLowerCase().includes(term) ||
        r.roomNumber.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || r.statusId === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [repairData, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / CARDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleRepairs = filteredData.slice(
    (safePage - 1) * CARDS_PER_PAGE,
    (safePage - 1) * CARDS_PER_PAGE + CARDS_PER_PAGE,
  );

  const statusCounts = useMemo(() => {
    const counts = { all: repairData.length };
    for (const status of statusList) {
      counts[status.id] = 0;
    }
    repairData.forEach((r) => {
      counts[r.statusId] = (counts[r.statusId] ?? 0) + 1;
    });
    return counts;
  }, [repairData, statusList]);

  /* ─── Modal 1: Inspect ─── */
  async function handleApprove(detail) {
    const response = await approveRepairRequest(detail.id);

    if (response.isError) {
      alert(response.errorMessage || 'อนุมัติไม่สำเร็จ');
      return;
    }

    setInspectRequestId(null);
    showToast(`อนุมัติ Case ${detail.caseCode} สำเร็จ — ย้ายไปสถานะ "อยู่ระหว่างซ่อม"`);
    await fetchAll();
  }

  async function handleReject(detail, reason) {
    const response = await rejectRepairRequest(detail.id, reason);

    if (response.isError) {
      alert(response.errorMessage || 'ปฏิเสธไม่สำเร็จ');
      return;
    }

    setInspectRequestId(null);
    showToast(`ปฏิเสธ Case ${detail.caseCode} เรียบร้อย`);
    await fetchAll();
  }

  /* ─── ยกเลิกงานที่อยู่ระหว่างซ่อม ─── */
  async function handleCancelInProgress(reason) {
    const repair = cancelingRepair;
    const response = await rejectRepairRequest(repair.id, reason);

    setCancelingRepair(null);

    if (response.isError) {
      alert(response.errorMessage || 'ยกเลิกไม่สำเร็จ');
      return;
    }

    showToast(`ยกเลิก Case ${repair.caseCode} เรียบร้อย`);
    await fetchAll();
  }

  /* ─── Modal 2: Manage ─── */
  async function openManageModal(requestId) {
    const r = findCase(requestId);
    if (!r) return;
    setManageRequestId(requestId);
    // ถ้าเคสนี้มีคำร้องค้างอยู่ ให้เปิดตรงแท็บ "รายงานผลการซ่อม" เลย เพราะคำร้อง+ปุ่มอนุมัติ/ปฏิเสธ
    // อยู่ในแท็บนั้น ไม่ใช่แท็บ "จัดการงานซ่อม" (ตารางนัด) ที่เคยเปิดให้แบบตายตัวมาก่อน
    setManageTab(r.hasPendingComplaint ? 'report' : 'schedule');
    setReportText(r.repairReport || '');
    setReportNewPhotos([]);

    const [existingPhotos, complaints] = await Promise.all([
      getCompletionPhotos(requestId),
      getComplaints(requestId),
    ]);
    setExistingReportPhotos(existingPhotos);
    setCaseComplaints(complaints);

    let initialForm = { date: '', timeslot: '09-11', technicianId: '', notes: '' };
    let initialEquipment = [];

    // ถ้ามีนัดหมายอยู่แล้ว ให้ดึงข้อมูลมาเติมในฟอร์มเพื่อแก้ไข (รวมครุภัณฑ์ที่เคยเบิกไว้ด้วย)
    if (r.appointmentDate) {
      const [detail, timeline, equipmentUsage] = await Promise.all([
        getRepairRequestDetail(requestId),
        getRepairTimeline(requestId),
        getRepairEquipmentUsage(requestId),
      ]);

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

  // แท็บ B ของ Modal 2: บันทึกรายงานผลซ่อม+รูปหน้างาน — ไม่เปลี่ยนสถานะ ไม่ส่งให้นักศึกษาเห็นทันที
  async function handleSendReport() {
    const repair = findCase(manageRequestId);
    const response = await saveRepairReport(manageRequestId, reportText, reportNewPhotos);

    if (response.isError) {
      alert(response.errorMessage || 'บันทึกรายงานผลซ่อมไม่สำเร็จ');
      return;
    }

    setReportNewPhotos([]);
    const refreshedPhotos = await getCompletionPhotos(manageRequestId);
    setExistingReportPhotos(refreshedPhotos);
    showToast(`บันทึกรายงานผลซ่อม Case ${repair?.caseCode} สำเร็จ`);
    await fetchAll(true);
  }

  // แท็บ B ของ Modal 2: ส่งงานให้นักศึกษาตรวจสอบ — ยังไม่ใช่จุดจบจริง นักศึกษาต้องกด "ยอมรับ" เอง
  // (หรือยื่นคำร้องแจ้งแก้ไข) ถึงจะปิดเคสจริง — เปลี่ยนข้อความ confirm ให้ตรงความจริงใหม่แล้ว
  async function handleCloseJob() {
    const repair = findCase(manageRequestId);
    const confirmed = window.confirm(`ส่งงาน Case ${repair?.caseCode} ให้นักศึกษาตรวจสอบ? นักศึกษาจะเห็นรายงานผลซ่อมแล้วเลือกยอมรับหรือแจ้งแก้ไขได้`);
    if (!confirmed) return;

    const response = await completeRepairRequest(manageRequestId);

    if (response.isError) {
      alert(response.errorMessage || 'ส่งงานไม่สำเร็จ');
      return;
    }

    setManageRequestId(null);
    showToast(`ส่งงาน Case ${repair?.caseCode} ให้นักศึกษาตรวจสอบเรียบร้อยแล้ว`);
    await fetchAll();
  }

  // moderator ตัดสินใจคำร้องที่นักศึกษายื่นมา — อนุมัติ (ไปซ่อมรอบใหม่) หรือ ปฏิเสธ (ครบ 2 ครั้งจะบังคับปิดเคส)
  async function handleDecideComplaint(complaintId, decision) {
    // ปุ่มอนุมัติ/ปฏิเสธคำร้องอยู่แท็บเดียวกับช่องพิมพ์รายงานผลซ่อม+แนบรูป ถ้าเจ้าหน้าที่พิมพ์/แนบ
    // ไว้แล้วแต่ยังไม่ได้กด "ส่งงาน" (ยังไม่ save) การกดปุ่มนี้จะปิด modal ทันทีทำให้ข้อมูลที่พิมพ์
    // ไว้หายไปเงียบๆ — เตือนก่อนเสมอถ้ามีการเปลี่ยนแปลงที่ยังไม่บันทึก
    const repair = findCase(manageRequestId);
    const hasUnsavedReport = reportText !== (repair?.repairReport || '') || reportNewPhotos.length > 0;
    if (hasUnsavedReport) {
      const confirmedDiscard = window.confirm(
        'คุณมีรายงานผลซ่อม/รูปที่พิมพ์หรือแนบไว้แต่ยังไม่ได้กด "ส่งงาน" ถ้าดำเนินการต่อ ข้อมูลที่ยังไม่บันทึกจะหายไป ต้องการดำเนินการต่อหรือไม่?'
      );
      if (!confirmedDiscard) return;
    }

    if (decision === 'rejected') {
      const confirmed = window.confirm('ยืนยันปฏิเสธคำร้องนี้? ถ้าปฏิเสธครบ 2 ครั้ง เคสจะถูกปิดเป็น "สำเร็จ" ทันทีโดยไม่ให้ยื่นคำร้องอีก');
      if (!confirmed) return;
    }

    const response = await decideComplaint(complaintId, manageRequestId, decision);

    if (response.isError) {
      alert(response.errorMessage || 'ดำเนินการไม่สำเร็จ');
      return;
    }

    const refreshedComplaints = await getComplaints(manageRequestId);
    setCaseComplaints(refreshedComplaints);
    setManageRequestId(null);
    showToast(decision === 'approved' ? 'อนุมัติคำร้องแล้ว เคสกลับไปเป็น "รอแก้ไข"' : 'ปฏิเสธคำร้องแล้ว');
    await fetchAll();
  }

  /* ─── Modal 3: Review ─── */
  const reviewRepair = reviewRequestId ? findCase(reviewRequestId) : null;

  async function openReviewModal(requestId) {
    setReviewRequestId(requestId);
    setReviewTab('report');
    const photos = await getCompletionPhotos(requestId);
    setReviewCompletionPhotos(photos);
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

      {/* Status filter pills — ดึงชื่อสถานะจากฐานข้อมูลเท่านั้น */}
      <div className="flex gap-3 flex-wrap">
        <StatusPill
          icon="apps"
          label="ดูทั้งหมด"
          count={statusCounts.all}
          isActive={statusFilter === 'all'}
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
        />
        {statusList.map((status) => (
          <StatusPill
            key={status.id}
            status={status.id}
            label={status.name}
            count={statusCounts[status.id] ?? 0}
            isActive={statusFilter === status.id}
            onClick={() => { setStatusFilter(status.id); setCurrentPage(1); }}
          />
        ))}
      </div>

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
              {findCase(manageRequestId)?.appointmentDate && (
                <button onClick={handleDeleteAppointment} className="h-11.5 px-6 rounded-full text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">event_busy</span> ลบกำหนดนัดหมาย
                </button>
              )}
              <button onClick={() => setManageRequestId(null)} className="h-11.5 px-6 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
                ยกเลิก
              </button>
              <button
                onClick={handleSaveManage}
                disabled={!hasScheduleChanges()}
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
              <button onClick={handleSendReport} className="h-11.5 px-6 rounded-full text-sm font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">save</span> ส่งงาน
              </button>
              <button onClick={handleCloseJob} className="h-11.5 px-6 rounded-full text-sm font-bold text-white bg-blue-700 shadow-md hover:brightness-110 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">task_alt</span> ปิดงาน
              </button>
            </div>
          )
        }
      >
        <div className="flex gap-1 bg-slate-100 rounded-full p-1 w-fit">
          <button
            onClick={() => setManageTab('schedule')}
            className={`px-6.5 py-2.5 rounded-full text-sm font-bold ${manageTab === 'schedule' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-black/5'}`}
          >
            จัดการงานซ่อม
          </button>
          <button
            onClick={() => setManageTab('report')}
            className={`px-6.5 py-2.5 rounded-full text-sm font-bold ${manageTab === 'report' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-black/5'}`}
          >
            รายงานผลการซ่อม
          </button>
        </div>

        {manageTab === 'schedule' ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* ฝั่งซ้าย: นัดหมายวันซ่อม + ช่วงเวลา + ช่างผู้รับผิดชอบ */}
          <div className="flex flex-col gap-4.5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold">นัดหมายวันซ่อม</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-lg pointer-events-none">calendar_today</span>
                <input
                  type="date"
                  value={manageForm.date}
                  onChange={(e) => setManageForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full pl-10.5 pr-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold">ช่วงเวลา</label>
              <select
                value={manageForm.timeslot}
                onChange={(e) => setManageForm((f) => ({ ...f, timeslot: e.target.value }))}
                className="w-full px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
              >
                <option value="09-11">09:00 - 11:00 น.</option>
                <option value="13-15">13:00 - 15:00 น.</option>
                <option value="15-17">15:00 - 17:00 น.</option>
              </select>
            </div>

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
        ) : (
        <div className="flex flex-col gap-6">
          {caseComplaints.length > 0 && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold">ประวัติคำร้องจากนักศึกษา</label>
              {caseComplaints.map((complaint, index) => (
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

                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{complaint.complaintText}</p>

                  {complaint.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {complaint.photos.map((photo) => (
                        <img
                          key={photo.photoId}
                          src={photoFullUrl(photo.photoUrl)}
                          alt="รูปประกอบคำร้อง"
                          className="aspect-square w-full rounded-lg object-cover border border-slate-200"
                        />
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
                        onClick={() => handleDecideComplaint(complaint.complaintId, 'rejected')}
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

          <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">รายงานผลการซ่อม</label>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="ระบุรายละเอียดผลการซ่อม..."
              className="w-full min-h-40 px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">รูปภาพหลักฐาน / รูปภาพหน้างาน</label>
            <div className="grid grid-cols-3 gap-2">
              {existingReportPhotos.map((photo) => (
                <img
                  key={photo.photoId}
                  src={photoFullUrl(photo.photoUrl)}
                  alt="รูปหลักฐานหน้างาน"
                  className="aspect-square w-full rounded-xl object-cover border border-slate-200"
                />
              ))}
              {reportNewPhotos.map((file, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="รูปที่เพิ่งเลือก"
                    className="h-full w-full rounded-xl object-cover border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setReportNewPhotos((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
            <label className="w-fit flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900 cursor-pointer">
              <span className="material-symbols-outlined text-lg">add_photo_alternate</span> แนบรูปภาพ
              <input
                type="file"
                accept="image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setReportNewPhotos((prev) => [...prev, ...files]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          </div>
        </div>
        )}
      </BaseModal>

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
            <button
              onClick={() => showToast('กำลังเตรียมพิมพ์รายงาน... (ฟังก์ชันพิมพ์จะเชื่อมต่อในเฟสถัดไป)')}
              className="h-11.5 px-6 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">print</span> พิมพ์รายงาน
            </button>
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
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4.5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold">รายงาน</label>
                    <div className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 text-sm min-h-12 whitespace-pre-wrap">
                      {reviewRepair.repairReport || 'ยังไม่มีรายงาน'}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold">รูปภาพหลักฐาน / รูปภาพหน้างาน</label>
                  {reviewCompletionPhotos.length === 0 ? (
                    <div className="aspect-square mt-2 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-4xl opacity-50">photo_camera</span>
                      <p className="text-sm font-semibold">ไม่มีรูปภาพแนบ</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {reviewCompletionPhotos.map((photo) => (
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
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold">ข้อเสนอแนะเพิ่มเติม</label>
                  <div className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 text-sm min-h-12">
                    ยังไม่มีข้อเสนอแนะ
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold">รูปภาพผลลัพธ์หลังซ่อมเสร็จ</label>
                  <div className="aspect-square mt-2 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-4xl opacity-50">photo_camera</span>
                    <p className="text-sm font-semibold">ไม่มีรูปภาพแนบ</p>
                  </div>
                </div>
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
        onConfirm={(reason) => {
          const repair = rejectingRepair;
          setRejectingRepair(null);
          handleReject(repair, reason);
        }}
      />

      {/* ═══════ ยกเลิกงานที่อยู่ระหว่างซ่อม ═══════ */}
      <RejectReasonModal
        isOpen={!!cancelingRepair}
        caseCode={cancelingRepair?.caseCode}
        onClose={() => setCancelingRepair(null)}
        onConfirm={handleCancelInProgress}
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
