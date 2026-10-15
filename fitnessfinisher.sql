-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               12.3.2-MariaDB - MariaDB Server
-- Server OS:                    Win64
-- HeidiSQL Version:             12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for dorm_repair
CREATE DATABASE IF NOT EXISTS `dorm_repair` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_thai_520_w2 */;
USE `dorm_repair`;

-- Dumping structure for table dorm_repair.account
CREATE TABLE IF NOT EXISTS `account` (
  `account_id` int(11) NOT NULL AUTO_INCREMENT,
  `person_id` int(11) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`account_id`),
  KEY `person_id` (`person_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `1` FOREIGN KEY (`person_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `2` FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.account: ~4 rows (approximately)
INSERT INTO `account` (`account_id`, `person_id`, `role_id`, `username`, `password`) VALUES
	(1, 1, 1, '6610210067', 'b9c950640e1b3740e98acb93e669c65766f6670dd1609ba91ff41052ba48c6f3'),
	(2, 2, 2, 'somying_mod', '15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225'),
	(8, 13, 1, '6610210011', '15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225'),
	(9, 14, 2, 'sixsevenverity', '403774aa7e1635aaf218dc899900238e691ffb21ec1701255840aa614a28fc39'),
	(10, 16, 1, '6610210056', '15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225');

-- Dumping structure for table dorm_repair.complaint_reason
CREATE TABLE IF NOT EXISTS `complaint_reason` (
  `complaint_reason_id` int(11) NOT NULL AUTO_INCREMENT,
  `complaint_reason_name` varchar(100) NOT NULL,
  PRIMARY KEY (`complaint_reason_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.complaint_reason: ~6 rows (approximately)
INSERT INTO `complaint_reason` (`complaint_reason_id`, `complaint_reason_name`) VALUES
	(1, 'ซ่อมไม่เรียบร้อย'),
	(2, 'ซ่อมผิดจุด/ไม่ตรงปัญหาที่แจ้ง'),
	(3, 'ปัญหากลับมาเป็นซ้ำ'),
	(4, 'ช่างมาช้า/ไม่มาตามนัด'),
	(5, 'ใช้เวลาซ่อมนานเกินไป'),
	(6, 'อื่นๆ');

-- Dumping structure for table dorm_repair.equipment
CREATE TABLE IF NOT EXISTS `equipment` (
  `equipment_id` int(11) NOT NULL AUTO_INCREMENT,
  `equipment_code` varchar(20) NOT NULL COMMENT 'รหัสครุภัณฑ์ เช่น I001, I002',
  `equipment_type_id` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `equipment_name` varchar(150) NOT NULL COMMENT 'เช่น โคมไฟ, เก้าอี้',
  `quantity` int(11) NOT NULL DEFAULT 0 COMMENT 'จำนวนคงเหลือในคลัง',
  `low_stock_threshold` int(11) NOT NULL DEFAULT 5 COMMENT 'จำนวนขั้นต่ำที่ถือว่าเหลือน้อย (ตั้งได้ต่อชิ้น)',
  PRIMARY KEY (`equipment_id`),
  UNIQUE KEY `equipment_code` (`equipment_code`),
  KEY `equipment_type_id` (`equipment_type_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `fk_equipment_type` FOREIGN KEY (`equipment_type_id`) REFERENCES `equipment_type` (`equipment_type_id`),
  CONSTRAINT `fk_equipment_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit` (`unit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.equipment: ~6 rows (approximately)
INSERT INTO `equipment` (`equipment_id`, `equipment_code`, `equipment_type_id`, `unit_id`, `equipment_name`, `quantity`, `low_stock_threshold`) VALUES
	(2, 'I002', 1, 4, 'หลอดไฟ Philips', 7, 3),
	(3, 'I003', 2, 2, 'ก๊อกน้ำ Sanwa', 6, 3),
	(4, 'I004', 5, 8, 'เราเตอร์ D-Link', 4, 3),
	(5, 'I005', 3, 2, 'เก้าอี้อเนกประสงค์', 6, 3),
	(6, 'I006', 3, 9, 'ฟูกที่นอน', 3, 2),
	(7, 'I007', 4, 5, 'หน้าต่างห้อง', 2, 1);

-- Dumping structure for table dorm_repair.equipment_photo
CREATE TABLE IF NOT EXISTS `equipment_photo` (
  `equipment_photo_id` int(11) NOT NULL AUTO_INCREMENT,
  `equipment_id` int(11) NOT NULL,
  `photo_path` varchar(255) NOT NULL,
  `uploaded_date` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`equipment_photo_id`),
  KEY `equipment_id` (`equipment_id`),
  CONSTRAINT `fk_equipment_photo` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`equipment_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.equipment_photo: ~5 rows (approximately)
INSERT INTO `equipment_photo` (`equipment_photo_id`, `equipment_id`, `photo_path`, `uploaded_date`) VALUES
	(1, 2, '/uploads/equipment_photos/1788427369392-c9f15ce6-d3ab-48e5-aca5-a5f0f3571310.jpg', '2026-09-03 16:22:49'),
	(2, 3, '/uploads/equipment_photos/1791873110064-6973d9e8-87a2-4c6a-b041-437e14701000.jpg', '2026-10-13 13:31:50'),
	(3, 4, '/uploads/equipment_photos/1791873213964-7874e361-390e-4a05-a01d-dcb9a5a2ca9a.webp', '2026-10-13 13:33:33'),
	(4, 5, '/uploads/equipment_photos/1791873403976-c2d37226-3f5d-4fda-8012-bb7315b88906.jpg', '2026-10-13 13:36:44'),
	(5, 6, '/uploads/equipment_photos/1791873763387-db5b45ef-4199-4378-a1ba-2ecd6909fe94.webp', '2026-10-13 13:42:43'),
	(6, 7, '/uploads/equipment_photos/1791873836573-0b6ed1d5-6549-488a-950d-5fa3e4dcfb21.jpg', '2026-10-13 13:43:56');

-- Dumping structure for table dorm_repair.equipment_type
CREATE TABLE IF NOT EXISTS `equipment_type` (
  `equipment_type_id` int(11) NOT NULL AUTO_INCREMENT,
  `equipment_type_name` varchar(100) NOT NULL COMMENT 'เช่น ไฟฟ้า, ประปา, เฟอร์นิเจอร์',
  PRIMARY KEY (`equipment_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.equipment_type: ~6 rows (approximately)
INSERT INTO `equipment_type` (`equipment_type_id`, `equipment_type_name`) VALUES
	(1, 'ไฟฟ้า'),
	(2, 'ประปา'),
	(3, 'เฟอร์นิเจอร์'),
	(4, 'ห้อง'),
	(5, 'อินเทอร์เน็ต'),
	(6, 'อื่นๆ');

-- Dumping structure for table dorm_repair.moderator
CREATE TABLE IF NOT EXISTS `moderator` (
  `moderator_id` int(11) NOT NULL AUTO_INCREMENT,
  `person_id` int(11) DEFAULT NULL,
  `position_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`moderator_id`),
  KEY `person_id` (`person_id`),
  KEY `position_id` (`position_id`),
  CONSTRAINT `1` FOREIGN KEY (`person_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `2` FOREIGN KEY (`position_id`) REFERENCES `position` (`position_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.moderator: ~1 rows (approximately)
INSERT INTO `moderator` (`moderator_id`, `person_id`, `position_id`) VALUES
	(1, 2, 1),
	(8, 14, 3);

-- Dumping structure for table dorm_repair.notification
CREATE TABLE IF NOT EXISTS `notification` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) DEFAULT NULL,
  `event_type` enum('new_request','appeal_filed','accepted','declined','evaluated','rush_requested','auto_closed','student_cancelled','request_edited') NOT NULL,
  `message` varchar(255) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `fk_notification_request` (`request_id`),
  CONSTRAINT `fk_notification_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.notification: ~9 rows (approximately)
INSERT INTO `notification` (`notification_id`, `request_id`, `event_type`, `message`, `is_read`, `created_at`) VALUES
	(1, 17, 'appeal_filed', 'สมหมาย หมายสม ยื่นคำร้องอุทธรณ์', 1, '2026-09-30 21:41:25'),
	(2, 17, 'appeal_filed', 'สมหมาย หมายสม ยื่นคำร้องอุทธรณ์', 1, '2026-10-01 13:32:13'),
	(3, 18, 'new_request', 'สมหญิง เก่งมาก แจ้งซ่อมใหม่', 1, '2026-10-03 17:51:45'),
	(4, 15, 'evaluated', 'สมหมาย หมายสม ประเมินผลงานซ่อมแล้ว (3 ดาว)', 1, '2026-10-04 22:28:54'),
	(5, 19, 'new_request', 'สมหมาย หมายสม แจ้งซ่อมใหม่', 1, '2026-10-06 15:03:08'),
	(6, 20, 'new_request', 'สมหมาย หมายสม แจ้งซ่อมใหม่', 1, '2026-10-07 14:08:17'),
	(7, 20, 'student_cancelled', 'สมหมาย หมายสม ยกเลิกคำร้องแจ้งซ่อม', 1, '2026-10-07 14:10:57'),
	(8, 21, 'new_request', 'สมหมาย หมายสม แจ้งซ่อมใหม่', 1, '2026-10-07 14:12:16'),
	(9, 24, 'new_request', 'เอ็มมี่ เนลสัน แจ้งซ่อมใหม่', 1, '2026-10-13 15:29:00'),
	(10, 25, 'new_request', 'เอ็มมี่ เนลสัน แจ้งซ่อมใหม่', 1, '2026-10-13 16:26:13'),
	(11, 25, 'appeal_filed', 'เอ็มมี่ เนลสัน ยื่นคำร้องอุทธรณ์', 1, '2026-10-13 21:41:00');

-- Dumping structure for table dorm_repair.person
CREATE TABLE IF NOT EXISTS `person` (
  `person_id` int(11) NOT NULL AUTO_INCREMENT,
  `person_no` varchar(15) NOT NULL,
  `role_id` int(11) NOT NULL,
  `firstname` varchar(50) NOT NULL,
  `lastname` varchar(50) NOT NULL,
  `phone` varchar(10) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`person_id`),
  UNIQUE KEY `person_no` (`person_no`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `1` FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.person: ~8 rows (approximately)
INSERT INTO `person` (`person_id`, `person_no`, `role_id`, `firstname`, `lastname`, `phone`, `profile_image`) VALUES
	(1, 'P00001', 1, 'สมหมาย', 'หมายสม', '0954594396', '/uploads/profile_photos/1791804216451-82902286-c82d-49a0-ad0a-b4c1307813b1.jpg'),
	(2, 'P00002', 2, 'สมหญิง', 'หญิงสม', '0954594890', NULL),
	(3, 'P00003', 3, 'ซ่อมดี', 'เก่งมาก', '0801246810', NULL),
	(12, 'P00012', 3, 'ช่องเก่ง', 'ที่สุด', '0824549596', NULL),
	(13, 'P00013', 1, 'เริ่ดมาก', 'ตัวมัม', '0945634568', '/uploads/profile_photos/1791804203676-162add72-5a58-48e8-a10b-d7f42dfe35bb.jpg'),
	(14, 'P00014', 2, 'สุกมล', 'ทุงทุง', '0945602558', '/uploads/profile_photos/1791877277676-c47b8929-583a-49cd-b689-9597a60b972b.jpg'),
	(15, 'P00015', 3, 'เก็ท', 'ไวไฟ', '0895545555', NULL),
	(16, 'P00016', 1, 'เอ็มมี่', 'เนลสัน', '0616767676', '/uploads/profile_photos/1791878500802-459b576e-3b9f-4cce-8e6b-f5a0d2bdf7f4.jpg');

-- Dumping structure for table dorm_repair.position
CREATE TABLE IF NOT EXISTS `position` (
  `position_id` int(11) NOT NULL AUTO_INCREMENT,
  `position_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`position_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.position: ~3 rows (approximately)
INSERT INTO `position` (`position_id`, `position_name`) VALUES
	(1, 'เจ้าหน้าที่หอพัก'),
	(2, 'หัวหน้าเจ้าหน้าที่หอพัก'),
	(3, 'หัวหน้าฝ่ายช่าง');

-- Dumping structure for table dorm_repair.progress_status
CREATE TABLE IF NOT EXISTS `progress_status` (
  `progress_status_id` int(11) NOT NULL AUTO_INCREMENT,
  `progress_status_name` varchar(100) NOT NULL,
  PRIMARY KEY (`progress_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.progress_status: ~6 rows (approximately)
INSERT INTO `progress_status` (`progress_status_id`, `progress_status_name`) VALUES
	(1, 'รอตรวจสอบ'),
	(2, 'อยู่ระหว่างซ่อม'),
	(3, 'เสร็จสิ้น'),
	(4, 'ถูกปฏิเสธ/ยกเลิก'),
	(5, 'อยู่ระหว่างการแก้ไข'),
	(6, 'สำเร็จ'),
	(7, 'รอตรวจสอบแก้ไข'),
	(8, 'ไม่สำเร็จ');

-- Dumping structure for table dorm_repair.repair_cancellation
CREATE TABLE IF NOT EXISTS `repair_cancellation` (
  `cancellation_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `cancelled_by_moderator_id` int(11) DEFAULT NULL,
  `cancel_reason` text NOT NULL,
  `cancel_date` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`cancellation_id`),
  KEY `request_id` (`request_id`),
  KEY `cancelled_by_moderator_id` (`cancelled_by_moderator_id`),
  CONSTRAINT `fk_cancel_moderator` FOREIGN KEY (`cancelled_by_moderator_id`) REFERENCES `moderator` (`moderator_id`),
  CONSTRAINT `fk_cancel_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_cancellation: ~1 rows (approximately)
INSERT INTO `repair_cancellation` (`cancellation_id`, `request_id`, `cancelled_by_moderator_id`, `cancel_reason`, `cancel_date`) VALUES
	(5, 14, 1, 'ภาพไม่ครบ', '2026-09-03 15:02:54'),
	(6, 20, NULL, 'ไม่เอาแล้ว', '2026-10-07 14:10:57'),
	(7, 24, 8, 'ส่งใหม่', '2026-10-13 16:00:51');

-- Dumping structure for table dorm_repair.repair_complaint
CREATE TABLE IF NOT EXISTS `repair_complaint` (
  `complaint_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `complaint_text` text NOT NULL,
  `complaint_reason_id` int(11) DEFAULT NULL COMMENT 'หมวดหมู่เหตุผลที่ยื่นอุทธรณ์ (นักศึกษาเลือกตอนยื่นคำร้อง เคสเก่าก่อนมีฟีเจอร์นี้เป็นค่าว่าง)',
  `allow_entry` tinyint(1) DEFAULT NULL COMMENT 'อนุญาตให้ช่างเข้าห้องได้ไหมสำหรับรอบอุทธรณ์นี้ (1=อนุญาต, 0=ไม่อนุญาต, NULL=เคสเก่าก่อนมีฟีเจอร์นี้)',
  `decision` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `filed_at` datetime DEFAULT current_timestamp(),
  `decided_at` datetime DEFAULT NULL,
  `appointment_date` datetime DEFAULT NULL COMMENT 'วันนัดแก้ไขของรอบอุทธรณ์ที่อนุมัติ (NULL = อุทธรณ์ที่ไม่ถูกอนุมัติ หรือยังไม่ได้นัด)',
  `edited_at` datetime DEFAULT NULL,
  PRIMARY KEY (`complaint_id`),
  KEY `fk_complaint_request` (`request_id`),
  KEY `fk_complaint_reason` (`complaint_reason_id`),
  CONSTRAINT `fk_complaint_reason` FOREIGN KEY (`complaint_reason_id`) REFERENCES `complaint_reason` (`complaint_reason_id`),
  CONSTRAINT `fk_complaint_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_complaint: ~3 rows (approximately)
INSERT INTO `repair_complaint` (`complaint_id`, `request_id`, `complaint_text`, `complaint_reason_id`, `allow_entry`, `decision`, `filed_at`, `decided_at`, `appointment_date`, `edited_at`) VALUES
	(4, 17, 'แย่มาก', 1, NULL, 'rejected', '2026-09-30 21:41:25', '2026-09-30 21:43:48', NULL, NULL),
	(5, 17, 'I love JZB Studio', 5, 1, 'approved', '2026-10-01 13:32:13', '2026-10-01 14:18:30', '2026-10-02 09:00:00', NULL),
	(6, 25, 'กระจกซอมไม่เรียบร้อย', 1, 1, 'approved', '2026-10-13 21:41:00', '2026-10-13 21:41:45', '2026-10-14 13:00:00', NULL);

-- Dumping structure for table dorm_repair.repair_complaint_photo
CREATE TABLE IF NOT EXISTS `repair_complaint_photo` (
  `complaint_photo_id` int(11) NOT NULL AUTO_INCREMENT,
  `complaint_id` int(11) NOT NULL,
  `photo_url` varchar(255) NOT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`complaint_photo_id`),
  KEY `fk_complaint_photo_complaint` (`complaint_id`),
  CONSTRAINT `fk_complaint_photo_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `repair_complaint` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_complaint_photo: ~1 rows (approximately)
INSERT INTO `repair_complaint_photo` (`complaint_photo_id`, `complaint_id`, `photo_url`, `uploaded_at`) VALUES
	(3, 5, '/uploads/repair_complaint_photos/1790836333007-290baf4e-6f86-4f26-97f8-1f3e64536822.jpeg', '2026-10-01 13:32:13'),
	(4, 6, '/uploads/repair_complaint_photos/1791902460701-c3b4c186-9607-4130-86d8-46737f9bb3a2.jpg', '2026-10-13 21:41:00');

-- Dumping structure for table dorm_repair.repair_completion_item
CREATE TABLE IF NOT EXISTS `repair_completion_item` (
  `completion_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `repair_type_id` int(11) NOT NULL,
  `revision_round` int(11) NOT NULL DEFAULT 0,
  `report_text` text DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`completion_item_id`),
  UNIQUE KEY `uq_completion_item_round` (`request_id`,`repair_type_id`,`revision_round`),
  KEY `fk_completion_item_repair_type` (`repair_type_id`),
  CONSTRAINT `fk_completion_item_repair_type` FOREIGN KEY (`repair_type_id`) REFERENCES `repair_type` (`repair_type_id`),
  CONSTRAINT `fk_completion_item_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_completion_item: ~2 rows (approximately)
INSERT INTO `repair_completion_item` (`completion_item_id`, `request_id`, `repair_type_id`, `revision_round`, `report_text`, `updated_at`) VALUES
	(1, 15, 1, 0, 'เสร็จแล้ว', '2026-09-15 14:10:49'),
	(4, 17, 2, 0, 'น้ำดีมากๆๆๆๆๆๆๆ', '2026-09-23 21:26:34'),
	(6, 17, 2, 1, 'สวยมาก', '2026-09-24 11:46:03'),
	(7, 25, 4, 0, 'ซ่อมเสร็จแล้วครับ', '2026-10-13 21:07:51');

-- Dumping structure for table dorm_repair.repair_completion_item_photo
CREATE TABLE IF NOT EXISTS `repair_completion_item_photo` (
  `completion_item_photo_id` int(11) NOT NULL AUTO_INCREMENT,
  `completion_item_id` int(11) NOT NULL,
  `photo_url` varchar(255) NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`completion_item_photo_id`),
  KEY `fk_completion_item_photo_item` (`completion_item_id`),
  CONSTRAINT `fk_completion_item_photo_item` FOREIGN KEY (`completion_item_id`) REFERENCES `repair_completion_item` (`completion_item_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_completion_item_photo: ~2 rows (approximately)
INSERT INTO `repair_completion_item_photo` (`completion_item_photo_id`, `completion_item_id`, `photo_url`, `uploaded_at`) VALUES
	(1, 1, '/uploads/repair_completion_photos/1789099142611-7794a2bb-c5ae-42e0-9310-9998925d2a8f.jpg', '2026-09-11 10:59:02'),
	(5, 4, '/uploads/repair_completion_photos/1790173594842-0ffce20b-147b-41dd-bdaa-e544d1c0216a.jpg', '2026-09-23 21:26:42'),
	(6, 6, '/uploads/repair_completion_photos/1790225163225-8977e58d-7784-4f86-a901-47c32450092b.jpg', '2026-09-24 11:46:03'),
	(7, 7, '/uploads/repair_completion_photos/1791900470854-8597d1a9-ae2e-408b-bf6c-18a675d4df9a.jpg', '2026-10-13 21:07:51');

-- Dumping structure for table dorm_repair.repair_evaluation
CREATE TABLE IF NOT EXISTS `repair_evaluation` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `rating` int(11) DEFAULT NULL COMMENT 'ดาว 1-5 (ว่าง = เคสซ่อมไม่สำเร็จ ซึ่งไม่ให้ดาว)',
  `feedback` text DEFAULT NULL,
  `evaluated_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`evaluation_id`),
  UNIQUE KEY `uq_evaluation_request` (`request_id`),
  CONSTRAINT `fk_evaluation_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_evaluation: ~1 rows (approximately)
INSERT INTO `repair_evaluation` (`evaluation_id`, `request_id`, `rating`, `feedback`, `evaluated_at`) VALUES
	(1, 15, 3, 'ok ใช้ได้', '2026-10-04 22:28:54');

-- Dumping structure for table dorm_repair.repair_evaluation_photo
CREATE TABLE IF NOT EXISTS `repair_evaluation_photo` (
  `evaluation_photo_id` int(11) NOT NULL AUTO_INCREMENT,
  `evaluation_id` int(11) NOT NULL,
  `photo_url` varchar(255) NOT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`evaluation_photo_id`),
  KEY `fk_evaluation_photo_evaluation` (`evaluation_id`),
  CONSTRAINT `fk_evaluation_photo_evaluation` FOREIGN KEY (`evaluation_id`) REFERENCES `repair_evaluation` (`evaluation_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_evaluation_photo: ~0 rows (approximately)
INSERT INTO `repair_evaluation_photo` (`evaluation_photo_id`, `evaluation_id`, `photo_url`, `uploaded_at`) VALUES
	(1, 1, '/uploads/repair_evaluation_photos/1791127734022-a2b62176-cc13-453d-8d3a-2de28161345a.jpeg', '2026-10-04 22:28:54');

-- Dumping structure for table dorm_repair.repair_request
CREATE TABLE IF NOT EXISTS `repair_request` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) DEFAULT NULL,
  `case_code` varchar(50) NOT NULL,
  `moderator_id` int(11) DEFAULT NULL,
  `technician_id` int(11) DEFAULT NULL,
  `progress_status_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `contact_phone` varchar(15) DEFAULT NULL COMMENT 'เบอร์โทรศัพท์ติดต่อ (ถ้าว่าง = ใช้เบอร์ผู้แจ้ง)',
  `allow_entry` tinyint(1) DEFAULT NULL,
  `report_date` datetime DEFAULT current_timestamp(),
  `appointment_date` datetime DEFAULT NULL,
  `finish_date` datetime DEFAULT NULL,
  `target_room` varchar(50) DEFAULT NULL COMMENT 'หมายเลขห้องที่เกิดปัญหา (ถ้าว่าง = ใช้ห้องของผู้แจ้ง)',
  `contact_name` varchar(100) DEFAULT NULL COMMENT 'ชื่อผู้ที่ต้องการให้ช่างติดต่อ (ถ้าว่าง = ใช้ชื่อผู้แจ้ง)',
  `max_complaints` tinyint(4) NOT NULL DEFAULT 2 COMMENT 'จำนวนครั้งที่ยื่นอุทธรณ์ได้ของเคสนี้ (เจ้าหน้าที่ปรับรายเคสได้ 1-5)',
  `student_last_seen_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'เวลาที่นักศึกษาเปิดดูเคสนี้ล่าสุด (watermark ของจุดแดง มีอัปเดตใหม่)',
  `rushed_at` datetime DEFAULT NULL COMMENT 'เวลาที่นักศึกษากดเร่งงานล่าสุด (cooldown + ช่องผู้แจ้งเร่งงาน) ล้างเมื่อเลื่อนนัด/ส่งงานเสร็จ',
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `tracking_number` (`case_code`) USING BTREE,
  KEY `moderator_id` (`moderator_id`),
  KEY `technician_id` (`technician_id`),
  KEY `progress_status_id` (`progress_status_id`),
  KEY `student_id` (`student_id`) USING BTREE,
  CONSTRAINT `1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`),
  CONSTRAINT `2` FOREIGN KEY (`moderator_id`) REFERENCES `moderator` (`moderator_id`),
  CONSTRAINT `3` FOREIGN KEY (`technician_id`) REFERENCES `technician` (`technician_id`),
  CONSTRAINT `4` FOREIGN KEY (`progress_status_id`) REFERENCES `progress_status` (`progress_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_request: ~13 rows (approximately)
INSERT INTO `repair_request` (`request_id`, `student_id`, `case_code`, `moderator_id`, `technician_id`, `progress_status_id`, `description`, `contact_phone`, `allow_entry`, `report_date`, `appointment_date`, `finish_date`, `target_room`, `contact_name`, `max_complaints`, `student_last_seen_at`, `rushed_at`) VALUES
	(9, 1, '1100009', 1, 1, 2, 'ไฟเสีย', '0801234567', 1, '2026-08-10 21:55:28', '2026-08-18 09:00:00', NULL, '110912', 'สมหญิง หญิงสม', 2, '2026-10-04 10:20:34', NULL),
	(11, 1, '1100011', 1, NULL, 2, 'ไฟเสีย', '0801234567', 1, '2026-08-12 21:04:35', NULL, NULL, '110912', 'สมหญิง หญิงสม', 2, '2026-10-07 14:11:59', NULL),
	(12, 1, '1100012', 1, NULL, 2, 'น้ำรั่ว', '0801234567', 1, '2026-08-12 21:14:55', NULL, NULL, '110912', 'สมหญิง หญิงสม', 2, '2026-10-07 14:11:56', NULL),
	(13, 1, '1100013', 1, 1, 2, 'ไฟฟ้าเสีย', '0801234567', 1, '2026-08-13 10:35:47', '2026-08-13 13:00:00', NULL, '110912', 'สมหญิง หญิงสม', 2, '2026-10-04 10:20:34', NULL),
	(14, 1, '1100014', NULL, NULL, 4, 'ไฟเสีย', '0954594392', 1, '2026-08-23 17:38:57', NULL, NULL, '111033', 'สมหมาย หมายสม', 2, '2026-10-04 10:20:34', NULL),
	(15, 1, '1100015', 1, 1, 6, 'ไฟฟ้าเสียมาก', '0954594392', 1, '2026-09-02 13:59:33', '2026-09-11 09:00:00', '2026-09-15 21:54:02', '111033', 'สมหมาย หมายสม', 2, '2026-10-12 15:10:19', NULL),
	(17, 1, '1100017', 1, 1, 5, 'ปลาหมอคางดำ', '0954594392', 0, '2026-09-23 21:25:38', '2026-09-24 15:00:00', '2026-09-24 11:46:03', '111033', 'สมหมาย หมายสม', 2, '2026-10-06 20:40:17', NULL),
	(18, 1, '1100018', 1, NULL, 2, 'ไฟฟ้าใช้ไม่ได้', '0801455677', 1, '2026-10-03 17:51:45', '2026-10-05 09:00:00', NULL, '111035', 'สมหญิง เก่งมาก', 2, '2026-10-06 14:28:14', NULL),
	(19, 1, '1100019', 1, 1, 2, 'เน็ตเน่า', '0954594396', 1, '2026-10-06 15:03:08', '2026-10-07 09:00:00', NULL, '111035', 'สมหมาย หมายสม', 2, '2026-10-09 11:29:45', NULL),
	(20, 1, '1100020', NULL, NULL, 4, 'ไฟเสีย', '0954594396', 0, '2026-10-07 14:08:17', NULL, NULL, '111035', 'สมหมาย หมายสม', 2, '2026-10-12 18:06:22', NULL),
	(21, 1, '1100021', 1, NULL, 2, 'ประตูหลุด ลูกบิดใช้ไม่ได้', '0954594396', 0, '2026-10-07 14:12:16', '2026-10-14 09:00:00', NULL, '111035', 'สมหมาย หมายสม', 2, '2026-10-12 17:18:49', NULL),
	(24, 5, '1100024', NULL, NULL, 4, 'กระจกห้องได้รับความเสียหาย', '0616767676', 1, '2026-10-13 15:29:00', NULL, NULL, '101011', 'เอ็มมี่ เนลสัน', 2, '2026-10-13 21:20:51', NULL),
	(25, 5, '1100025', 8, 1, 5, 'กระจกหน้าต่างแตก', '0616767676', 1, '2026-10-13 16:26:13', '2026-10-14 15:00:00', '2026-10-13 21:07:51', '101011', 'เอ็มมี่ เนลสัน', 2, '2026-10-13 21:40:25', NULL);

-- Dumping structure for table dorm_repair.repair_request_detail
CREATE TABLE IF NOT EXISTS `repair_request_detail` (
  `request_detail_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) DEFAULT NULL,
  `repair_type_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`request_detail_id`),
  KEY `request_id` (`request_id`),
  KEY `repair_type_id` (`repair_type_id`),
  CONSTRAINT `1` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`repair_type_id`) REFERENCES `repair_type` (`repair_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_request_detail: ~11 rows (approximately)
INSERT INTO `repair_request_detail` (`request_detail_id`, `request_id`, `repair_type_id`) VALUES
	(10, 9, 1),
	(12, 11, 1),
	(13, 12, 2),
	(14, 13, 1),
	(15, 14, 1),
	(48, 15, 1),
	(51, 17, 2),
	(52, 18, 1),
	(53, 19, 5),
	(54, 20, 1),
	(56, 21, 4),
	(57, 24, 4),
	(58, 25, 4);

-- Dumping structure for table dorm_repair.repair_request_equipment
CREATE TABLE IF NOT EXISTS `repair_request_equipment` (
  `request_equipment_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `equipment_id` int(11) NOT NULL,
  `quantity_used` int(11) NOT NULL DEFAULT 1,
  `revision_round` int(11) NOT NULL DEFAULT 0 COMMENT 'รอบที่ใช้ครุภัณฑ์: 0 = ซ่อมครั้งแรก, 1-2 = แก้ไขครั้งที่ 1-2',
  PRIMARY KEY (`request_equipment_id`),
  KEY `request_id` (`request_id`),
  KEY `equipment_id` (`equipment_id`),
  CONSTRAINT `fk_req_equip_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`equipment_id`),
  CONSTRAINT `fk_req_equip_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_request_equipment: ~1 rows (approximately)
INSERT INTO `repair_request_equipment` (`request_equipment_id`, `request_id`, `equipment_id`, `quantity_used`, `revision_round`) VALUES
	(1, 25, 7, 1, 0);

-- Dumping structure for table dorm_repair.repair_request_photo
CREATE TABLE IF NOT EXISTS `repair_request_photo` (
  `photo_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `photo_url` varchar(255) NOT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`photo_id`),
  KEY `request_id` (`request_id`),
  CONSTRAINT `fk_photo_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_request_photo: ~7 rows (approximately)
INSERT INTO `repair_request_photo` (`photo_id`, `request_id`, `photo_url`, `uploaded_at`) VALUES
	(16, 15, '/uploads/repair_photos/1788349209275-43cdedc5-fb3c-423e-bb22-cf90e9b45b79.jpeg', '2026-09-02 18:40:09'),
	(17, 15, '/uploads/repair_photos/1788349209290-5ab19e3c-f1dc-4d12-bc94-78266263a9a1.jpeg', '2026-09-02 18:40:09'),
	(18, 15, '/uploads/repair_photos/1788349209298-a3e460ff-d7ce-4da9-bac4-2506cfc426a5.jpeg', '2026-09-02 18:40:09'),
	(22, 17, '/uploads/repair_photos/1790173538576-5a028de3-bd8c-4dcc-baba-03cd165c448f.jpeg', '2026-09-23 21:25:38'),
	(23, 18, '/uploads/repair_photos/1791024705882-7db310e3-513d-46b3-9d70-6e4748d40818.jpeg', '2026-10-03 17:51:45'),
	(24, 24, '/uploads/repair_photos/1791880140214-fe23ec0f-24af-44da-89ee-3fd30a7e92f5.jpg', '2026-10-13 15:29:00'),
	(25, 25, '/uploads/repair_photos/1791883574352-c064a67e-bc35-4423-b1d9-8fd95e40404c.jpg', '2026-10-13 16:26:14');

-- Dumping structure for table dorm_repair.repair_timeline
CREATE TABLE IF NOT EXISTS `repair_timeline` (
  `timeline_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `step_code` enum('submitted','reviewing','approved','appointment','appointment_cancelled','in_progress','completed','cancelled','accepted','complaint_filed','complaint_approved','complaint_rejected','complaint_reviewing','declined','auto_closed','student_cancelled') NOT NULL,
  `step_detail` text DEFAULT NULL COMMENT 'รายละเอียดเฉพาะเคส เช่น เหตุผลยกเลิก (ไม่ใช่ label คงที่)',
  `event_date` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`timeline_id`),
  KEY `request_id` (`request_id`),
  CONSTRAINT `fk_timeline_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_timeline: ~67 rows (approximately)
INSERT INTO `repair_timeline` (`timeline_id`, `request_id`, `step_code`, `step_detail`, `event_date`) VALUES
	(8, 9, 'submitted', NULL, '2026-08-10 21:55:28'),
	(9, 9, 'reviewing', NULL, '2026-08-10 22:28:59'),
	(10, 9, 'approved', NULL, '2026-08-11 18:57:28'),
	(11, 9, 'appointment', NULL, '2026-08-11 18:57:58'),
	(15, 11, 'submitted', NULL, '2026-08-12 21:04:35'),
	(16, 11, 'reviewing', NULL, '2026-08-12 21:04:40'),
	(17, 11, 'approved', NULL, '2026-08-12 21:04:48'),
	(18, 12, 'submitted', NULL, '2026-08-12 21:14:55'),
	(19, 12, 'approved', NULL, '2026-08-12 21:15:20'),
	(20, 13, 'submitted', NULL, '2026-08-13 10:35:47'),
	(21, 13, 'reviewing', NULL, '2026-08-13 10:37:19'),
	(22, 13, 'approved', NULL, '2026-08-13 10:37:46'),
	(23, 13, 'appointment', 'จะซอมภายใน 1-2 วัน ครับ', '2026-08-13 10:38:34'),
	(24, 14, 'submitted', NULL, '2026-08-23 17:38:57'),
	(25, 15, 'submitted', NULL, '2026-09-02 13:59:33'),
	(26, 15, 'reviewing', NULL, '2026-09-02 21:49:15'),
	(27, 14, 'reviewing', NULL, '2026-09-02 22:37:51'),
	(28, 15, 'approved', NULL, '2026-09-03 15:01:15'),
	(29, 14, 'cancelled', 'ภาพไม่ครบ', '2026-09-03 15:02:54'),
	(30, 15, 'appointment', NULL, '2026-09-03 15:47:00'),
	(31, 15, 'appointment', NULL, '2026-09-04 11:21:18'),
	(32, 15, 'appointment', NULL, '2026-09-10 22:46:17'),
	(33, 15, 'appointment', NULL, '2026-09-10 22:57:14'),
	(34, 15, 'appointment', NULL, '2026-09-10 22:57:19'),
	(35, 15, 'appointment', NULL, '2026-09-10 23:02:20'),
	(36, 15, 'appointment', 'เลื่อนกำหนดการซ่อมเป็น 11 กันยายน 2569 ช่วง 09:00 - 11:00 น.', '2026-09-10 23:05:14'),
	(37, 15, 'completed', NULL, '2026-09-11 10:59:26'),
	(38, 13, 'appointment', 'เลื่อนกำหนดการซ่อมเป็น 13 สิงหาคม 2569 ช่วง 13:00 - 15:00 น.', '2026-09-11 11:06:31'),
	(39, 15, 'accepted', NULL, '2026-09-15 21:54:02'),
	(55, 17, 'submitted', NULL, '2026-09-23 21:25:38'),
	(56, 17, 'reviewing', NULL, '2026-09-23 21:25:48'),
	(57, 17, 'approved', NULL, '2026-09-23 21:25:55'),
	(58, 17, 'appointment', 'ได้รับวันนัดหมายซ่อม 23 กันยายน 2569 ช่วง 15:00 - 17:00 น.', '2026-09-23 21:26:13'),
	(59, 17, 'completed', NULL, '2026-09-23 21:26:42'),
	(61, 17, 'complaint_reviewing', NULL, '2026-09-23 21:27:30'),
	(62, 17, 'complaint_approved', NULL, '2026-09-23 21:37:05'),
	(63, 17, 'appointment', 'ได้รับวันนัดหมายซ่อม 24 กันยายน 2569 ช่วง 15:00 - 17:00 น.', '2026-09-23 21:50:10'),
	(64, 17, 'completed', NULL, '2026-09-24 11:46:03'),
	(65, 17, 'complaint_filed', 'แย่มาก', '2026-09-30 21:41:25'),
	(66, 17, 'complaint_reviewing', NULL, '2026-09-30 21:43:16'),
	(67, 17, 'complaint_rejected', 'ไม่มีหลักฐาย', '2026-09-30 21:43:48'),
	(68, 17, 'complaint_filed', 'I love JZB Studio', '2026-10-01 13:32:13'),
	(69, 17, 'complaint_reviewing', NULL, '2026-10-01 13:32:44'),
	(70, 17, 'complaint_approved', NULL, '2026-10-01 14:18:30'),
	(71, 17, 'appointment', 'ระบบจัดคิวนัดหมายซ่อมให้อัตโนมัติ 1 ตุลาคม 2569 ช่วง 15:00 - 17:00 น.', '2026-10-01 14:18:30'),
	(72, 17, 'appointment', 'เลื่อนกำหนดการซ่อมเป็น 2 ตุลาคม 2569 ช่วง 09:00 - 11:00 น.', '2026-10-01 14:21:10'),
	(73, 18, 'submitted', NULL, '2026-10-03 17:51:45'),
	(74, 18, 'reviewing', NULL, '2026-10-03 17:54:47'),
	(75, 18, 'approved', NULL, '2026-10-03 17:55:14'),
	(76, 18, 'appointment', 'เจ้าหน้าที่นัดหมายวันซ่อมให้คุณแล้ว 5 ตุลาคม 2569 ช่วง 09:00 - 11:00 น.', '2026-10-03 17:55:14'),
	(77, 19, 'submitted', NULL, '2026-10-06 15:03:08'),
	(78, 19, 'reviewing', NULL, '2026-10-06 15:03:18'),
	(79, 19, 'approved', NULL, '2026-10-06 15:03:43'),
	(80, 19, 'appointment', 'เจ้าหน้าที่นัดหมายวันซ่อมให้คุณแล้ว 7 ตุลาคม 2569 ช่วง 09:00 - 11:00 น.', '2026-10-06 15:03:43'),
	(81, 19, 'appointment', 'กำหนดการซ่อม 7 ตุลาคม 2569 ช่วง 09:00 - 11:00 น. (รับทราบค่ะ)', '2026-10-06 16:15:04'),
	(82, 20, 'submitted', NULL, '2026-10-07 14:08:17'),
	(83, 20, 'student_cancelled', 'ไม่เอาแล้ว', '2026-10-07 14:10:57'),
	(84, 21, 'submitted', NULL, '2026-10-07 14:12:16'),
	(85, 21, 'reviewing', NULL, '2026-10-09 21:56:31'),
	(86, 21, 'approved', 'คุณไม่อนุญาตให้ช่างเข้าห้อง กรุณาติดต่อเจ้าหน้าที่ สมหญิง หญิงสม เบอร์ 0954594890 เพื่อนัดหมายวันที่สะดวก', '2026-10-12 15:36:50'),
	(87, 21, 'appointment', 'ได้รับวันนัดหมายซ่อม 12 ตุลาคม 2569 ช่วง 09:00 - 11:00 น.', '2026-10-12 15:37:14'),
	(88, 21, 'appointment', 'เลื่อนกำหนดการซ่อมเป็น 13 ตุลาคม 2569 ช่วง 09:00 - 11:00 น.', '2026-10-12 15:37:23'),
	(89, 21, 'appointment', 'เลื่อนกำหนดการซ่อมเป็น 14 ตุลาคม 2569 ช่วง 09:00 - 11:00 น.', '2026-10-12 15:37:33'),
	(90, 24, 'submitted', NULL, '2026-10-13 15:29:00'),
	(91, 24, 'cancelled', 'ส่งใหม่', '2026-10-13 16:00:51'),
	(92, 25, 'submitted', NULL, '2026-10-13 16:26:13'),
	(93, 25, 'reviewing', NULL, '2026-10-13 16:37:15'),
	(94, 25, 'approved', NULL, '2026-10-13 16:37:22'),
	(95, 25, 'appointment', 'เจ้าหน้าที่นัดหมายวันซ่อมให้คุณแล้ว 14 ตุลาคม 2569 ช่วง 09:00 - 11:00 น.', '2026-10-13 16:37:22'),
	(96, 25, 'appointment', 'เลื่อนกำหนดการซ่อมเป็น 14 ตุลาคม 2569 ช่วง 15:00 - 17:00 น. จากเดิม 14 ตุลาคม 2569 ช่วง 09:00 - 11:00 น. (เดี๋ยวช่างจะซ่อมกระจกครับ)', '2026-10-13 20:36:28'),
	(97, 25, 'completed', NULL, '2026-10-13 21:07:51'),
	(98, 25, 'complaint_filed', 'กระจกซอมไม่เรียบร้อย', '2026-10-13 21:41:00'),
	(99, 25, 'complaint_reviewing', NULL, '2026-10-13 21:41:42'),
	(100, 25, 'complaint_approved', NULL, '2026-10-13 21:41:45'),
	(101, 25, 'appointment', 'เจ้าหน้าที่นัดหมายวันซ่อมให้คุณแล้ว 14 ตุลาคม 2569 ช่วง 13:00 - 15:00 น.', '2026-10-13 21:41:45');

-- Dumping structure for table dorm_repair.repair_type
CREATE TABLE IF NOT EXISTS `repair_type` (
  `repair_type_id` int(11) NOT NULL AUTO_INCREMENT,
  `repair_type_name` varchar(100) NOT NULL,
  PRIMARY KEY (`repair_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.repair_type: ~6 rows (approximately)
INSERT INTO `repair_type` (`repair_type_id`, `repair_type_name`) VALUES
	(1, 'งานไฟฟ้า'),
	(2, 'งานประปา'),
	(3, 'งานเฟอร์นิเจอร์'),
	(4, 'งานห้อง'),
	(5, 'งานอินเทอร์เน็ต'),
	(6, 'อื่นๆ');

-- Dumping structure for table dorm_repair.role
CREATE TABLE IF NOT EXISTS `role` (
  `role_id` int(5) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  PRIMARY KEY (`role_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.role: ~3 rows (approximately)
INSERT INTO `role` (`role_id`, `role_name`) VALUES
	(1, 'นักศึกษา'),
	(2, 'เจ้าหน้าที่'),
	(3, 'ช่าง');

-- Dumping structure for table dorm_repair.rush_log
CREATE TABLE IF NOT EXISTS `rush_log` (
  `rush_log_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `rush_reason_id` int(11) NOT NULL,
  `reason_note` varchar(200) DEFAULT NULL COMMENT 'ข้อความที่นักศึกษาพิมพ์ (บังคับเฉพาะเหตุผล "อื่นๆ")',
  `rushed_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`rush_log_id`),
  KEY `idx_rush_log_request` (`request_id`),
  KEY `idx_rush_log_reason` (`rush_reason_id`),
  KEY `idx_rush_log_time` (`rushed_at`),
  CONSTRAINT `fk_rush_log_reason` FOREIGN KEY (`rush_reason_id`) REFERENCES `rush_reason` (`rush_reason_id`),
  CONSTRAINT `fk_rush_log_request` FOREIGN KEY (`request_id`) REFERENCES `repair_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.rush_log: ~0 rows (approximately)

-- Dumping structure for table dorm_repair.rush_reason
CREATE TABLE IF NOT EXISTS `rush_reason` (
  `rush_reason_id` int(11) NOT NULL AUTO_INCREMENT,
  `rush_reason_name` varchar(100) NOT NULL,
  `is_urgent` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`rush_reason_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.rush_reason: ~5 rows (approximately)
INSERT INTO `rush_reason` (`rush_reason_id`, `rush_reason_name`, `is_urgent`) VALUES
	(1, 'ช่างไม่มาตามนัด', 0),
	(2, 'ช่างมาแล้วแต่ยังซ่อมไม่เสร็จ', 0),
	(3, 'ยังไม่มีการติดต่อกลับ', 0),
	(4, 'กระทบความปลอดภัย / การใช้ห้องพัก', 1),
	(5, 'อื่นๆ (ระบุเพิ่ม)', 0);

-- Dumping structure for table dorm_repair.specialty
CREATE TABLE IF NOT EXISTS `specialty` (
  `specialty_id` int(11) NOT NULL AUTO_INCREMENT,
  `specialty_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`specialty_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.specialty: ~5 rows (approximately)
INSERT INTO `specialty` (`specialty_id`, `specialty_name`) VALUES
	(1, 'ช่างทั่วไป'),
	(2, 'ช่างไฟฟ้า'),
	(3, 'ช่างประปา'),
	(4, 'ช่างห้อง'),
	(5, 'ช่างอินเทอร์เน็ต');

-- Dumping structure for table dorm_repair.student
CREATE TABLE IF NOT EXISTS `student` (
  `student_id` int(11) NOT NULL AUTO_INCREMENT,
  `person_id` int(11) DEFAULT NULL,
  `room_number` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`student_id`),
  KEY `person_id` (`person_id`),
  CONSTRAINT `1` FOREIGN KEY (`person_id`) REFERENCES `person` (`person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.student: ~3 rows (approximately)
INSERT INTO `student` (`student_id`, `person_id`, `room_number`) VALUES
	(1, 1, '111035'),
	(4, 13, '111040'),
	(5, 16, '101011');

-- Dumping structure for table dorm_repair.technician
CREATE TABLE IF NOT EXISTS `technician` (
  `technician_id` int(11) NOT NULL AUTO_INCREMENT,
  `person_id` int(11) DEFAULT NULL,
  `specialty_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`technician_id`),
  KEY `person_id` (`person_id`),
  KEY `specialty_id` (`specialty_id`),
  CONSTRAINT `1` FOREIGN KEY (`person_id`) REFERENCES `person` (`person_id`),
  CONSTRAINT `2` FOREIGN KEY (`specialty_id`) REFERENCES `specialty` (`specialty_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.technician: ~2 rows (approximately)
INSERT INTO `technician` (`technician_id`, `person_id`, `specialty_id`) VALUES
	(1, 3, 1),
	(5, 12, 2),
	(6, 15, 5);

-- Dumping structure for table dorm_repair.unit
CREATE TABLE IF NOT EXISTS `unit` (
  `unit_id` int(11) NOT NULL AUTO_INCREMENT,
  `unit_name` varchar(30) NOT NULL COMMENT 'เช่น ชิ้น, ม้วน, หลอด, ชุด',
  PRIMARY KEY (`unit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Dumping data for table dorm_repair.unit: ~8 rows (approximately)
INSERT INTO `unit` (`unit_id`, `unit_name`) VALUES
	(1, 'ชิ้น'),
	(2, 'ตัว'),
	(3, 'ชุด'),
	(4, 'ดวง'),
	(5, 'บาน'),
	(6, 'เส้น'),
	(7, 'ผืน'),
	(8, 'เครื่อง'),
	(9, 'หลัง');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
