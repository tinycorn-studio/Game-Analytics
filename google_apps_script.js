/**
 * Google Apps Script Webhook để nhận dữ liệu từ Game Level Deconstructor Tool
 * 
 * HƯỚNG DẪN CÀI ĐẶT TRONG 1 PHÚT:
 * 1. Mở file Google Sheet bạn muốn xuất dữ liệu vào.
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa hết mã cũ trong file Code.gs, dán toàn bộ đoạn mã này vào.
 * 4. Bấm nút "Triển khai" (Deploy) ở góc trên bên phải -> Chọn "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web App).
 *    - Mô tả: Game Analytics Webhook
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone) -> (RẤT QUAN TRỌNG để Tool gửi dữ liệu được).
 * 6. Bấm "Triển khai" (Deploy) và Cấp quyền truy cập nếu Google hỏi.
 * 7. Sao chép "URL ứng dụng web" (Web App URL) dạng: https://script.google.com/macros/s/.../exec
 * 8. Dán URL này vào nút "Xuất Google Sheet" trên Web Dashboard của Tool!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Không nhận được dữ liệu (Empty payload)"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.game_name || "Game_Analysis";
    
    // Tìm hoặc tạo tab mới theo tên game
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear(); // Xóa dữ liệu cũ để ghi đè mới
    }
    
    // Tạo tiêu đề cột
    var headers = [
      "Level", 
      "Thời gian bắt đầu", 
      "Thời gian kết thúc", 
      "Thời lượng giải (giây)", 
      "Trạng thái", 
      "Thời điểm cập nhật"
    ];
    sheet.appendRow(headers);
    
    // Định dạng dòng Tiêu đề
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1e3a8a");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
    
    // Thêm các dòng dữ liệu
    var levels = data.levels || [];
    var rows = [];
    var updateTime = data.exported_at || new Date().toLocaleString("vi-VN");
    
    for (var i = 0; i < levels.length; i++) {
      var lvl = levels[i];
      rows.push([
        lvl.level || ("Level " + (i + 1)),
        lvl.start_time || lvl.start_time_str || "",
        lvl.end_time || lvl.end_time_str || "",
        lvl.duration || lvl.duration_seconds || 0,
        lvl.status || "Hoàn thành",
        updateTime
      ]);
    }
    
    if (rows.length > 0) {
      var dataRange = sheet.getRange(2, 1, rows.length, headers.length);
      dataRange.setValues(rows);
      dataRange.setHorizontalAlignment("center");
      dataRange.setVerticalAlignment("middle");
      
      // Kẻ viền ô (borders)
      dataRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
    }
    
    // Tự động căn chỉnh độ rộng cột
    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Dữ liệu đã được cập nhật thành công lên Google Sheet!",
      sheet_name: sheetName,
      sheet_url: ss.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
