import { useEffect, useRef, useState } from 'react';
import BaseModal from '../BaseModal';
import { photoFullUrl } from '../../utils/photoUtil';

const EMPTY_FORM = {
  roleId: '',
  firstname: '',
  lastname: '',
  phone: '',
  username: '',
  password: '',
  roomNumber: '',
  positionId: '',
  specialtyId: '',
};

const VALID_STUDENT_PREFIXES = ['661', '671', '681', '691'];

function fieldLabel(field) {
  return {
    roleId: 'บทบาท',
    firstname: 'ชื่อ',
    lastname: 'นามสกุล',
    phone: 'เบอร์โทรศัพท์',
    username: 'username',
    password: 'รหัสผ่าน',
    roomNumber: 'หมายเลขห้อง',
    positionId: 'ตำแหน่ง',
    specialtyId: 'ความเชี่ยวชาญ',
  }[field];
}

function validateStudentUsername(username) {
  if (!/^\d+$/.test(username)) {
    return 'รูปแบบ username ไม่ถูกต้อง';
  }
  if (username.length !== 10) {
    return 'สามารถพิมพ์ตัวเลขได้ 10 หลักเท่านั้น';
  }
  if (!VALID_STUDENT_PREFIXES.includes(username.slice(0, 3))) {
    return 'สามารถพิมพ์ตัวเลขได้ 10 หลักเท่านั้น';
  }
  return '';
}

function validatePhone(phone) {
  if (!/^\d+$/.test(phone)) {
    return 'คุณกำลังใส่เบอร์โทรผิดรูปแบบ';
  }
  if (phone.length !== 10) {
    return 'กรุณาใส่เบอร์โทรให้ครบ 10 หลัก';
  }
  return '';
}

function validateRoomNumber(roomNumber) {
  const match = /^(\d{2})(\d{2})(\d{2})$/.exec(roomNumber);
  if (!match) {
    return 'หมายเลขห้องไม่ถูกต้อง';
  }
  const building = Number(match[1]);
  const floor = Number(match[2]);
  const room = Number(match[3]);
  if (building < 10 || building > 11) return 'หมายเลขห้องไม่ถูกต้อง';
  if (floor < 2 || floor > 15) return 'หมายเลขห้องไม่ถูกต้อง';
  if (room < 1 || room > 40) return 'หมายเลขห้องไม่ถูกต้อง';
  return '';
}

/**
 * PersonnelFormModal - เพิ่ม/แก้ไขบุคลากร บน BaseModal
 * บทบาทถูกล็อกในโหมดแก้ไข (ตามสเปก: เปลี่ยน role ไม่ได้ ต้องลบแล้วสร้างใหม่)
 */
function PersonnelFormModal({
  isOpen,
  mode, // 'add' | 'edit'
  person, // PersonnelModel เมื่อ mode === 'edit'
  roles,
  positions,
  specialties,
  onClose,
  onSubmit,
  onRequestDelete,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const profileImageInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && person) {
      setForm({
        roleId: String(person.roleId),
        firstname: person.firstname,
        lastname: person.lastname,
        phone: person.phone,
        // แสดง username เดิมให้เห็นว่าตอนนี้คือชื่ออะไร (แก้แล้วค่อยพิมพ์ทับ) — ต่างจาก password
        // ที่ต้องเว้นว่างเสมอเพราะเก็บเป็น hash ในฐานข้อมูล ไม่มีทางดึงค่าจริงกลับมาโชว์ได้
        username: person.username || '',
        password: '',
        roomNumber: person.roomNumber || '',
        positionId: person.positionId ? String(person.positionId) : '',
        specialtyId: person.specialtyId ? String(person.specialtyId) : '',
      });
      // DB เก็บ path สั้นของรูปบน server (/uploads/...) ต้องต่อ host ของ API ก่อน ไม่งั้นเบราว์เซอร์ไปโหลดจากพอร์ต Vite
      setProfileImagePreview(person.profileImage ? photoFullUrl(person.profileImage) : null);
    } else {
      setForm(EMPTY_FORM);
      setProfileImagePreview(null);
    }
    setErrors({});
    setSubmitError('');
  }, [isOpen, mode, person]);

  // TODO(backend): ตอนนี้เก็บรูปไว้แค่ preview ฝั่ง client เท่านั้น
  // อนาคตจะอัปโหลดจริงผ่าน multer แล้วเก็บ path ลงคอลัมน์ person.profile_image
  function handleProfileImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setProfileImagePreview(reader.result);
    reader.readAsDataURL(file);
  }

  const roleId = Number(form.roleId) || null;

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};

    if (!form.roleId) next.roleId = `กรุณาใส่${fieldLabel('roleId')}`;
    if (!form.firstname.trim()) next.firstname = `กรุณาใส่${fieldLabel('firstname')}`;
    if (!form.lastname.trim()) next.lastname = `กรุณาใส่${fieldLabel('lastname')}`;
    if (!form.phone.trim()) {
      next.phone = `กรุณาใส่${fieldLabel('phone')}`;
    } else {
      const phoneError = validatePhone(form.phone.trim());
      if (phoneError) next.phone = phoneError;
    }

    if (roleId === 1) {
      // ตอนแก้ไข username/password ไม่บังคับกรอก (เว้นว่าง = ไม่เปลี่ยน) แต่ถ้ากรอกมาก็ต้อง
      // ตรวจรูปแบบเหมือนตอนสร้างใหม่อยู่ดี — เดิมเช็คแค่ตอน mode === 'add' เท่านั้น ทำให้กรอก
      // username ผิดรูปแบบตอนแก้ไขแล้วไม่มีอะไรเตือนเลย
      if (mode === 'add' && !form.username.trim()) {
        next.username = `กรุณาใส่${fieldLabel('username')}`;
      } else if (form.username.trim()) {
        const usernameError = validateStudentUsername(form.username.trim());
        if (usernameError) next.username = usernameError;
      }

      if (mode === 'add' && !form.password) {
        next.password = `กรุณาใส่${fieldLabel('password')}`;
      } else if (form.password && form.password.length < 6) {
        next.password = 'รหัสผ่านสั้นเกินไป';
      }

      if (!form.roomNumber.trim()) {
        next.roomNumber = `กรุณาใส่${fieldLabel('roomNumber')}`;
      } else {
        const roomError = validateRoomNumber(form.roomNumber.trim());
        if (roomError) next.roomNumber = roomError;
      }
    }

    if (roleId === 2) {
      if (mode === 'add' && !form.username.trim()) {
        next.username = `กรุณาใส่${fieldLabel('username')}`;
      } else if (form.username.trim() && form.username.trim().length < 4) {
        next.username = 'username สั้นเกินไป';
      }

      if (mode === 'add' && !form.password) {
        next.password = `กรุณาใส่${fieldLabel('password')}`;
      } else if (form.password && form.password.length < 6) {
        next.password = 'รหัสผ่านสั้นเกินไป';
      }

      if (!form.positionId) next.positionId = `กรุณาใส่${fieldLabel('positionId')}`;
    }

    if (roleId === 3) {
      if (!form.specialtyId) next.specialtyId = `กรุณาใส่${fieldLabel('specialtyId')}`;
    }

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
        personId: person?.personId,
        roleId,
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        phone: form.phone.trim(),
        username: form.username.trim(),
        password: form.password,
        roomNumber: form.roomNumber.trim(),
        positionId: form.positionId ? Number(form.positionId) : null,
        specialtyId: form.specialtyId ? Number(form.specialtyId) : null,
      });

      if (response?.isError) {
        setSubmitError(response.errorMessage || 'บันทึกข้อมูลไม่สำเร็จ');
      }
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
      title={mode === 'edit' ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มข้อมูลบุคลากร'}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={() => onRequestDelete?.(person)}
              className="h-11.5 px-6 rounded-full text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              ลบข้อมูลบุคลากร
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
                {mode === 'edit' ? 'save' : 'person_add'}
              </span>
              {mode === 'edit' ? 'บันทึกข้อมูล' : 'เพิ่มข้อมูล'}
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
          <button
            type="button"
            onClick={() => profileImageInputRef.current?.click()}
            className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-700"
          >
            {profileImagePreview ? (
              <img src={profileImagePreview} alt="รูปโปรไฟล์" className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-3xl text-slate-400">person</span>
            )}
            <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
              <span className="material-symbols-outlined text-xl text-white">photo_camera</span>
            </span>
          </button>
          <input
            ref={profileImageInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfileImageChange}
            className="hidden"
          />
          <p className="text-xs text-slate-500">รูปโปรไฟล์ (ไม่บังคับ)</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold">บทบาท</label>
          <select
            value={form.roleId}
            onChange={(e) => setField('roleId', e.target.value)}
            disabled={mode === 'edit'}
            className={`${inputClass('roleId')} disabled:bg-slate-100 disabled:text-slate-500`}
          >
            <option value="">-- เลือกบทบาท --</option>
            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.roleName}
              </option>
            ))}
          </select>
          {errors.roleId && <p className="text-xs text-red-600">{errors.roleId}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4.5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">ชื่อ</label>
            <input
              type="text"
              value={form.firstname}
              onChange={(e) => setField('firstname', e.target.value)}
              className={inputClass('firstname')}
            />
            {errors.firstname && <p className="text-xs text-red-600">{errors.firstname}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">นามสกุล</label>
            <input
              type="text"
              value={form.lastname}
              onChange={(e) => setField('lastname', e.target.value)}
              className={inputClass('lastname')}
            />
            {errors.lastname && <p className="text-xs text-red-600">{errors.lastname}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold">เบอร์โทรศัพท์</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            className={inputClass('phone')}
          />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
        </div>

        {roleId === 1 && (
          <>
            <div className="grid sm:grid-cols-2 gap-4.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Username (รหัสนักศึกษา 10 หลัก)</label>
                <input
                  type="text"
                  placeholder={mode === 'edit' ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน' : '66112345XX'}
                  value={form.username}
                  onChange={(e) => setField('username', e.target.value)}
                  className={inputClass('username')}
                />
                {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'edit' ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน' : ''}
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    className={`${inputClass('password')} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold">หมายเลขห้อง</label>
              <input
                type="text"
                placeholder="เช่น 100205"
                value={form.roomNumber}
                onChange={(e) => setField('roomNumber', e.target.value)}
                className={inputClass('roomNumber')}
              />
              {errors.roomNumber && <p className="text-xs text-red-600">{errors.roomNumber}</p>}
            </div>
          </>
        )}

        {roleId === 2 && (
          <>
            <div className="grid sm:grid-cols-2 gap-4.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Username</label>
                <input
                  type="text"
                  placeholder={mode === 'edit' ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน' : ''}
                  value={form.username}
                  onChange={(e) => setField('username', e.target.value)}
                  className={inputClass('username')}
                />
                {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'edit' ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน' : ''}
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    className={`${inputClass('password')} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold">ตำแหน่ง</label>
              <select
                value={form.positionId}
                onChange={(e) => setField('positionId', e.target.value)}
                className={inputClass('positionId')}
              >
                <option value="">-- เลือกตำแหน่ง --</option>
                {positions.map((pos) => (
                  <option key={pos.positionId} value={pos.positionId}>
                    {pos.positionName}
                  </option>
                ))}
              </select>
              {errors.positionId && <p className="text-xs text-red-600">{errors.positionId}</p>}
            </div>
          </>
        )}

        {roleId === 3 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">ประเภทความเชี่ยวชาญ</label>
            <select
              value={form.specialtyId}
              onChange={(e) => setField('specialtyId', e.target.value)}
              className={inputClass('specialtyId')}
            >
              <option value="">-- เลือกความเชี่ยวชาญ --</option>
              {specialties.map((sp) => (
                <option key={sp.specialtyId} value={sp.specialtyId}>
                  {sp.specialtyName}
                </option>
              ))}
            </select>
            {errors.specialtyId && <p className="text-xs text-red-600">{errors.specialtyId}</p>}
          </div>
        )}
      </div>
    </BaseModal>
  );
}

export default PersonnelFormModal;
