/**
 * Google Apps Script Webhook để nhận dữ liệu và NHÚNG ẢNH MÀN CHƠI từ Game Level Deconstructor Tool
 * Hỗ trợ xuất Đa Bảng Tính (Multi-Tab Game Deconstruction Suite):
 * 1. Level Matrix
 * 2. Mechanics & FTUE
 * 3. Boosters & Unlocks
 * 4. Pacing & Difficulty
 * 5. Executive Summary
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService.createTextOutput(JSON.stringify({
      status: "active",
      spreadsheet_name: ss.getName(),
      sheets: ss.getSheets().map(function(s) { return s.getName(); })
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

    // -------------------------------------------------------------
    // CHẾ ĐỘ 1: XUẤT ĐA TAB (MULTI-TAB GAME DECONSTRUCTION SUITE)
    // -------------------------------------------------------------
    if (data.multi_tab && data.sheets && data.sheets.length > 0) {
      for (var sIdx = 0; sIdx < data.sheets.length; sIdx++) {
        var sData = data.sheets[sIdx];
        var tabTitle = gameName + " - " + sData.sheet_name;
        if (tabTitle.length > 50) {
          tabTitle = tabTitle.substring(0, 50);
        }

        renderCustomSheet(ss, tabTitle, sData.headers, sData.rows, sData.column_widths);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Đã xuất thành công " + data.sheets.length + " tabs phân tích Game Design lên Google Sheet!",
        game_name: gameName,
        sheet_url: ss.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // -------------------------------------------------------------
    // CHẾ ĐỘ 2: TƯƠNG THÍCH NGƯỢC (LEGACY SINGLE SHEET LEVEL MATRIX)
    // -------------------------------------------------------------
    var sheet = ss.getSheetByName(gameName);
    if (!sheet) {
      sheet = ss.insertSheet(gameName);
    } else {
      sheet.clear();
    }

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

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1e3a8a");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 38);
    sheet.setFrozenRows(1);

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
      var tableValues = [];
      for (var i = 0; i < rowCount; i++) {
        var lvl = levels[i];

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

      var dataRange = sheet.getRange(2, 1, rowCount, headers.length);
      dataRange.setValues(tableValues);

      sheet.getRange(2, 6, rowCount, 1).setNumberFormat("0");
      sheet.getRange(2, 4, rowCount, 2).setNumberFormat("@");
      sheet.setRowHeights(2, rowCount, 110);

      dataRange.setHorizontalAlignment("center");
      dataRange.setVerticalAlignment("middle");
      dataRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
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

/**
 * Hàm chung render một Sheet chuyên sâu bất kỳ với định dạng chuẩn
 */
function renderCustomSheet(ss, tabTitle, headers, rows, colWidths) {
  var sheet = ss.getSheetByName(tabTitle);
  if (!sheet) {
    sheet = ss.insertSheet(tabTitle);
  } else {
    sheet.clear();
  }

  if (!headers || headers.length === 0) return;

  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1e3a8a");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);

  // Set column widths if provided
  if (colWidths) {
    for (var colIdx in colWidths) {
      try {
        sheet.setColumnWidth(parseInt(colIdx), parseInt(colWidths[colIdx]));
      } catch (eW) {}
    }
  }

  if (!rows || rows.length === 0) return;

  var hasImage = false;
  var tableValues = [];

  for (var r = 0; r < rows.length; r++) {
    var rowData = rows[r];
    var formattedRow = [];

    for (var c = 0; c < rowData.length; c++) {
      var cell = rowData[c];
      if (cell && typeof cell === "object" && cell.type === "image") {
        hasImage = true;
        try {
          var img = SpreadsheetApp.newCellImage()
            .setSourceUrl(cell.url)
            .setAltTextTitle("Image")
            .build();
          formattedRow.push(img);
        } catch (eImg) {
          formattedRow.push("-");
        }
      } else if (cell && typeof cell === "object" && cell.type === "text") {
        formattedRow.push(cell.value);
      } else {
        formattedRow.push(cell != null ? cell : "");
      }
    }
    tableValues.push(formattedRow);
  }

  var dataRange = sheet.getRange(2, 1, rows.length, headers.length);
  try {
    dataRange.setValues(tableValues);
  } catch (errSet) {
    // Fallback: If an image fails to fetch from CDN, insert safe strings to avoid blocking export
    var safeValues = [];
    for (var rIdx = 0; rIdx < tableValues.length; rIdx++) {
      var sRow = [];
      for (var cIdx = 0; cIdx < tableValues[rIdx].length; cIdx++) {
        var v = tableValues[rIdx][cIdx];
        sRow.push(typeof v === "object" && v !== null ? "[Ảnh đang cập nhật]" : v);
      }
      safeValues.push(sRow);
    }
    dataRange.setValues(safeValues);
  }

  var rowHeight = hasImage ? 110 : 35;
  sheet.setRowHeights(2, rows.length, rowHeight);

  dataRange.setHorizontalAlignment("center");
  dataRange.setVerticalAlignment("middle");
  dataRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
}
