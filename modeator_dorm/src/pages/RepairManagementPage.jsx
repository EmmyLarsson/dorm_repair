import React, { useEffect, useMemo, useState } from 'react';
import BaseModal from '../components/BaseModal';
import { InfoRow } from '../components/ui/InfoRow';
import StatusPill from '../components/StatusPill';
import RepairCard from '../components/RepairCard.jsx';
import RepairDetailModal from '../components/RepairDetailModal';
import RejectReasonModal from '../components/RejectReasonModal';
import { AppAPI } from '../services/appApi';
import { RepairRequestModel } from '../models/repairRequestModel';

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

async function assignTechnician(requestId, technicianId, appointmentDate, notes) {
  const response = await AppAPI.post("/repair_request/assign_technician", {
    request_id: requestId,
    technician_id: technicianId,
    appointment_date: appointmentDate,
    notes,
  });

  return response.json();
}

async function completeRepairRequest(requestId) {
  const response = await AppAPI.post("/repair_request/complete", {
    request_id: requestId,
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

  // Modal 2: Manage (นัดหมาย/มอบหมายช่าง) — วันที่/ช่วงเวลา/หมายเหตุยังไม่ทำในเฟสนี้
  const [manageRequestId, setManageRequestId] = useState(null);
  const [manageForm, setManageForm] = useState({ date: '', timeslot: '09-11', technicianId: '', notes: '' });

  // Modal 3: Review
  const [reviewRequestId, setReviewRequestId] = useState(null);
  const [reviewTab, setReviewTab] = useState('report');

  // ยกเลิกงานที่อยู่ระหว่างซ่อม
  const [cancelingRepair, setCancelingRepair] = useState(null);

  // เลือกการ์ด/ลบรายการแจ้งซ่อม (เฉพาะหน้านี้)
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

      const [repairs, statuses, technicians] = await Promise.all([
        getAllRepairRequests(),
        getProgressStatusList(),
        getTechnicianList(),
      ]);

      setRepairData(Array.isArray(repairs) ? repairs : []);
      setStatusList(Array.isArray(statuses) ? statuses : []);
      setTechnicianList(Array.isArray(technicians) ? technicians : []);
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
    setManageForm({ date: '', timeslot: '09-11', technicianId: '', notes: '' });

    // ถ้ามีนัดหมายอยู่แล้ว ให้ดึงข้อมูลมาเติมในฟอร์มเพื่อแก้ไข
    if (r.appointmentDate) {
      const [detail, timeline] = await Promise.all([
        getRepairRequestDetail(requestId),
        getRepairTimeline(requestId),
      ]);

      const [datePart, timePart] = (detail.appointmentDate || '').split(' ');
      const hour = Number((timePart || '09:00:00').split(':')[0]);
      const timeslot = hour < 13 ? '09-11' : hour < 15 ? '13-15' : '15-17';
      const lastAppointmentStep = [...timeline].reverse().find((s) => s.stepCode === 'appointment');

      setManageForm({
        date: datePart || '',
        timeslot,
        technicianId: detail.technicianId ? String(detail.technicianId) : '',
        notes: lastAppointmentStep?.eventDetail || '',
      });
    }
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

    setSelectedIds([]);
    showToast('ลบรายการที่เลือกเรียบร้อย');
    await fetchAll();
  }

  async function handleDeleteAll() {
    if (filteredData.length === 0) return;

    const confirmed = window.confirm('คุณจะลบรายการซ่อมทั้งหมดใช่หรือไม่?');
    if (!confirmed) return;

    const response = await deleteRepairRequests(filteredData.map((r) => r.id));

    if (response.isError) {
      alert(response.errorMessage || 'ลบรายการไม่สำเร็จ');
      return;
    }

    setSelectedIds([]);
    showToast('ลบรายการซ่อมทั้งหมดเรียบร้อย');
    await fetchAll();
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
    );

    if (response.isError) {
      alert(response.errorMessage || 'บันทึกการมอบหมายงานไม่สำเร็จ');
      return;
    }

    setManageRequestId(null);
    showToast(`บันทึกการมอบหมายงาน Case ${repair?.caseCode} สำเร็จ`);
    await fetchAll();
  }

  /* ─── Modal 3: Review ─── */
  const reviewRepair = reviewRequestId ? findCase(reviewRequestId) : null;

  async function handleCompleteCase() {
    const repair = reviewRepair;
    const response = await completeRepairRequest(repair.id);

    if (response.isError) {
      alert(response.errorMessage || 'ปิดเคสไม่สำเร็จ');
      return;
    }

    setReviewRequestId(null);
    showToast(`ปิดเคส ${repair.caseCode} เรียบร้อยแล้ว`);
    await fetchAll();
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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            ลบที่เลือก{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </button>
          <button
            type="button"
            onClick={handleDeleteAll}
            className="flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            ลบทั้งหมด
          </button>
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
                onReview={(r) => setReviewRequestId(r.id)}
                onCancel={setCancelingRepair}
                selectable
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

      {/* ═══════ MODAL 2: จัดการงานซ่อม (นัดหมาย/มอบหมายช่าง) ═══════ */}
      <BaseModal
        isOpen={!!manageRequestId}
        onClose={() => setManageRequestId(null)}
        title="จัดการงานซ่อม"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-3 ml-auto items-center">
            {findCase(manageRequestId)?.appointmentDate && (
              <button onClick={handleDeleteAppointment} className="h-11.5 px-6 rounded-full text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">event_busy</span> ลบกำหนดนัดหมาย
              </button>
            )}
            <button onClick={() => setManageRequestId(null)} className="h-11.5 px-6 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
              ยกเลิก
            </button>
            <button onClick={handleSaveManage} className="h-11.5 px-6 rounded-full text-sm font-bold text-white bg-blue-700 shadow-md hover:brightness-110 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">save</span> บันทึกการมอบหมาย
            </button>
          </div>
        }
      >
        <div className="grid md:grid-cols-2 gap-6">
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

          <div className="flex flex-col gap-2 md:col-span-2">
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

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-bold">รายการครุภัณฑ์ที่ใช้</label>
            <div className="w-full min-h-15 px-4 py-3 border-[1.5px] border-dashed border-slate-300 rounded-xl text-sm text-slate-400 flex items-center">
              ยังไม่มีรายการที่เลือก
            </div>
            <button
              type="button"
              onClick={() => showToast('ฟีเจอร์เลือกครุภัณฑ์จะเปิดใช้งานเร็วๆ นี้')}
              className="w-fit flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span> เพิ่มครุภัณฑ์ที่ใช้
            </button>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-bold">หมายเหตุ</label>
            <textarea
              value={manageForm.notes}
              onChange={(e) => setManageForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="ระบุรายละเอียดเพิ่มเติม..."
              className="w-full min-h-22.5 px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
            />
          </div>
        </div>
      </BaseModal>

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
            <button
              onClick={handleCompleteCase}
              className="h-11.5 px-6 rounded-full text-sm font-bold text-white bg-blue-700 shadow-md hover:brightness-110 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">task_alt</span> ปิดเคส
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
                    <div className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 text-sm min-h-12">
                      {reviewRepair.progressDetail || 'ยังไม่มีรายงาน'}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold">รูปภาพหลักฐาน / รูปภาพหน้างาน</label>
                  <div className="aspect-square mt-2 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-4xl opacity-50">photo_camera</span>
                    <p className="text-sm font-semibold">ไม่มีรูปภาพแนบ</p>
                  </div>
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
