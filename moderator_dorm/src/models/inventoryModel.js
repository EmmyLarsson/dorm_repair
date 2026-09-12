// ใช้ร่วมกันทั้งการ์ดหน้า Inventory และการ์ดใน picker ครุภัณฑ์ (หน้าจัดการงานซ่อม)
export const EQUIPMENT_STATUS_BADGE_CLASS = {
  stock: 'bg-emerald-100 text-emerald-800',
  low: 'bg-amber-100 text-amber-800',
  out: 'bg-red-100 text-red-800',
};

export const EQUIPMENT_STATUS_LABEL = {
  stock: 'คงคลัง',
  low: 'ใกล้จะหมด',
  out: 'หมดคงคลัง',
};

export class InventoryModel {
  constructor({
    equipmentId,
    equipmentCode,
    equipmentName,
    equipmentTypeId,
    equipmentTypeName,
    unitId,
    unitName,
    quantity,
    lowStockThreshold,
    imageUrl,
  }) {
    this.equipmentId = equipmentId;
    this.equipmentCode = equipmentCode;
    this.equipmentName = equipmentName;
    this.equipmentTypeId = equipmentTypeId;
    this.equipmentTypeName = equipmentTypeName;
    this.unitId = unitId;
    this.unitName = unitName;
    this.quantity = quantity;
    this.lowStockThreshold = lowStockThreshold;
    this.imageUrl = imageUrl;
  }

  get status() {
    if (this.quantity <= 0) return 'out';
    if (this.quantity <= this.lowStockThreshold) return 'low';
    return 'stock';
  }

  static fromJson(json) {
    return new InventoryModel({
      equipmentId: json.equipment_id,
      equipmentCode: json.equipment_code ?? '',
      equipmentName: json.equipment_name ?? '',
      equipmentTypeId: json.equipment_type_id ?? null,
      equipmentTypeName: json.equipment_type_name ?? '',
      unitId: json.unit_id ?? null,
      unitName: json.unit_name ?? '',
      quantity: json.quantity ?? 0,
      lowStockThreshold: json.low_stock_threshold ?? 0,
      imageUrl: json.image_url ?? null,
    });
  }
}
