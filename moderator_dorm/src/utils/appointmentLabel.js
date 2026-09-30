// ข้อความวัน+ช่วงเวลาสำหรับ toast ตอนระบบจัดนัดให้เอง — ใช้ร่วมกันทั้งหน้าแรกและหน้าจัดการงานซ่อม
// หาช่วงจากชั่วโมงเริ่มด้วยกติกาเดียวกับ backend (<13 = 09-11, 13-14 = 13-15, ตั้งแต่ 15 = 15-17)
export function appointmentToastLabel(appointmentDate) {
  const [datePart, timePart] = appointmentDate.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const hour = Number(timePart.split(':')[0]);
  const slot = hour < 13 ? '09:00-11:00' : hour < 15 ? '13:00-15:00' : '15:00-17:00';
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${dateLabel} ช่วง ${slot} น.`;
}
