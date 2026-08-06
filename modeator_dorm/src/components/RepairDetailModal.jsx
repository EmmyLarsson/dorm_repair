// RepairDetailModal.jsx
import React, { useEffect, useState } from 'react';
import BaseModal from './BaseModal';
import { InfoRow, SectionHeader, MetadataBadge } from './ui/InfoRow';
import { getRepairRequestDetail } from '../services/appApi';

const RepairDetailModal = ({ repairId, onClose, onApprove, onReject }) => {
  const isOpen = repairId !== null && repairId !== undefined;

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ดึงรายละเอียดคำร้องแจ้งซ่อมจาก backend ทุกครั้งที่เปลี่ยน repairId
  useEffect(() => {
    if (!isOpen) {
      setDetail(null);
      setErrorMessage('');
      return;
    }

    let isCancelled = false;

    async function fetchDetail() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const result = await getRepairRequestDetail(repairId);

        if (!isCancelled) {
          setDetail(result);
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setErrorMessage(
            fetchError instanceof Error
              ? fetchError.message
              : 'ไม่สามารถโหลดรายละเอียดคำร้องได้',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      isCancelled = true;
    };
  }, [repairId, isOpen]);

  const caseId = detail?.caseCode ?? '-';
  const reportDate = detail?.reportDate ?? '-';
  const status = detail?.statusName ?? '-';
  const repairType = detail?.typeNames?.length ? detail.typeNames.join(', ') : '-';
  const problemDetail = detail?.description || '-';
  const allowAccess = detail?.allowEntry ? 'ได้' : 'ไม่ได้';
  const studentName = detail?.studentName || '-';
  const phoneNumber = detail?.contactPhone || '-';
  const roomNumber = detail?.roomNumber || '-';
  const imageUrl = detail?.imageUrl || null;

  const footerContent = (
    <>
      <div className="flex items-center gap-2 text-on-surface-variant text-label-sm">
        <span className="material-symbols-outlined text-sm">info</span>
        <span>กรุณาตรวจสอบข้อมูลก่อนดำเนินการ</span>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          onClick={() => onReject?.(detail)}
          disabled={!detail}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-error-container text-error font-label-md text-label-md hover:bg-error hover:text-on-error transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-sm">cancel</span>
          ปฏิเสธ
        </button>
        <button
          onClick={() => onApprove?.(detail)}
          disabled={!detail}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all duration-200 active:scale-95 tactile-shadow disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-sm">check_circle</span>
          อนุมัติคำร้อง
        </button>
      </div>
    </>
  );

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} title="รายละเอียดคำร้องแจ้งซ่อม" footer={detail ? footerContent : null}>
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">
              progress_activity
            </span>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-2xl border border-error/30 bg-error-container/20 p-6 text-center text-error">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && detail && (
          <>
            {/* Global Metadata Row */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 px-6 py-4 bg-primary-container/10 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">fingerprint</span>
                <span className="font-body-md text-body-md">
                  <span className="font-label-md text-primary">หมายเลข Case:</span> {caseId}
                </span>
              </div>
              <div className="w-px h-6 bg-primary/20 hidden md:block" />
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                <span className="font-body-md text-body-md">
                  <span className="font-label-md text-primary">วันที่แจ้ง:</span> {reportDate}
                </span>
              </div>
              <div className="ml-auto">
                <MetadataBadge text={status} />
              </div>
            </div>

            {/* Two-Column Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
              <div className="space-y-8">
                <section className="space-y-4">
                  <SectionHeader icon="build" title="รายละเอียดคำร้อง" />
                  <div className="grid gap-3">
                    <InfoRow label="ประเภทงานซ่อม" value={repairType} />
                    <InfoRow label="ปัญหา" value={problemDetail} />
                    <InfoRow label="อนุญาตให้ช่างเข้าไปได้ไหม" value={allowAccess} valueClass="text-primary font-bold" />
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

              <div className="space-y-4">
                <SectionHeader icon="image" title="รูปภาพความเสียหาย" />
                {imageUrl ? (
                  <>
                    <div
                      className="group relative aspect-[4/3] rounded-3xl overflow-hidden custom-shadow bg-surface-dim border border-outline-variant/20 cursor-pointer"
                      onClick={() => setIsLightboxOpen(true)}
                    >
                      <img alt="Damage report" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={imageUrl} />
                      <div className="absolute inset-0 bg-gradient-to-t from-on-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                          className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">zoom_in</span>
                          ดูรูปภาพขนาดใหญ่
                        </button>
                      </div>
                    </div>
                    <p className="text-on-surface-variant text-label-sm italic text-center">
                      * คลิกที่รูปเพื่อดูรายละเอียดเพิ่มเติมแบบขยาย
                    </p>
                  </>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-3xl border border-dashed border-outline-variant/40 bg-surface-container-low text-on-surface-variant">
                    ไม่มีรูปภาพแนบมากับคำร้องนี้
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </BaseModal>

      {/* Lightbox แยกอยู่นอก BaseModal (ต้องอยู่ z-index สูงกว่า) */}
      {isLightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-on-background/80 backdrop-blur-md p-6"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img src={imageUrl} alt="Full view" className="max-w-full max-h-full object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default RepairDetailModal;
