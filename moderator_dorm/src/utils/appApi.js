import { AppConfig } from "../config/appConfig";

export const AppAPI = {
  async get(uri) {
    const accessToken = sessionStorage.getItem("access_token");
    const url = `${AppConfig.apiBaseUri}${uri}`;
    console.log(url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response;
  },

  async post(uri, body) {
    const accessToken = sessionStorage.getItem("access_token");
    const url = `${AppConfig.apiBaseUri}${uri}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    return response;
  },

  // ส่ง multipart/form-data (ไม่ตั้ง Content-Type เอง — เบราว์เซอร์ต้องกำหนด boundary ให้)
  // fields: object ของ field ธรรมดา (text) ที่จะแนบไปพร้อมไฟล์ เช่น { remove: '1' }
  // file: ไฟล์เดียว (ของเดิม) / files: หลายไฟล์ภายใต้ fieldName เดียวกัน (เช่น รูปรายงานผลซ่อม)
  async postFormData(uri, { file, files, fieldName = 'file', fields = {} } = {}) {
    const accessToken = sessionStorage.getItem("access_token");
    const url = `${AppConfig.apiBaseUri}${uri}`;

    const formData = new FormData();
    if (file) formData.append(fieldName, file);
    (files || []).forEach((f) => formData.append(fieldName, f));
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    return response;
  },
};
