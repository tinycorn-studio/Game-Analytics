/**
 * Google Apps Script Webhook để nhận dữ liệu và NHÚNG ẢNH MÀN CHƠI từ Game Level Deconstructor Tool
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("FishSortPuzzle");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Sheet not found" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (e && e.parameter && e.parameter.test) {
      var url1 = "https://raw.githubusercontent.com/tinycorn-studio/Game-Analytics/main/projects/FishSortPuzzle/levels/level_01/board_start.jpg";
      var url2 = "https://raw.githubusercontent.com/tinycorn-studio/Game-Analytics/main/projects/FishSortPuzzle/levels/level_01/victory.jpg";
      
      // Test 1: Just =IMAGE(url)
      sheet.getRange("B2").setFormula('=IMAGE("' + url1 + '")');
      
      // Test 2: newCellImage()
      var cellImg = SpreadsheetApp.newCellImage().setSourceUrl(url2).build();
      sheet.getRange("C2").setValue(cellImg);
    }
    
    var range = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 8), sheet.getLastColumn());
    return ContentService.createTextOutput(JSON.stringify({
      values: range.getDisplayValues(),
      formulas: range.getFormulas()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

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
    
    // Xóa tab thử nghiệm nếu có
    var testSheet = ss.getSheetByName("TestGame");
    if (testSheet) {
      try { ss.deleteSheet(testSheet); } catch (eIgnore) {}
    }
    
    var levels = data.levels || [];
    var rowCount = levels.length;
    
    if (rowCount > 0) {
      // 1. Chuẩn bị mảng 2 chiều cho bảng dữ liệu và ảnh nhúng Native In-Cell
      var tableValues = [];
      for (var i = 0; i < rowCount; i++) {
        var lvl = levels[i];
        
        // Tạo đối tượng ảnh nhúng trực tiếp (Native In-Cell Image)
        var boardImg = "-";
        if (lvl.board_url) {
          try {
            boardImg = SpreadsheetApp.newCellImage()
              .setSourceUrl(lvl.board_url)
              .setAltTextTitle((lvl.level || ("Level " + (i + 1))) + " Board Start")
              .build();
          } catch (e1) {
            boardImg = "-";
          }
        }
        
        var victoryImg = "-";
        if (lvl.victory_url) {
          try {
            victoryImg = SpreadsheetApp.newCellImage()
              .setSourceUrl(lvl.victory_url)
              .setAltTextTitle((lvl.level || ("Level " + (i + 1))) + " Victory Screen")
              .build();
          } catch (e2) {
            victoryImg = "-";
          }
        }
        
        tableValues.push([
          lvl.level || ("Level " + (i + 1)),
          boardImg,
          victoryImg,
          lvl.start_time || "",
          lvl.end_time || "",
          parseInt(lvl.duration) || 0,
          lvl.difficulty || "Bình thường",
          lvl.status || "Hoàn thành",
          lvl.notes || ""
        ]);
      }
      
      // Ghi toàn bộ dữ liệu & ảnh vào bảng trong 1 thao tác (Batch setValues)
      var dataRange = sheet.getRange(2, 1, rowCount, headers.length);
      dataRange.setValues(tableValues);
      
      // Định dạng số nguyên cho cột 6 (Thời lượng giải) để không bao giờ bị nhảy sang dạng Ngày Tháng
      sheet.getRange(2, 6, rowCount, 1).setNumberFormat("0");
      sheet.getRange(2, 4, rowCount, 2).setNumberFormat("@"); // Cột 4, 5 dạng text
      
      // Chỉnh chiều cao hàng 110px để hiển thị ảnh thumbnail điện thoại rõ nét
      sheet.setRowHeights(2, rowCount, 110);
      
      // Căn giữa & kẻ viền bảng
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
