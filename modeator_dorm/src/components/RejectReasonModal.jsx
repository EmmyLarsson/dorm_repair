// RejectReasonModal.jsx
import React, { useState } from 'react';
import BaseModal from './BaseModal';

/**
 * RejectReasonModal - popup ให้กรอกเหตุผลก่อนปฏิเสธ/ยกเลิกงานซ่อม
 */
const RejectReasonModal = ({ isOpen, caseCode, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  function handleClose() {
    setReason('');
    onClose?.();
  }

  function handleConfirm() {
    if (!reason.trim()) {
      return;
    }

    onConfirm?.(reason.trim());
    setReason('');
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="ระบุเหตุผลการปฏิเสธ"
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
            disabled={!reason.trim()}
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
          placeholder="ระบุเหตุผลการปฏิเสธ/ยกเลิกงานซ่อม..."
          className="w-full min-h-30 px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
        />
      </div>
    </BaseModal>
  );
};

export default RejectReasonModal;
