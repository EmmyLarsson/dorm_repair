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
function StatusPill({ status, icon, label, count, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-sm font-semibold border transition ${
        isActive
          ? 'bg-blue-800 border-blue-800 text-white'
          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
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
    </button>
  );
}

export default StatusPill;