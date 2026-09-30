# 📜 QUY TẮC BẢO TRÌ & NÂNG CẤP DỰ ÁN GAME ANALYSIS

## 🚨 MANDATORY DOC & ROADMAP SYNC RULE
Mọi lần cập nhật mã nguồn (code updates), thêm tính năng mới, hoặc hoàn thành milestone BẮT BUỘC phải đồng bộ ngay lập tức vào 2 tài liệu sau trước khi bàn giao:
1. `SYSTEM_ARCHITECTURE_GUIDE.md`: Cập nhật kiến trúc, analyzer mới, cấu trúc bảng tính, khả năng áp dụng cho các game Hybrid Puzzle khác.
2. `ROADMAP_MILESTONES.md`: Tích dấu hoàn thành (`[x]`) cho các milestone đã xong và bổ sung các milestone mới.

## 🏛️ SOLID DESIGN
- Tuân thủ nghiêm ngặt SRP, OCP, LSP, ISP, DIP trong toàn bộ thư mục `core/analyzers/`.
- Mở rộng game mới qua file Profile JSON (`profiles/`) hoặc thêm Analyzer độc lập, không sửa đổi logic lõi của Aggregator.

## 📊 GOOGLE SHEETS & DASHBOARD DISPLAY
- Luôn bật `setWrap(true)` trên Google Sheets để văn bản không bị tràn hoặc cắt xén.
- Cột mô tả, diễn giải dài: Căn lề trái (`left`).
- Cột định danh, số, checkbox, tier: Căn giữa (`center`).
- Cột `Tier`: Phân biệt màu sắc (`Normal`, `Hard`, `Crazy`).
- Cột `Mechanic_unlock`: Highlight màu xanh lá cây sáng.
- Bảng Level Curve: Nhúng checkbox tương tác cho từng cột cơ chế.
