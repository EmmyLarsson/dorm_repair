// ui/InfoRow.jsx
import React from 'react';

/**
 * InfoRow - Pattern การ์ดแถวข้อมูล Label-Value
 * ใช้ซ้ำได้ทุก Modal ที่ต้องโชว์ข้อมูลแบบ Key-Value
 */
export const InfoRow = ({ label, value, variant = 'default', valueClass = '' }) => {
  const baseClass =
    variant === 'card'
      ? 'p-4 bg-white rounded-xl flex items-center justify-between border border-slate-200 shadow-sm'
      : 'p-4 bg-slate-50 rounded-xl flex items-center justify-between border border-transparent hover:border-blue-200 transition-colors';

  return (
    <div className={baseClass}>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className={`text-sm text-slate-900 font-semibold ${valueClass}`}>
        {value}
      </span>
    </div>
  );
};

/**
 * SectionHeader - หัวข้อ Section พร้อม Icon (เช่น "รายละเอียดคำร้อง")
 * ใช้ซ้ำได้ทุก Modal ที่ต้องแบ่งกลุ่มข้อมูล
 */
export const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-3 mb-2">
    <span
      className="material-symbols-outlined text-blue-800"
      style={{ fontVariationSettings: "'FILL' 1" }}
    >
      {icon}
    </span>
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
  </div>
);

/**
 * MetadataBadge - Badge สถานะแบบแคปซูล (ใช้ใน Top Metadata Bar)
 */
export const MetadataBadge = ({ text, colorClass = 'bg-slate-100 text-slate-700' }) => (
  <span className={`inline-flex items-center px-4 py-1.5 rounded-full ${colorClass} text-xs font-bold`}>
    {text}
  </span>
);