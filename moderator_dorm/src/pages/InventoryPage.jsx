import { useEffect, useMemo, useState } from 'react';
import StatusPill from '../components/StatusPill';
import InventoryCard from '../components/inventory/InventoryCard';
import InventoryFormModal from '../components/inventory/InventoryFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { AppAPI } from '../utils/appApi';
import { InventoryModel } from '../models/inventoryModel';

const CARDS_PER_PAGE = 10;

const STATUS_FILTERS = [
  { id: 'all', icon: 'apps', label: 'ทั้งหมด' },
  { id: 'stock', icon: 'inventory_2', label: 'คงคลัง' },
  { id: 'low', icon: 'warning', label: 'ใกล้จะหมด' },
  { id: 'out', icon: 'error', label: 'หมดคงคลัง' },
];

async function getAllEquipment() {
  const response = await AppAPI.get('/equipment/get_all');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map(InventoryModel.fromJson);
}

async function getEquipmentTypeList() {
  const response = await AppAPI.get('/equipment/get_type');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    equipmentTypeId: row.equipment_type_id,
    equipmentTypeName: row.equipment_type_name,
  }));
}

async function getUnitList() {
  const response = await AppAPI.get('/equipment/get_unit');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    unitId: row.unit_id,
    unitName: row.unit_name,
  }));
}

async function createEquipment(values) {
  const response = await AppAPI.post('/equipment/create', {
    equipment_name: values.equipmentName,
    equipment_type_id: values.equipmentTypeId,
    unit_id: values.unitId,
    quantity: values.quantity,
    low_stock_threshold: values.lowStockThreshold,
  });
  return response.json();
}

async function updateEquipment(values) {
  const response = await AppAPI.post('/equipment/update', {
    equipment_id: values.equipmentId,
    equipment_name: values.equipmentName,
    equipment_type_id: values.equipmentTypeId,
    unit_id: values.unitId,
    quantity: values.quantity,
    low_stock_threshold: values.lowStockThreshold,
  });
  return response.json();
}

async function deleteEquipment(equipmentIds) {
  const response = await AppAPI.post('/equipment/delete', {
    equipment_ids: Array.isArray(equipmentIds) ? equipmentIds : [equipmentIds],
  });
  return response.json();
}

// เพิ่ม/เปลี่ยน/ลบรูปครุภัณฑ์ — endpoint เดียวรับได้ทั้ง 3 กรณี (ดูฝั่ง server.js)
async function saveEquipmentImage(equipmentId, { file, remove }) {
  const response = await AppAPI.postFormData(`/equipment/${equipmentId}/photos`, {
    file,
    fieldName: 'photo',
    fields: remove ? { remove: '1' } : {},
  });
  return response.json();
}

function InventoryPage() {
  const [equipmentData, setEquipmentData] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [formModal, setFormModal] = useState({ isOpen: false, mode: 'add', equipment: null });
  const [deleteTarget, setDeleteTarget] = useState(null); // { equipmentIds: [], label: '' }
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), 2800);
  }

  async function fetchAll(silent = false) {
    try {
      if (!silent) setIsLoading(true);
      setError('');

      const [equipmentList, types, unitList] = await Promise.all([
        getAllEquipment(),
        getEquipmentTypeList(),
        getUnitList(),
      ]);

      setEquipmentData(equipmentList);
      setEquipmentTypes(types);
      setUnits(unitList);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const intervalId = window.setInterval(() => fetchAll(true), 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return equipmentData.filter((item) => {
      const matchesSearch =
        term === '' ||
        item.equipmentName.toLowerCase().includes(term) ||
        item.equipmentCode.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.equipmentTypeId === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [equipmentData, searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / CARDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleEquipment = filteredData.slice(
    (safePage - 1) * CARDS_PER_PAGE,
    (safePage - 1) * CARDS_PER_PAGE + CARDS_PER_PAGE,
  );

  const statusCounts = useMemo(() => {
    const counts = { all: equipmentData.length, stock: 0, low: 0, out: 0 };
    equipmentData.forEach((item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    });
    return counts;
  }, [equipmentData]);

  function openAddModal() {
    setFormModal({ isOpen: true, mode: 'add', equipment: null });
  }

  function openEditModal(equipment) {
    setFormModal({ isOpen: true, mode: 'edit', equipment });
  }

  function closeFormModal() {
    setFormModal((m) => ({ ...m, isOpen: false }));
  }

  // แค่บันทึกข้อมูลครุภัณฑ์ (ชื่อ/ประเภท/จำนวน ฯลฯ) — ยังไม่ปิด modal/toast/refetch ตรงนี้
  // เพราะต้องรอขั้นตอนอัปโหลดรูป (ถ้ามี) ให้เสร็จก่อน ไม่งั้น modal ปิดไปแล้วแต่รูปเพิ่งพังทีหลัง
  // ผู้ใช้จะไม่เห็น error เลย — ดู handleFormSuccess ที่ทำ 3 อย่างนั้นแทน
  async function handleFormSubmit(values) {
    const response = values.mode === 'edit' ? await updateEquipment(values) : await createEquipment(values);
    return response;
  }

  // เรียกจาก InventoryFormModal หลัง "ทุกขั้นตอน" (บันทึกข้อมูล + อัปโหลดรูปถ้ามี) สำเร็จแล้วเท่านั้น
  async function handleFormSuccess(mode) {
    closeFormModal();
    showToast(mode === 'edit' ? 'บันทึกข้อมูลครุภัณฑ์เรียบร้อย' : 'เพิ่มครุภัณฑ์เรียบร้อย');
    await fetchAll();
  }

  function toggleSelect(equipment) {
    setSelectedIds((prev) =>
      prev.includes(equipment.equipmentId)
        ? prev.filter((id) => id !== equipment.equipmentId)
        : [...prev, equipment.equipmentId],
    );
  }

  function requestDeleteSingle(equipment) {
    setDeleteTarget({
      equipmentIds: [equipment.equipmentId],
      label: `คุณกำลังจะลบ "${equipment.equipmentName}" ออกจากระบบใช่หรือไม่?`,
    });
  }

  function requestDeleteSelected() {
    if (selectedIds.length === 0) return;
    setDeleteTarget({
      equipmentIds: selectedIds,
      label: `คุณกำลังจะลบครุภัณฑ์ที่เลือกไว้ ${selectedIds.length} รายการใช่หรือไม่?`,
    });
  }

  function enterSelectMode() {
    setSelectMode(true);
  }

  function cancelSelectMode() {
    setSelectMode(false);
    setSelectedIds([]);
  }

  function toggleSelectAll() {
    const allIds = filteredData.map((item) => item.equipmentId);
    const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(isAllSelected ? [] : allIds);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    const response = await deleteEquipment(deleteTarget.equipmentIds);
    setDeleteTarget(null);

    if (response.isError) {
      alert(response.errorMessage || 'ลบข้อมูลไม่สำเร็จ');
      return;
    }

    setSelectMode(false);
    setSelectedIds([]);
    closeFormModal();
    showToast('ลบครุภัณฑ์เรียบร้อย');
    await fetchAll();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Inventory Management
          </p>
          <h2 className="text-2xl font-extrabold">ครุภัณฑ์</h2>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-md hover:brightness-110"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          เพิ่มครุภัณฑ์
        </button>
      </div>

      <div className="flex">
        <div className="relative w-full max-w-[460px] flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-slate-400 text-xl">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="ค้นหาชื่อ หรือรหัสครุภัณฑ์..."
            className="w-full py-3.5 pl-11.5 pr-4 border-[1.5px] border-slate-300 rounded-2xl text-sm bg-white focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
          />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {STATUS_FILTERS.map((filter) => (
          <StatusPill
            key={filter.id}
            icon={filter.icon}
            label={filter.label}
            count={statusCounts[filter.id] ?? 0}
            isActive={statusFilter === filter.id}
            onClick={() => { setStatusFilter(filter.id); setCurrentPage(1); }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative w-full max-w-[240px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-700 text-lg">
              category
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full appearance-none rounded-full border-[1.5px] border-slate-300 bg-white py-2.5 pl-10.5 pr-9 text-[13.5px] font-bold text-slate-700 focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
            >
              <option value="all">ทั้งหมด</option>
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

          <p className="text-[13.5px] font-semibold text-slate-500">
            พบ <strong className="text-blue-800">{filteredData.length}</strong> รายการ
            {selectMode && (
              <>
                {' '}· เลือกไว้ <strong className="text-blue-800">{selectedIds.length}</strong> รายการ
              </>
            )}
          </p>
        </div>

        {filteredData.length > 0 && (
          selectMode ? (
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={cancelSelectMode}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-base">close</span>
                ยกเลิกการเลือก
              </button>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-100 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-200"
              >
                <span className="material-symbols-outlined text-base">
                  {filteredData.length > 0 && filteredData.every((item) => selectedIds.includes(item.equipmentId))
                    ? 'deselect'
                    : 'select_all'}
                </span>
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={requestDeleteSelected}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                ลบ{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={enterSelectMode}
              className="flex items-center gap-1.5 rounded-xl bg-white border-[1.5px] border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base">checklist</span>
              เลือก
            </button>
          )
        )}
      </div>

      <section>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && visibleEquipment.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
            <span className="material-symbols-outlined text-5xl opacity-40">search_off</span>
            <p className="text-sm font-semibold">ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไข</p>
          </div>
        ) : (
          <div className="grid gap-4.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {visibleEquipment.map((equipment) => (
              <InventoryCard
                key={equipment.equipmentId}
                equipment={equipment}
                onEdit={openEditModal}
                selectable={selectMode}
                isSelected={selectedIds.includes(equipment.equipmentId)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(safePage - 1)}
              className="h-9.5 w-9.5 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
              <button
                type="button"
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-9.5 min-w-9.5 px-3 rounded-xl border font-bold text-[13.5px] ${
                  page === safePage ? 'bg-blue-800 border-blue-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="h-9.5 w-9.5 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        )}
      </section>

      <InventoryFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        equipment={formModal.equipment}
        equipmentTypes={equipmentTypes}
        units={units}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        onSubmitImage={saveEquipmentImage}
        onSuccess={handleFormSuccess}
        onRequestDelete={requestDeleteSingle}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบครุภัณฑ์"
        message={deleteTarget?.label}
      />

      {toast && (
        <div className="fixed bottom-8 right-8 z-[200] flex items-center gap-2.5 bg-slate-900 text-white px-5.5 py-3.5 rounded-2xl text-[13.5px] font-semibold shadow-xl">
          <span className="material-symbols-outlined text-green-400 text-xl">check_circle</span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default InventoryPage;
