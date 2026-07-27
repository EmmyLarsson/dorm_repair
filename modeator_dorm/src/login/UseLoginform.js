import { useState, useEffect, useCallback } from 'react';

/**
 * useLoginForm
 * ─────────────────────────────────────────────────────────
 * Custom hook ที่รวม logic ทั้งหมดของฟอร์ม login เจ้าหน้าที่หอพัก
 * แปลมาจาก modeator_login.js ทีละ section:
 *   1. Remember-me (โหลด/บันทึก username ที่จำไว้)
 *   2. Toggle แสดง/ซ่อนรหัสผ่าน
 *   3. Validation
 *   4. Submit + loading state
 * ─────────────────────────────────────────────────────────
 */

const REMEMBER_KEY = 'staff_remember_username';

export function useLoginForm() {
  // ── STEP 1: State พื้นฐานของฟอร์ม ──
  // เทียบเท่ากับ usernameInput.value / passwordInput.value ในเว็บ
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // ── STEP 2: State สำหรับ error message ราย field ──
  // เทียบเท่ากับ usernameError.textContent / passwordError.textContent
  const [errors, setErrors] = useState({ username: '', password: '' });

  // ── STEP 3: State ควบคุมการแสดง/ซ่อนรหัสผ่าน ──
  // เทียบเท่ากับการสลับ passwordInput.type ระหว่าง 'password' / 'text'
  const [showPassword, setShowPassword] = useState(false);

  // ── STEP 4: State ระหว่างกำลัง submit (loading) ──
  // เทียบเท่ากับ submitBtn.disabled + เปลี่ยน innerHTML ตอนกำลังส่ง
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── STEP 5: state แสดงผลลัพธ์หลัง submit (แทนการใช้ alert() ของเว็บเดิม) ──
  // 'idle' | 'success' | 'error'
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // ══════════════════════════════════════════════════════
  // โหลดค่า "จดจำฉัน" ตอนโหลดหน้าครั้งแรก
  // (เทียบเท่ากับ localStorage.getItem('staff_remember_username') ในเว็บ)
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    const savedUsername = localStorage.getItem(REMEMBER_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  // ══════════════════════════════════════════════════════
  // Toggle แสดง/ซ่อนรหัสผ่าน
  // ══════════════════════════════════════════════════════
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  // ══════════════════════════════════════════════════════
  // Validation — ตรงกับฟังก์ชัน validate() ในเว็บทุกเงื่อนไข
  // ══════════════════════════════════════════════════════
  const validate = useCallback(() => {
    const nextErrors = { username: '', password: '' };
    let valid = true;

    if (!username.trim()) {
      nextErrors.username = 'กรุณากรอกชื่อผู้ใช้งาน';
      valid = false;
    }

    if (!password.trim()) {
      nextErrors.password = 'กรุณากรอกรหัสผ่าน';
      valid = false;
    } else if (password.length < 6) {
      nextErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      valid = false;
    }

    setErrors(nextErrors);
    return valid;
  }, [username, password]);

  // ══════════════════════════════════════════════════════
  // Submit — ตรงกับ form.addEventListener('submit', ...) ในเว็บ
  // ══════════════════════════════════════════════════════
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitStatus('idle');
      setSubmitMessage('');

      if (!validate()) return;

      // จัดการ "จดจำฉัน" — เหมือนเว็บเป๊ะ: บันทึก/ลบ username ใน localStorage
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      setIsSubmitting(true);

      try {
        // ⚠️ TODO(backend step 1/3): เปลี่ยนบล็อกจำลอง (mock) นี้เป็นการเรียก
        // API จริงที่ยิงไปยัง Node.js/Express เช่น:
        //
        //   const res = await fetch('/api/auth/staff-login', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //       username: username.trim(),
        //       password, // ⚠️ ส่งผ่าน HTTPS เท่านั้น ห้ามส่ง plaintext ผ่าน HTTP
        //     }),
        //   });
        //   const data = await res.json();
        //   if (!res.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
        //
        // ⚠️ TODO(backend step 2/3): ฝั่ง Node.js ควร query ตาราง `staff_users`
        // ใน MySQL ด้วย username แล้วเทียบรหัสผ่านที่ hash ไว้ (เช่น bcrypt.compare)
        // ห้ามเก็บรหัสผ่านเป็น plaintext ในฐานข้อมูลเด็ดขาด
        //
        // ⚠️ TODO(backend step 3/3): เมื่อ login สำเร็จ backend ควรส่ง JWT หรือ
        // session token กลับมา แล้วเก็บไว้ (เช่น httpOnly cookie หรือ
        // localStorage ชั่วคราว) เพื่อใช้แนบไปกับ request อื่นๆ ที่ต้อง auth
        await new Promise((resolve) => setTimeout(resolve, 1200)); // demo delay

        setSubmitStatus('success');
        setSubmitMessage('เข้าสู่ระบบสำเร็จ (Demo) — เชื่อมต่อ API จริงได้ที่ useLoginForm.js');

        // ⚠️ TODO: เมื่อมี react-router แล้ว ให้ navigate ไปหน้า dashboard ตรงนี้ เช่น
        //   navigate('/staff/dashboard');
        // ตอนนี้ยังไม่มี routing จึงปล่อยเป็น comment ไว้ก่อน
      } catch (err) {
        setSubmitStatus('error');
        setSubmitMessage(err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
      } finally {
        setIsSubmitting(false);
      }
    },
    [username, password, rememberMe, validate]
  );

  return {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    errors,
    showPassword,
    togglePasswordVisibility,
    isSubmitting,
    submitStatus,
    submitMessage,
    handleSubmit,
  };
}