import { Outlet } from "react-router-dom";

export default function BrandPanel() {
  return (
    <div className="flex min-h-screen">
      {/* ฝั่ง Brand เดิม */}
      <section
        className="
          relative hidden md:flex flex-1 basis-1/2 flex-col justify-between
          overflow-hidden p-12 text-white
        "
        style={{
          // จุดที่จะเปลี่ยนเป็นรูปจริงในอนาคต
          // background: `url(...) center/cover`
          background:
            "linear-gradient(135deg, #0c2a8f 0%, #1a40c2 45%, #3b5bdb 100%)",
        }}
      >
        {/* Pattern ตกแต่งพื้นหลัง */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(
                circle at 20% 20%,
                rgba(255,255,255,0.08) 0,
                transparent 45%
              ),
              radial-gradient(
                circle at 80% 70%,
                rgba(255,255,255,0.10) 0,
                transparent 40%
              ),
              repeating-linear-gradient(
                45deg,
                rgba(255,255,255,0.03) 0 2px,
                transparent 2px 40px
              )
            `,
          }}
        />

        {/* การ์ดข้อความหลัก */}
        <div className="relative z-[2] max-w-[460px]">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-white/30 bg-white/15">
            <span className="material-symbols-outlined text-[32px] text-white">
              apartment
            </span>
          </div>

          <h1 className="mb-3 text-[28px] font-bold leading-snug">
            ระบบแจ้งซ่อมหอพักนักศึกษาในกำกับ 10-11
          </h1>

          <p className="mb-5 text-base text-white/85">
            มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่
          </p>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(252,212,0,0.5)] bg-[rgba(252,212,0,0.2)] px-3.5 py-1.5 text-sm font-semibold text-[#fcd400]">
            <span className="material-symbols-outlined text-[18px]">
              badge
            </span>

            สำหรับเจ้าหน้าที่หอพัก
          </span>
        </div>

        {/* Footer */}
        <div className="relative z-[2] flex items-center gap-2 text-[13px] text-white/70">
          <span className="material-symbols-outlined text-[16px]">
            verified
          </span>

          Powered by PSU Digital Service
        </div>
      </section>

      {/* LoginPage จะแสดงตรงตำแหน่งนี้ */}
      <Outlet />
    </div>
  );
}