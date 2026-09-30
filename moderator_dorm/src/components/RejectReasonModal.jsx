// RejectReasonModal.jsx
import React, { useEffect, useState } from 'react';
import BaseModal from './BaseModal';

/**
 * RejectReasonModal - popup ให้กรอกเหตุผลก่อนปฏิเสธ/ยกเลิกงานซ่อม
 */
const RejectReasonModal = ({
  isOpen,
  caseCode,
  onClose,
  onConfirm,
  title = 'ระบุเหตุผลการปฏิเสธ',
  placeholder = 'ระบุเหตุผลการปฏิเสธ/ยกเลิกงานซ่อม...',
  note,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ล้างข้อความตอนหน้าต่างปิดเท่านั้น (ไม่ล้างตอนกดยืนยัน) — ถ้า onConfirm ล้มเหลวแล้วผู้เรียกไม่ปิดหน้าต่าง
  // ข้อความที่พิมพ์ไว้จะยังอยู่ให้กดยืนยันซ้ำได้ ไม่ต้องพิมพ์ใหม่
  useEffect(() => {
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  function handleClose() {
    setReason('');
    onClose?.();
  }

  // onConfirm อาจคืน Promise (จุดที่รอผล API ก่อนปิดหน้าต่าง) — รอให้จบก่อน และกันกดยืนยันซ้ำระหว่างรอ
  async function handleConfirm() {
    if (!reason.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm?.(reason.trim());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="max-w-lg"
      footer={
        <div className="flex gap-3 ml-auto">
          <button
            onClick={handleClose}
            className="h-11.5 px-6 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || isSubmitting}
            className="h-11.5 px-6 rounded-full text-sm font-bold text-white bg-red-700 hover:brightness-110 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-lg">cancel</span>
            ยืนยัน
          </button>
        </div>
      }
    >
      {caseCode && (
        <p className="text-sm text-slate-500">
          หมายเลข Case: <b className="text-slate-900">{caseCode}</b>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold">เหตุผล</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          className="w-full min-h-30 px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
        />
      </div>

      {note && <p className="text-xs text-slate-500">{note}</p>}
    </BaseModal>
  );
};

export default RejectReasonModal;
