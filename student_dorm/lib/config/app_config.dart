class AppConfig {
  // 127.0.0.1 แทน localhost: localhost ถูก resolve เป็น IPv6 (::1) ก่อน ซึ่ง server เราฟังแค่ IPv4
  // ถ้ามีโปรเซสอื่นจับ [::1]:3000 ไว้ request จะไปผิดที่ (เครื่องจริงต้องใช้ IP LAN แทนอยู่แล้ว)
  static const String apiBaseUri = "http://127.0.0.1:3000/api";
}