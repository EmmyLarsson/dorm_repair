import {useEffect, useMemo, useState,} from 'react';
import { useNavigate } from 'react-router-dom';
import { AppAPI } from '../utils/appApi';
import { appointmentToastLabel } from '../utils/appointmentLabel';
import { RepairRequestModel } from '../models/repairRequestModel';
import { EQUIPMENT_STATUS_BADGE_CLASS, InventoryModel } from '../models/inventoryModel';
import { markCaseNotificationsRead } from '../utils/caseNotification';
import StatusCard from '../components/StatusCard';
import RepairCard from '../components/RepairCard';
import RepairDetailModal from '../components/RepairDetailModal';
import RejectReasonModal from '../components/RejectReasonModal';

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
    description: model.description,
    reportDate: model.getRepairRequestDateLabel(),
    statusId: model.statusId,
    statusName: model.statusName,
    technicianId: model.technicianId,
    technicianName: model.technicianName,
    appointmentDate: model.appointmentDate,
    appointmentDateLabel: model.getAppointmentDateLabel(),
    createdAt: model.createdAt,
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
  };
}

// ส่วน "งานซ่อมที่ต้องจัดการ" โชว์สูงสุดกี่ใบต่อกลุ่ม (กลุ่มขอเร่งงานโชว์ทั้งหมดเสมอ เพราะสำคัญที่สุด) —
// ที่เหลือกด "ดูอีก" ไปหน้าจัดการงานซ่อม; 3 ใบ = 1 แถวเต็มของกริด 3 คอลัมน์บนจอเดสก์ท็อป
const TODO_PREVIEW_LIMIT = 3;

// ตารางแจ้งเตือนสต๊อกโชว์สูงสุดกี่รายการ (ที่เหลือกด "ดูทั้งหมด" ไปหน้าครุภัณฑ์) — เรียงหมดคงคลังก่อน แล้วเหลือน้อยสุดก่อน
const INVENTORY_PREVIEW_LIMIT = 5;

// ค่าเวลาเก่าสุดก่อน (รอนานสุดอยู่บน) — เคสที่ไม่มีเวลาไปท้ายสุด
function byOldest(getTime) {
  return (a, b) => (getTime(a) ?? '9999').localeCompare(getTime(b) ?? '9999');
}

async function getHomeDashboard() {
  const [repairsResponse, summaryResponse, equipmentResponse] = await Promise.all([
    AppAPI.get("/repair_request/get_all"),
    AppAPI.get("/repair_request/get_summary"),
    AppAPI.get("/equipment/get_all"),
  ]);

  const repairsJson = await repairsResponse.json();
  const summaryJson = await summaryResponse.json();
  const equipmentJson = await equipmentResponse.json();

  // แจ้งเตือนสต๊อก = ครุภัณฑ์ที่ "ใกล้จะหมด" หรือ "หมดคงคลัง" ตามเกณฑ์เดียวกับหน้าครุภัณฑ์ (InventoryModel.status)
  const inventoryAlerts = (Array.isArray(equipmentJson.data) ? equipmentJson.data : [])
    .map(InventoryModel.fromJson)
    .filter((equipment) => equipment.status !== 'stock')
    .sort((a, b) => (a.status === b.status ? a.quantity - b.quantity : a.status === 'out' ? -1 : 1));

  const repairs = (Array.isArray(repairsJson.data) ? repairsJson.data : []).map(mapRepairRequestRow);

  // เดิมนับแค่สถานะ 1/2/3 พอมีสถานะใหม่ "รอแก้ไข"(5)/"สำเร็จ"(6) เพิ่มเข้ามา เคสที่อยู่ 2 สถานะนี้
  // จะไม่ถูกนับในสถิติที่ไหนเลย (หายไปจากหน้าแรกทั้งหมด) เลยเพิ่ม 2 หมวดใหม่แยกจากของเดิม
  const repairSummary = {
    pending: 0,
    waiting: 0,
    completed: 0,
    pendingComplaintReview: 0,
    underRevision: 0,
    success: 0,
    failed: 0,
  };

  for (const row of summaryJson.data ?? []) {
    const total = Number(row.total) || 0;

    if (row.progress_status_id === 1) {
      repairSummary.pending = total;
    } else if (row.progress_status_id === 2) {
      repairSummary.waiting = total;
    } else if (row.progress_status_id === 3) {
      repairSummary.completed = total;
    } else if (row.progress_status_id === 7) {
      repairSummary.pendingComplaintReview = total;
    } else if (row.progress_status_id === 5) {
      repairSummary.underRevision = total;
    } else if (row.progress_status_id === 6) {
      repairSummary.success = total;
    } else if (row.progress_status_id === 8) {
      repairSummary.failed = total;
    }
  }

  return {
    repairSummary,
    repairs,
    inventoryAlerts,
  };
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

const initialDashboard = {
  repairSummary: {
    pending: 0,
    waiting: 0,
    completed: 0,
    underRevision: 0,
    success: 0,
    failed: 0,
  },

  repairs: [],

  inventoryAlerts: [],
};

function HomePage() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] =
    useState(initialDashboard);

  const [currentTime, setCurrentTime] =
    useState(new Date());

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [viewingRepairId, setViewingRepairId] =
    useState(null);

  const [rejectingRepair, setRejectingRepair] =
    useState(null);

  // เปิด modal "ดูรายละเอียด" → ล้างแจ้งเตือนของเคสนั้น (ป้าย "มีอัปเดตใหม่จากนักศึกษา" บนการ์ด)
  useEffect(() => {
    if (viewingRepairId) markCaseNotificationsRead(viewingRepairId);
  }, [viewingRepairId]);

  /*
   ดึงข้อมูลหน้า Home จาก Server
   (แสดงเฉพาะรายการที่ "รอตรวจสอบ" เท่านั้น เคสที่อนุมัติ/ปฏิเสธแล้วจะย้ายไปหน้าจัดการงานซ่อม)
  */
  // ข้อความแจ้งผลชั่วคราวมุมจอ (รูปแบบเดียวกับหน้าจัดการงานซ่อม/ครุภัณฑ์/บุคลากร) — เดิมหน้านี้อนุมัติแล้วรายการ
  // หายไปเงียบๆ เจ้าหน้าที่ไม่รู้ว่าสำเร็จหรือไม่ และไม่รู้ว่าระบบจัดนัดหมายให้วันไหน
  const [toast, setToast] = useState('');

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), 2800);
  }

  async function fetchDashboard(silent = false) {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError('');

      const data = await getHomeDashboard();

      setDashboard({
        repairSummary:
          data.repairSummary ??
          initialDashboard.repairSummary,

        // เก็บเฉพาะเคสที่เป็น "งานที่ต้องจัดการ": แจ้งใหม่ (1), อุทธรณ์รอตัดสิน (7), หรือ นศ. กดเร่งและยังไม่ถูกตอบสนอง
        repairs:
          (Array.isArray(data.repairs) ? data.repairs : [])
            .filter((repair) => repair.statusId === 1 || repair.statusId === 7 || Boolean(repair.rushedAt)),

        inventoryAlerts:
          Array.isArray(data.inventoryAlerts)
            ? data.inventoryAlerts
            : [],
      });
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
    fetchDashboard();

    // อัปเดตรายการแจ้งซ่อมอัตโนมัติ ไม่ต้องรอให้เจ้าหน้าที่รีเฟรชหน้าเอง
    const intervalId = window.setInterval(() => fetchDashboard(true), 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  /*
   อัปเดตนาฬิกาทุก 1 วินาที
  */
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // กลุ่มของ "งานซ่อมที่ต้องจัดการ" ตามลำดับความสำคัญ — ทุกกลุ่มดูจากสถานะจริงของเคส รายการจึงหายเองเมื่อเจ้าหน้าที่
  // ตอบสนอง (อนุมัติ/ปฏิเสธ/ตัดสินคำร้อง/เลื่อนนัด/ส่งงาน) โดยไม่ต้องกด "เสร็จแล้ว"
  const todoGroups = useMemo(() => {
    const repairs = dashboard.repairs;

    // เร่งงาน: เร่งด่วนขึ้นก่อน แล้วเรียงรอนานสุด (เวลาที่กดเร่ง) ก่อน — เฉพาะเคสที่ยังซ่อมอยู่ (2/5)
    const rush = repairs
      .filter((r) => r.rushedAt && (r.statusId === 2 || r.statusId === 5))
      .sort((a, b) => Number(b.isRushUrgent) - Number(a.isRushUrgent) || byOldest((r) => r.rushedAt)(a, b));

    const appeal = repairs
      .filter((r) => r.statusId === 7)
      .sort(byOldest((r) => r.appealFiledAt ?? r.createdAt));

    const created = repairs
      .filter((r) => r.statusId === 1)
      .sort(byOldest((r) => r.createdAt));

    return [
      { key: 'rush', title: 'ขอเร่งงาน', icon: 'bolt', hint: 'เร่งด่วนขึ้นก่อน เรียงรอนานสุดก่อน', badgeClass: 'bg-red-600', items: rush, limit: Infinity },
      { key: 'appeal', title: 'คำร้องอุทธรณ์', icon: 'edit_note', hint: 'นักศึกษาไม่พอใจผลซ่อม รอตัดสินใจ', badgeClass: 'bg-violet-600', items: appeal, limit: TODO_PREVIEW_LIMIT },
      { key: 'new', title: 'คำร้องแจ้งซ่อมใหม่', icon: 'fiber_new', hint: 'รออนุมัติหรือปฏิเสธ', badgeClass: 'bg-yellow-600', items: created, limit: TODO_PREVIEW_LIMIT },
    ];
  }, [dashboard.repairs]);

  const todoTotal = todoGroups.reduce((sum, group) => sum + group.items.length, 0);

  const thaiDate =
    currentTime.toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const thaiTime =
    currentTime.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  async function handleApprove(repair) {
    const confirmed = window.confirm(
      `ยืนยันการอนุมัติ Case ${repair.caseCode}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await approveRepairRequest(repair.id);

      if (response.isError) {
        throw new Error(response.errorMessage);
      }

      await fetchDashboard();

      const autoAppointmentDate = response.data?.appointmentDate;
      showToast(
        autoAppointmentDate
          ? `อนุมัติ Case ${repair.caseCode} สำเร็จ — ระบบจัดนัดหมายให้ ${appointmentToastLabel(autoAppointmentDate)}`
          : `อนุมัติ Case ${repair.caseCode} สำเร็จ — ย้ายไปสถานะ "อยู่ระหว่างซ่อม"`,
      );
    } catch (approveError) {
      alert(
        approveError instanceof Error
          ? approveError.message
          : 'อนุมัติไม่สำเร็จ',
      );
    }
  }

  async function handleReject(repair, reason) {
    try {
      const response = await rejectRepairRequest(repair.id, reason);

      if (response.isError) {
        throw new Error(response.errorMessage);
      }

      await fetchDashboard();
      // คืน true ให้ผู้เรียกปิดหน้าต่างเฉพาะเมื่อสำเร็จ (ล้มเหลว = เปิดค้างไว้ ข้อความเหตุผลไม่หาย)
      return true;
    } catch (rejectError) {
      alert(
        rejectError instanceof Error
          ? rejectError.message
          : 'ปฏิเสธไม่สำเร็จ',
      );
      return false;
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-800">
            progress_activity
          </span>

          <p className="mt-3 text-sm text-slate-500">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-bold text-red-800">
          โหลดข้อมูลไม่สำเร็จ
        </h2>

        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-9">

      {/* Page Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Dashboard Overview
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold md:text-2xl">
              {thaiDate}
            </h2>

            <span className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white shadow-md">
              เวลา {thaiTime} น.
            </span>
          </div>
        </div>

      </section>

      {/* สถานะงานซ่อม */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            สถานะงานซ่อม
          </h3>

          <button
            type="button"
            onClick={() => navigate('/moderator/repairs')}
            className="flex items-center gap-1 text-sm font-bold text-blue-800 hover:underline"
          >
            ดูรายละเอียดทั้งหมด

            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-7">
          <StatusCard
            icon="pending_actions"
            number={
              dashboard.repairSummary.pending
            }
            label="รอดำเนินการ"
            iconClass="bg-yellow-100 text-yellow-800"
          />

          <StatusCard
            icon="engineering"
            number={
              dashboard.repairSummary.waiting
            }
            label="รอซ่อม"
            iconClass="bg-blue-100 text-blue-800"
          />

          <StatusCard
            icon="task_alt"
            number={
              dashboard.repairSummary.completed
            }
            label="เสร็จสิ้น"
            iconClass="bg-green-100 text-green-700"
          />

          <StatusCard
            icon="gavel"
            number={
              dashboard.repairSummary.pendingComplaintReview
            }
            label="รอตรวจสอบคำร้อง"
            iconClass="bg-amber-100 text-amber-800"
          />

          <StatusCard
            icon="build_circle"
            number={
              dashboard.repairSummary.underRevision
            }
            label="รอแก้ไข"
            iconClass="bg-orange-100 text-orange-800"
          />

          <StatusCard
            icon="verified"
            number={
              dashboard.repairSummary.success
            }
            label="สำเร็จ"
            iconClass="bg-emerald-100 text-emerald-800"
          />

          <StatusCard
            icon="cancel"
            number={
              dashboard.repairSummary.failed
            }
            label="ซ่อมไม่สำเร็จ"
            iconClass="bg-red-100 text-red-800"
          />
        </div>
      </section>

      {/* งานซ่อมที่ต้องจัดการ: ขอเร่งงาน / คำร้องอุทธรณ์ / คำร้องแจ้งซ่อมใหม่ (แทนส่วน "รายการซ่อมที่แจ้งเข้ามา" เดิม) */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <h3 className="text-lg font-bold">
            งานซ่อมที่ต้องจัดการ
          </h3>

          {todoTotal > 0 && (
            <span className="rounded-full bg-blue-800 px-3 py-0.5 text-xs font-bold text-white">
              {todoTotal}
            </span>
          )}
        </div>

        {todoTotal === 0 ? (
          <EmptyMessage
            message="ไม่มีงานซ่อมที่ต้องจัดการ"
          />
        ) : (
          <div className="flex flex-col gap-6">
            {todoGroups.filter((group) => group.items.length > 0).map((group) => (
              <div key={group.key}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-slate-700">{group.icon}</span>
                  <h4 className="text-sm font-extrabold text-slate-800">{group.title}</h4>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${group.badgeClass}`}>
                    {group.items.length}
                  </span>
                  <span className="text-xs text-slate-500">{group.hint}</span>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.slice(0, group.limit).map((repair) => (
                    <RepairCard
                      key={repair.id}
                      repair={repair}
                      onApprove={handleApprove}
                      onReject={setRejectingRepair}
                      onManage={() => navigate('/moderator/repairs')}
                      onView={() =>
                        setViewingRepairId(repair.id)
                      }
                    />
                  ))}
                </div>

                {group.items.length > group.limit && (
                  <button
                    type="button"
                    onClick={() => navigate('/moderator/repairs')}
                    className="mt-3 text-sm font-bold text-blue-800 hover:underline"
                  >
                    ดูอีก {group.items.length - group.limit} รายการ →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* แจ้งเตือนครุภัณฑ์ */}
      <section>
        <div className="mb-5">
          <h3 className="text-lg font-bold">
            แจ้งเตือนสต๊อกครุภัณฑ์
          </h3>
        </div>

        <InventoryTable
          items={dashboard.inventoryAlerts.slice(0, INVENTORY_PREVIEW_LIMIT)}
          onManage={() => navigate('/moderator/inventory')}
        />

        {dashboard.inventoryAlerts.length > INVENTORY_PREVIEW_LIMIT && (
          <button
            type="button"
            onClick={() => navigate('/moderator/inventory')}
            className="mt-3 text-[13px] font-bold text-blue-800 hover:underline"
          >
            ดูทั้งหมด {dashboard.inventoryAlerts.length} รายการ →
          </button>
        )}
      </section>

      <RepairDetailModal
        repairId={viewingRepairId}
        onClose={() => setViewingRepairId(null)}
        onApprove={(repair) => {
          setViewingRepairId(null);
          handleApprove(repair);
        }}
        onReject={async (repair, reason) => {
          const succeeded = await handleReject(repair, reason);
          if (succeeded) {
            setViewingRepairId(null);
          }
          return succeeded;
        }}
      />

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

      {toast && (
        <div className="fixed bottom-8 right-8 z-[200] flex items-center gap-2.5 bg-slate-900 text-white px-5.5 py-3.5 rounded-2xl text-[13.5px] font-semibold shadow-xl">
          <span className="material-symbols-outlined text-green-400 text-xl">check_circle</span>
          {toast}
        </div>
      )}
    </div>
  );
}

/* Component ย่อยเก็บไว้ในไฟล์เดียวก่อน */

// onManage = กด "จัดการ" แล้วพาไปหน้าครุภัณฑ์ (แก้จำนวน/เกณฑ์แจ้งเตือนที่นั่น ไม่ทำฟอร์มแก้ไขซ้ำในหน้า Home)
function InventoryTable({ items, onManage }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-160 border-collapse">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-6 py-4 text-left text-xs text-slate-500">
              รหัสครุภัณฑ์
            </th>

            <th className="px-6 py-4 text-left text-xs text-slate-500">
              รายการ
            </th>

            <th className="px-6 py-4 text-left text-xs text-slate-500">
              สถานะ
            </th>

            <th className="px-6 py-4 text-right text-xs text-slate-500">
              การจัดการ
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr
              key={item.equipmentId}
              className="border-t border-slate-200 hover:bg-slate-50"
            >
              <td className="px-6 py-4 text-sm font-bold">
                {item.equipmentCode}
              </td>

              <td className="px-6 py-4 text-sm">
                {item.equipmentName}
              </td>

              <td className="px-6 py-4">
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${EQUIPMENT_STATUS_BADGE_CLASS[item.status]}`}>
                  {item.status === 'out'
                    ? 'หมดคงคลัง'
                    : `ใกล้จะหมด · เหลือ ${item.quantity} ${item.unitName}`}
                </span>
              </td>

              <td className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={onManage}
                  className="rounded-xl bg-blue-800 px-4 py-2 text-xs font-bold text-white hover:bg-blue-900"
                >
                  จัดการ
                </button>
              </td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td
                colSpan="4"
                className="px-6 py-10 text-center text-sm text-slate-500"
              >
                ไม่มีครุภัณฑ์ที่ใกล้หมด
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmptyMessage({ message }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export default HomePage;