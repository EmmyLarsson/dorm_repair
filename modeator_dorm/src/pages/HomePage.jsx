import {useEffect, useMemo, useState,} from 'react';
import { useNavigate } from 'react-router-dom';
import {getHomeDashboard,} from "../services/appApi"
import StatusCard from '../components/StatusCard';
import RepairCard from '../components/RepairCard';
import RepairDetailModal from '../components/RepairDetailModal';

const PAGE_SIZE = 4;

const initialDashboard = {
  repairSummary: {
    pending: 0,
    waiting: 0,
    completed: 0,
  },

  repairs: [],

  inventoryAlerts: [],
};

function HomePage() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] =
    useState(initialDashboard);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [currentTime, setCurrentTime] =
    useState(new Date());

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [viewingRepairId, setViewingRepairId] =
    useState(null);

  /*
   ดึงข้อมูลหน้า Home จาก Server
  */
  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        setError('');

        const data = await getHomeDashboard();

        setDashboard({
          repairSummary:
            data.repairSummary ??
            initialDashboard.repairSummary,

          repairs:
            Array.isArray(data.repairs)
              ? data.repairs
              : [],

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
        setIsLoading(false);
      }
    }

    fetchDashboard();
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

  const totalPages = Math.max(
    1,
    Math.ceil(
      dashboard.repairs.length / PAGE_SIZE,
    ),
  );

  const visibleRepairs = useMemo(() => {
    const start =
      (currentPage - 1) * PAGE_SIZE;

    return dashboard.repairs.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [
    currentPage,
    dashboard.repairs,
  ]);

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
      await approveRepair(repair.id);

      setDashboard((previous) => ({
        ...previous,

        repairs: previous.repairs.map((item) =>
          item.id === repair.id
            ? {
                ...item,
                status: 'waiting',
              }
            : item,
        ),
      }));
    } catch (approveError) {
      alert(
        approveError instanceof Error
          ? approveError.message
          : 'อนุมัติไม่สำเร็จ',
      );
    }
  }

  async function handleReject(repair) {
    const confirmed = window.confirm(
      `ยืนยันการปฏิเสธ Case ${repair.caseCode}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await rejectRepair(repair.id);

      setDashboard((previous) => ({
        ...previous,

        repairs: previous.repairs.filter(
          (item) => item.id !== repair.id,
        ),
      }));
    } catch (rejectError) {
      alert(
        rejectError instanceof Error
          ? rejectError.message
          : 'ปฏิเสธไม่สำเร็จ',
      );
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

        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm">
          <span className="material-symbols-outlined text-blue-800">
            notifications
          </span>

          {dashboard.inventoryAlerts.length}
          {' '}แจ้งเตือนใหม่
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
            onClick={() => navigate('/repairs')}
            className="flex items-center gap-1 text-sm font-bold text-blue-800 hover:underline"
          >
            ดูรายละเอียดทั้งหมด

            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
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
        </div>
      </section>

      {/* รายการแจ้งซ่อม */}
      <section>
        <div className="mb-5">
          <h3 className="text-lg font-bold">
            รายการซ่อมที่แจ้งเข้ามา
          </h3>
        </div>

        {visibleRepairs.length === 0 ? (
          <EmptyMessage
            message="ยังไม่มีรายการแจ้งซ่อม"
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {visibleRepairs.map((repair) => (
              <RepairCard
                key={repair.id}
                repair={repair}
                onApprove={handleApprove}
                onReject={handleReject}
                onView={() =>
                  setViewingRepairId(repair.id)
                }
              />
            ))}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
        />
      </section>

      {/* แจ้งเตือนครุภัณฑ์ */}
      <section>
        <div className="mb-5">
          <h3 className="text-lg font-bold">
            แจ้งเตือนสต๊อกครุภัณฑ์
          </h3>
        </div>

        <InventoryTable
          items={dashboard.inventoryAlerts}
        />
      </section>

      <RepairDetailModal
        repairId={viewingRepairId}
        onClose={() => setViewingRepairId(null)}
        onApprove={(repair) => {
          setViewingRepairId(null);
          handleApprove(repair);
        }}
        onReject={(repair) => {
          setViewingRepairId(null);
          handleReject(repair);
        }}
      />
    </div>
  );
}

/* Component ย่อยเก็บไว้ในไฟล์เดียวก่อน */

function Pagination({
  currentPage,
  totalPages,
  onChange,
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-6 flex justify-center gap-2">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() =>
          onChange(currentPage - 1)
        }
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="material-symbols-outlined">
          chevron_left
        </span>
      </button>

      {Array.from(
        { length: totalPages },
        (_, index) => index + 1,
      ).map((page) => (
        <button
          type="button"
          key={page}
          onClick={() => onChange(page)}
          className={`h-10 min-w-10 rounded-xl border px-3 font-bold ${
            page === currentPage
              ? 'border-blue-800 bg-blue-800 text-white'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() =>
          onChange(currentPage + 1)
        }
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="material-symbols-outlined">
          chevron_right
        </span>
      </button>
    </div>
  );
}

function InventoryTable({ items }) {
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
              key={item.id}
              className="border-t border-slate-200 hover:bg-slate-50"
            >
              <td className="px-6 py-4 text-sm font-bold">
                {item.code}
              </td>

              <td className="px-6 py-4 text-sm">
                {item.name}
              </td>

              <td className="px-6 py-4">
                <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800">
                  คงเหลือ {item.quantity} ชิ้น
                </span>
              </td>

              <td className="px-6 py-4 text-right">
                <button
                  type="button"
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