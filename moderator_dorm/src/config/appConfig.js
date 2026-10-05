export const AppConfig = {
  // 127.0.0.1 แทน localhost: localhost ถูก resolve เป็น IPv6 (::1) ก่อน ซึ่ง server เราฟังแค่ IPv4
  // ถ้ามีโปรเซสอื่นจับ [::1]:3000 ไว้ (เช่น dev server โปรเจกต์อื่น) request จะไปผิดที่แล้วได้ 404
  apiBaseUri: "http://127.0.0.1:3000/api",
};