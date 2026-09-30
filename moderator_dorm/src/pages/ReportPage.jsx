import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

// TODO: 🔌 หน้านี้เป็น Mockup — ข้อมูลทั้งหมดด้านล่างเป็นข้อมูลตัวอย่าง ยังไม่ได้ต่อ API
// (แผน: GET /api/dashboard/summary?range=7|30|all) ไว้ดูหน้าตา/UX ก่อนลงมือทำจริง

const RANGE_OPTIONS = [
  { key: '7', label: '7 วัน', factor: 0.25, days: 7 },
  { key: '30', label: '30 วัน', factor: 1, days: 30 },
  { key: 'all', label: 'ทั้งหมด', factor: 2.4, days: 30 },
];

// สีสถานะให้สอดคล้องกับป้ายสถานะเดิมใน RepairCard.jsx
const STATUS_COLORS = {
  done: '#047857',
  doing: '#1a40c2',
  rejected: '#ba1a1a',
};

const ACCEPT_COLORS = {
  first: '#047857',
  appealApproved: '#c2410c',
  appealRejected: '#ba1a1a',
  waiting: '#94a3b8',
};

const ACCEPT_SEGMENTS = [
  { key: 'first', label: 'ยอมรับครั้งแรก' },
  { key: 'appealApproved', label: 'อุทธรณ์ แล้วอนุมัติ' },
  { key: 'appealRejected', label: 'อุทธรณ์ แล้วปฏิเสธ' },
  { key: 'waiting', label: 'รอผล' },
];

const EQUIPMENT_TYPE_COLORS = {
  ไฟฟ้า: '#b45309',
  ประปา: '#1a40c2',
  เฟอร์นิเจอร์: '#7c3aed',
  ห้อง: '#0f766e',
  อินเทอร์เน็ต: '#be185d',
  อื่นๆ: '#64748b',
};

const BASE_STATUS = [
  { key: 'done', name: 'เสร็จสิ้น', value: 18 },
  { key: 'doing', name: 'กำลังดำเนินการ', value: 9 },
  { key: 'rejected', name: 'ถูกปฏิเสธ/ยกเลิก', value: 3 },
];

const BASE_TYPES = [
  { name: 'ไฟฟ้า', count: 14 },
  { name: 'ประปา', count: 9 },
  { name: 'เฟอร์นิเจอร์', count: 6 },
  { name: 'ห้อง', count: 4 },
  { name: 'อินเทอร์เน็ต', count: 3 },
  { name: 'อื่นๆ', count: 2 },
];

// [ยอมรับครั้งแรก, อุทธรณ์แล้วอนุมัติ, อุทธรณ์แล้วปฏิเสธ, รอผล]
const BASE_ACCEPT_BY_TYPE = [
  { name: 'ไฟฟ้า', values: [9, 2, 1, 2] },
  { name: 'ประปา', values: [5, 2, 0, 2] },
  { name: 'เฟอร์นิเจอร์', values: [4, 1, 0, 1] },
  { name: 'ห้อง', values: [2, 1, 0, 1] },
  { name: 'อินเทอร์เน็ต', values: [2, 0, 0, 1] },
  { name: 'อื่นๆ', values: [1, 0, 0, 1] },
];

const BASE_EQUIPMENT = [
  { name: 'หลอดไฟ LED', type: 'ไฟฟ้า', qty: 12, unit: 'หลอด' },
  { name: 'ก๊อกน้ำ', type: 'ประปา', qty: 6, unit: 'ชิ้น' },
  { name: 'สายไฟ', type: 'ไฟฟ้า', qty: 5, unit: 'เมตร' },
  { name: 'ท่อ PVC', type: 'ประปา', qty: 4, unit: 'เส้น' },
  { name: 'บานพับ', type: 'เฟอร์นิเจอร์', qty: 4, unit: 'ชิ้น' },
  { name: 'สวิตช์ไฟ', type: 'ไฟฟ้า', qty: 3, unit: 'ชิ้น' },
  { name: 'ปลั๊กพ่วง', type: 'ไฟฟ้า', qty: 3, unit: 'ชิ้น' },
  { name: 'สายแลน', type: 'อินเทอร์เน็ต', qty: 2, unit: 'เมตร' },
  { name: 'กุญแจ', type: 'ห้อง', qty: 2, unit: 'ชุด' },
  { name: 'ซีลยางก๊อก', type: 'ประปา', qty: 1, unit: 'ชิ้น' },
];

// TODO: 🔌 ระบบยังไม่มีข้อมูลนี้ — ต้องเพิ่มตัวเลือก "เหตุผลที่ไม่พอใจ" ตอนนักศึกษายื่นคำร้อง (ต้องเพิ่มคอลัมน์ใน repair_complaint)
const BASE_REASONS = [
  { name: 'ซ่อมไม่เรียบร้อย', count: 4 },
  { name: 'แก้ปัญหาไม่ตรงจุด', count: 3 },
  { name: 'ปัญหากลับมาเป็นซ้ำ', count: 2 },
  { name: 'ช่างมาช้า/ไม่มาตามนัด', count: 1 },
  { name: 'อื่นๆ', count: 1 },
];

const BASE_SLOTS = [
  { name: '09:00-11:00', count: 11 },
  { name: '13:00-15:00', count: 8 },
  { name: '15:00-17:00', count: 5 },
];

const OVERDUE_CASES = [
  { code: '1100009', room: '110912', type: 'ไฟฟ้า', days: 12, status: 'อยู่ระหว่างซ่อม' },
  { code: '1100011', room: '110912', type: 'ไฟฟ้า', days: 9, status: 'อยู่ระหว่างซ่อม' },
  { code: '1100016', room: '111105', type: 'ประปา', days: 6, status: 'รอตรวจสอบคำร้อง' },
];

function scale(value, factor) {
  return Math.max(0, Math.round(value * factor));
}

function buildDailySeries(days) {
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const offset = days - 1 - index;
    const date = new Date(today);
    date.setDate(today.getDate() - offset);

    return {
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      report: Math.max(0, Math.round(2 + 2 * Math.sin(index * 0.9))),
      appointment: Math.max(0, Math.round(1.5 + 2 * Math.cos(index * 0.7 + 1))),
    };
  });
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

function ReportPage() {
  const [rangeKey, setRangeKey] = useState('30');
  const range = RANGE_OPTIONS.find((option) => option.key === rangeKey);

  const data = useMemo(() => {
    const { factor, days } = range;

    const status = BASE_STATUS.map((item) => ({ ...item, value: scale(item.value, factor) }));
    const statusTotal = status.reduce((sum, item) => sum + item.value, 0);

    const types = BASE_TYPES
      .map((item) => ({ ...item, count: scale(item.count, factor) }))
      .sort((a, b) => b.count - a.count);

    const acceptRows = BASE_ACCEPT_BY_TYPE.map((row) => ({
      name: row.name,
      first: scale(row.values[0], factor),
      appealApproved: scale(row.values[1], factor),
      appealRejected: scale(row.values[2], factor),
      waiting: scale(row.values[3], factor),
    }));
    const acceptTotal = acceptRows.reduce(
      (sum, row) => ({
        name: 'รวมทั้งหมด',
        first: sum.first + row.first,
        appealApproved: sum.appealApproved + row.appealApproved,
        appealRejected: sum.appealRejected + row.appealRejected,
        waiting: sum.waiting + row.waiting,
      }),
      { name: 'รวมทั้งหมด', first: 0, appealApproved: 0, appealRejected: 0, waiting: 0 },
    );
    const decided = acceptTotal.first + acceptTotal.appealApproved + acceptTotal.appealRejected;
    const appealRate = decided === 0
      ? 0
      : Math.round(((acceptTotal.appealApproved + acceptTotal.appealRejected) / decided) * 100);

    const acceptRate = decided === 0 ? 0 : 100 - appealRate;

    const reasons = BASE_REASONS
      .map((item) => ({ ...item, count: scale(item.count, factor) }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const equipment = BASE_EQUIPMENT
      .map((item) => ({ ...item, qty: scale(item.qty, factor) }))
      .filter((item) => item.qty > 0)
      .sort((a, b) => b.qty - a.qty);

    const slots = BASE_SLOTS.map((item) => ({ ...item, count: scale(item.count, factor) }));
    const daily = buildDailySeries(days);
    const busiestDay = daily.reduce((best, item) => (item.appointment > best.appointment ? item : best), daily[0]);

    return {
      status,
      statusTotal,
      types,
      acceptTotal,
      decided,
      appealRate,
      acceptRate,
      reasons,
      equipment,
      slots,
      daily,
      busiestDay,
    };
  }, [range]);

  return (
    <div className="space-y-9">
      {/* แถบแจ้งว่าเป็น Mockup — ซ่อนตอนพิมพ์ */}
      <div className="print:hidden rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900">
        <strong>แบบจำลอง (Mockup)</strong> — ข้อมูลในหน้านี้เป็นข้อมูลตัวอย่างสำหรับดูหน้าตา ยังไม่ได้เชื่อมต่อฐานข้อมูลจริง
      </div>

      {/* หัวหน้า + ตัวเลือกช่วงเวลา + ปุ่มพิมพ์ */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Report Summary
          </p>
          <h2 className="text-2xl font-extrabold">รายงานสรุป</h2>
          <p className="mt-1 text-sm text-slate-500">
            ช่วงข้อมูล: {range.key === 'all' ? 'ทั้งหมดตั้งแต่เริ่มใช้ระบบ' : `${range.label}ล่าสุด`}
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

      {/* การ์ดตัวเลข */}
      {/* ตัดการ์ด "7 วัน/เดือนนี้/ทั้งหมด" ออก เพราะซ้ำกับตัวเลือกช่วงเวลาด้านบน ใช้การ์ด "ช่วงที่เลือก" แทน */}
      <section className="grid gap-5 md:grid-cols-3 xl:grid-cols-6">
        <StatusCard icon="today" number="3" label="แจ้งซ่อมวันนี้" iconClass="bg-yellow-100 text-yellow-800" />
        <StatusCard icon="date_range" number={data.statusTotal} label={`แจ้งซ่อมใน${range.key === 'all' ? 'ช่วงทั้งหมด' : range.label}`} iconClass="bg-blue-100 text-blue-800" />
        <StatusCard icon="star" number="4.3 / 5" label="คะแนนประเมินเฉลี่ย" iconClass="bg-amber-100 text-amber-800" />
        <StatusCard icon="timer" number="2.4 วัน" label="เวลาเฉลี่ยซ่อมเสร็จ" iconClass="bg-emerald-100 text-emerald-800" />
        <StatusCard icon="fact_check" number="5 ชม." label="เวลาเฉลี่ยจากแจ้งถึงอนุมัติ" iconClass="bg-slate-200 text-slate-700" />
        <StatusCard icon="replay" number="8%" label="ซ่อมซ้ำ (ห้อง+ประเภทเดิมใน 30 วัน)" iconClass="bg-orange-100 text-orange-800" />
      </section>

      {/* แถว 1: Donut + แท่งประเภทงาน */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="สัดส่วนงานซ่อมตามสถานะ"
          subtitle="กำลังดำเนินการ รวมสถานะรอตรวจสอบ, อยู่ระหว่างซ่อม, รอยืนยัน, รอแก้ไข และรอตรวจสอบคำร้อง"
        >
          <div className="relative h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.status}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={2}
                >
                  {data.status.map((item) => (
                    <Cell key={item.key} fill={STATUS_COLORS[item.key]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} เคส`, name]} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
              <div className="text-3xl font-extrabold">{data.statusTotal}</div>
              <div className="text-xs text-slate-500">เคสทั้งหมด</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="ประเภทงานที่แจ้งมากที่สุด"
          subtitle="นับตามรายการงานซ่อม เคสที่แจ้งหลายประเภทจะนับซ้ำทุกประเภท"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.types} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} รายการ`, 'จำนวน']} />
                <Bar dataKey="count" fill="#1a40c2" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* แถว 2: ยอมรับครั้งแรก vs อุทธรณ์ */}
      <ChartCard
        title="การยอมรับครั้งแรก เทียบกับการยื่นอุทธรณ์"
        subtitle="วัดคุณภาพงานซ่อมโดยรวม นับเฉพาะเคสที่เจ้าหน้าที่ส่งงานให้นักศึกษาตรวจแล้ว (ยังไม่แยกตามประเภทงาน จนกว่าจะมีข้อมูลสะสมพอ)"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-10">
            <div>
              <div className="text-5xl font-extrabold text-emerald-700">{data.acceptRate}%</div>
              <div className="mt-1 text-sm font-semibold text-slate-600">ยอมรับผลซ่อมครั้งแรก</div>
              <div className="text-xs text-slate-500">
                {data.acceptTotal.first} จาก {data.decided} เคสที่ตัดสินแล้ว
              </div>
            </div>

            <div>
              <div className="text-5xl font-extrabold text-orange-700">{data.appealRate}%</div>
              <div className="mt-1 text-sm font-semibold text-slate-600">ไม่พอใจผลซ่อม (ยื่นอุทธรณ์)</div>
              <div className="text-xs text-slate-500">
                {data.acceptTotal.appealApproved + data.acceptTotal.appealRejected} จาก {data.decided} เคสที่ตัดสินแล้ว
              </div>
            </div>
          </div>

          {data.decided < 10 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              ข้อมูลยังน้อย ยังสรุปผลไม่ได้
            </span>
          )}
        </div>

        {/* แท่ง 100% แท่งเดียว แบ่ง 4 ช่วง ใส่จำนวนกำกับในแต่ละช่วง */}
        <div className="mt-5 flex h-14 w-full overflow-hidden rounded-2xl bg-slate-100">
          {ACCEPT_SEGMENTS.map((segment) => {
            const count = data.acceptTotal[segment.key];
            const total = ACCEPT_SEGMENTS.reduce((sum, item) => sum + data.acceptTotal[item.key], 0);
            if (count === 0 || total === 0) return null;

            return (
              <div
                key={segment.key}
                title={`${segment.label}: ${count} เคส`}
                className="flex items-center justify-center text-sm font-bold text-white"
                style={{ width: `${(count / total) * 100}%`, background: ACCEPT_COLORS[segment.key] }}
              >
                {count}
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          {ACCEPT_SEGMENTS.map((segment) => (
            <div key={segment.key} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: ACCEPT_COLORS[segment.key] }} />
              <span className="text-slate-600">{segment.label}</span>
              <strong className="ml-auto">{data.acceptTotal[segment.key]}</strong>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* เหตุผลที่ไม่พอใจ — ทำให้รู้ว่าทีมงานพลาดตรงไหน (ต้องเพิ่มข้อมูลตอนยื่นคำร้อง) */}
      <ChartCard
        title="เหตุผลที่นักศึกษาไม่พอใจ"
        subtitle="นับจากเหตุผลที่นักศึกษาเลือกตอนยื่นอุทธรณ์ ใช้ดูว่าควรปรับปรุงตรงไหน (ตัวอย่างข้อมูล ระบบยังไม่มีการเก็บเหตุผลนี้)"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.reasons} layout="vertical" margin={{ top: 0, right: 32, left: 24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value} คำร้อง`, 'จำนวน']} />
              <Bar dataKey="count" fill="#c2410c" radius={[0, 8, 8, 0]} label={{ position: 'right', fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* แถว 3: ครุภัณฑ์ + ช่วงเวลานัดหมาย */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="ครุภัณฑ์ที่ใช้มากที่สุด 10 อันดับ"
          subtitle="สีแยกตามประเภทครุภัณฑ์ (หน่วยนับของแต่ละรายการต่างกัน ดูหน่วยที่ Tooltip)"
        >
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {Object.entries(EQUIPMENT_TYPE_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                {type}
              </span>
            ))}
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.equipment} layout="vertical" margin={{ top: 0, right: 32, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, _name, item) => [`${value} ${item.payload.unit}`, item.payload.type]}
                />
                <Bar dataKey="qty" radius={[0, 8, 8, 0]} label={{ position: 'right', fontSize: 12 }}>
                  {data.equipment.map((item) => (
                    <Cell key={item.name} fill={EQUIPMENT_TYPE_COLORS[item.type]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="ช่วงเวลานัดหมายที่มากที่สุด"
          subtitle="นับตามนัดล่าสุดของแต่ละเคส (เลื่อนนัดแล้วจะนับเฉพาะนัดใหม่)"
        >
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slots} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} นัด`, 'จำนวน']} />
                <Bar dataKey="count" fill="#0f766e" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* แถว 4: กราฟเส้นรายวัน */}
      <ChartCard
        title="จำนวนงานต่อวัน"
        subtitle={`วันที่มีนัดหมายมากที่สุดในช่วงนี้: ${data.busiestDay.label} (${data.busiestDay.appointment} นัด)`}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.daily} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={range.days > 7 ? 2 : 0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend verticalAlign="top" />
              <Line type="monotone" dataKey="report" name="แจ้งซ่อม" stroke="#1a40c2" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="appointment" name="นัดหมาย" stroke="#c2410c" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ตารางเคสค้างนาน */}
      <ChartCard title="เคสค้างนาน" subtitle="เคสที่ยังไม่เสร็จและผ่านไปเกินกำหนด (ตัวอย่าง: เกิน 5 วัน)">
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
              {OVERDUE_CASES.map((item) => (
                <tr key={item.code} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-bold text-blue-800">{item.code}</td>
                  <td className="px-4 py-3">{item.room}</td>
                  <td className="px-4 py-3">{item.type}</td>
                  <td className="px-4 py-3 font-bold text-red-700">{item.days} วัน</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

export default ReportPage;
