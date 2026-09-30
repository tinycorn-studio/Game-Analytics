# 📜 QUY TẮC PHÁT TRIỂN & BẢO TRÌ HỆ THỐNG (AGENT GUIDELINES & RULES)

Tài liệu này định nghĩa các quy tắc bắt buộc mà AI Assistant (Antigravity) và các kỹ sư phần mềm phải tuân thủ trong suốt quá trình phát triển, nâng cấp và mở rộng repository **Game Level Deconstructor (Game-Analytics)**.

---

## 🚨 QUY TẮC BẮT BUỘC 1: ĐỒNG BỘ TÀI LIỆU HỆ THỐNG (MANDATORY DOC SYNC)
> **Mọi lần cập nhật mã nguồn (code updates), thêm tính năng mới, hoặc hoàn thành milestone BẮT BUỘC phải đồng bộ ngay lập tức vào 2 tài liệu sau trước khi bàn giao cho người dùng:**
> 1. **`SYSTEM_ARCHITECTURE_GUIDE.md`**: Cập nhật sơ đồ kiến trúc, mô tả các analyzer mới, cấu trúc dữ liệu bảng tính, và hướng dẫn mở rộng cho các game Hybrid Puzzle khác.
> 2. **`ROADMAP_MILESTONES.md`**: Tích dấu hoàn thành (`[x]`) cho các milestone đã xong và bổ sung các milestone kế tiếp nếu có yêu cầu mới.

---

## 🏛️ QUY TẮC BẮT BUỘC 2: TUÂN THỦ NGUYÊN LÝ THIẾT KẾ SOLID
1. **Single Responsibility Principle (SRP)**:
   - Mỗi Analyzer trong `core/analyzers/` chỉ giải quyết 1 khía cạnh chuyên sâu của Game Design (ví dụ: `MechanicsCatalogAnalyzer` cho danh mục cơ chế, `LevelCurveMechanicsAnalyzer` cho ma trận tiến trình độ khó).
   - Tách biệt hoàn toàn tầng bóc tách Computer Vision (`VideoProcessor`) với tầng phân tích số liệu (`BaseGameAnalyzer`).
2. **Open/Closed Principle (OCP)**:
   - Khi hỗ trợ game mới hoặc chỉ số mới, ưu tiên tạo thêm class Analyzer mới kế thừa `BaseGameAnalyzer` hoặc tạo file Game Profile JSON trong `profiles/`. Tuyệt đối không làm thay đổi các contract điều phối trong `GameDesignAggregator`.
3. **Dependency Inversion Principle (DIP)**:
   - Các module cấp cao (như Aggregator, Flask API) chỉ giao tiếp qua abstract interface `BaseGameAnalyzer`.

---

## 📊 QUY TẮC BẮT BUỘC 3: ĐỊNH DẠNG BẢNG TÍNH & HIỂN THỊ CHUẨN XUẤT BẢN
1. **Không để tràn chữ / cắt chữ (Text Wrap & Smart Alignment)**:
   - Trên Google Sheets: Bắt buộc gọi `dataRange.setWrap(true)`.
   - Cột diễn giải dài (Mô tả, Quy tắc, Cách hóa giải, Áp lực tiền tệ, Khuyến nghị GD) **bắt buộc căn lề trái (`left`)** và có độ rộng tối thiểu 350px.
   - Cột định danh, số liệu, cấp độ, thời gian, Checkbox, Tier **bắt buộc căn giữa (`center`)**.
2. **Trực quan hóa Phân Tầng Độ Khó (Tiering & Highlights)**:
   - Cột `Tier`: Tô màu badge phân biệt (`Normal` xám nhẹ, `Hard` xanh dương, `Crazy` đỏ nổi bật).
   - Cột `Mechanic_unlock`: Tô màu nền xanh lá cây sáng (`#86efac`) làm nổi bật các màn mở khóa cơ chế mới.
   - Các cột cơ chế trong bảng Level Curve: Sử dụng checkbox tương tác thật (`insertCheckboxes()` trên Sheet, checkbox icon trên Web).
