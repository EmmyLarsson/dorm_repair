import { useEffect, useRef, useState } from 'react';
import BaseModal from '../BaseModal';
import { photoFullUrl } from '../../utils/photoUtil';

const EMPTY_FORM = {
  equipmentName: '',
  equipmentTypeId: '',
  unitId: '',
  quantity: 0,
  lowStockThreshold: 0,
};

function fieldLabel(field) {
  return {
    equipmentName: 'ชื่อครุภัณฑ์',
    equipmentTypeId: 'ประเภท',
    unitId: 'หน่วยนับ',
  }[field];
}

/**
 * InventoryFormModal - เพิ่ม/แก้ไขครุภัณฑ์ บน BaseModal
 * โครงสไตล์เดียวกับ PersonnelFormModal.jsx
 */
function InventoryFormModal({
  isOpen,
  mode, // 'add' | 'edit'
  equipment, // InventoryModel เมื่อ mode === 'edit'
  equipmentTypes,
  units,
  onClose,
  onSubmit,
  onSubmitImage, // (equipmentId, { file, remove }) => Promise<{isError, errorMessage}>
  onSuccess, // (mode) => void — เรียกหลังบันทึกข้อมูล + รูป (ถ้ามี) สำเร็จครบทุกขั้นตอน
  onRequestDelete,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  // ไฟล์รูปใหม่ที่เพิ่งเลือก (ยังไม่อัปโหลดจนกว่าจะกดบันทึก) — null = ไม่ได้เปลี่ยนรูป
  const [imageFile, setImageFile] = useState(null);
  // กด "ลบรูป" ไว้ (ต้องแยกจาก imageFile เพราะ "ลบ" ก็ทำให้ imagePreview เป็น null เหมือนกัน
  // แต่ความหมายต่างกัน: ลบรูป vs ไม่เคยมีรูปเลย)
  const [imageRemoved, setImageRemoved] = useState(false);
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && equipment) {
      setForm({
        equipmentName: equipment.equipmentName,
        equipmentTypeId: String(equipment.equipmentTypeId),
        unitId: String(equipment.unitId),
        quantity: equipment.quantity,
        lowStockThreshold: equipment.lowStockThreshold,
      });
      setImagePreview(equipment.imageUrl ? photoFullUrl(equipment.imageUrl) : null);
    } else {
      setForm(EMPTY_FORM);
      setImagePreview(null);
    }
    setImageFile(null);
    setImageRemoved(false);
    setErrors({});
    setSubmitError('');
  }, [isOpen, mode, equipment]);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImageRemoved(false);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  }

  function handleRemoveImage(e) {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function adjustQuantity(delta) {
    setForm((f) => ({ ...f, quantity: Math.max(0, Number(f.quantity || 0) + delta) }));
  }

  function validate() {
    const next = {};

    if (!form.equipmentName.trim()) next.equipmentName = `กรุณาใส่${fieldLabel('equipmentName')}`;
    if (!form.equipmentTypeId) next.equipmentTypeId = `กรุณาเลือก${fieldLabel('equipmentTypeId')}`;
    if (!form.unitId) next.unitId = `กรุณาเลือก${fieldLabel('unitId')}`;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitError('');
    setIsSubmitting(true);

    try {
      const response = await onSubmit({
        mode,
        equipmentId: equipment?.equipmentId,
        equipmentName: form.equipmentName.trim(),
        equipmentTypeId: Number(form.equipmentTypeId),
        unitId: Number(form.unitId),
        quantity: Math.max(0, Number(form.quantity) || 0),
        lowStockThreshold: Math.max(0, Number(form.lowStockThreshold) || 0),
      });

      if (response?.isError) {
        setSubmitError(response.errorMessage || 'บันทึกข้อมูลไม่สำเร็จ');
        return response;
      }

      // อัปโหลด/เปลี่ยน/ลบรูป เฉพาะตอนที่ผู้ใช้แตะต้องรูปจริงๆ (ไม่งั้นไม่ยิง request เปล่าๆ)
      const equipmentId = mode === 'edit' ? equipment?.equipmentId : response?.data?.equipment_id;
      if (onSubmitImage && equipmentId && (imageFile || imageRemoved)) {
        const imageResponse = await onSubmitImage(equipmentId, {
          file: imageFile,
          remove: imageRemoved && !imageFile,
        });

        if (imageResponse?.isError) {
          setSubmitError(imageResponse.errorMessage || 'บันทึกรูปภาพไม่สำเร็จ');
          return imageResponse;
        }
      }

      // ปิด modal / โชว์ toast / รีเฟรชรายการ เฉพาะตอนที่ทุกขั้นตอนสำเร็จครบจริงๆ
      onSuccess?.(mode);
      return response;
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-white focus:outline-none focus:ring-4 ${
      errors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-400/10'
        : 'border-slate-300 focus:border-blue-800 focus:ring-blue-800/10'
    }`;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'แก้ไขครุภัณฑ์' : 'เพิ่มครุภัณฑ์'}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={() => onRequestDelete?.(equipment)}
              className="h-11.5 px-6 rounded-full text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              ลบครุภัณฑ์
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11.5 px-6 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11.5 px-6 rounded-full text-sm font-bold text-white bg-blue-700 shadow-md hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                {mode === 'edit' ? 'save' : 'add_circle'}
              </span>
              {mode === 'edit' ? 'บันทึกข้อมูล' : 'เพิ่ม'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4.5">
        {submitError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <div className="relative h-28 w-28">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-700"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="รูปครุภัณฑ์" className="h-full w-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-3xl text-slate-400">inventory_2</span>
              )}
              <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                <span className="material-symbols-outlined text-xl text-white">
                  {imagePreview ? 'sync' : 'photo_camera'}
                </span>
              </span>
            </button>

            {imagePreview && (
              <button
                type="button"
                onClick={handleRemoveImage}
                title="ลบรูป"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <p className="text-xs text-slate-500">รูปครุภัณฑ์ (ไม่บังคับ)</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold">ชื่อครุภัณฑ์</label>
          <input
            type="text"
            placeholder="เช่น เก้าอี้สำนักงาน"
            value={form.equipmentName}
            onChange={(e) => setField('equipmentName', e.target.value)}
            className={inputClass('equipmentName')}
          />
          {errors.equipmentName && <p className="text-xs text-red-600">{errors.equipmentName}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4.5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">ประเภท</label>
            <select
              value={form.equipmentTypeId}
              onChange={(e) => setField('equipmentTypeId', e.target.value)}
              className={inputClass('equipmentTypeId')}
            >
              <option value="">-- เลือกประเภท --</option>
              {equipmentTypes.map((type) => (
                <option key={type.equipmentTypeId} value={type.equipmentTypeId}>
                  {type.equipmentTypeName}
                </option>
              ))}
            </select>
            {errors.equipmentTypeId && <p className="text-xs text-red-600">{errors.equipmentTypeId}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">หน่วยนับ</label>
            <select
              value={form.unitId}
              onChange={(e) => setField('unitId', e.target.value)}
              className={inputClass('unitId')}
            >
              <option value="">-- เลือกหน่วยนับ --</option>
              {units.map((unit) => (
                <option key={unit.unitId} value={unit.unitId}>
                  {unit.unitName}
                </option>
              ))}
            </select>
            {errors.unitId && <p className="text-xs text-red-600">{errors.unitId}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4.5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">จำนวน</label>
            <div className="flex h-12 items-center overflow-hidden rounded-xl border-[1.5px] border-slate-300">
              <button
                type="button"
                onClick={() => adjustQuantity(-1)}
                className="flex h-full w-11 items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-lg">remove</span>
              </button>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
                className="h-full w-full border-x-[1.5px] border-slate-300 text-center text-base font-extrabold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => adjustQuantity(1)}
                className="flex h-full w-11 items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">จำนวนขั้นต่ำ/แนะนำ</label>
            <input
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(e) => setField('lowStockThreshold', e.target.value)}
              className={inputClass('lowStockThreshold')}
            />
            <p className="text-[11px] text-slate-500">
              เหลือน้อยกว่าหรือเท่ากับค่านี้จะขึ้นสถานะ "ใกล้จะหมด"
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

export default InventoryFormModal;
