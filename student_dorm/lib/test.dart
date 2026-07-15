import 'package:flutter/material.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {

  final TextEditingController username = TextEditingController();
  final TextEditingController password = TextEditingController();

  bool remember = false;
  bool hidePassword = true;
  bool loading = false;

  Future<void> login() async {

    if(username.text.isEmpty || password.text.isEmpty){
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("กรุณากรอก Username และ Password"),
        ),
      );
      return;
    }

    setState(() {
      loading = true;
    });

    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      loading = false;
    });

    if(username.text=="admin" &&
        password.text=="admin123"){

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Login Success"),
        ),
      );

    }else{

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Username หรือ Password ไม่ถูกต้อง"),
        ),
      );

    }

  }

  @override
  Widget build(BuildContext context) {

    return Scaffold(

      backgroundColor: Colors.amber,

      body: Center(

        child: SingleChildScrollView(

          child: Container(

            width: 420,

            margin: const EdgeInsets.all(20),

            decoration: BoxDecoration(

              color: Colors.white,

              borderRadius: BorderRadius.circular(25),

              boxShadow: const [

                BoxShadow(
                  blurRadius: 20,
                  color: Colors.black12,
                )

              ],

            ),

            child: Padding(

              padding: const EdgeInsets.all(25),

              child: Column(

                children: [

                  ClipRRect(

                    borderRadius: BorderRadius.circular(15),

                    child: Image.network(
                      "https://picsum.photos/600/250",
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),

                  ),

                  const SizedBox(height:25),

                  const Text(

                    "ระบบแจ้งซ่อมหอพัก",

                    style: TextStyle(

                      fontSize: 22,
                      fontWeight: FontWeight.bold,

                    ),

                  ),

                  const SizedBox(height:30),

                  TextField(

                    controller: username,

                    decoration: const InputDecoration(

                      labelText: "Username",

                      prefixIcon: Icon(Icons.person),

                      border: OutlineInputBorder(),

                    ),

                  ),

                  const SizedBox(height:15),

                  TextField(

                    controller: password,

                    obscureText: hidePassword,

                    decoration: InputDecoration(

                      labelText: "Password",

                      prefixIcon: const Icon(Icons.lock),

                      border: const OutlineInputBorder(),

                      suffixIcon: IconButton(

                        icon: Icon(

                          hidePassword
                              ? Icons.visibility
                              : Icons.visibility_off,
                        ),

                        onPressed: (){

                          setState(() {

                            hidePassword = !hidePassword;

                          });

                        },

                      ),

                    ),

                  ),

                  const SizedBox(height:15),

                  Row(

                    children: [

                      Checkbox(

                        value: remember,

                        onChanged: (v){

                          setState(() {

                            remember = v!;

                          });

                        },

                      ),

                      const Text("Remember me")

                    ],

                  ),

                  const SizedBox(height:20),

                  SizedBox(

                    width: double.infinity,

                    height: 50,

                    child: ElevatedButton(

                      onPressed: loading ? null : login,

                      child: loading
                          ? const CircularProgressIndicator(
                              color: Colors.white,
                            )
                          : const Text("เข้าสู่ระบบ"),

                    ),

                  ),

                ],

              ),

            ),

          ),

        ),

      ),

    );

  }

}