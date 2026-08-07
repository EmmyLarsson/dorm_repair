function RepairCard({repair,onView,onApprove,onReject,}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <span className="material-symbols-outlined text-3xl text-blue-800">
            person
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">
            หมายเลข Case:{' '}
            <strong className="text-slate-900">
              {repair.caseCode}
            </strong>
          </p>

          <h4 className="truncate text-lg font-extrabold text-blue-800">
            {repair.studentName}
          </h4>

          <p className="text-sm text-slate-500">
            หมายเลขห้อง:{' '}
            <strong className="text-slate-900">
              {repair.roomNumber}
            </strong>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 pt-4">
        <div>
          <p className="mb-2 text-xs text-slate-500">
            วันที่แจ้ง:{' '}
            <strong className="text-slate-900">
              {repair.reportDate}
            </strong>
          </p>

          <span className="rounded-full bg-yellow-300 px-3 py-1.5 text-xs font-bold text-yellow-900">
            {repair.statusName}
          </span>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onView(repair)}
            className="flex w-full items-center justify-center gap-1 rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"
          >
            <span className="material-symbols-outlined text-base">
              visibility
            </span>

            ดูเพิ่มเติม
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onApprove(repair)}
              className="flex items-center gap-1 rounded-xl bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800"
            >
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>

              อนุมัติ
            </button>

            <button
              type="button"
              onClick={() => onReject(repair)}
              className="flex items-center gap-1 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
            >
              <span className="material-symbols-outlined text-base">
                cancel
              </span>

              ปฏิเสธ
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default RepairCard;