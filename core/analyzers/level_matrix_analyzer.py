from typing import Dict, Any, List, Optional
from .base_analyzer import BaseGameAnalyzer, AnalyzerResult

class LevelMatrixAnalyzer(BaseGameAnalyzer):
    """
    Analyzes and formats the core Level Matrix:
    - Level progression & timestamps
    - Board start & victory screenshots
    - Completion duration & difficulty categorization
    """

    def get_sheet_name(self) -> str:
        return "Level Matrix"

    def get_display_title(self) -> str:
        return "Ma Trận Màn Chơi (Level Matrix)"

    def analyze(self, vp: Any, levels_data: List[Dict[str, Any]], profile: Optional[Any] = None) -> AnalyzerResult:
        headers = [
            "Màn (Level)",
            "Ảnh Khởi Đầu (Board Start)",
            "Ảnh Chiến Thắng (Victory / Reward)",
            "Thời Gian Bắt Đầu",
            "Thời Gian Thắng",
            "Thời Lượng Giải (s)",
            "Độ Khó (Pacing)",
            "Trạng Thái",
            "Ghi Chú Game Designer"
        ]

        rows = []
        for lvl in levels_data:
            duration = int(lvl.get("duration_seconds", 0))
            if duration <= 25:
                difficulty = "🟢 Rất dễ (Tutorial)"
            elif duration <= 90:
                difficulty = "🟢 Dễ"
            elif duration <= 150:
                difficulty = "🟡 Trung bình"
            elif duration <= 200:
                difficulty = "🔴 Khó (Thử thách)"
            else:
                difficulty = "🟣 Rất khó"

            rows.append([
                f"Level {lvl.get('level', 1):02d}",
                lvl.get("board_image_rel", ""),
                lvl.get("victory_image_rel", ""),
                lvl.get("start_time_str", "00:00"),
                lvl.get("end_time_str", "00:00"),
                duration,
                difficulty,
                lvl.get("status", "Hoàn thành"),
                lvl.get("notes", "")
            ])

        col_widths = {
            1: 95,   # Level
            2: 120,  # Board
            3: 120,  # Victory
            4: 95,   # Start
            5: 95,   # End
            6: 105,  # Duration
            7: 150,  # Difficulty
            8: 110,  # Status
            9: 260   # Notes
        }

        return AnalyzerResult(
            sheet_name=self.get_sheet_name(),
            display_title=self.get_display_title(),
            headers=headers,
            rows=rows,
            column_widths=col_widths,
            summary_metrics={
                "total_levels": len(levels_data),
                "total_time_seconds": sum(int(l.get("duration_seconds", 0)) for l in levels_data)
            }
        )
