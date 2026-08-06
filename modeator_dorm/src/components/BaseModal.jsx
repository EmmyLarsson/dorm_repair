import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BaseModal.jsx
 * "เปลือก" Modal กลางที่ใช้ร่วมกันได้ทุก Pop-up ในระบบ
 * ควบคุม: Shape, Header, Close Button, Footer Slot, Animation, Scroll Lock, ESC
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} title - หัวข้อ Modal (ฝั่งซ้าย Header)
 * @param {React.ReactNode} children - เนื้อหาหลัก (Main Content)
 * @param {React.ReactNode} footer - เนื้อหา Footer (ปุ่มต่างๆ)
 * @param {string} maxWidth - ขนาดความกว้างสูงสุด default = 'max-w-5xl'
 */
const BaseModal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-5xl',
}) => {
  // ESC key + Scroll Lock
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  // Animation Variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 300 },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      transition: { duration: 0.15 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-on-background/40 backdrop-blur-sm p-margin-mobile md:p-margin-desktop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <motion.div
            key="modal"
            className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-[32px] custom-shadow border border-outline-variant/30`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ===== Header (Shape คงเดิมทุก Modal) ===== */}
            <header className="flex items-center justify-between px-8 py-6 bg-surface/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
              <h1 className="font-headline-md text-headline-md text-primary">
                {title}
              </h1>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2.5 bg-inverse-surface text-inverse-on-surface rounded-full transition-all duration-200 active:scale-95 hover:bg-on-surface-variant tactile-shadow"
              >
                <span className="material-symbols-outlined text-body-md">close</span>
                <span className="font-label-md text-label-md">ปิด</span>
              </button>
            </header>

            {/* ===== Main Content Slot ===== */}
            <main className="p-8 md:p-12 space-y-8">{children}</main>

            {/* ===== Footer Slot ===== */}
            {footer && (
              <footer className="px-8 py-6 bg-surface-container-high/30 border-t border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BaseModal;
