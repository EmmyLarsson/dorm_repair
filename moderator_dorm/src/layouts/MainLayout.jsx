import { useEffect, useRef, useState } from "react";
import {NavLink, Outlet, useLocation, useNavigate,} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppAPI } from "../utils/appApi";
import { photoFullUrl } from "../utils/photoUtil";
import dormLogo from "../assets/dorm_logo.jpg";

// แต่ละประเภทแจ้งเตือน → modal ที่ต้องเปิดในหน้าจัดการงานซ่อม (ของเดิมที่มีอยู่แล้วทั้งหมด ไม่สร้าง popup ใหม่)
// ตามที่ตกลงกัน: คลิกแจ้งเตือน → พาไปหน้าจัดการงานซ่อม + เปิด modal นั้นพร้อมกันทันที (ไม่ใช่ไปหน้าเปล่าๆ ก่อน)
const NOTIFICATION_TARGETS = {
  new_request: { modal: 'inspect' },
  request_edited: { modal: 'inspect' }, // นักศึกษาแก้ไขคำร้องก่อนอนุมัติ → ดูรายละเอียดฉบับล่าสุดที่หน้าตรวจสอบ
  appeal_filed: { modal: 'manage' },
  accepted: { modal: 'review' },
  declined: { modal: 'review' },
  evaluated: { modal: 'review', tab: 'review' }, // แท็บ "ผลการประเมิน" ของ Review modal
  rush_requested: { modal: 'manage' }, // นักศึกษากดเร่งงาน → เจ้าหน้าที่ต้องจัดการ (เลื่อนนัด/ส่งงาน) ที่หน้าจัดการ
  auto_closed: { modal: 'review' }, // ระบบปิดงานอัตโนมัติ (นักศึกษาไม่ยืนยันภายในกำหนด) → ดูผลที่หน้าตรวจสอบ
  student_cancelled: { modal: 'inspect' }, // นักศึกษายกเลิกคำร้องเอง (ก่อนอนุมัติ) → ดูรายละเอียดคำร้อง
};

async function getNotifications() {
  const response = await AppAPI.get('/notifications?limit=20');
  const json = await response.json();

  if (json.isError) {
    return { notifications: [], unreadCount: 0 };
  }

  return {
    notifications: Array.isArray(json.data?.notifications) ? json.data.notifications : [],
    unreadCount: json.data?.unreadCount ?? 0,
  };
}

// โปรไฟล์ของเจ้าหน้าที่ที่ล็อกอินอยู่ (ชื่อ/ตำแหน่ง/รูป) — ล้มเหลวคืน null เพื่อให้ topbar ใช้ข้อความ
// สำรองแทน ไม่ให้ทั้งหน้าเสียเพราะแค่โหลดชื่อไม่ได้
async function getStaffProfile() {
  try {
    const response = await AppAPI.get('/moderator/me');
    const json = await response.json();
    return json.isError ? null : json.data;
  } catch {
    return null;
  }
}

async function markNotificationRead(notificationId) {
  await AppAPI.post(`/notifications/${notificationId}/read`, {});
}

async function markAllNotificationsRead() {
  await AppAPI.post('/notifications/read-all', {});
}

// "5 นาทีที่แล้ว" ฯลฯ จากวันที่ backend ส่งมา (รูปแบบ "YYYY-MM-DD HH:mm:ss") — คำนวณสดตอนแสดงผลเสมอ
// ไม่เก็บค่าไว้ที่ไหน เพราะต้องขยับตามเวลาจริงทุกครั้งที่ dropdown เปิด
function formatRelativeTime(raw) {
  const [datePart, timePart] = raw.split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss] = (timePart || '00:00:00').split(':').map(Number);
  const then = new Date(y, m - 1, d, hh, mm, ss);
  const diffMinutes = Math.floor((Date.now() - then.getTime()) / 60000);

  if (diffMinutes < 1) return 'เมื่อสักครู่';
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  return then.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

const NOTIFICATION_ICON = {
  new_request: { icon: 'build', bg: 'bg-blue-100', color: 'text-blue-700' },
  request_edited: { icon: 'edit', bg: 'bg-blue-100', color: 'text-blue-700' },
  appeal_filed: { icon: 'gavel', bg: 'bg-orange-100', color: 'text-orange-700' },
  accepted: { icon: 'check_circle', bg: 'bg-green-100', color: 'text-green-700' },
  declined: { icon: 'cancel', bg: 'bg-red-100', color: 'text-red-700' },
  evaluated: { icon: 'star', bg: 'bg-amber-100', color: 'text-amber-700' },
  rush_requested: { icon: 'bolt', bg: 'bg-orange-100', color: 'text-orange-700' },
  auto_closed: { icon: 'schedule', bg: 'bg-green-100', color: 'text-green-700' },
  student_cancelled: { icon: 'undo', bg: 'bg-slate-200', color: 'text-slate-700' },
};

// แจ้งเตือนเร่งงานที่เหตุผลติดธงเร่งด่วน (backend ขึ้นต้นข้อความด้วย [เร่งด่วน]) — เปลี่ยนเป็นไอคอน/สีแดงให้เด่นกว่าปกติ
// เพราะตาราง notification ไม่มีคอลัมน์ธงนี้ (ไม่แก้ schema เพิ่มเพื่อเรื่องนี้)
const URGENT_NOTIFICATION_ICON = { icon: 'emergency', bg: 'bg-red-100', color: 'text-red-700' };

// ไอคอน/สีของแจ้งเตือน 1 รายการ — ใช้ทั้งในรายการกระดิ่งและการ์ดเด้งมุมขวาล่าง ให้หน้าตาตรงกัน
function notificationMeta(item) {
  const isUrgent = item.event_type === 'rush_requested' && item.message?.startsWith('[เร่งด่วน]');

  return (isUrgent ? URGENT_NOTIFICATION_ICON : NOTIFICATION_ICON[item.event_type]) ?? {
    icon: 'notifications',
    bg: 'bg-slate-100',
    color: 'text-slate-600',
  };
}

// การ์ดแจ้งเตือนใหม่มุมขวาล่างค้างอยู่กี่มิลลิวินาทีก่อนหายเอง (หลังจากนั้นดูต่อได้ที่ปุ่มกระดิ่ง)
const NOTIFICATION_TOAST_MS = 6000;

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
    label: "รายงานสรุป",
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
  const location = useLocation();

  // { firstname, lastname, position_name, image_url } ของผู้ล็อกอิน (null = ยังโหลดไม่ได้ ใช้ข้อความสำรอง)
  const [staffProfile, setStaffProfile] = useState(null);
  // รูปโหลดไม่ขึ้น (ไฟล์หาย/path ผิด) → กลับไปใช้ไอคอนคนแทนวงกลมว่าง
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  // การ์ดแจ้งเตือนใหม่มุมขวาล่าง: { item: แจ้งเตือนล่าสุด, extra: จำนวนรายการใหม่อื่นที่มาพร้อมกัน } (null = ไม่แสดง)
  const [toastInfo, setToastInfo] = useState(null);
  // notification_id สูงสุดที่เคยเห็น — รายการที่ id มากกว่านี้คือ "ใหม่" (null = ยังไม่โหลดครั้งแรก)
  const latestSeenIdRef = useRef(null);

  async function refreshNotifications() {
    const { notifications: list, unreadCount: count } = await getNotifications();
    setNotifications(list);
    setUnreadCount(count);

    // เด้งการ์ดเฉพาะรายการที่เพิ่งเข้ามาหลังโหลดหน้าแล้ว (โหลดครั้งแรกแค่จดค่าไว้ ไม่เด้งเรื่องเก่าที่ค้างอยู่) และยังไม่ถูกอ่าน
    // list เรียงใหม่สุดก่อน รายการแรกที่ผ่านเงื่อนไขจึงเป็นรายการล่าสุด
    const newestId = list.reduce((max, n) => Math.max(max, n.notification_id), 0);
    if (latestSeenIdRef.current !== null) {
      const fresh = list.filter((n) => n.notification_id > latestSeenIdRef.current && !n.is_read);
      if (fresh.length > 0) setToastInfo({ item: fresh[0], extra: fresh.length - 1 });
    }
    latestSeenIdRef.current = Math.max(latestSeenIdRef.current ?? 0, newestId);
  }

  // การ์ดมุมขวาล่างหายเองหลัง NOTIFICATION_TOAST_MS (มีรายการใหม่เข้ามาอีกก็เริ่มนับใหม่)
  useEffect(() => {
    if (!toastInfo) return undefined;

    const timerId = window.setTimeout(() => setToastInfo(null), NOTIFICATION_TOAST_MS);
    return () => window.clearTimeout(timerId);
  }, [toastInfo]);

  useEffect(() => {
    refreshNotifications();
    // poll ทุก 10 วิ ตามที่ตกลงกัน (ไม่ใช่ push จริง — ไม่ต้องเพิ่มเทคโนโลยีใหม่ ใช้รูปแบบเดียวกับที่หน้าอื่น
    // ในระบบ poll กันอยู่แล้ว เช่น RepairManagementPage ทุก 5 วิ)
    const intervalId = window.setInterval(refreshNotifications, 10000);
    return () => window.clearInterval(intervalId);
  }, []);

  // โหลดใหม่ทุกครั้งที่เปลี่ยนหน้า เพื่อให้ชื่อ/ตำแหน่ง/รูปอัปเดตหลังเจ้าหน้าที่แก้ข้อมูลตัวเองในหน้าบุคลากร
  // โดยไม่ต้องล็อกอินใหม่ (layout นี้ไม่ถูก mount ซ้ำตอนเปลี่ยนหน้า)
  useEffect(() => {
    let isCancelled = false;

    getStaffProfile().then((profile) => {
      if (isCancelled) return;
      if (profile) setStaffProfile(profile);
      setIsAvatarBroken(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [location.pathname]);

  const staffFullName = staffProfile ? `${staffProfile.firstname} ${staffProfile.lastname}`.trim() : '';

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((list) => list.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  }

  // คลิกแจ้งเตือน 1 รายการ — ทำเครื่องหมายว่าอ่านแล้ว + พาไปหน้าจัดการงานซ่อมพร้อมเปิด modal ที่เกี่ยวข้องทันที
  // (ส่งผ่าน location.state แทนการใช้ query string เพราะเป็นข้อมูลชั่วคราวใช้ครั้งเดียวตอนเปิดหน้า ไม่ต้อง
  // คงอยู่ใน URL ให้กดย้อนกลับ/แชร์ลิงก์แล้วงงว่าทำไม modal เด้งขึ้นมาเอง)
  async function handleNotificationClick(item) {
    setIsNotifOpen(false);

    if (!item.is_read) {
      setNotifications((list) =>
        list.map((n) => (n.notification_id === item.notification_id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      await markNotificationRead(item.notification_id);
    }

    const target = NOTIFICATION_TARGETS[item.event_type];
    if (!target || !item.request_id) return;

    navigate('/moderator/repairs', {
      state: { autoOpen: { modal: target.modal, requestId: item.request_id, tab: target.tab } },
    });
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "ยืนยันการออกจากระบบ?"
    );

    if (!confirmed) {
      return;
    }

    sessionStorage.removeItem("access_token");

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

        <div className="flex items-center gap-3">
          {/* ==================== แจ้งเตือน ==================== */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen((open) => !open)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[22px]">
                notifications
              </span>

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <>
                {/* พื้นหลังโปร่งใสไว้คลิกปิด dropdown เวลาคลิกนอกกรอบ */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotifOpen(false)}
                />

                <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-bold text-slate-800">การแจ้งเตือน</p>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-400">
                        ยังไม่มีการแจ้งเตือน
                      </p>
                    ) : (
                      notifications.map((item) => {
                        const meta = notificationMeta(item);
                        const isUnread = !item.is_read;

                        return (
                          <button
                            key={item.notification_id}
                            type="button"
                            onClick={() => handleNotificationClick(item)}
                            className={[
                              'flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50',
                              isUnread ? 'bg-blue-50/50' : '',
                            ].join(' ')}
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}>
                              <span className="material-symbols-outlined text-[18px]">
                                {meta.icon}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={`text-sm leading-snug ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                {item.message}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {formatRelativeTime(item.created_at)}
                                {item.case_code ? ` · ${item.case_code}` : ''}
                              </p>
                            </div>

                            {isUnread && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ข้อมูลผู้ใช้งาน */}
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-800">
              {staffProfile?.image_url && !isAvatarBroken ? (
                <img
                  src={photoFullUrl(staffProfile.image_url)}
                  alt={staffFullName}
                  onError={() => setIsAvatarBroken(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontVariationSettings:
                      "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
                  }}
                >
                  person
                </span>
              )}
            </div>

            <div className="min-w-0 max-w-[14rem]">
              <p className="truncate text-xs font-bold text-slate-800">
                {staffFullName || 'เจ้าหน้าที่หอพัก'}
              </p>

              {staffProfile?.position_name && (
                <p className="truncate text-[10px] text-slate-500">
                  {staffProfile.position_name}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==================== Sidebar ==================== */}
      <aside className="fixed bottom-0 left-0 top-16 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-sm">
        {/* ชื่อและข้อมูลระบบ */}
        <div className="border-b border-slate-200 px-6 py-7 text-center">
          <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-md">
            <img src={dormLogo} alt="หอพัก 10-11" className="h-full w-full object-cover" />
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

      {/* การ์ดแจ้งเตือนล่าสุดมุมขวาล่าง: โผล่เมื่อมีเรื่องใหม่จาก นศ. แล้วหายเอง กดแล้วเปิดรายการที่ปุ่มกระดิ่ง
          วางสูงกว่า toast สีดำของแต่ละหน้า (bottom-8) เพื่อไม่ซ้อนกัน */}
      <div className="pointer-events-none fixed bottom-24 right-8 z-[210]">
        <AnimatePresence>
          {toastInfo && (
            <motion.button
              key={toastInfo.item.notification_id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              onClick={() => {
                setIsNotifOpen(true);
                setToastInfo(null);
              }}
              className="pointer-events-auto flex w-96 max-w-[calc(100vw-4rem)] items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xl"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notificationMeta(toastInfo.item).bg} ${notificationMeta(toastInfo.item).color}`}>
                <span className="material-symbols-outlined text-[18px]">{notificationMeta(toastInfo.item).icon}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-blue-700">แจ้งเตือนใหม่</p>
                <p className="text-sm font-bold leading-snug text-slate-800">{toastInfo.item.message}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {toastInfo.item.case_code ? `${toastInfo.item.case_code} · ` : ''}
                  {toastInfo.extra > 0 ? `และอีก ${toastInfo.extra} รายการ · กดเพื่อดูที่กระดิ่ง` : 'กดเพื่อดูที่กระดิ่ง'}
                </p>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

