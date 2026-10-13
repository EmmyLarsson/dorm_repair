import { useEffect, useMemo, useState } from 'react';
import StatusPill from '../components/StatusPill';
import PersonnelCard from '../components/personnel/PersonnelCard';
import PersonnelFormModal from '../components/personnel/PersonnelFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { AppAPI } from '../utils/appApi';
import { PersonnelModel } from '../models/personnelModel';

const CARDS_PER_PAGE = 6;

const ROLE_FILTER_ICON = { 1: 'school', 2: 'badge', 3: 'engineering' };

async function getAllPersonnel() {
  const response = await AppAPI.get('/personnel/get_all');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map(PersonnelModel.fromJson);
}

async function getRoleList() {
  const response = await AppAPI.get('/role/get_all');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    roleId: row.role_id,
    roleName: row.role_name,
  }));
}

async function getPositionList() {
  const response = await AppAPI.get('/position/get_all');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    positionId: row.position_id,
    positionName: row.position_name,
  }));
}

async function getSpecialtyList() {
  const response = await AppAPI.get('/specialty/get_all');
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    specialtyId: row.specialty_id,
    specialtyName: row.specialty_name,
  }));
}

async function createPersonnel(values) {
  if (values.roleId === 1) {
    const response = await AppAPI.post('/personnel/create_student', {
      firstname: values.firstname,
      lastname: values.lastname,
      phone: values.phone,
      username: values.username,
      password: values.password,
      room_number: values.roomNumber,
    });
    return response.json();
  }

  if (values.roleId === 2) {
    const response = await AppAPI.post('/personnel/create_moderator', {
      firstname: values.firstname,
      lastname: values.lastname,
      phone: values.phone,
      username: values.username,
      password: values.password,
      position_id: values.positionId,
    });
    return response.json();
  }

  const response = await AppAPI.post('/personnel/create_technician', {
    firstname: values.firstname,
    lastname: values.lastname,
    phone: values.phone,
    specialty_id: values.specialtyId,
  });
  return response.json();
}

async function updatePersonnel(values) {
  if (values.roleId === 1) {
    const response = await AppAPI.post('/personnel/update_student', {
      person_id: values.personId,
      firstname: values.firstname,
      lastname: values.lastname,
      phone: values.phone,
      room_number: values.roomNumber,
      username: values.username,
      password: values.password,
    });
    return response.json();
  }

  if (values.roleId === 2) {
    const response = await AppAPI.post('/personnel/update_moderator', {
      person_id: values.personId,
      firstname: values.firstname,
      lastname: values.lastname,
      phone: values.phone,
      position_id: values.positionId,
      username: values.username,
      password: values.password,
    });
    return response.json();
  }

  const response = await AppAPI.post('/personnel/update_technician', {
    person_id: values.personId,
    firstname: values.firstname,
    lastname: values.lastname,
    phone: values.phone,
    specialty_id: values.specialtyId,
  });
  return response.json();
}

async function uploadPersonnelPhoto(personId, file) {
  const response = await AppAPI.postFormData(`/personnel/${personId}/photo`, { file, fieldName: 'photo' });
  return response.json();
}

async function deletePersonnel(personIds) {
  const response = await AppAPI.post('/personnel/delete', {
    person_ids: Array.isArray(personIds) ? personIds : [personIds],
  });
  return response.json();
}

function PersonnelPage() {
  const [personnelData, setPersonnelData] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [positionList, setPositionList] = useState([]);
  const [specialtyList, setSpecialtyList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [formModal, setFormModal] = useState({ isOpen: false, mode: 'add', person: null });
  const [deleteTarget, setDeleteTarget] = useState(null); // { personIds: [], label: '' }
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

      const [personnelList, roles, positions, specialties] = await Promise.all([
        getAllPersonnel(),
        getRoleList(),
        getPositionList(),
        getSpecialtyList(),
      ]);

      setPersonnelData(personnelList);
      setRoleList(roles);
      setPositionList(positions);
      setSpecialtyList(specialties);
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
    return personnelData.filter((p) => {
      const matchesSearch =
        term === '' ||
        p.fullName.toLowerCase().includes(term) ||
        p.personNo.toLowerCase().includes(term) ||
        (p.username || '').toLowerCase().includes(term);
      const matchesRole = roleFilter === 'all' || p.roleId === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [personnelData, searchTerm, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / CARDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visiblePersonnel = filteredData.slice(
    (safePage - 1) * CARDS_PER_PAGE,
    (safePage - 1) * CARDS_PER_PAGE + CARDS_PER_PAGE,
  );

  const roleCounts = useMemo(() => {
    const counts = { all: personnelData.length };
    for (const role of roleList) counts[role.roleId] = 0;
    personnelData.forEach((p) => {
      counts[p.roleId] = (counts[p.roleId] ?? 0) + 1;
    });
    return counts;
  }, [personnelData, roleList]);

  function openAddModal() {
    setFormModal({ isOpen: true, mode: 'add', person: null });
  }

  function openEditModal(person) {
    setFormModal({ isOpen: true, mode: 'edit', person });
  }

  function closeFormModal() {
    setFormModal((m) => ({ ...m, isOpen: false }));
  }

  async function handleFormSubmit(values) {
    const response = values.mode === 'edit' ? await updatePersonnel(values) : await createPersonnel(values);

    if (!response.isError) {
      // ข้อมูลบุคคลถูกบันทึกไปแล้วตรงนี้ — ถ้ารูปอัปโหลดไม่สำเร็จห้ามคืนค่า isError ให้โมดัลค้างไว้ให้กดบันทึกซ้ำ
      // (ตอนเพิ่มคนใหม่จะสร้างซ้ำ) แจ้งผ่าน toast แทน แล้วเปิดแก้ไขเพื่ออัปโหลดรูปใหม่ภายหลังได้
      let photoErrorMessage = '';
      if (values.profileImageFile) {
        const personId = values.mode === 'edit' ? values.personId : response.data?.person_id;
        try {
          const photoResponse = await uploadPersonnelPhoto(personId, values.profileImageFile);
          if (photoResponse.isError) {
            photoErrorMessage = photoResponse.errorMessage || 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ';
          }
        } catch {
          photoErrorMessage = 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ';
        }
      }

      closeFormModal();
      const savedMessage = values.mode === 'edit' ? 'บันทึกข้อมูลบุคลากรเรียบร้อย' : 'เพิ่มข้อมูลบุคลากรเรียบร้อย';
      showToast(photoErrorMessage ? `${savedMessage} แต่${photoErrorMessage}` : savedMessage);
      await fetchAll();
    }

    return response;
  }

  function toggleSelect(person) {
    setSelectedIds((prev) =>
      prev.includes(person.personId) ? prev.filter((id) => id !== person.personId) : [...prev, person.personId],
    );
  }

  function requestDeleteSingle(person) {
    setDeleteTarget({
      personIds: [person.personId],
      label: `คุณกำลังจะลบข้อมูลของ "${person.fullName}" ใช่หรือไม่?`,
    });
  }

  function requestDeleteSelected() {
    if (selectedIds.length === 0) return;
    setDeleteTarget({
      personIds: selectedIds,
      label: `คุณกำลังจะลบบุคลากรที่เลือกไว้ ${selectedIds.length} คนใช่หรือไม่?`,
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
    const allIds = filteredData.map((p) => p.personId);
    const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(isAllSelected ? [] : allIds);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    const response = await deletePersonnel(deleteTarget.personIds);
    setDeleteTarget(null);

    if (response.isError) {
      alert(response.errorMessage || 'ลบข้อมูลไม่สำเร็จ');
      return;
    }

    setSelectMode(false);
    setSelectedIds([]);
    closeFormModal();
    showToast('ลบข้อมูลบุคลากรเรียบร้อย');
    await fetchAll();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Personnel Management
          </p>
          <h2 className="text-2xl font-extrabold">จัดการบุคลากร</h2>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-md hover:brightness-110"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          เพิ่มข้อมูลบุคลากร
        </button>
      </div>

      <div className="flex">
        <div className="relative w-full max-w-[460px] flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-slate-400 text-xl">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="ค้นหาชื่อ, รหัสบุคลากร หรือ username..."
            className="w-full py-3.5 pl-11.5 pr-4 border-[1.5px] border-slate-300 rounded-2xl text-sm bg-white focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-800/10"
          />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <StatusPill
          icon="apps"
          label="ดูทั้งหมด"
          count={roleCounts.all}
          isActive={roleFilter === 'all'}
          onClick={() => { setRoleFilter('all'); setCurrentPage(1); }}
        />
        {roleList.map((role) => (
          <StatusPill
            key={role.roleId}
            icon={ROLE_FILTER_ICON[role.roleId] ?? 'person'}
            label={role.roleName}
            count={roleCounts[role.roleId] ?? 0}
            isActive={roleFilter === role.roleId}
            onClick={() => { setRoleFilter(role.roleId); setCurrentPage(1); }}
          />
        ))}
      </div>

      {filteredData.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[13.5px] font-semibold text-slate-500">
            พบ <strong className="text-blue-800">{filteredData.length}</strong> คน
            {selectMode && (
              <>
                {' '}· เลือกไว้ <strong className="text-blue-800">{selectedIds.length}</strong> คน
              </>
            )}
          </p>

          <div className="flex items-center gap-2.5 flex-wrap">
          {selectMode ? (
            <>
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
                  {filteredData.length > 0 && filteredData.every((p) => selectedIds.includes(p.personId))
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
            </>
          ) : (
            <button
              type="button"
              onClick={enterSelectMode}
              className="flex items-center gap-1.5 rounded-xl bg-white border-[1.5px] border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base">checklist</span>
              เลือก
            </button>
          )}
          </div>
        </div>
      )}

      <section>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && visiblePersonnel.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
            <span className="material-symbols-outlined text-5xl opacity-40">search_off</span>
            <p className="text-sm font-semibold">ไม่พบข้อมูลบุคลากรที่ตรงกับเงื่อนไข</p>
          </div>
        ) : (
          <div className="grid gap-4.5 md:grid-cols-2 xl:grid-cols-3">
            {visiblePersonnel.map((person) => (
              <PersonnelCard
                key={person.personId}
                person={person}
                onEdit={openEditModal}
                selectable={selectMode}
                isSelected={selectedIds.includes(person.personId)}
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

      <PersonnelFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        person={formModal.person}
        roles={roleList}
        positions={positionList}
        specialties={specialtyList}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        onRequestDelete={requestDeleteSingle}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบบุคลากร"
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

export default PersonnelPage;
