import { photoFullUrl } from '../../utils/photoUtil';
import { EQUIPMENT_STATUS_BADGE_CLASS, EQUIPMENT_STATUS_LABEL } from '../../models/inventoryModel';

const STATUS_ICON = { stock: 'check_circle', low: 'warning', out: 'error' };

/**
 * InventoryCard - การ์ดแสดงข้อมูลครุภัณฑ์คงคลัง
 * โครงสไตล์เดียวกับ PersonnelCard.jsx
 */
function InventoryCard({
  equipment,
  onEdit,
  selectable = false,
  isSelected = false,
  onToggleSelect,
}) {
  const status = equipment.status;

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg flex flex-col">
      {/* แถวหัวการ์ดเหนือรูป: [checkbox ตอนโหมดเลือก] ป้ายสถานะ — ไม่วางทับตัวรูป เพราะรูปจริงมีสีและรายละเอียด
          ทำให้ป้ายมองไม่เห็น (รหัสสินค้าอยู่ใต้ชื่อ เหนือประเภท) */}
      <div className="mb-2 flex items-center gap-2">
        {selectable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(equipment)}
            className="h-4.5 w-4.5 shrink-0 rounded border-slate-300 accent-blue-700"
          />
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${EQUIPMENT_STATUS_BADGE_CLASS[status]}`}
        >
          <span className="material-symbols-outlined text-sm">{STATUS_ICON[status]}</span>
          {EQUIPMENT_STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mb-3 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
        {equipment.imageUrl ? (
          <img src={photoFullUrl(equipment.imageUrl)} alt={equipment.equipmentName} className="h-full w-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-4xl text-blue-300">inventory_2</span>
        )}
      </div>

      <h4 className="truncate text-[15px] font-extrabold text-slate-900">{equipment.equipmentName}</h4>
      <p className="text-[11px] font-semibold text-slate-500">
        รหัสสินค้า: <span className="font-extrabold text-blue-800">{equipment.equipmentCode}</span>
      </p>
      <p className="text-[11px] font-semibold text-slate-500">ประเภท: {equipment.equipmentTypeName}</p>

      <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 text-xs">
        <p className="flex items-center gap-1.5 text-slate-500">
          <span className="material-symbols-outlined text-sm">inventory</span>
          จำนวนคงเหลือ:{' '}
          <strong className="text-slate-900">
            {equipment.quantity} {equipment.unitName}
          </strong>
        </p>
      </div>

      <div className="mt-auto">
        <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => onEdit(equipment)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-200"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            แก้ไข
          </button>
        </div>
      </div>
    </article>
  );
}

export default InventoryCard;
