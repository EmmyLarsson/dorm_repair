import BaseModal from './BaseModal';

/**
 * ConfirmDeleteModal - popup ยืนยันการลบ ใช้ร่วมกันได้ทุกจุดที่ต้องถามยืนยันก่อนลบถาวร
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onConfirm
 * @param {string} title
 * @param {React.ReactNode} message
 */
function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title = 'ยืนยันการลบ', message }) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="h-11.5 px-6 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11.5 px-6 rounded-full text-sm font-bold text-white bg-red-700 shadow-md hover:bg-red-800 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            ลบข้อมูล
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <span className="material-symbols-outlined text-3xl text-red-700">warning</span>
        </div>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </BaseModal>
  );
}

export default ConfirmDeleteModal;
