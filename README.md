# 🎮 Game Level Deconstructor & Competitor Analytics Tool

> Công cụ tự động phân tích, bóc tách màn chơi (levels) của game đối thủ từ video quay màn hình gameplay, xuất ảnh các màn và ma trận dữ liệu Excel/CSV phục vụ nghiên cứu thị trường và thiết kế Game (Level Design).

---

## 🌟 Tính Năng Nổi Bật (Key Features)

- **Chuẩn hóa Video tự động (Auto-Rotate & Crop)**: Tự động phát hiện hướng quay ngang 90° từ các giả lập Android (BlueStacks, Nox, LDPlayer...) để xoay dọc về chuẩn mobile màn hình dọc.
- **Phát hiện Màn chơi bằng Computer Vision (Scene & Victory Detection)**: Tự động quét và bắt chính xác sự kiện chiến thắng (`VICTORY`), tính toán thời gian giải từng màn và số màn hoàn thành.
- **Trích xuất Hình ảnh Tự động (Asset Extraction)**: Cắt và lưu tự động ảnh bố cục lúc bắt đầu ván (`board_start.jpg`) và ảnh kết quả/phần thưởng (`victory.jpg`).
- **Xuất Báo cáo Ma trận Cấp độ (Export Matrix Report)**: Tự động tạo bảng ma trận chi tiết thời gian giải từng màn dưới dạng `.xlsx` (Excel định dạng đẹp) và `.csv`.
- **Đồng Bộ Trực Tiếp Lên Google Sheets (Google Sheets Webhook Sync)**: Tích hợp nút xuất 1-click đẩy toàn bộ dữ liệu bảng ma trận lên Google Sheet của team qua Google Apps Script Webhook.
- **Giao diện Web Localhost Trực quan (Web Dashboard)**: Chạy trên trình duyệt tại `http://localhost:5000` với đầy đủ tính năng:
  - Quản lý đa dự án game đối thủ.
  - Nút bấm phân tích 1-click kèm thanh tiến trình (progress bar).
  - So sánh trực quan bố cục bàn chơi và ảnh chiến thắng trong popup.
  - Tải file Excel/CSV và xuất trực tiếp lên Google Sheets.
- **Khởi động 1-Click (`run_tool.bat`)**: Nhấp đúp chuột là tự bật server và tự mở trình duyệt.

---

## 📁 Cấu Trúc Thư Mục Tinh Gọn (Directory Structure)

```text
GameAnalysis/
├── app.py                          # Backend máy chủ Web Localhost (Flask)
├── run_tool.bat                    # Phím tắt 1-click khởi chạy và mở trình duyệt
├── requirements.txt                # Thư viện phụ thuộc Python
│
├── core/                           # Bộ lõi Computer Vision & Data Export
│   ├── video_processor.py         # Xử lý video, lấy mẫu frame, xoay dọc
│   ├── level_detector.py          # Thuật toán bắt sự kiện VICTORY & gom cụm level
│   └── report_generator.py        # Xuất dữ liệu bảng ma trận Excel (.xlsx) & CSV (.csv)
│
├── templates/index.html            # Giao diện Web HTML Dashboard
├── static/                         # Tài nguyên giao diện (CSS / JavaScript)
│   ├── css/style.css
│   └── js/dashboard.js
│
└── projects/                       # Nơi lưu trữ các dự án game đối thủ
    └── FishSortPuzzle/             # Dự án mẫu thực nghiệm
        ├── input_videos/           # Chứa video gốc (.mp4)
        ├── levels/                 # Các folder màn chơi chứa ảnh JPG đã bóc tách
        │   ├── level_01/ (board_start.jpg, victory.jpg)
        │   ├── level_02/ (board_start.jpg, victory.jpg)
        │   └── ...
        ├── report.xlsx             # Bảng ma trận cấp độ định dạng Excel
        └── report.csv              # Bảng ma trận cấp độ dạng CSV
```

---

## 🚀 Hướng Dẫn Cài Đặt & Sử Dụng (Getting Started)

### 1. Yêu Cầu Hệ Thống
- Hệ điều hành: Windows 10/11
- Python 3.10 trở lên

### 2. Cài Đặt Thư Viện
Mở PowerShell hoặc Command Prompt tại thư mục dự án và chạy:
```bash
pip install -r requirements.txt
```

### 3. Khởi Động Công Cụ
- **Cách 1 (Tiện lợi nhất)**: Nhấp đúp chuột vào file `run_tool.bat`. Trình duyệt sẽ tự động mở trang:
  ```text
  http://127.0.0.1:5000
  ```
- **Cách 2**: Chạy lệnh qua terminal:
  ```bash
  python app.py
  ```

---

## 🎯 Quy Trình Phân Tích Game Mới (Workflow)

1. **Tạo dự án mới**: Trên Web Dashboard, bấm **"+ Tạo Dự Án Mới"** và nhập tên game (ví dụ: `ScrewJam`, `RoyalMatch`).
2. **Bỏ video vào thư mục**: Copy file video gameplay quay màn hình (`.mp4`) thả vào thư mục:
   `projects/[Tên_Game]/input_videos/`
3. **Phân tích**: Trên Web Dashboard, chọn video vừa thả và bấm **"BẮT ĐẦU PHÂN TÍCH"**.
4. **Xem kết quả & Tải báo cáo**:
   - Xem ma trận level và preview ảnh chụp từng màn.
   - Nhấp **"Tải Báo Cáo Excel (.xlsx)"** hoặc **"Tải CSV"**.
   - Nhấp **"Xuất Google Sheet"** để đồng bộ trực tiếp lên Google Drive của team.

---

## 📊 Hướng Dẫn Đồng Bộ Google Sheets (Chỉ 1 Phút)

1. Mở file Google Sheet bất kỳ trên Google Drive của bạn.
2. Chọn **Tiện ích mở rộng (Extensions)** > **Apps Script**.
3. Sao chép toàn bộ nội dung trong file [`google_apps_script.js`](./google_apps_script.js) dán vào `Code.gs`.
4. Bấm **Triển khai (Deploy)** ở góc trên bên phải > **Tùy chọn triển khai mới (New deployment)**:
   - Loại: **Ứng dụng web (Web App)**
   - Thực thi dưới dạng (Execute as): **Tôi (Me)**
   - Quyền truy cập (Who has access): **Bất kỳ ai (Anyone)**
5. Bấm **Triển khai (Deploy)** và sao chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
6. Trên Web Dashboard của Tool, bấm nút **"Xuất Google Sheet"**, dán URL này vào và bấm **"Gửi Lên Sheet Ngay"**. Dữ liệu sẽ tự động tạo tab mới mang tên game và kẻ bảng đẹp mắt!

---

## 📄 License
MIT License - Developed by tinycorn-studio.
