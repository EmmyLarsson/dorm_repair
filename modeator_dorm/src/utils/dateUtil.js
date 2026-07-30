export function getFormattedDate(dt) {
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0"); // getMonth() เริ่มที่ 0
  const year = dt.getFullYear();

  return `${day}-${month}-${year}`; // format: dd-MM-yyyy
}