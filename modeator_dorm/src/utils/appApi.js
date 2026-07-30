import { AppConfig } from "../config/appConfig";

export const AppAPI = {
  async get(uri) {
    const accessToken = localStorage.getItem("access_token");

    console.log(`${AppConfig.apiBaseUri}${uri}`);

    const response = await fetch(`${AppConfig.apiBaseUri}${uri}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response;
  },
};import { AppConfig } from "../config/appConfig";

export const AppAPI = {
  async get(uri) {
    const accessToken = localStorage.getItem("access_token");

    console.log(`${AppConfig.apiBaseUri}${uri}`);

    const response = await fetch(`${AppConfig.apiBaseUri}${uri}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response;
  },
};