from typing import Dict, Any, List, Optional
import os
import cv2
import numpy as np
from .base_analyzer import BaseGameAnalyzer, AnalyzerResult

class FTUEMechanicsAnalyzer(BaseGameAnalyzer):
    """
    Analyzes First-Time User Experience (FTUE) and progressive mechanic introductions:
    - Detects instructional tutorial popups and banners via Computer Vision / RapidOCR.
    - Classifies tutorial types: Forced Tutorial (Hand pointer) vs Contextual Hint vs Passive.
    - Tracks when new obstacles (Ice Block, Locked Bubble) are introduced and their design rules.
    """

    def __init__(self):
        self._ocr = None

    def _get_ocr(self):
        if self._ocr is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._ocr = RapidOCR()
            except Exception as e:
                print(f"[FTUEMechanicsAnalyzer] Warning: RapidOCR not available ({e}).")
        return self._ocr

    def get_sheet_name(self) -> str:
        return "Mechanics & FTUE"

    def get_display_title(self) -> str:
        return "Lộ Trình Cơ Chế & Tân Thủ (Mechanics & FTUE)"

    def analyze(self, vp: Any, levels_data: List[Dict[str, Any]], profile: Optional[Any] = None) -> AnalyzerResult:
        headers = [
            "Màn (Level)",
            "Cơ Chế / Chướng Ngại Vật",
            "Ảnh Minh Họa Hướng Dẫn",
            "Lời Thoại Hướng Dẫn (OCR)",
            "Phân Loại FTUE",
            "Quy Tắc Tương Tác",
            "Tác Động Game Design"
        ]

        ocr = self._get_ocr()
        rows = []
        mechanics_seen = set()

        for lvl in levels_data:
            lvl_num = lvl.get("level", 1)
            lvl_str = f"Level {lvl_num:02d}"
            start_sec = lvl.get("start_second", 0.0)
            if start_sec == 0.0 and "start_time_str" in lvl:
                parts = lvl["start_time_str"].split(":")
                start_sec = int(parts[0]) * 60 + int(parts[1])

            # Scan frames around level start to locate tutorial dialogs
            detected_text = ""
            best_frame = None
            best_t = start_sec

            if vp is not None and ocr is not None:
                # Search window: from -6s to +5s around start
                for offset in range(-6, 6):
                    t = max(0.0, start_sec + offset)
                    frame = vp.get_frame_at_second(t)
                    if frame is None:
                        continue
                    
                    res, _ = ocr(frame)
                    if res:
                        found_snippets = []
                        for box, text, conf in res:
                            t_lower = text.lower()
                            if any(w in t_lower for w in ["match", "pop", "bubble", "click", "defrost", "ice", "times", "adjacent", "drag", "tap"]):
                                found_snippets.append(text)
                        
                        if found_snippets:
                            combined = " ".join(found_snippets)
                            if len(combined) > len(detected_text):
                                detected_text = combined
                                best_frame = frame.copy()
                                best_t = t

            # Determine Mechanic details
            img_rel_path = ""
            if best_frame is not None:
                output_dir = os.path.dirname(lvl.get("board_image_rel", ""))
                # Level folder
                lvl_folder = os.path.join(getattr(vp, "project_dir", ""), "levels", f"level_{lvl_num:02d}")
                if os.path.exists(lvl_folder):
                    ftue_path = os.path.join(lvl_folder, "tutorial_ftue.jpg")
                    cv2.imwrite(ftue_path, best_frame)
                    img_rel_path = f"level_{lvl_num:02d}/tutorial_ftue.jpg"

            # If no specific tutorial frame was captured, fallback to board_start
            if not img_rel_path:
                img_rel_path = lvl.get("board_image_rel", "")

            # Heuristics for Mechanic Classification
            t_lower = detected_text.lower()
            if "ice" in t_lower or "defrost" in t_lower:
                name = "❄️ Khối Băng (Ice Block Obstacle)"
                tutorial_type = "💡 Banner Gợi Ý Ngữ Cảnh (Contextual Tooltip)"
                rule = "Click cá cùng màu lân cận 3 lần để rã đông khối băng"
                impact = "Chướng ngại vật khóa ô, buộc người chơi gom nhóm xung quanh, tăng số nước đi và chiều sâu tính toán"
            elif "bubble" in t_lower or "pop" in t_lower:
                name = "🫧 Bong Bóng Khóa (Locked Bubble)"
                tutorial_type = "🎯 Bắt buộc (Forced Tutorial - Bàn tay chỉ)"
                rule = "Thu thập đủ 3 cá cùng màu để giải phóng cá con bị giam bên trong"
                impact = "Cơ chế giải đố phân tầng (Layered Goal), kích thích tò mò và cảm giác thỏa mãn khi nổ bóng"
            elif lvl_num == 1:
                name = "🎮 Di Chuyển Cơ Bản (Core Match Mechanics)"
                tutorial_type = "🎯 Bắt buộc (Forced Tutorial)"
                detected_text = "Chạm cá đưa vào bình cùng loại để hoàn thành mục tiêu"
                rule = "Chọn cá trên bàn cờ di chuyển vào các bình rỗng phía trên"
                impact = "FTUE làm quen luật chơi cốt lõi trong < 10 giây, giảm thiểu Drop-off ngày đầu"
            else:
                name = "📈 Tăng Mật Độ & Thử Thách (Board Density Scaling)"
                tutorial_type = "👁️ Tự do (No Tutorial)"
                detected_text = "Không có hướng dẫn (Màn chơi tiêu chuẩn)"
                rule = "Tự do tính toán giải đố với bố cục mở rộng"
                impact = "Thử thách kỹ năng người chơi với nhịp độ dồn dập hơn, chuẩn bị cho màn khó tiếp theo"

            rows.append([
                lvl_str,
                name,
                img_rel_path,
                detected_text,
                tutorial_type,
                rule,
                impact
            ])

        col_widths = {
            1: 95,   # Level
            2: 240,  # Mechanic
            3: 120,  # Image
            4: 280,  # OCR Text
            5: 190,  # FTUE Type
            6: 280,  # Rule
            7: 320   # Impact
        }

        return AnalyzerResult(
            sheet_name=self.get_sheet_name(),
            display_title=self.get_display_title(),
            headers=headers,
            rows=rows,
            column_widths=col_widths
        )
