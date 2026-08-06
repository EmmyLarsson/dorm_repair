// ui/InfoRow.jsx
import React from 'react';

/**
 * InfoRow - Pattern การ์ดแถวข้อมูล Label-Value
 * ใช้ซ้ำได้ทุก Modal ที่ต้องโชว์ข้อมูลแบบ Key-Value
 */
export const InfoRow = ({ label, value, variant = 'default', valueClass = '' }) => {
  const baseClass =
    variant === 'card'
      ? 'p-4 bg-white rounded-xl flex items-center justify-between border border-outline-variant/30 shadow-sm'
      : 'p-4 bg-surface-container-low rounded-xl flex items-center justify-between border border-transparent hover:border-primary/20 transition-colors';

  return (
    <div className={baseClass}>
      <span className="font-label-md text-on-surface-variant">{label}</span>
      <span className={`font-body-md text-on-surface font-semibold ${valueClass}`}>
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
      className="material-symbols-outlined text-primary"
      style={{ fontVariationSettings: "'FILL' 1" }}
    >
      {icon}
    </span>
    <h2 className="font-headline-md text-headline-md">{title}</h2>
  </div>
);

/**
 * MetadataBadge - Badge สถานะแบบแคปซูล (ใช้ใน Top Metadata Bar)
 */
export const MetadataBadge = ({ text, colorClass = 'bg-secondary-container text-on-secondary-container' }) => (
  <span className={`inline-flex items-center px-4 py-1 rounded-full ${colorClass} font-label-md text-label-md`}>
    {text}
  </span>
);