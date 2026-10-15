import { photoFullUrl } from '../utils/photoUtil';

const STATUS_BADGE_CLASS = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-green-100 text-green-700',
  4: 'bg-red-100 text-red-700',
  5: 'bg-orange-100 text-orange-800',
  6: 'bg-emerald-100 text-emerald-800',
  7: 'bg-amber-100 text-amber-800',
  8: 'bg-red-100 text-red-800',
};

// ป้ายบนการ์ดบอกเรื่องล่าสุดที่นักศึกษาทำและเจ้าหน้าที่ยังไม่ได้เปิดดู (ตรงกับ event_type ของตารางแจ้งเตือน)
// ลำดับในอาร์เรย์ = ลำดับความสำคัญที่ใช้เรียงป้าย (ตัวแรกสำคัญสุด)
const UNREAD_EVENT_LABEL = {
  rush_requested: 'ขอเร่งงาน',
  appeal_filed: 'ยื่นอุทธรณ์',
  new_request: 'แจ้งซ่อมใหม่',
  request_edited: 'แก้ไขคำร้อง',
  declined: 'ไม่ยอมรับผลซ่อม',
  student_cancelled: 'ยกเลิกคำร้อง',
  accepted: 'ยอมรับผลซ่อม',
  evaluated: 'ประเมินผลงานแล้ว',
  auto_closed: 'ปิดอัตโนมัติ',
};
const UNREAD_EVENT_ORDER = Object.keys(UNREAD_EVENT_LABEL);
// ป้ายแยกหัวข้อบนการ์ดได้สูงสุดกี่ใบ (ที่เหลือรวมเป็น "+N") เพื่อไม่ให้ล้นขอบการ์ด
const MAX_UNREAD_CHIPS = 2;

/**
 * RepairCard - การ์ดงานซ่อม ใช้ร่วมกันทั้งหน้า Home และหน้าจัดการงานซ่อม
 * ปุ่ม action จะเปลี่ยนตามสถานะ:
 *   รอตรวจสอบ (1)     -> ดูเพิ่มเติม + อนุมัติ/ปฏิเสธ
 *   อยู่ระหว่างซ่อม (2) -> ดูเพิ่มเติม + จัดการ/ยกเลิก (ยกเลิกได้เฉพาะสถานะนี้ ก่อนส่งงาน)
 *   เสร็จสิ้น (3)     -> ดูเพิ่มเติม + ตรวจสอบ (ตอนนี้หมายถึง "รอนักศึกษายืนยัน" ไม่ใช่จบจริง)
 *   รอตรวจสอบคำร้อง (7) -> ดูเพิ่มเติม + จัดการคำร้อง (นักศึกษายื่นอุทธรณ์ รอเจ้าหน้าที่ตัดสินใจ)
 *   รอแก้ไข (5)       -> ดูเพิ่มเติม + จัดการ (workflow เหมือน statusId 2 แต่ยกเลิกไม่ได้)
 *   สำเร็จ (6)        -> ดูเพิ่มเติม + ตรวจสอบ (จุดจบจริง)
 *   ซ่อมไม่สำเร็จ (8)  -> ดูเพิ่มเติม + ตรวจสอบ (จุดจบ: นักศึกษาไม่ยอมรับหลังยื่นคำร้องครบสิทธิ์)
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

  // การ์ดเร่งด่วน (เหตุผลที่ติดธง is_urgent) ต้องต่างจากเพื่อนชัดเจน: ขอบแดงหนา + พื้นไล่สีแดงอ่อน + แถบหัวเขียนว่า
  // "เร่งด่วน" — ใช้ทั้งสี รูปทรง และข้อความ ไม่พึ่งสีอย่างเดียว; การ์ดที่ถูกเร่งปกติได้แค่ขอบส้มกับป้ายเล็ก
  const isUrgent = Boolean(repair.isRushUrgent);
  const isRushed = Boolean(repair.rushedAt) && !isUrgent;
  const isAppeal = repair.statusId === 7 && repair.complaintCount > 0;
  // หัวข้อที่ยังไม่ได้เปิดดู แยกเป็นป้ายทีละหัวข้อ เรียงตามความสำคัญ (ข้อมูลที่ไม่รู้จักขึ้นเป็น "มีเรื่องใหม่" ไม่ให้หาย)
  const unreadLabels = [...(repair.unreadEventTypes ?? [])]
    .sort((a, b) => {
      const ia = UNREAD_EVENT_ORDER.indexOf(a);
      const ib = UNREAD_EVENT_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map((type) => UNREAD_EVENT_LABEL[type] ?? 'มีเรื่องใหม่');
  const shownUnreadLabels = unreadLabels.slice(0, MAX_UNREAD_CHIPS);
  const hiddenUnreadCount = unreadLabels.length - shownUnreadLabels.length;
  const rushReasonText = [repair.rushReasonName, repair.rushReasonNote].filter(Boolean).join(' – ');

  let frameClass = 'border border-slate-200 bg-white shadow-sm hover:shadow-lg';
  if (isUrgent) {
    frameClass = 'border-2 border-red-700 bg-linear-to-b from-red-50 to-white shadow-lg shadow-red-200';
  } else if (isRushed) {
    frameClass = 'border border-orange-300 bg-white shadow-sm hover:shadow-lg';
  }

  return (
    <article className={`relative rounded-2xl p-4 transition hover:-translate-y-1 flex flex-col ${frameClass}`}>
      {/* เครื่องหมาย "มีความเคลื่อนไหวใหม่": มีแจ้งเตือนจากนักศึกษาของเคสนี้ที่เจ้าหน้าที่ยังไม่เปิดดู (หายเมื่อเปิดเคส)
          ใช้จุดแดงแบบเดียวกับปุ่มกรอง จะได้เป็นสัญลักษณ์เดียวทั้งหน้า — การ์ดเร่งด่วนไม่ใช้ป้ายนี้ (แถบหัวสีแดงบอกเรื่องอยู่แล้ว)
          ใช้ป้ายเล็ก "ใหม่" ในแถบหัวแทน ไม่ให้ซ้อนกันรก */}
      {unreadLabels.length > 0 && !isUrgent && (
        <div className="absolute -top-2.5 right-4 z-10 flex flex-wrap justify-end gap-1">
          {shownUnreadLabels.map((label) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white py-0.5 pl-2.5 pr-3 text-[11px] font-bold text-slate-700 shadow-sm"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              {label}
            </span>
          ))}
          {hiddenUnreadCount > 0 && (
            <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 shadow-sm">
              +{hiddenUnreadCount}
            </span>
          )}
        </div>
      )}

      {isUrgent && (
        <div className="-mx-4 -mt-4 mb-3 flex items-center justify-between gap-2 rounded-t-[14px] bg-red-700 px-4 py-1.5 text-xs font-extrabold text-white">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-base">emergency</span>
            เร่งด่วน
          </span>
          <span className="flex items-center gap-2">
            ขอเร่ง {repair.rushCount} ครั้ง
            {repair.studentUnreadCount > 0 && (
              <span className="rounded-full bg-white px-2.5 py-px text-[11px] font-extrabold text-red-700">ใหม่</span>
            )}
          </span>
        </div>
      )}

      {isUrgent && rushReasonText && (
        <p className="mb-3 rounded-lg border border-dashed border-red-300 bg-white px-2.5 py-1.5 text-xs font-bold leading-snug text-red-700">
          เหตุผล: {rushReasonText}
        </p>
      )}

      {isRushed && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-orange-100 px-2.5 py-1 text-[11.5px] font-bold text-orange-700">
          <span className="material-symbols-outlined text-sm">bolt</span>
          ถูกเร่ง{rushReasonText ? ` · ${rushReasonText}` : ''}
        </p>
      )}

      {isAppeal && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-violet-100 px-2.5 py-1 text-[11.5px] font-bold text-violet-700">
          <span className="material-symbols-outlined text-sm">edit_note</span>
          ยื่นอุทธรณ์ครั้งที่ {repair.complaintCount}
          {repair.appealReasonName ? ` · ${repair.appealReasonName}` : ''}
        </p>
      )}

      {selectable && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(repair)}
          className="absolute right-3 top-3 h-4.5 w-4.5 rounded border-slate-300 accent-blue-700"
        />
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100">
          {repair.studentProfileImage ? (
            <img
              src={photoFullUrl(repair.studentProfileImage)}
              alt={repair.studentName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-xl text-blue-800">
              person
            </span>
          )}
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

        {/* feedback ของนักศึกษา (เฉพาะเคสที่ปิดแล้ว): ดาว+ข้อความประเมิน (สำเร็จ) / เหตุผลที่ไม่ยอมรับ (ไม่สำเร็จ) ย่อ 2 บรรทัด
            ดูเต็มได้ที่ปุ่ม "ตรวจสอบ" */}
        {repair.statusId === 6 && repair.evaluationRating != null && (
          <p className="line-clamp-2 text-slate-500">
            ประเมิน:{' '}
            <span className="font-bold text-amber-500">
              {'★'.repeat(repair.evaluationRating)}
              <span className="text-slate-300">{'★'.repeat(Math.max(0, 5 - repair.evaluationRating))}</span>
            </span>
            {repair.evaluationFeedback && <span className="text-slate-900"> · {repair.evaluationFeedback}</span>}
          </p>
        )}

        {/* เหตุผลของเคสไม่สำเร็จมาจากการประเมินแบบไม่มีดาว (evaluationFeedback) — declineReason (timeline) เป็นตัวสำรอง
            สำหรับเคสที่ปิดจากแอปเวอร์ชันเก่าที่ส่งเหตุผลมาตอนกดไม่ยอมรับ */}
        {repair.statusId === 8 && (repair.evaluationFeedback || repair.declineReason) && (
          <p className="line-clamp-2 text-slate-500">
            เหตุผลที่ไม่ยอมรับ: <span className="text-red-700">{repair.evaluationFeedback || repair.declineReason}</span>
          </p>
        )}

        {repair.appointmentDateLabel && (
          <p className="text-slate-500">
            {/* สถานะ 7 (อุทธรณ์) นัดที่เหลืออยู่คือนัดซ่อมครั้งก่อน ไม่ใช่นัดที่รออยู่ — เขียนให้ชัดไม่ให้อ่านเป็นงานที่ยังรอนัด */}
            {repair.statusId === 7 ? 'นัดซ่อมครั้งก่อน' : 'นัดหมาย'}:{' '}
            <strong className="text-blue-800">
              {repair.appointmentDateLabel}
            </strong>
            {repair.isOverdue && !repair.isUnscheduled && (repair.statusId === 2 || repair.statusId === 5) && (
              <span className="ml-2 rounded-md bg-red-100 px-1.5 py-0.5 text-[10.5px] font-bold text-red-700">
                เกินนัดหมาย
              </span>
            )}
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

          {(repair.statusId === 2 || repair.statusId === 5) && (
            <>
              <button
                type="button"
                onClick={() => onManage(repair)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
              >
                <span className="material-symbols-outlined text-base">engineering</span>
                จัดการ
              </button>

              {/* ยกเลิกได้เฉพาะสถานะ 2 (ยังไม่ส่งงาน) — รอบแก้ไข (5) เกิดจากสิทธิ์อุทธรณ์ของนักศึกษา ยกเลิกข้ามไม่ได้ และหน้าแรก
                  ไม่ส่ง onCancel มา จึงไม่แสดงปุ่มที่กดแล้วไม่มีอะไรรองรับ */}
              {repair.statusId === 2 && onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(repair)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200"
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  ยกเลิก
                </button>
              )}
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

          {repair.statusId === 7 && (
            <button
              type="button"
              onClick={() => onManage(repair)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700"
            >
              <span className="material-symbols-outlined text-base">report</span>
              มีคำร้องใหม่ - จัดการ
            </button>
          )}

          {repair.statusId === 6 && (
            <button
              type="button"
              onClick={() => onReview(repair)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-100 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-200"
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              ตรวจสอบ
            </button>
          )}

          {repair.statusId === 8 && (
            <button
              type="button"
              onClick={() => onReview(repair)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200"
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
