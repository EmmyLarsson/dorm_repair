function StatusCard({icon,number,label,iconClass,}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-5 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <span className="material-symbols-outlined">
            {icon}
          </span>
        </div>

        <strong className="text-3xl font-extrabold">
          {number}
        </strong>
      </div>

      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}

export default StatusCard;