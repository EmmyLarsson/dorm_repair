import { AppConfig } from "../config/appConfig";
async function sha256(text) {
  const data = new TextEncoder().encode(text);

  const hashBuffer = await window.crypto.subtle.digest(
    "SHA-256",
    data
  );

  const hashArray = Array.from(
    new Uint8Array(hashBuffer)
  );

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * วันที่รูปแบบ dd-MM-yyyy
 *
 * ต้องตรงกับ DateUtil.getFormattedDate() ฝั่ง Flutter
 */
function getFormattedDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * อ่าน JSON จาก response อย่างปลอดภัย
 */
async function parseResponse(response) {
  let json;

  try {
    json = await response.json();
  } catch {
    throw new Error(
      `Server ตอบกลับมาไม่ใช่ JSON (${response.status})`
    );
  }

  if (!response.ok) {
    throw new Error(
      json.errorMessage ||
        `เรียก API ไม่สำเร็จ (${response.status})`
    );
  }

  return json;
}

/**
 * ขั้นที่ 1:
 * ส่ง authen_request ไปขอ authen_token
 *
 * Flutter เดิม:
 * username&dd-MM-yyyy
 * แล้ว SHA-256
 */
export async function authenRequest(username) {
  const cleanUsername = username.trim();
  const formattedDate = getFormattedDate(new Date());

  const combinedString =
    `${cleanUsername}&${formattedDate}`;

  const authenRequestString =
    await sha256(combinedString);

  const url =
    `${AppConfig.apiBaseUri}/authen/authen_request`;

  console.log("Authen combined:", combinedString);
  console.log("Authen request:", authenRequestString);
  console.log("Authen URL:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/json; charset=UTF-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      authen_request: authenRequestString,
    }),
  });

  const json = await parseResponse(response);

  return {
    isError: Boolean(json.isError),
    data: json.data ?? "",
    errorMessage: json.errorMessage ?? "",
  };
}

export async function accessRequest(username, password, authenToken) 
{
  const cleanUsername = username.trim();

  const passwordEncode = await sha256(password);

  const combinedString =
    `${cleanUsername}&${passwordEncode}&${authenToken}`;

  const authenSignature =
    await sha256(combinedString);

  const url =
    `${AppConfig.apiBaseUri}/authen/access_request`;

  console.log("Access combined:", combinedString);
  console.log("Authen signature:", authenSignature);
  console.log("Access URL:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/json; charset=UTF-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      authen_signature: authenSignature,
      authen_token: authenToken,
    }),
  });

  const json = await parseResponse(response);

  if (!json.isError) {
    const accessToken =
      json.data?.access_token ?? "";

    const imageUrl =
      json.data?.image_url ?? "";

    if (!accessToken) {
      throw new Error(
        "Server ไม่ได้ส่ง access_token กลับมา"
      );
    }

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("username", cleanUsername);
    localStorage.setItem("image_url", imageUrl);

    return {
      isError: false,
      data: accessToken,
      errorMessage: json.errorMessage ?? "",
    };
  }

  return {
    isError: true,
    data:
      typeof json.data === "string"
        ? json.data
        : "",
    errorMessage:
      json.errorMessage || "เข้าสู่ระบบไม่สำเร็จ",
  };
}