import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatusCard from '../components/StatusCard';
import { AppAPI } from '../utils/appApi';
import { ReportSummaryResponse } from '../models/reportSummaryModel';

const RANGE_OPTIONS = [
  { key: '7', label: '7 วัน' },
  { key: '30', label: '30 วัน' },
  { key: 'all', label: 'ทั้งหมด' },
];

// สีผลสุดท้ายให้สอดคล้องกับป้ายสถานะเดิมใน RepairCard.jsx
const OUTCOME_COLORS = {
  success: '#047857',
  failed: '#ba1a1a',
  cancelled: '#94a3b8',
};

// ชื่อสถานะมาจาก backend (progress_status) ยกเว้น 2 สถานะนี้ที่โชว์ในตารางเคสค้างนาน: สถานะ 3 ในฐานข้อมูลชื่อ
// "เสร็จสิ้น" ซึ่งทำให้ดูเหมือนเคสจบแล้วทั้งที่ยังรอนักศึกษายืนยัน จึงใช้คำที่บอกว่ากำลังรอใคร; สถานะ 7 ใช้คำว่าอุทธรณ์
// ให้ตรงกับคำที่เจ้าหน้าที่ใช้ในหน้าจัดการงานซ่อม
const STATUS_DISPLAY_NAMES = {
  3: 'รอ นศ. ยืนยัน',
  7: 'รอตรวจสอบอุทธรณ์',
};

const APPEAL_SEGMENTS = [
  { key: 'firstAccepted', label: 'ยืนยันครั้งแรก', color: '#047857' },
  { key: 'appealSucceeded', label: 'ยื่นอุทธรณ์แล้วสำเร็จ', color: '#1a40c2' },
  { key: 'appealFailed', label: 'ยื่นอุทธรณ์แล้วไม่สำเร็จ', color: '#ba1a1a' },
];

const APPOINTMENT_LINES = [
  { key: 'repair', label: 'นัดซ่อม', color: '#1a40c2' },
  { key: 'revision', label: 'นัดแก้ไข', color: '#c2410c' },
];

const EQUIPMENT_TYPE_COLORS = {
  ไฟฟ้า: '#b45309',
  ประปา: '#1a40c2',
  เฟอร์นิเจอร์: '#7c3aed',
  ห้อง: '#0f766e',
  อินเทอร์เน็ต: '#be185d',
  อื่นๆ: '#64748b',
};

function formatDayLabel(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${day}/${month}`;
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <h3 className="text-base font-bold">{title}</h3>
      {subtitle && <p className="mt-1 mb-4 text-xs text-slate-500">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}

function EmptyNote() {
  return <p className="py-10 text-center text-sm text-slate-500">ไม่มีข้อมูลที่จะแสดง</p>;
}

function ReportPage() {
  const [rangeKey, setRangeKey] = useState('30');
  const [reloadToken, setReloadToken] = useState(0);
  // เก็บผลพร้อมคีย์ของคำขอ (ช่วงเวลา + รอบโหลดซ้ำ) แล้วคำนวณสถานะ "กำลังโหลด" จากการเทียบคีย์
  // แทนการ setState ใน effect ตรงๆ — ผลของช่วงเดิมที่ค้างอยู่จึงไม่ถูกเอามาแสดงปนกับช่วงใหม่
  const [loaded, setLoaded] = useState(null);
  // กราฟนัดหมายต่อวัน: เลือกดูเส้นเดียวได้ เส้นอื่นจางลง (null = ดูทั้งสองเส้น)
  const [focusLine, setFocusLine] = useState(null);

  const requestKey = `${rangeKey}:${reloadToken}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await AppAPI.get(`/dashboard/summary?range=${rangeKey}`);
        const result = ReportSummaryResponse.fromJson(await response.json());
        if (!cancelled) setLoaded({ key: requestKey, result });
      } catch {
        // เครือข่ายล่ม หรือ server ตอบไม่ใช่ JSON (เช่น token หมดอายุแล้วได้หน้า error) — แสดงข้อความ ไม่ปล่อยให้หน้าค้าง
        if (!cancelled) {
          setLoaded({
            key: requestKey,
            result: new ReportSummaryResponse({ isError: true, data: null, errorMessage: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง' }),
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [rangeKey, requestKey]);

  const isLoading = loaded === null || loaded.key !== requestKey;
  const summary = !isLoading && !loaded.result.isError ? loaded.result.data : null;
  const errorMessage = !isLoading && loaded.result.isError ? loaded.result.errorMessage : '';
  const rangeOption = RANGE_OPTIONS.find((option) => option.key === rangeKey);

  const closedTotal = summary ? summary.getClosedAppealTotal() : 0;
  const appealCount = summary ? summary.appeal.appealSucceeded + summary.appeal.appealFailed : 0;
  const firstRate = closedTotal === 0 ? 0 : Math.round((summary.appeal.firstAccepted / closedTotal) * 100);
  const appealRate = closedTotal === 0 ? 0 : 100 - firstRate;

  const busiestDay = summary
    ? summary.daily.reduce(
        (best, item) => (item.repair + item.revision > best.repair + best.revision ? item : best),
        summary.daily[0],
      )
    : null;

  const dailyChartData = summary
    ? summary.daily.map((item) => ({ ...item, label: formatDayLabel(item.date) }))
    : [];
  const slotChartData = summary
    ? summary.slots.map((slot) => ({ ...slot, name: summary.getSlotLabel(slot.key) }))
    : [];
  const outcomeSlices = summary ? summary.getOutcomeSlices() : [];

  return (
    <div className="space-y-9">
      {/* หัวหน้า + ตัวเลือกช่วงเวลา + ปุ่มพิมพ์ */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Report Summary
          </p>
          <h2 className="text-2xl font-extrabold">รายงานสรุป</h2>
          <p className="mt-1 text-sm text-slate-500">
            ช่วงข้อมูล: {rangeKey === 'all' ? 'ทั้งหมดตั้งแต่เริ่มใช้ระบบ' : `${rangeOption.label}ล่าสุด`}
          </p>
        </div>

        <div className="print:hidden flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-full bg-slate-100 p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRangeKey(option.key)}
                className={`rounded-full px-5 py-2 text-sm font-bold ${
                  rangeKey === option.key
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'text-slate-500 hover:bg-black/5'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading && (
        <ChartCard title="กำลังโหลดรายงาน…">
          <p className="py-10 text-center text-sm text-slate-500">กรุณารอสักครู่</p>
        </ChartCard>
      )}

      {errorMessage && (
        <ChartCard title="โหลดรายงานไม่สำเร็จ">
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="print:hidden rounded-full bg-blue-700 px-6 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              ลองใหม่
            </button>
          </div>
        </ChartCard>
      )}

      {summary && (
        <>
          {/* การ์ดตัวเลข */}
          {/* ตัดการ์ด "7 วัน/เดือนนี้/ทั้งหมด" ออก เพราะซ้ำกับตัวเลือกช่วงเวลาด้านบน ใช้การ์ด "ช่วงที่เลือก" แทน */}
          <section className="grid gap-5 md:grid-cols-3 xl:grid-cols-5">
            <StatusCard icon="today" number={summary.cards.reportedToday} label="แจ้งซ่อมวันนี้" iconClass="bg-yellow-100 text-yellow-800" />
            <StatusCard icon="date_range" number={summary.cards.reportedInRange} label={`แจ้งซ่อมใน${rangeKey === 'all' ? 'ช่วงทั้งหมด' : rangeOption.label}`} iconClass="bg-blue-100 text-blue-800" />
            <StatusCard
              icon="star"
              number={summary.cards.avgRating === null ? '-' : `${summary.cards.avgRating} / 5`}
              label={summary.cards.ratingCount > 0 ? `คะแนนประเมินเฉลี่ย (${summary.cards.ratingCount} รายการ)` : 'คะแนนประเมินเฉลี่ย'}
              iconClass="bg-amber-100 text-amber-800"
            />
            <StatusCard icon="timer" number={summary.cards.avgRepairDays === null ? '-' : `${summary.cards.avgRepairDays} วัน`} label="เวลาเฉลี่ยซ่อมเสร็จ" iconClass="bg-emerald-100 text-emerald-800" />
            <StatusCard icon="fact_check" number={summary.cards.avgApproveHours === null ? '-' : `${summary.cards.avgApproveHours} ชม.`} label="เวลาเฉลี่ยจากแจ้งถึงอนุมัติ" iconClass="bg-slate-200 text-slate-700" />
          </section>

          {summary.isEmpty() ? (
            <ChartCard title="ภาพรวมงานซ่อม">
              <EmptyNote />
            </ChartCard>
          ) : (
            <>
              {/* แถว 1: Donut + แท่งประเภทงาน */}
              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard
                  title="ผลงานซ่อมที่จบแล้ว"
                  subtitle="นับเฉพาะเคสที่ได้ผลสุดท้ายแล้ว (สำเร็จ ไม่สำเร็จ และยกเลิก)"
                >
                  {summary.outcomes.closedTotal === 0 ? (
                    <EmptyNote />
                  ) : (
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="relative h-52 w-52 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={outcomeSlices.filter((slice) => slice.total > 0)}
                              dataKey="total"
                              nameKey="label"
                              innerRadius={62}
                              outerRadius={96}
                              paddingAngle={2}
                            >
                              {outcomeSlices
                                .filter((slice) => slice.total > 0)
                                .map((slice) => (
                                  <Cell key={slice.key} fill={OUTCOME_COLORS[slice.key]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [`${value} เคส`, name]} />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-3xl font-extrabold">{summary.outcomes.closedTotal}</div>
                          <div className="text-xs text-slate-500">เคสที่จบแล้ว</div>
                        </div>
                      </div>

                      <div className="flex min-w-56 flex-1 flex-col gap-3">
                        {outcomeSlices.map((slice) => (
                          <div key={slice.key}>
                            <div className="flex items-center justify-between gap-2 text-sm font-bold">
                              <span className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: OUTCOME_COLORS[slice.key] }} />
                                {slice.label}
                              </span>
                              <span>{slice.total} · {summary.getPercent(slice.total)}%</span>
                            </div>
                            {slice.items.length > 0 && (
                              <ul className="mt-1 ml-5 flex flex-col gap-0.5 text-xs text-slate-500">
                                {slice.items.map((item) => (
                                  <li key={item.key} className="flex justify-between gap-2">
                                    <span>{item.name}</span>
                                    <span>{item.total}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.outcomes.inProgressTotal > 0 && (
                    <p className="mt-4 text-xs text-slate-500">
                      ขณะนี้ยังดำเนินการอยู่ {summary.outcomes.inProgressTotal} เคส (ไม่นับในกราฟนี้)
                    </p>
                  )}
                </ChartCard>

                <ChartCard
                  title="ประเภทงานที่แจ้งมากที่สุด"
                  subtitle="นับตามรายการงานซ่อม เคสที่แจ้งหลายประเภทจะนับซ้ำทุกประเภท"
                >
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.repairTypes} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => [`${value} รายการ`, 'จำนวน']} />
                        <Bar dataKey="total" fill="#1a40c2" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 12 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              {/* แถว 2: ยืนยันครั้งแรก vs อุทธรณ์ */}
              <ChartCard
                title="การยืนยันครั้งแรก เทียบกับการยื่นอุทธรณ์"
                subtitle={`นับจากผลสุดท้ายของเคสที่จบแล้ว (สำเร็จและไม่สำเร็จรวม ${closedTotal} เคส)`}
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-wrap gap-10">
                    <div>
                      <div className="text-5xl font-extrabold text-emerald-700">{firstRate}%</div>
                      <div className="mt-1 text-sm font-semibold text-slate-600">ยืนยันผลซ่อมครั้งแรก</div>
                      <div className="text-xs text-slate-500">
                        {summary.appeal.firstAccepted} จาก {closedTotal} เคสที่จบแล้ว
                      </div>
                    </div>

                    <div>
                      <div className="text-5xl font-extrabold text-orange-700">{appealRate}%</div>
                      <div className="mt-1 text-sm font-semibold text-slate-600">ไม่พอใจผลซ่อม (ยื่นอุทธรณ์)</div>
                      <div className="text-xs text-slate-500">
                        {appealCount} จาก {closedTotal} เคสที่จบแล้ว
                      </div>
                    </div>
                  </div>

                  {closedTotal > 0 && closedTotal < 10 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      ข้อมูลยังน้อย ยังสรุปผลไม่ได้
                    </span>
                  )}
                </div>

                {closedTotal === 0 ? (
                  <EmptyNote />
                ) : (
                  <>
                    {/* แท่ง 100% แท่งเดียว แบ่ง 3 ช่วง ใส่จำนวนกำกับในแต่ละช่วง */}
                    <div className="mt-5 flex h-14 w-full overflow-hidden rounded-2xl bg-slate-100">
                      {APPEAL_SEGMENTS.map((segment) => {
                        const count = summary.appeal[segment.key];
                        if (count === 0) return null;

                        return (
                          <div
                            key={segment.key}
                            title={`${segment.label}: ${count} เคส`}
                            className="flex items-center justify-center text-sm font-bold text-white"
                            style={{ width: `${(count / closedTotal) * 100}%`, background: segment.color }}
                          >
                            {count}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      {APPEAL_SEGMENTS.map((segment) => (
                        <div key={segment.key} className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ background: segment.color }} />
                          <span className="text-slate-600">{segment.label}</span>
                          <strong className="ml-auto">{summary.appeal[segment.key]}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {summary.appeal.appealPending > 0 && (
                  <p className="mt-4 text-xs text-slate-500">
                    ยังอยู่ระหว่างอุทธรณ์/แก้ไขอีก {summary.appeal.appealPending} เคส (ไม่นับในแท่งนี้)
                  </p>
                )}
              </ChartCard>

              {/* เหตุผลที่ไม่พอใจ — ทำให้รู้ว่าทีมงานพลาดตรงไหน */}
              <ChartCard
                title="เหตุผลที่นักศึกษาไม่พอใจ"
                subtitle="นับจากเหตุผลที่นักศึกษาเลือกตอนยื่นอุทธรณ์ ใช้ดูว่าควรปรับปรุงตรงไหน"
              >
                {summary.appealReasons.length === 0 ? (
                  <EmptyNote />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.appealReasons} layout="vertical" margin={{ top: 0, right: 32, left: 24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => [`${value} คำร้อง`, 'จำนวน']} />
                        <Bar dataKey="total" fill="#c2410c" radius={[0, 8, 8, 0]} label={{ position: 'right', fontSize: 12 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              {/* แถว 3: ครุภัณฑ์ + ช่วงเวลานัดหมาย */}
              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard
                  title="ครุภัณฑ์ที่ใช้มากที่สุด 5 อันดับ"
                  subtitle="รวมจำนวนที่เบิกใช้ สีแยกตามประเภทครุภัณฑ์ (หน่วยนับของแต่ละรายการต่างกัน ดูหน่วยที่ Tooltip)"
                >
                  {summary.equipment.length === 0 ? (
                    <EmptyNote />
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        {Object.entries(EQUIPMENT_TYPE_COLORS).map(([type, color]) => (
                          <span key={type} className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                            {type}
                          </span>
                        ))}
                      </div>

                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={summary.equipment} layout="vertical" margin={{ top: 0, right: 32, left: 16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 12 }} />
                            <Tooltip
                              formatter={(value, _name, item) => [`${value} ${item.payload.unit}`, item.payload.type]}
                            />
                            <Bar dataKey="total" radius={[0, 8, 8, 0]} label={{ position: 'right', fontSize: 12 }}>
                              {summary.equipment.map((item) => (
                                <Cell key={item.id} fill={EQUIPMENT_TYPE_COLORS[item.type] ?? '#64748b'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </ChartCard>

                <ChartCard
                  title="ช่วงเวลานัดหมายที่มากที่สุด"
                  subtitle="รวมนัดซ่อมและนัดแก้ไข นับตามวันนัดหมายในช่วงที่เลือก"
                >
                  {slotChartData.every((slot) => slot.total === 0) ? (
                    <EmptyNote />
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={slotChartData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value} นัด`, 'จำนวน']} />
                          <Bar dataKey="total" fill="#0f766e" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 12 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* แถว 4: กราฟเส้นนัดหมายรายวัน (นัดซ่อม vs นัดแก้ไข) */}
              <ChartCard
                title="จำนวนนัดหมายต่อวัน"
                subtitle={
                  busiestDay.repair + busiestDay.revision === 0
                    ? 'นับตามวันนัดของแต่ละรอบ'
                    : `วันที่มีนัดหมายมากที่สุดในช่วงนี้: ${formatDayLabel(busiestDay.date)} (${busiestDay.repair + busiestDay.revision} นัด) · ${rangeKey === 'all' ? 'แสดง 30 วันล่าสุด' : 'นับตามวันนัดของแต่ละรอบ'}`
                }
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="print:hidden flex gap-1 rounded-full bg-slate-100 p-1" role="group" aria-label="เลือกเส้นที่ต้องการดู">
                    {APPOINTMENT_LINES.map((line) => (
                      <button
                        key={line.key}
                        type="button"
                        aria-pressed={focusLine === line.key}
                        onClick={() => setFocusLine((current) => (current === line.key ? null : line.key))}
                        className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${
                          focusLine === line.key ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:bg-black/5'
                        }`}
                      >
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: line.color }} />
                        {line.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-slate-500">นัดซ่อมวันนี้ </span>
                      <strong className="text-lg" style={{ color: APPOINTMENT_LINES[0].color }}>{summary.todayAppointments.repair}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">นัดแก้ไขวันนี้ </span>
                      <strong className="text-lg" style={{ color: APPOINTMENT_LINES[1].color }}>{summary.todayAppointments.revision}</strong>
                    </div>
                  </div>
                </div>

                {busiestDay.repair + busiestDay.revision === 0 ? (
                  <EmptyNote />
                ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={dailyChartData.length > 7 ? 2 : 0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      {APPOINTMENT_LINES.map((line) => {
                        const isFaded = focusLine !== null && focusLine !== line.key;

                        return (
                          <Line
                            key={line.key}
                            type="monotone"
                            dataKey={line.key}
                            name={line.label}
                            stroke={line.color}
                            strokeWidth={isFaded ? 2 : 3}
                            strokeOpacity={isFaded ? 0.18 : 1}
                            dot={isFaded ? false : { r: 3 }}
                            activeDot={isFaded ? false : { r: 5 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                )}
              </ChartCard>
            </>
          )}

          {/* ตารางเคสค้างนาน — เป็นสถานะปัจจุบัน ไม่ขึ้นกับช่วงเวลาที่เลือก */}
          <ChartCard title="เคสค้างนาน" subtitle="เคสที่ยังไม่ปิด เรียงตามวันที่แจ้งเก่าสุด 5 อันดับ (ไม่ขึ้นกับช่วงเวลาที่เลือก)">
            {summary.overdue.length === 0 ? (
              <EmptyNote />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 border-collapse text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Case</th>
                      <th className="px-4 py-3">ห้อง</th>
                      <th className="px-4 py-3">ประเภท</th>
                      <th className="px-4 py-3">ค้างมาแล้ว</th>
                      <th className="px-4 py-3">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.overdue.map((item) => (
                      <tr key={item.requestId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-bold text-blue-800">{item.caseCode}</td>
                        <td className="px-4 py-3">{item.roomNumber}</td>
                        <td className="px-4 py-3">{item.typeNames}</td>
                        <td className="px-4 py-3 font-bold text-red-700">{item.daysOpen} วัน</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            {STATUS_DISPLAY_NAMES[item.statusId] ?? item.statusName}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}

export default ReportPage;
