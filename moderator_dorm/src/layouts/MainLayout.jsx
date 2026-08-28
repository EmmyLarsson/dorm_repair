import {NavLink, Outlet, useNavigate,} from "react-router-dom";
const menuItems = [
  {
    to: "/moderator/home",
    label: "หน้าหลัก",
    icon: "home",
  },
  {
    to: "/moderator/repairs",
    label: "จัดการงานซ่อม",
    icon: "build",
  },
  {
    to: "/moderator/inventory",
    label: "ครุภัณฑ์",
    icon: "inventory_2",
  },
  {
    to: "/moderator/reports",
    label: "จัดทำสรุป",
    icon: "description",
  },
  {
    to: "/moderator/personnel",
    label: "จัดการบุคลากร",
    icon: "manage_accounts",
  },
];

export default function MainLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    const confirmed = window.confirm(
      "ยืนยันการออกจากระบบ?"
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem("access_token");

    navigate("/login", {
      replace: true,
    });
  }

 return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ==================== Topbar ==================== */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 shadow-sm backdrop-blur lg:px-10">
        {/* ชื่อระบบ */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-950 text-white shadow-md">
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
              }}
            >
              apartment
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold leading-tight text-blue-800">
              Dormitory Staff Portal
            </h1>

            <p className="truncate text-[11px] font-semibold tracking-wider text-slate-500">
              PSU DORM 10–11 · HAT YAI
            </p>
          </div>
        </div>

        {/* ข้อมูลผู้ใช้งาน */}
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800">
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
              }}
            >
              person
            </span>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              เจ้าหน้าที่หอพัก
            </p>

            <p className="text-[10px] text-slate-500">
              Staff · Dorm 10–11
            </p>
          </div>
        </div>
      </header>

      {/* ==================== Sidebar ==================== */}
      <aside className="fixed bottom-0 left-0 top-16 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-sm">
        {/* ชื่อและข้อมูลระบบ */}
        <div className="border-b border-slate-200 px-6 py-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-800 text-white shadow-md">
            <span
              className="material-symbols-outlined text-4xl"
              style={{
                fontVariationSettings:
                  "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 40",
              }}
            >
              school
            </span>
          </div>

          <h2 className="text-sm font-bold leading-6 text-slate-800">
            ระบบแจ้งซ่อมหอพักนักศึกษาในกำกับ 10-11
            <br />
            มหาวิทยาลัยสงขลานครินทร์
            <br />
            วิทยาเขตหาดใหญ่
          </h2>
        </div>

        {/* เมนู */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "group relative flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition duration-200",
                      isActive
                        ? "bg-blue-100 text-blue-800"
                        : "text-slate-600 hover:bg-slate-100 hover:text-blue-800",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="material-symbols-outlined text-[22px] transition-transform duration-200 group-hover:translate-x-0.5"
                        style={{
                          fontVariationSettings: isActive
                            ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                            : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                        }}
                      >
                        {item.icon}
                      </span>

                      <span>{item.label}</span>

                      {isActive && (
                        <span className="absolute bottom-2 right-0 top-2 w-1 rounded-l-full bg-blue-800" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* ปุ่มออกจากระบบ */}
        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-red-700 transition duration-200 hover:bg-red-50 active:scale-95"
          >
            <span className="material-symbols-outlined">
              logout
            </span>

            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* ==================== Main Area ==================== */}
      <div className="min-h-screen pl-72 pt-16">
        {/*
          Outlet คือจุดที่หน้าแต่ละหน้าจะถูกนำมาแสดง

          /moderator/home
          แสดง HomePage

          /moderator/repairs
          แสดง RepairManagementPage

          /moderator/inventory
          แสดง InventoryPage

          Topbar และ Sidebar จะไม่เปลี่ยน
        */}
        <main className="min-h-[calc(100vh-8rem)] p-8">
          <Outlet />
        </main>

        {/* ==================== Footer ==================== */}
        <footer className="border-t border-slate-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              PSU Dormitory 10–11 Maintenance Request
              System
            </p>

            <p>
              Prince of Songkla University · Hat Yai
              Campus
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

