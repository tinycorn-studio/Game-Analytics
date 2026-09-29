/**
 * Google Apps Script Webhook để nhận dữ liệu và NHÚNG ẢNH MÀN CHƠI từ Game Level Deconstructor Tool
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
    
    // 1. Tìm hoặc tạo Sheet theo tên game
    var sheet = ss.getSheetByName(gameName);
    if (!sheet) {
      sheet = ss.insertSheet(gameName);
    } else {
      sheet.clear(); // Xóa dữ liệu cũ để cập nhật mới
    }
    
    // 2. Tiêu đề các cột
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
    
    // Cài đặt độ rộng cột chuẩn hiển thị ảnh điện thoại
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
        
        // Tạo công thức nhúng ảnh trực tiếp vào ô tính
        var boardFormula = "-";
        if (lvl.board_url) {
          boardFormula = '=HYPERLINK("' + lvl.board_url + '", IMAGE("' + lvl.board_url + '"))';
        }
        
        var victoryFormula = "-";
        if (lvl.victory_url) {
          victoryFormula = '=HYPERLINK("' + lvl.victory_url + '", IMAGE("' + lvl.victory_url + '"))';
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
