// RepairDetailModal.jsx
import React, { useEffect, useState } from 'react';
import BaseModal from './BaseModal';
import { InfoRow, SectionHeader, MetadataBadge } from './ui/InfoRow';
import { getRepairRequestDetail } from '../services/appApi';

const RepairDetailModal = ({ repairId, onClose, onApprove, onReject }) => {
  const isOpen = repairId !== null && repairId !== undefined;

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // ดึงข้อมูลแจ้งซ่อมจริงของ นศ. จาก server ทุกครั้งที่เปลี่ยน repairId
  useEffect(() => {
    if (!isOpen) {
      setDetail(null);
      return;
    }

    let isCancelled = false;

    getRepairRequestDetail(repairId).then((result) => {
      if (!isCancelled) {
        setDetail(result);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [repairId, isOpen]);

  const {
    caseCode: caseId = '-',
    reportDate = '-',
    statusName: status = '-',
    typeNames = [],
    description: problemDetail = '-',
    allowEntry,
    studentName = '-',
    contactPhone: phoneNumber = '-',
    roomNumber = '-',
    imageUrl = null,
  } = detail || {};

  const repairType = typeNames.length ? typeNames.join(', ') : '-';
  const allowAccess = allowEntry ? 'ได้' : 'ไม่ได้';

  const footerContent = (
    <>
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <span className="material-symbols-outlined text-sm">info</span>
        <span>กรุณาตรวจสอบข้อมูลก่อนดำเนินการ</span>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          onClick={() => onReject?.(detail)}
          disabled={!detail}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-red-100 text-red-700 text-sm font-bold hover:bg-red-700 hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-sm">cancel</span>
          ปฏิเสธ
        </button>
        <button
          onClick={() => onApprove?.(detail)}
          disabled={!detail}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-blue-800 text-white text-sm font-bold hover:bg-blue-900 transition-all duration-200 active:scale-95 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-sm">check_circle</span>
          อนุมัติคำร้อง
        </button>
      </div>
    </>
  );

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} title="รายละเอียดคำร้องแจ้งซ่อม" footer={footerContent}>
        {/* Global Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 px-6 py-4 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-800">fingerprint</span>
            <span className="text-sm text-slate-700">
              <span className="font-bold text-blue-800">หมายเลข Case:</span> {caseId}
            </span>
          </div>
          <div className="w-px h-6 bg-blue-200 hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-800">calendar_today</span>
            <span className="text-sm text-slate-700">
              <span className="font-bold text-blue-800">วันที่แจ้ง:</span> {reportDate}
            </span>
          </div>
          <div className="ml-auto">
            <MetadataBadge text={status} />
          </div>
        </div>

        {/* Two-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="space-y-8">
            <section className="space-y-4">
              <SectionHeader icon="build" title="รายละเอียดคำร้อง" />
              <div className="grid gap-3">
                <InfoRow label="ประเภทงานซ่อม" value={repairType} />
                <InfoRow label="ปัญหา" value={problemDetail} />
                <InfoRow label="อนุญาตให้ช่างเข้าไปได้ไหม" value={allowAccess} valueClass="text-blue-800 font-bold" />
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader icon="account_circle" title="ข้อมูลส่วนตัว" />
              <div className="grid gap-3">
                <InfoRow label="ชื่อ" value={studentName} variant="card" />
                <InfoRow label="เบอร์โทรศัพท์" value={phoneNumber} variant="card" />
                <InfoRow label="หมายเลขห้อง" value={roomNumber} variant="card" />
              </div>
            </section>
          </div>

          <div className="flex h-full flex-col space-y-4">
            <SectionHeader icon="image" title="รูปภาพความเสียหาย" />
            {imageUrl ? (
              <>
                <div
                  className="group relative flex-1 min-h-72 rounded-3xl overflow-hidden shadow-md bg-slate-100 border border-slate-200 cursor-pointer"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <img alt="Damage report" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={imageUrl} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                      className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">zoom_in</span>
                      ดูรูปภาพขนาดใหญ่
                    </button>
                  </div>
                </div>
                <p className="text-slate-500 text-xs italic text-center">
                  * คลิกที่รูปเพื่อดูรายละเอียดเพิ่มเติมแบบขยาย
                </p>
              </>
            ) : (
              <div className="flex flex-1 min-h-72 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                <span className="text-sm">ไม่มีรูปภาพแนบมากับคำร้องนี้</span>
              </div>
            )}
          </div>
        </div>
      </BaseModal>

      {/* Lightbox แยกอยู่นอก BaseModal (ต้องอยู่ z-index สูงกว่า) */}
      {isLightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img src={imageUrl} alt="Full view" className="max-w-full max-h-full object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default RepairDetailModal;