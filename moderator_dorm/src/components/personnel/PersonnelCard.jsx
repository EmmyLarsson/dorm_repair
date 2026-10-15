import { photoFullUrl } from '../../utils/photoUtil';
import { formatPhoneForDisplay } from '../../utils/phoneUtil';

const ROLE_BADGE_CLASS = {
  1: 'bg-indigo-100 text-indigo-800',
  2: 'bg-amber-100 text-amber-800',
  3: 'bg-blue-100 text-blue-800',
};

const ROLE_ICON = {
  1: 'school',
  2: 'badge',
  3: 'engineering',
};

/**
 * PersonnelCard - การ์ดแสดงข้อมูลบุคลากร (นักศึกษา/เจ้าหน้าที่/ช่าง)
 * โครงสไตล์เดียวกับ RepairCard.jsx เนื้อหาแสดงตาม role
 */
function PersonnelCard({
  person,
  onEdit,
  selectable = false,
  isSelected = false,
  isSelf = false,
  onToggleSelect,
}) {
  const metaLines = [];

  if (person.roleId === 1) {
    metaLines.push({ icon: 'meeting_room', label: 'ห้อง', value: person.roomNumber || '-' });
  } else if (person.roleId === 2) {
    metaLines.push({ icon: 'work', label: 'ตำแหน่ง', value: person.positionName || '-' });
  } else if (person.roleId === 3) {
    metaLines.push({ icon: 'construction', label: 'ความเชี่ยวชาญ', value: person.specialtyName || '-' });
  }
  metaLines.push({ icon: 'call', label: 'เบอร์โทร', value: formatPhoneForDisplay(person.phone) || '-' });

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg flex flex-col">
      {selectable && (
        isSelf ? (
          // บัญชีของผู้ที่ล็อกอินอยู่ลบไม่ได้ (backend ปฏิเสธด้วย) — แสดงป้ายแทนช่องติ๊กให้เห็นเหตุผล
          <span className="absolute right-3 top-3 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            บัญชีของคุณ
          </span>
        ) : (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(person)}
            className="absolute right-3 top-3 h-4.5 w-4.5 rounded border-slate-300 accent-blue-700"
          />
        )
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100">
          {person.profileImage ? (
            <img src={photoFullUrl(person.profileImage)} alt={person.fullName} className="h-full w-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-xl text-blue-800">
              {ROLE_ICON[person.roleId] ?? 'person'}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">
            รหัส:{' '}
            <strong className="text-slate-900">{person.personNo}</strong>
          </p>

          <h4 className="truncate text-base font-extrabold text-blue-800">
            {person.fullName}
          </h4>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${ROLE_BADGE_CLASS[person.roleId] ?? 'bg-slate-100 text-slate-700'}`}
          >
            {person.roleName}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 text-xs">
        {metaLines.map((line) => (
          <p key={line.icon} className="flex items-center gap-1.5 text-slate-500">
            <span className="material-symbols-outlined text-sm">{line.icon}</span>
            {line.label}:{' '}
            <strong className="text-slate-900">{line.value}</strong>
          </p>
        ))}
      </div>

      <div className="mt-auto">
        <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => onEdit(person)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-200"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            แก้ไข
          </button>
        </div>
      </div>
    </article>
  );
}

export default PersonnelCard;
