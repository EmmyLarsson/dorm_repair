import React from 'react';

const STATUS_DOT_COLOR = {
  1: '#705d00',
  2: '#1a40c2',
  3: '#22863a',
  4: '#ba1a1a',
  5: '#c2410c',
  6: '#047857',
  7: '#b45309',
  8: '#b91c1c',
};

/**
 * StatusPill - ปุ่ม filter สถานะงานซ่อม (ดูทั้งหมด / รอตรวจสอบ / รอซ่อม / เสร็จสิ้น)
 */
// unreadCount = ป้ายแดง "ในปุ่ม" ต่อจากจำนวนรวม (จำนวนเคสข้างในที่ นศ. ทำอะไรใหม่และเจ้าหน้าที่ยังไม่ได้เปิดดู ลดลงเมื่อเปิดการ์ด
// 0 = ไม่แสดง) ค่าเริ่มต้นปิด หน้าอื่นที่ใช้ปุ่มนี้อยู่จึงไม่เปลี่ยน — ใช้สีแดงกับเรื่อง "ยังไม่เปิดดู" เรื่องเดียว ปุ่มจึงไม่มีโทนแดงอื่นปน
function StatusPill({ status, icon, label, count, isActive, onClick, unreadCount = 0 }) {
  const activeClass = 'bg-blue-800 border-blue-800 text-white';
  const idleClass = 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-sm font-semibold border transition ${
        isActive ? activeClass : idleClass
      }`}
    >
      {icon ? (
        <span className="material-symbols-outlined text-lg">{icon}</span>
      ) : (
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ background: STATUS_DOT_COLOR[status] }}
        />
      )}

      {label}

      <span
        className={`px-2 py-0.5 rounded-full text-xs font-bold min-w-5 text-center ${
          isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-900'
        }`}
      >
        {count}
      </span>

      {unreadCount > 0 && (
        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-extrabold text-white">
          {unreadCount > 9 ? '9+' : unreadCount} ใหม่
        </span>
      )}
    </button>
  );
}

export default StatusPill;