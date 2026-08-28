const STATUS_BADGE_CLASS = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-green-100 text-green-700',
  4: 'bg-red-100 text-red-700',
};

/**
 * RepairCard - การ์ดงานซ่อม ใช้ร่วมกันทั้งหน้า Home และหน้าจัดการงานซ่อม
 * ปุ่ม action จะเปลี่ยนตามสถานะ:
 *   รอตรวจสอบ (1)     -> ดูเพิ่มเติม + อนุมัติ/ปฏิเสธ
 *   อยู่ระหว่างซ่อม (2) -> ดูเพิ่มเติม + จัดการ/ยกเลิก
 *   เสร็จสิ้น (3)      -> ดูเพิ่มเติม + ตรวจสอบ
 *   ปฏิเสธ/ยกเลิก (4)  -> ดูเพิ่มเติม เท่านั้น
 */
function RepairCard({
  repair,
  onView,
  onApprove,
  onReject,
  onManage,
  onReview,
  onCancel,
  selectable = false,
  isSelected = false,
  onToggleSelect,
}) {
  const repairType = repair.typeNames?.length ? repair.typeNames.join(', ') : '-';

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg flex flex-col">
      {selectable && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(repair)}
          className="absolute right-3 top-3 h-4.5 w-4.5 rounded border-slate-300 accent-blue-700"
        />
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <span className="material-symbols-outlined text-xl text-blue-800">
            person
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">
            หมายเลข Case:{' '}
            <strong className="text-slate-900">
              {repair.caseCode}
            </strong>
          </p>

          <h4 className="truncate text-base font-extrabold text-blue-800">
            {repair.studentName}
          </h4>

          <p className="text-xs text-slate-500">
            ห้อง:{' '}
            <strong className="text-slate-900">
              {repair.roomNumber}
            </strong>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 text-xs">
        <p className="text-slate-500">
          ประเภทงานซ่อม:{' '}
          <strong className="text-slate-900">
            {repairType}
          </strong>
        </p>

        <p className="line-clamp-2 text-slate-500">
          รายละเอียด:{' '}
          <span className="text-slate-900">
            {repair.description || '-'}
          </span>
        </p>

        {repair.appointmentDateLabel && (
          <p className="text-slate-500">
            นัดหมาย:{' '}
            <strong className="text-blue-800">
              {repair.appointmentDateLabel}
            </strong>
          </p>
        )}
      </div>

      <div className="mt-auto">
        <div className="mt-3 flex items-center justify-between gap-2.5 border-t border-slate-200 pt-3">
          <div className="text-[11px] text-slate-500">
            วันที่แจ้ง: <strong className="text-slate-900">{repair.reportDate}</strong>
          </div>

          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${STATUS_BADGE_CLASS[repair.statusId] ?? 'bg-slate-100 text-slate-700'}`}
          >
            {repair.statusName}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onView(repair)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            ดูเพิ่มเติม
          </button>

          {repair.statusId === 1 && (
            <>
              <button
                type="button"
                onClick={() => onApprove(repair)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                อนุมัติ
              </button>

              <button
                type="button"
                onClick={() => onReject(repair)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
              >
                <span className="material-symbols-outlined text-base">cancel</span>
                ปฏิเสธ
              </button>
            </>
          )}

          {repair.statusId === 2 && (
            <>
              <button
                type="button"
                onClick={() => onManage(repair)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
              >
                <span className="material-symbols-outlined text-base">engineering</span>
                จัดการ
              </button>

              <button
                type="button"
                onClick={() => onCancel(repair)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200"
              >
                <span className="material-symbols-outlined text-base">cancel</span>
                ยกเลิก
              </button>
            </>
          )}

          {repair.statusId === 3 && (
            <button
              type="button"
              onClick={() => onReview(repair)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-100 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-200"
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              ตรวจสอบ
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default RepairCard;
