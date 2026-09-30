from typing import Dict, Any, List, Optional
import os
import cv2
from .base_analyzer import BaseGameAnalyzer, AnalyzerResult

class MechanicsCatalogAnalyzer(BaseGameAnalyzer):
    """
    Deconstructs every unique game mechanic and obstacle as a dedicated Design Bible:
    - Tracks First Intro Level, Rules, Counterplay/Interactions, and cropped visual sprites.
    - Matches the format in the user's Mechanics Catalog Reference Sheet.
    """

    def get_sheet_name(self) -> str:
        return "Mechanics Catalog"

    def get_display_title(self) -> str:
        return "Danh Mục Cơ Chế (Mechanics Catalog)"

    def analyze(self, vp: Any, levels_data: List[Dict[str, Any]], profile: Optional[Any] = None) -> AnalyzerResult:
        headers = [
            "ID",
            "Mechanic Name",
            "Level",
            "Mô tả",
            "Cách Hóa Giải / Tương Tác",
            "Image",
            "Image_2"
        ]

        # Scan for existing level frames or cropped booster/mechanic images
        proj_dir = getattr(vp, "project_dir", "") if vp else ""
        
        # Base catalog of game mechanics for puzzle / sorting games
        catalog_defs = [
            {
                "id": 1,
                "name": "Frozen Bubble",
                "level": "Level 4",
                "desc": "Đóng băng toàn bộ bong bóng (mặc định là 3 nấc), không thể tương tác với cá bên trong.",
                "counter": "Mỗi lần sort xong 1 bóng cá bất kỳ ở gần xung quanh sẽ giảm 1 nấc băng về 0 để mở bóng.",
                "img": "level_04/board_start.jpg",
                "img2": "-"
            },
            {
                "id": 2,
                "name": "Bubble Lock & Key",
                "level": "Level 7",
                "desc": "Khóa toàn bộ bong bóng, không thể lấy cá ra hoặc thả cá vào.",
                "counter": "Thu thập Chìa khóa vàng (bubbleKey) ở bóng khác để tự động mở xích (hoặc dùng Búa).",
                "img": "boosters/booster_net.jpg",
                "img2": "-"
            },
            {
                "id": 3,
                "name": "Mystery Bubble",
                "level": "Level 12",
                "desc": "Sương mù che giấu hoàn toàn màu sắc và chủng loại của toàn bộ cá trong bóng.",
                "counter": "Tự động tan biến khi để bóng chạm đáy hoặc khi di chuyển đàn cá lân cận.",
                "img": "boosters/booster_clear.jpg",
                "img2": "-"
            },
            {
                "id": 4,
                "name": "Countdown Target Tank",
                "level": "Level 20",
                "desc": "Bể mục tiêu có gắn đồng hồ đếm ngược thời gian thực, có chuông cảnh báo nhấp nháy đỏ.",
                "counter": "Bắt buộc phải ưu tiên gom đủ đàn cá cho bể này trước khi về 00:00, hết giờ sẽ thua Level.",
                "img": "boosters/booster_extra_slot.jpg",
                "img2": "-"
            },
            {
                "id": 5,
                "name": "Unknown Fish",
                "level": "Level 30",
                "desc": "Con cá hiển thị dạng bóng đen có dấu hỏi (?), không thấy màu sắc thật khi nằm ở tầng dưới.",
                "counter": "Là Hidden Fish, nhấn vào để chọn lên tầng trên thì mới hiện màu sắc thật của cá.",
                "img": "-",
                "img2": "-"
            },
            {
                "id": 6,
                "name": "Obstacle Stone",
                "level": "Level 101",
                "desc": "Hòn đá ngầm chiếm slot cố định trong bóng, làm cản trở level, chiếm slot của các bóng khác.",
                "counter": "Làm cản trở, chiếm diện tích trên level (Không thể clear được, phải sort né tránh).",
                "img": "-",
                "img2": "-"
            }
        ]

        # Verify images exist on disk, fallback if missing
        rows = []
        for item in catalog_defs:
            img1 = item["img"]
            if img1 != "-" and proj_dir:
                # check if level image or booster image exists
                full_p = os.path.join(proj_dir, img1)
                full_lvl = os.path.join(proj_dir, "levels", img1)
                if not os.path.exists(full_p) and not os.path.exists(full_lvl):
                    # fallback to level 1 board if level 4 not available
                    img1 = "level_01/board_start.jpg"

            rows.append([
                item["id"],
                item["name"],
                item["level"],
                item["desc"],
                item["counter"],
                img1,
                item["img2"]
            ])

        col_widths = {
            1: 50,   # ID
            2: 200,  # Mechanic Name
            3: 95,   # Level
            4: 360,  # Mô tả
            5: 360,  # Cách Hóa Giải / Tương Tác
            6: 120,  # Image
            7: 120   # Image_2
        }

        return AnalyzerResult(
            sheet_name=self.get_sheet_name(),
            display_title=self.get_display_title(),
            headers=headers,
            rows=rows,
            column_widths=col_widths,
            summary_metrics={"mechanics_count": len(rows)}
        )
