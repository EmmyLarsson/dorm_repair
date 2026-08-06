import { AppConfig } from "../config/appConfig";
import { RepairRequestModel } from "../models/repairRequestModel";

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
};

export async function getHomeDashboard() {
  const [repairsResponse, summaryResponse] = await Promise.all([
    AppAPI.get("/repair_request/get_all"),
    AppAPI.get("/repair_request/get_summary"),
  ]);

  const repairsJson = await repairsResponse.json();
  const summaryJson = await summaryResponse.json();


  const repairs = (repairsJson.data ?? []).map((row) => {
    const model = RepairRequestModel.fromJson(row);

    return {
      id: model.requestId,
      caseCode: model.caseCode,
      studentName: model.studentName,
      roomNumber: model.roomNumber,
      reportDate: model.getRepairRequestDateLabel(),
      statusId: model.statusId,
      statusName: model.statusName,
    };
  });

  const repairSummary = {
    pending: 0,
    waiting: 0,
    completed: 0,
  };

  for (const row of summaryJson.data ?? []) {
    const total = Number(row.total) || 0;

    if (row.progress_status_id === 1) {
      repairSummary.pending = total;
    } else if (row.progress_status_id === 2) {
      repairSummary.waiting = total;
    } else if (row.progress_status_id === 3) {
      repairSummary.completed = total;
    }
  }

  return {
    repairSummary,
    repairs,
    inventoryAlerts: [],
  };
}

export async function getRepairRequestDetail(requestId) {
  const response = await AppAPI.get(`/repair_request/get_by_id/${requestId}`);
  const json = await response.json();
  const model = RepairRequestModel.fromJson(json.data);

  return {
    id: model.requestId,
    caseCode: model.caseCode,
    studentName: model.studentName,
    contactPhone: model.contactPhone,
    roomNumber: model.roomNumber,
    allowEntry: model.allowEntry,
    typeNames: model.typeNames,
    description: model.description,
    statusId: model.statusId,
    statusName: model.statusName,
    reportDate: model.getRepairRequestDateLabel(),
  };
}