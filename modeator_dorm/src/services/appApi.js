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

function mapRepairRequestRow(row) {
  const model = RepairRequestModel.fromJson(row);

  return {
    id: model.requestId,
    caseCode: model.caseCode,
    studentName: model.studentName,
    contactPhone: model.contactPhone,
    roomNumber: model.roomNumber,
    allowEntry: model.allowEntry,
    typeNames: model.typeNames,
    description: model.description,
    reportDate: model.getRepairRequestDateLabel(),
    statusId: model.statusId,
    statusName: model.statusName,
    technicianName: model.technicianName,
  };
}

export async function getAllRepairRequests() {
  const response = await AppAPI.get("/repair_request/get_all");
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map(mapRepairRequestRow);
}

export async function getProgressStatusList() {
  const response = await AppAPI.get("/progress_status/get_all");
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    id: row.progress_status_id,
    name: row.progress_status_name,
  }));
}

export async function approveRepairRequest(requestId) {
  const response = await AppAPI.post("/repair_request/approve", {
    request_id: requestId,
  });

  return response.json();
}

export async function rejectRepairRequest(requestId, reason) {
  const response = await AppAPI.post("/repair_request/reject", {
    request_id: requestId,
    reason,
  });

  return response.json();
}

export async function getHomeDashboard() {
  const [repairsResponse, summaryResponse] = await Promise.all([
    AppAPI.get("/repair_request/get_all"),
    AppAPI.get("/repair_request/get_summary"),
  ]);

  const repairsJson = await repairsResponse.json();
  const summaryJson = await summaryResponse.json();

  const repairs = (Array.isArray(repairsJson.data) ? repairsJson.data : []).map(mapRepairRequestRow);

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
    technicianName: model.technicianName,
    reportDate: model.getRepairRequestDateLabel(),
  };
}

export async function getTechnicianList() {
  const response = await AppAPI.get("/technician/get_all");
  const json = await response.json();

  return (Array.isArray(json.data) ? json.data : []).map((row) => ({
    id: row.technician_id,
    name: row.full_name,
    specialtyName: row.specialty_name,
  }));
}

export async function assignTechnician(requestId, technicianId) {
  const response = await AppAPI.post("/repair_request/assign_technician", {
    request_id: requestId,
    technician_id: technicianId,
  });

  return response.json();
}