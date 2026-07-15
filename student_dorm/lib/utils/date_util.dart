import 'package:intl/intl.dart';

class DateUtil {
  static String getFormattedDate(DateTime dt) {
    String formattedDate = DateFormat('dd-MM-yyyy').format(dt);

    return formattedDate;
  }
}