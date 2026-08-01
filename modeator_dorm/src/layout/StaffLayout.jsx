import {
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router-dom';

const menuItems = [
  {
    path: '/',
    label: 'หน้าหลัก',
    icon: 'home',
    end: true,
  },
  {
    path: '/repairs',
    label: 'จัดการงานซ่อม',
    icon: 'build',
  },
  {
    path: '/inventory',
    label: 'ครุภัณฑ์',
    icon: 'inventory_2',
  },
  {
    path: '/reports',
    label: 'จัดทำสรุป',
    icon: 'description',
  },
  {
    path: '/personnel',
    label: 'จัดการบุคลากร',
    icon: 'manage_accounts',
  },
];

function StaffLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    const confirmed = window.confirm(
      'ยืนยันการออกจากระบบ?',
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem('access_token');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-900">

      {/* Topbar */}
      <header className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-6 shadow-sm backdrop-blur md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-800 shadow-md">
            <span className="material-symbols-outlined text-white">
              apartment
            </span>
          </div>

          <div>
            <h1 className="text-lg font-extrabold text-blue-800 md:text-xl">
              Dormitory Staff Portal
            </h1>

            <p className="text-[10px] font-semibold tracking-wide text-slate-500 md:text-xs">
              PSU DORM 10–11 · HAT YAI
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
            <span className="material-symbols-outlined text-blue-800">
              person
            </span>
          </div>

          <div>
            <p className="text-xs font-bold">
              เจ้าหน้าที่หอพัก
            </p>

            <p className="text-[10px] text-slate-500">
              Staff · Dorm 10-11
            </p>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-70 flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
        <div className="border-b border-slate-200 px-5 py-7 text-center">
          <div className="mx-auto mb-4 flex h-18 w-18 items-center justify-center rounded-2xl bg-blue-800 shadow-md">
            <span className="material-symbols-outlined text-4xl text-yellow-300">
              apartment
            </span>
          </div>

          <h2 className="text-xs font-bold leading-5">
            ระบบแจ้งซ่อมหอพักนักศึกษา
            <br />
            ในกำกับ 10-11
            <br />
            มหาวิทยาลัยสงขลานครินทร์
          </h2>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-1">
            {menuItems.map((menu) => (
              <li key={menu.path}>
                <NavLink
                  to={menu.path}
                  end={menu.end}
                  className={({ isActive }) => {
                    const normalClass =
                      'flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition';

                    const activeClass =
                      'bg-blue-100 text-blue-800';

                    const inactiveClass =
                      'text-slate-600 hover:bg-slate-100 hover:text-blue-800';

                    return `${normalClass} ${
                      isActive
                        ? activeClass
                        : inactiveClass
                    }`;
                  }}
                >
                  <span className="material-symbols-outlined">
                    {menu.icon}
                  </span>

                  <span>{menu.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50"
          >
            <span className="material-symbols-outlined">
              logout
            </span>

            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* เนื้อหาที่เปลี่ยนตามหน้า */}
      <main className="min-h-screen px-5 pb-8 pt-24 lg:ml-70 lg:px-10">
        <Outlet />

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          PSU Dormitory 10-11 Maintenance System
        </footer>
      </main>
    </div>
  );
}

export default StaffLayout;