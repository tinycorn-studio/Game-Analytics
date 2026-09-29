/**
 * Google Apps Script Webhook để nhận dữ liệu và NHÚNG ẢNH MÀN CHƠI từ Game Level Deconstructor Tool
 * 
 * HƯỚNG DẪN CẬP NHẬT TRONG 1 PHÚT:
 * 1. Mở file Google Sheet của bạn -> Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Xóa toàn bộ mã cũ trong Code.gs, dán toàn bộ đoạn mã mới này vào.
 * 3. Bấm nút 💾 Lưu (Ctrl + S).
 * 4. Bấm nút "Triển khai" (Deploy) ở góc trên bên phải:
 *    - Chọn "Quản lý bản triển khai" (Manage deployments).
 *    - Bấm vào biểu tượng cây bút (Chỉnh sửa - Edit).
 *    - Tại mục "Phiên bản" (Version), chọn "Phiên bản mới" (New version).
 *    - Bấm "Triển khai" (Deploy).
 * 5. Giờ bạn bấm nút "Xuất Google Sheet" trên Tool là ảnh sẽ tự động nhúng vào từng ô tính!
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
    var gameName = data.game_name || "Game_Analysis";
    
    // 1. Quản lý thư mục lưu trữ ảnh trên Google Drive của bạn
    var rootFolderName = "Game_Analytics_Screenshots";
    var rootFolders = DriveApp.getFoldersByName(rootFolderName);
    var rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(rootFolderName);
    
    var gameFolders = rootFolder.getFoldersByName(gameName);
    var gameFolder = gameFolders.hasNext() ? gameFolders.next() : rootFolder.createFolder(gameName);
    
    // 2. Tìm hoặc tạo Sheet theo tên game
    var sheet = ss.getSheetByName(gameName);
    if (!sheet) {
      sheet = ss.insertSheet(gameName);
    } else {
      sheet.clear(); // Xóa cũ để cập nhật mới
    }
    
    // 3. Tiêu đề các cột
    var headers = [
      "Màn (Level)",
      "Ảnh Khởi Đầu (Board Start)",
      "Ảnh Chiến Thắng (Victory / Reward)",
      "Thời Gian Bắt Đầu",
      "Thời Gian Thắng",
      "Thời Lượng Giải (s)",
      "Độ Khó (Pacing)",
      "Trạng Thái",
      "Ghi Chú Game Designer"
    ];
    sheet.appendRow(headers);
    
    // Định dạng dòng Tiêu đề
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1e3a8a");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 38);
    sheet.setFrozenRows(1); // Cố định tiêu đề
    
    // Cài đặt độ rộng cột chuẩn hiển thị ảnh
    sheet.setColumnWidth(1, 95);  // Level
    sheet.setColumnWidth(2, 120); // Ảnh Board
    sheet.setColumnWidth(3, 120); // Ảnh Victory
    sheet.setColumnWidth(4, 95);  // Bắt đầu
    sheet.setColumnWidth(5, 95);  // Kết thúc
    sheet.setColumnWidth(6, 105); // Thời lượng
    sheet.setColumnWidth(7, 150); // Độ khó
    sheet.setColumnWidth(8, 110); // Trạng thái
    sheet.setColumnWidth(9, 260); // Ghi chú GD
    
    var levels = data.levels || [];
    var rowCount = levels.length;
    
    if (rowCount > 0) {
      for (var i = 0; i < rowCount; i++) {
        var lvl = levels[i];
        var rowNum = i + 2;
        
        // 4. Lưu ảnh lên Google Drive và tạo công thức nhúng ảnh
        var boardFormula = "-";
        if (lvl.board_base64) {
          try {
            var bBlob = Utilities.newBlob(Utilities.base64Decode(lvl.board_base64), "image/jpeg", gameName + "_" + lvl.level + "_board.jpg");
            var bFile = gameFolder.createFile(bBlob);
            bFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            var bId = bFile.getId();
            var bThumb = "https://lh3.googleusercontent.com/d/" + bId;
            var bView = "https://drive.google.com/file/d/" + bId + "/view";
            boardFormula = '=HYPERLINK("' + bView + '", IMAGE("' + bThumb + '"))';
          } catch (e1) {
            boardFormula = "Lỗi ảnh";
          }
        }
        
        var victoryFormula = "-";
        if (lvl.victory_base64) {
          try {
            var vBlob = Utilities.newBlob(Utilities.base64Decode(lvl.victory_base64), "image/jpeg", gameName + "_" + lvl.level + "_victory.jpg");
            var vFile = gameFolder.createFile(vBlob);
            vFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            var vId = vFile.getId();
            var vThumb = "https://lh3.googleusercontent.com/d/" + vId;
            var vView = "https://drive.google.com/file/d/" + vId + "/view";
            victoryFormula = '=HYPERLINK("' + vView + '", IMAGE("' + vThumb + '"))';
          } catch (e2) {
            victoryFormula = "Lỗi ảnh";
          }
        }
        
        // Ghi dữ liệu dòng
        sheet.getRange(rowNum, 1).setValue(lvl.level || ("Level " + (i + 1)));
        if (boardFormula.indexOf("=") === 0) {
          sheet.getRange(rowNum, 2).setFormula(boardFormula);
        } else {
          sheet.getRange(rowNum, 2).setValue(boardFormula);
        }
        
        if (victoryFormula.indexOf("=") === 0) {
          sheet.getRange(rowNum, 3).setFormula(victoryFormula);
        } else {
          sheet.getRange(rowNum, 3).setValue(victoryFormula);
        }
        
        sheet.getRange(rowNum, 4).setValue(lvl.start_time || "");
        sheet.getRange(rowNum, 5).setValue(lvl.end_time || "");
        sheet.getRange(rowNum, 6).setValue(lvl.duration || 0);
        sheet.getRange(rowNum, 7).setValue(lvl.difficulty || "Bình thường");
        sheet.getRange(rowNum, 8).setValue(lvl.status || "Hoàn thành");
        sheet.getRange(rowNum, 9).setValue(lvl.notes || "");
      }
      
      // Chỉnh chiều cao hàng 110px để hiển thị ảnh thumbnail điện thoại rõ nét
      sheet.setRowHeights(2, rowCount, 110);
      
      // Căn giữa & kẻ viền bảng
      var dataRange = sheet.getRange(2, 1, rowCount, headers.length);
      dataRange.setHorizontalAlignment("center");
      dataRange.setVerticalAlignment("middle");
      dataRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
      
      // Cột ghi chú canh lề trái
      sheet.getRange(2, 9, rowCount, 1).setHorizontalAlignment("left");
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã nhúng toàn bộ ảnh màn chơi và dữ liệu thành công lên Google Sheet!",
      sheet_name: gameName,
      sheet_url: ss.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
