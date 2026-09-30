import { photoFullUrl } from '../utils/photoUtil';

/**
 * CompletionItemReportCard - การ์ดรายงานผลซ่อม "1 รายการงานซ่อม" (repair_type) ของเคส
 * เคสที่นักศึกษาเลือกหลายอาการตอนแจ้งซ่อม จะมีการ์ดแบบนี้หลายใบ แยกกันคนละใบ กดบันทึกทีละใบ
 */
function CompletionItemReportCard({
  item,
  onReportTextChange,
  onAddPhotos,
  onRemoveNewPhoto,
  onRemoveExistingPhoto,
  onSave,
  onViewPhoto,
  readOnly = false,
}) {
  return (
    <div className="rounded-xl border-[1.5px] border-slate-200 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-700 text-lg">build</span>
        <span className="text-sm font-bold text-slate-800">{item.repairTypeName}</span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500">รายงานผลการซ่อม</label>
        <textarea
          value={item.reportText}
          onChange={(e) => onReportTextChange(item.repairTypeId, e.target.value)}
          placeholder="ระบุรายละเอียดผลการซ่อมรายการนี้..."
          disabled={readOnly}
          className="w-full min-h-24 px-4 py-3 border-[1.5px] border-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10 disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500">รูปภาพหลักฐาน / รูปภาพหน้างาน</label>
        {/* กรอบเดียวครอบทั้งแนบรูป + ดูรูป + รูปที่แนบไว้แล้ว ไม่แยกกรอบย่อยหลายอัน */}
        <div className="flex flex-col gap-3 p-3 border-[1.5px] border-slate-300 rounded-xl">
          {(item.existingPhotos.length > 0 || item.newPhotos.length > 0) && (
            <div className="grid grid-cols-4 gap-2">
              {item.existingPhotos.map((photo, index) => (
                <div key={photo.photoId} className="relative aspect-square">
                  <button
                    type="button"
                    onClick={() => onViewPhoto(
                      item.existingPhotos.map((p) => ({ photo_id: p.photoId, photo_url: p.photoUrl })),
                      index,
                    )}
                    className="h-full w-full"
                  >
                    <img
                      src={photoFullUrl(photo.photoUrl)}
                      alt="รูปหลักฐานหน้างาน"
                      className="h-full w-full rounded-xl object-cover border border-slate-200"
                    />
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveExistingPhoto(item.repairTypeId, photo.photoId)}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
              ))}
              {item.newPhotos.map((file, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="รูปที่เพิ่งเลือก"
                    className="h-full w-full rounded-xl object-cover border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveNewPhoto(item.repairTypeId, index)}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          {!readOnly && (
            <label className="flex items-center justify-center gap-1.5 py-3 border-[1.5px] border-dashed border-slate-300 rounded-xl text-xs font-bold text-blue-700 hover:text-blue-900 hover:border-blue-400 cursor-pointer">
              <span className="material-symbols-outlined text-lg">add_photo_alternate</span> แนบรูปภาพ
              <input
                type="file"
                accept="image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  onAddPhotos(item.repairTypeId, files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={() => onSave(item.repairTypeId)}
          className="w-fit h-9 px-4 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">save</span>
          บันทึกรายการนี้
        </button>
      )}
    </div>
  );
}

export default CompletionItemReportCard;
