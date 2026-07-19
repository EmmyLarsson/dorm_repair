import 'package:flutter/material.dart';

class RepairSubmit extends StatefulWidget {
  const RepairSubmit({super.key});

  @override
  State<RepairSubmit> createState() => _RepairSubmitState();
}

class _RepairSubmitState extends State<RepairSubmit> {
  final _formKey = GlobalKey<FormState>();

  final _nameValueController = TextEditingController();
  final _phoneValueController = TextEditingController();
  final _roomValueController = TextEditingController();
  final _detailValueController = TextEditingController();
  final List<String> _repairTypes = [
    'งานไฟฟ้า',
    'งานประปา',
    'เฟอร์นิเจอร์',
    'ห้องพัก',
    'อินเตอร์เน็ต',
    'อื่นๆ'
  ];

  List<String> _selectedTypes = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        height: double.infinity,
        width: double.infinity,
        // ย้าย alignment มาไว้ให้ถูกที่ (เป็นของ Container ตัวนอกสุด)
        alignment: Alignment.center, 
        child: Container(
          height: 400,
          width: double.infinity,
          margin: const EdgeInsets.symmetric(horizontal: 30),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white),
            borderRadius: BorderRadius.circular(15),
            color: Colors.black.withValues(alpha: 0.1),
          ),
          alignment: Alignment.topLeft,
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
          // เอา Form มาใส่เป็น child ของ Container สูง 400 ให้ถูกต้อง
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 50),
                  child: const Text("ชื่อผู้แจ้ง"),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 30),
                  child: TextFormField(
                    controller: _nameValueController,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return "กรุณากรอก Username";
                      }
                      return null;
                    },
                  ),
                ),
                Container(
                  margin: const EdgeInsets.only(top: 50),
                  child: const Text("เบอร์โทรติดต่อ"),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 30),
                  child: TextFormField(
                    obscureText: true,
                    controller: _phoneValueController,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return "กรุณากรอก Password";
                      }
                      return null;
                    },
                  ),
                ),
                Container(
                  margin: const EdgeInsets.only(top: 50),
                  child: const Text("หมายเลขห้องพัก"),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 30),
                  child: TextFormField(
                    obscureText: true,
                    controller: _roomValueController,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return "กรุณากรอก Password";
                      }
                      return null;
                    },
                  ),
                ),
                Container(
                  margin: const EdgeInsets.only(top: 50),
                  child: const Text("รายงานปัญหา"),
                ),
                Container(
                    margin: const EdgeInsets.only(top: 30, bottom: 10),
                    child: const Text(
                      "ประเภทงานซ่อม (เลือกได้มากกว่า 1 ข้อ)",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                Wrap(
                  spacing: 8.0, // ระยะห่างแนวนอนระหว่างกล่อง
                  runSpacing: 8.0, // ระยะห่างแนวตั้งเมื่อขึ้นบรรทัดใหม่
                  children: _repairTypes.map((type) {
                    // เช็กว่าตัวเลือกนี้ถูกเลือกอยู่หรือไม่
                    final isSelected = _selectedTypes.contains(type);
                    
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          if (isSelected) {
                            _selectedTypes.remove(type); // ถ้าเลือกอยู่แล้ว > เอาออก
                          } else {
                            _selectedTypes.add(type); // ถ้ายังไม่เลือก > เพิ่มเข้า List
                          }
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          // ถ้าเลือกให้เป็นสีฟ้าเหลี่ยมๆ ถ้าไม่เลือกให้เป็นสีใสขอบขาวดิบๆ
                          color: isSelected ? Colors.blue : Colors.transparent,
                          border: Border.all(color: Colors.white),
                          // ทรงสี่เหลี่ยมดิบๆ (ไม่ได้ใส่ borderRadius ให้มน)
                        ),
                        child: Text(
                          type,
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.white70,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
                // Container(
                //   margin: EdgeInsets.only(top: 40),
                //   child: ElevatedButton(
                //     onPressed: () {
                //       if (_formKey.currentState!.validate()) {
                //         _doLogin(context);
                //       }
                //     },

                //     child: Text("Login"),
                //   ),
                // ),
 
}