export class PersonnelModel {
  constructor({
    personId,
    personNo,
    firstname,
    lastname,
    phone,
    profileImage,
    roleId,
    roleName,
    accountId,
    username,
    roomNumber,
    positionId,
    positionName,
    specialtyId,
    specialtyName,
  }) {
    this.personId = personId;
    this.personNo = personNo;
    this.firstname = firstname;
    this.lastname = lastname;
    this.phone = phone;
    this.profileImage = profileImage;
    this.roleId = roleId;
    this.roleName = roleName;
    this.accountId = accountId;
    this.username = username;
    this.roomNumber = roomNumber;
    this.positionId = positionId;
    this.positionName = positionName;
    this.specialtyId = specialtyId;
    this.specialtyName = specialtyName;
  }

  get fullName() {
    return `${this.firstname} ${this.lastname}`.trim();
  }

  static fromJson(json) {
    return new PersonnelModel({
      personId: json.person_id,
      personNo: json.person_no ?? '',
      firstname: json.firstname ?? '',
      lastname: json.lastname ?? '',
      phone: json.phone ?? '',
      profileImage: json.profile_image ?? null,
      roleId: json.role_id,
      roleName: json.role_name ?? '',
      accountId: json.account_id ?? null,
      username: json.username ?? '',
      roomNumber: json.room_number ?? '',
      positionId: json.position_id ?? null,
      positionName: json.position_name ?? '',
      specialtyId: json.specialty_id ?? null,
      specialtyName: json.specialty_name ?? '',
    });
  }
}
