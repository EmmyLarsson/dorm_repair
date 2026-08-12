import { AppConfig } from "../config/appConfig";

export const AppAPI = {
  async get(uri) {
    const accessToken = localStorage.getItem("access_token");
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
    const accessToken = localStorage.getItem("access_token");
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
};
