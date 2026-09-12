import { useMemo, useState } from 'react';
import { photoFullUrl } from '../utils/photoUtil';
import { EQUIPMENT_STATUS_BADGE_CLASS, EQUIPMENT_STATUS_LABEL } from '../models/inventoryModel';

/**
 * EquipmentPickerModal - popup ซ้อนบน modal "จัดการงานซ่อม" สำหรับเลือกครุภัณฑ์ที่จะเบิกใช้
 * mirror ของ Prototype/Modeator/modeator_repair_management.html ("MODAL 2b: คลังครุภัณฑ์ที่ใช้")
 * โครงการ์ดคล้าย InventoryCard.jsx แต่ตัดปุ่มแก้ไขออก เปลี่ยนเป็นช่องจำนวน + ปุ่มเบิกใช้แทน
 */
function EquipmentPickerModal({ isOpen, equipmentList, equipmentTypes, selectedUsage, onAdd, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [qtyInputs, setQtyInputs] = useState({});

  const filteredList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return equipmentList.filter((item) => {
      const matchesSearch =
        term === '' ||
        item.equipmentName.toLowerCase().includes(term) ||
        item.equipmentCode.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === 'all' || item.equipmentTypeId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [equipmentList, searchTerm, categoryFilter]);

  if (!isOpen) return null;

  function getQty(equipmentId, max) {
    const raw = qtyInputs[equipmentId];
    if (raw === undefined) return Math.min(1, max);
    return raw;
  }

  function setQty(equipmentId, value) {
    setQtyInputs((prev) => ({ ...prev, [equipmentId]: value }));
  }

  function handlePick(item) {
    const qty = Math.max(1, Math.min(item.quantity, Number(getQty(item.equipmentId, item.quantity)) || 1));
    onAdd(item, qty);
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-7 py-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-blue-800">
            <span className="material-symbols-outlined">inventory_2</span>
            คลังครุภัณฑ์ที่ใช้
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-200 px-7 py-4 flex-wrap">
          <div className="relative w-full max-w-[320px] flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-xl">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาครุภัณฑ์..."
              className="w-full py-2.5 pl-11 pr-4 border-[1.5px] border-slate-300 rounded-full text-sm bg-white focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
            />
          </div>

          <div className="relative w-full max-w-[220px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-700 text-lg">
              category
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full appearance-none rounded-full border-[1.5px] border-slate-300 bg-white py-2.5 pl-10.5 pr-9 text-[13.5px] font-bold text-slate-700 focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
            >
              <option value="all">ทุกประเภท</option>
              {equipmentTypes.map((type) => (
                <option key={type.equipmentTypeId} value={type.equipmentTypeId}>
                  {type.equipmentTypeName}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              expand_more
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-5">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
              <span className="material-symbols-outlined text-5xl opacity-40">search_off</span>
              <p className="text-sm font-semibold">ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {filteredList.map((item) => {
                const alreadyAdded = selectedUsage.some((u) => u.equipmentId === item.equipmentId);
                const isOut = item.quantity === 0;
                const qty = getQty(item.equipmentId, item.quantity);

                return (
                  <div
                    key={item.equipmentId}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="relative mb-3 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {item.imageUrl ? (
                        <img
                          src={photoFullUrl(item.imageUrl)}
                          alt={item.equipmentName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-3xl text-blue-300">inventory_2</span>
                      )}
                      <span className="absolute right-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 backdrop-blur">
                        {item.equipmentCode}
                      </span>
                    </div>

                    <span
                      className={`mb-1.5 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold whitespace-nowrap ${EQUIPMENT_STATUS_BADGE_CLASS[item.status]}`}
                    >
                      {EQUIPMENT_STATUS_LABEL[item.status]}
                    </span>

                    <h4 className="truncate text-sm font-extrabold text-slate-900">{item.equipmentName}</h4>
                    <p className="mb-2 text-[11px] font-semibold text-slate-500">
                      ประเภท: {item.equipmentTypeName} · คงเหลือ: {item.quantity} {item.unitName}
                    </p>

                    <div className="mt-auto flex items-center gap-2 border-t border-slate-200 pt-3">
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, item.quantity)}
                        value={qty}
                        disabled={isOut}
                        onChange={(e) => setQty(item.equipmentId, e.target.value)}
                        className="h-9 w-16 rounded-lg border-[1.5px] border-slate-300 text-center text-sm font-bold focus:outline-none focus:border-blue-800 disabled:bg-slate-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        disabled={isOut}
                        onClick={() => handlePick(item)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                          alreadyAdded
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-700 text-white hover:brightness-110'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {alreadyAdded ? 'check' : 'add'}
                        </span>
                        {alreadyAdded ? 'เพิ่มแล้ว' : 'เบิกใช้'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EquipmentPickerModal;
