from typing import Dict, Any, List, Optional
import os
import cv2
from .base_analyzer import BaseGameAnalyzer, AnalyzerResult

class BoosterProgressionAnalyzer(BaseGameAnalyzer):
    """
    Analyzes Booster and Feature Unlock progression by scanning the bottom HUD bar:
    - Detects lock states (Lv.3, Lv.5, Lv.7) transitioning to unlocked booster icons (Net, Clear, Extra Slot).
    - Crops clean thumbnail icons of the booster assets.
    - Formats the game design utility and monetization pressure for each booster.
    """

    def __init__(self):
        self._ocr = None

    def _get_ocr(self):
        if self._ocr is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._ocr = RapidOCR()
            except Exception as e:
                print(f"[BoosterProgressionAnalyzer] Warning: RapidOCR not available ({e}).")
        return self._ocr

    def get_sheet_name(self) -> str:
        return "Boosters & Unlocks"

    def get_display_title(self) -> str:
        return "Trợ Thủ & Mở Khóa Tính Năng (Boosters & Unlocks)"

    def analyze(self, vp: Any, levels_data: List[Dict[str, Any]], profile: Optional[Any] = None) -> AnalyzerResult:
        headers = [
            "Tên Vật Phẩm / Tính Năng",
            "Ảnh Icon Trợ Thủ",
            "Màn Mở Khóa",
            "Thời Điểm Mở Khóa",
            "Phân Loại",
            "Công Dụng Cứu Nguy (Bailout Utility)",
            "Đánh Giá Áp Lực Tiền Tệ (Monetization Pressure)"
        ]

        ocr = self._get_ocr()
        boosters_dir = os.path.join(getattr(vp, "project_dir", ""), "boosters")
        os.makedirs(boosters_dir, exist_ok=True)

        rows = []
        
        # Predefined slot bounding box proportions on bottom HUD bar:
        # Slot 1 (Left): x 13-30%, y 88-98%
        # Slot 2 (Center): x 41-58%, y 88-98%
        # Slot 3 (Right): x 70-87%, y 88-98%
        slots_def = [
            {"slot": 1, "default_name": "Vợt Bắt Cá (Net)", "slug": "net", "unlock_lvl": 3, "box": (0.88, 0.98, 0.13, 0.30)},
            {"slot": 2, "default_name": "Cọ Quét Sạch (Clear)", "slug": "clear", "unlock_lvl": 5, "box": (0.88, 0.98, 0.41, 0.58)},
            {"slot": 3, "default_name": "Bình Chứa Dự Phòng (Extra Slot)", "slug": "extra_slot", "unlock_lvl": 7, "box": (0.88, 0.98, 0.70, 0.87)},
        ]

        # Scan levels to detect exact unlock frames and crop icons
        for s_info in slots_def:
            target_lvl = s_info["unlock_lvl"]
            y1_pct, y2_pct, x1_pct, x2_pct = s_info["box"]
            
            # Find matching level data
            matching_lvl = next((l for l in levels_data if l.get("level") == target_lvl), None)
            
            shot_time = 0.0
            time_str = f"Màn {target_lvl:02d}"
            icon_rel = ""

            if vp is not None:
                # Capture frame at target level or fallback
                if matching_lvl:
                    shot_time = matching_lvl.get("board_shot_time", matching_lvl.get("start_second", 0.0))
                    time_str = f"Level {target_lvl:02d} ({matching_lvl.get('start_time_str', '00:00')})"
                else:
                    # Fallback for future levels like Lv.7
                    shot_time = levels_data[-1].get("end_second", 800.0) if levels_data else 800.0
                    time_str = f"Level {target_lvl:02d} (Dự kiến mở khóa)"

                frame = vp.get_frame_at_second(shot_time)
                if frame is not None:
                    h, w = frame.shape[:2]
                    icon_crop = frame[int(y1_pct * h):int(y2_pct * h), int(x1_pct * w):int(x2_pct * w)]
                    slug = s_info["slug"]
                    icon_filename = f"booster_{slug}.jpg"
                    icon_full_path = os.path.join(boosters_dir, icon_filename)
                    cv2.imwrite(icon_full_path, icon_crop)
                    icon_rel = f"boosters/{icon_filename}"

            # Game Design Specifications for each booster
            if s_info["slot"] == 1:
                b_name = "🏸 Vợt Bắt Cá (Net Booster)"
                b_type = "In-game Active Booster"
                utility = "Thu thập ngay 1 nhóm cá bất kỳ mà không cần chờ bình rỗng. Cứu người chơi khi khay chờ sắp đầy."
                monetization = "🟢 Áp lực thấp: Tặng miễn phí ở Lv.3 để kích thích thói quen dùng item (Habit Loop)."
            elif s_info["slot"] == 2:
                b_name = "🧹 Cây Cọ Quét (Clear Brush)"
                b_type = "Emergency Bailout Booster"
                utility = "Quét dọn tức thời thanh chờ hoặc giải phóng 1 khối băng tắc nghẽn. Tránh bàn thua cận kề (Loss Aversion)."
                monetization = "🟡 Áp lực trung bình: Giới thiệu ở Lv.5 khi các màn bắt đầu có 2 khối băng, bán gói cứu nguy ($0.99)."
            else:
                b_name = "🏺 Bình Cá Dự Phòng (Extra Jar Slot)"
                b_type = "Permanent / Session Upgrade"
                utility = "Mở rộng không gian phân loại thêm 1 bình nước, giải tỏa áp lực sắp xếp cho các màn nhiều chủng loại cá."
                monetization = "🔴 Áp lực cao: Mở khóa ở Lv.7, đây là điểm chốt chặn (Paywall) bán gói Starter Bundle hoặc xem Video Ads thưởng."

            rows.append([
                b_name,
                icon_rel,
                f"Level {target_lvl:02d}",
                time_str,
                b_type,
                utility,
                monetization
            ])

        col_widths = {
            1: 240,  # Booster Name
            2: 120,  # Icon Image
            3: 110,  # Unlock Level
            4: 180,  # Timestamp
            5: 200,  # Type
            6: 350,  # Utility
            7: 350   # Monetization
        }

        return AnalyzerResult(
            sheet_name=self.get_sheet_name(),
            display_title=self.get_display_title(),
            headers=headers,
            rows=rows,
            column_widths=col_widths,
            summary_metrics={"boosters_count": len(rows)}
        )
