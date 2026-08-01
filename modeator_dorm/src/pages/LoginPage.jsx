import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authenRequest, accessRequest,} from "../services/authService";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ปรับชื่อตัวแปรแจ้งเตือนจาก formError ให้เป็น submitStatus/submitMessage 
  // เพื่อให้ตรงกับตัวแปรที่ UI โค้ดเดิมต้องการพอดี (จะได้ไม่ต้องแก้ UI)
  const [submitStatus, setSubmitStatus] = useState("idle"); 
  const [submitMessage, setSubmitMessage] = useState("");

  // ฟังก์ชันสลับการมองเห็นรหัสผ่านที่ UI โค้ดเดิมเรียกใช้
  const togglePasswordVisibility = () => setShowPassword((v) => !v);

  // โหลดค่า "จดจำฉัน" จาก localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem("staff_remember_username");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  function validate() {
    const next = { username: "", password: "" };
    let valid = true;

    if (!username.trim()) {
      next.username = "กรุณากรอกชื่อผู้ใช้งาน";
      valid = false;
    } else if (!password.trim()) {
      next.password = "กรุณากรอกรหัสผ่าน";
      valid = false;
    } else if (password.length < 6) {
      next.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
      valid = false;
    }

    setErrors(next);
    return valid;
  }


 async function handleLogin(e) {
    e.preventDefault(); // ป้องกันหน้าเว็บรีเฟรช
    setSubmitStatus("idle");
    setSubmitMessage("");

    if (!validate()) return; // ถ้า validate ไม่ผ่านให้หยุดการทำงาน

    setIsSubmitting(true); // 3. เปิดแสดงวงล้อ Loading

    try {
      const authResult = await authenRequest(username);

      if (authResult.isError) {
        // 2. เปลี่ยนมาใช้ setSubmitMessage และ setSubmitStatus
        setSubmitMessage(authResult.errorMessage);
        setSubmitStatus("error");
        setIsSubmitting(false); // ปิด Loading เมื่อ Error
        return;
      }

      const authenToken = authResult.data;
      const result = await accessRequest(username, password, authenToken);
      console.log(result);

      if (!result.isError) {
        // เพิ่มจดจำฉัน (จำ username ลงเครื่องถ้าผู้ใช้ติ๊กถูก)
        if (rememberMe) {
          localStorage.setItem("staff_remember_username", username.trim());
        } else {
          localStorage.removeItem("staff_remember_username");
        }
        
        setSubmitStatus("success");
        setSubmitMessage("เข้าสู่ระบบสำเร็จ กำลังพาไปหน้าหลัก...");
        
        setTimeout(() => {
          navigate("/moderator/home");
        }, 1000);
      } else {
        // 2. เปลี่ยนมาใช้ setSubmitMessage และ setSubmitStatus
        setSubmitMessage(result.errorMessage);
        setSubmitStatus("error");
      }
    } catch (err) {
      setSubmitMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false); // 3. ปิดแสดงวงล้อ Loading เสมอเมื่อจบการทำงาน
    }
  }

  // ════════════════════════════════════════════════════════════
  // 2. ส่วนของ UI (JSX) คงเดิม 100% ไม่มีการแก้ไขใดๆ ทั้งสิ้น
  // ════════════════════════════════════════════════════════════
  return (
    <section className="flex flex-1 basis-1/2 flex-col items-center justify-center bg-[#f7f9ff] p-6">
      <div className="w-full max-w-[420px] rounded-[20px] bg-white p-9 shadow-[0_10px_30px_rgba(26,64,194,0.12)]">
        {/* ── Header (เทียบเท่า .login-header) ── */}
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e2e5ff]">
            <span className="material-symbols-outlined text-[28px] text-[#1a40c2]">
              lock_person
            </span>
          </div>
          <h2 className="mb-1.5 text-[22px] font-bold text-[#181c20]">
            ยินดีต้อนรับกลับ
          </h2>
          <p className="text-sm text-[#667085]">
            เข้าสู่ระบบเพื่อจัดการงานแจ้งซ่อมหอพัก
          </p>
        </header>

        <form onSubmit={handleLogin} noValidate>
          {/* ══════════════════════════════════════════
              STEP 1: ชื่อผู้ใช้งาน (Username)
              ⚠️ TODO(backend): ค่านี้จะถูกส่งไปเทียบกับคอลัมน์ `username`
              ในตาราง `staff_users` ของ MySQL ผ่าน API POST /api/auth/staff-login
              ══════════════════════════════════════════ */}
          <div className="mb-4.5">
            <label
              htmlFor="username"
              className="mb-1.5 block text-[13px] font-semibold text-[#667085]"
            >
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#9aa0b4]">
                person
              </span>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="กรอกชื่อผู้ใช้งาน"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`
                  w-full rounded-xl border-[1.5px] px-11 py-3 text-[15px]
                  transition-colors duration-200
                  focus:outline-none focus:ring-[3px]
                  ${
                    errors.username
                      ? 'border-[#ba1a1a]'
                      : 'border-[#dcdfe8] focus:border-[#1a40c2] focus:ring-[rgba(26,64,194,0.12)]'
                  }
                `}
              />
            </div>
            <p className="mt-1 min-h-[16px] text-xs text-[#ba1a1a]">
              {errors.username}
            </p>
          </div>

          {/* ══════════════════════════════════════════
              STEP 2: รหัสผ่าน (Password)
              ⚠️ TODO(backend): ห้ามส่ง/เก็บรหัสผ่านเป็น plaintext —
              ฝั่ง Node.js ต้อง hash ด้วย bcrypt ก่อนเทียบกับค่าที่เก็บไว้
              ══════════════════════════════════════════ */}
          <div className="mb-4.5">
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-semibold text-[#667085]"
            >
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#9aa0b4]">
                lock
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`
                  w-full rounded-xl border-[1.5px] px-11 py-3 text-[15px]
                  transition-colors duration-200
                  focus:outline-none focus:ring-[3px]
                  ${
                    errors.password
                      ? 'border-[#ba1a1a]'
                      : 'border-[#dcdfe8] focus:border-[#1a40c2] focus:ring-[rgba(26,64,194,0.12)]'
                  }
                `}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                aria-label="แสดง/ซ่อนรหัสผ่าน"
                className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center p-1 text-[#9aa0b4] transition-colors hover:text-[#1a40c2]"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="mt-1 min-h-[16px] text-xs text-[#ba1a1a]">
              {errors.password}
            </p>
          </div>

          {/* ══════════════════════════════════════════
              STEP 3: ตัวเลือกเพิ่มเติม — จดจำฉัน / ลืมรหัสผ่าน
              ══════════════════════════════════════════ */}
          <div className="mb-5.5 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#667085]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[#1a40c2]"
              />
              จดจำฉัน
            </label>
            <a
              href="#"
              className="text-sm font-semibold text-[#1a40c2] hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              ลืมรหัสผ่าน?
            </a>
          </div>

          {/* ══════════════════════════════════════════
              STEP 4: ปุ่ม Submit — เข้าสู่ระบบ
              ⚠️ TODO(backend): ระหว่าง isSubmitting=true ควร disable ปุ่มนี้
              ไว้กันผู้ใช้กดซ้ำระหว่างรอ response จาก server (ทำไว้แล้วด้านล่าง)
              ══════════════════════════════════════════ */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="
              flex w-full items-center justify-center gap-2 rounded-xl
              bg-[#1a40c2] py-3.5 text-base font-bold text-white
              transition-all duration-200
              hover:bg-[#0c2a8f] active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-70
            "
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">
                  login
                </span>
                เข้าสู่ระบบ
              </>
            )}
          </button>

          {/* ══════════════════════════════════════════
              ผลลัพธ์หลัง submit (แทนที่ alert() ของเว็บเดิม)
              ══════════════════════════════════════════ */}
          {submitStatus !== 'idle' && (
            <p
              className={`
                mt-3 rounded-lg px-3 py-2 text-center text-sm font-medium
                ${
                  submitStatus === 'success'
                    ? 'bg-[#e7f8ec] text-[#1b7a3d]'
                    : 'bg-[#fdeaea] text-[#ba1a1a]'
                }
              `}
              role="status"
            >
              {submitMessage}
            </p>
          )}

          {/* ── Divider (เทียบเท่า .divider) ── */}
          <div className="my-5 flex items-center text-center text-[13px] text-[#b0b5c3]">
            <span className="h-px flex-1 bg-[#e5e7f0]" />
            <span className="px-3">หรือ</span>
            <span className="h-px flex-1 bg-[#e5e7f0]" />
          </div>

          <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-[#667085]">
            <span className="material-symbols-outlined text-[18px] text-[#1a40c2]">
              support_agent
            </span>
            ยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบหอพัก
          </p>
        </form>
      </div>

      <p className="mt-6 text-xs text-[#a1a6b8]">
        © 2026 PSU Dormitory 10-11 Management System
      </p>
    </section>
  );
}