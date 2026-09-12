import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { photoFullUrl } from '../utils/photoUtil';

function formatThaiDate(sqlDateTime) {
  if (!sqlDateTime) return '';
  const date = new Date(sqlDateTime.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return sqlDateTime;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const buddhistYear = date.getFullYear() + 543;

  return `${day}/${month}/${buddhistYear}`;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 26, stiffness: 320 },
  },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } },
};

// สไลด์รูปตามทิศทางที่เลื่อน (next = เข้าจากขวา, prev = เข้าจากซ้าย)
const imageVariants = {
  enter: (direction) => ({ opacity: 0, x: direction > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: (direction) => ({ opacity: 0, x: direction > 0 ? -40 : 40, transition: { duration: 0.12 } }),
};

// popup ดูรูปแบบเต็มจอ พื้นหลังเบลอ เลื่อนซ้าย-ขวาดูรูปก่อนหน้า/ถัดไปได้ (mirror ของ
// student_dorm/lib/screen/photo_viewer_screen.dart แต่เป็นฝั่ง React สำหรับเจ้าหน้าที่)
export default function PhotoLightbox({ photos, initialIndex, caseCode, onClose }) {
  const [[index, direction], setIndexState] = useState([initialIndex, 0]);

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const current = photos[index];

  function goTo(nextIndex, dir) {
    setIndexState([nextIndex, dir]);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && hasPrev) goTo(index - 1, -1);
      if (event.key === 'ArrowRight' && hasNext) goTo(index + 1, 1);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, index, onClose]);

  if (!current) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-2xl mx-4"
        variants={panelVariants}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header: รหัส Case + วันที่แนบรูป + ปุ่มปิด */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-white">
            <span className="text-sm font-bold">รหัส Case: {caseCode}</span>
            <span className="text-sm text-white/70 ml-2">
              · แนบเมื่อ {formatThaiDate(current.uploaded_at)} · รูปที่ {index + 1}/{photos.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* รูปภาพ */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/30">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.img
              key={current.photo_id}
              custom={direction}
              variants={imageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              src={photoFullUrl(current.photo_url)}
              alt={`รูปที่ ${index + 1}`}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </AnimatePresence>

          {hasPrev && (
            <button
              type="button"
              onClick={() => goTo(index - 1, -1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white z-10"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          )}

          {hasNext && (
            <button
              type="button"
              onClick={() => goTo(index + 1, 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white z-10"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
