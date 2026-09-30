from typing import Dict, Any, List, Optional
import numpy as np
from .base_analyzer import BaseGameAnalyzer, AnalyzerResult

class PacingDifficultyAnalyzer(BaseGameAnalyzer):
    """
    Analyzes game pacing, tension-and-release cycles, and difficulty bottlenecks:
    - Evaluates level completion time deviations against the game session mean.
    - Classifies the psychological pacing role (Warm-up, Breather, Tension Spike, Peak Challenge).
    - Identifies Choke Points / Paywall risks where players are most prone to churn.
    """

    def get_sheet_name(self) -> str:
        return "Pacing & Difficulty"

    def get_display_title(self) -> str:
        return "Nhịp Độ & Đường Cong Độ Khó (Pacing & Difficulty)"

    def analyze(self, vp: Any, levels_data: List[Dict[str, Any]], profile: Optional[Any] = None) -> AnalyzerResult:
        headers = [
            "Màn (Level)",
            "Thời Lượng Giải (s)",
            "Độ Lệch Chuẩn (%)",
            "Nhịp Độ Tâm Lý (Pacing Role)",
            "Chỉ Số Căng Thẳng (Tension Tier)",
            "Nguy Cơ Bỏ Game (Choke Point Risk)",
            "Khuyến Nghị Game Designer (Balancing Advice)"
        ]

        durations = [int(lvl.get("duration_seconds", 0)) for lvl in levels_data]
        mean_dur = float(np.mean(durations)) if durations else 1.0

        rows = []
        prev_dur = 0
        choke_points = []

        for i, lvl in enumerate(levels_data):
            lvl_num = lvl.get("level", i + 1)
            lvl_str = f"Level {lvl_num:02d}"
            dur = int(lvl.get("duration_seconds", 0))
            ratio = (dur / max(1.0, mean_dur)) * 100.0

            # Determine Pacing Role
            if dur <= 25:
                pacing_role = "🟢 Khởi Động (Tutorial / Warm-up)"
                tension = "1/5 (Thư giãn tuyệt đối)"
                choke_risk = "✅ Rất Thấp: FTUE dẫn dắt nhẹ nhàng"
                advice = "Giữ nguyên luồng chơi, không nên tăng thêm chướng ngại vật."
            elif i > 0 and dur < prev_dur * 0.85:
                pacing_role = "🍃 Màn Xả Hơi (Breather Level)"
                tension = "2/5 (Giải tỏa áp lực)"
                choke_risk = "✅ Thấp: Củng cố cảm giác thành công (Competence)"
                advice = "Rất tốt cho Retention sau màn căng thẳng, duy trì tâm lý tích cực."
            elif i > 0 and dur > prev_dur * 1.25 and dur < 160:
                pacing_role = "⚡ Đẩy Cao Trào (Tension Spike)"
                tension = "3.5/5 (Tập trung cao độ)"
                choke_risk = "🟡 Trung bình: Bắt đầu tạo áp lực phân vân"
                advice = "Theo dõi thời gian suy nghĩ, kích thích người chơi nhìn vào thanh Booster."
            elif dur >= 160:
                pacing_role = "🔥 Thử Thách Cực Hạn (Peak Challenge / Boss Feel)"
                tension = "4.5/5 (Áp lực cao độ)"
                choke_risk = "⚠️ NGUY CƠ CAO (Choke Point / Paywall)"
                advice = "Điểm ép nạp vật phẩm ($0.99) hoặc xem Ads hồi sinh. Cần tặng 1 Booster dùng thử trước đó."
                choke_points.append(lvl_str)
            else:
                pacing_role = "⚖️ Tiến Trình Tiêu Chuẩn (Steady Flow)"
                tension = "3/5 (Cân bằng)"
                choke_risk = "✅ An Toàn: Nhịp chơi ổn định"
                advice = "Độ khó vừa vặn với kỹ năng người chơi tích lũy."

            prev_dur = dur

            rows.append([
                lvl_str,
                dur,
                f"{ratio:.0f}%",
                pacing_role,
                tension,
                choke_risk,
                advice
            ])

        col_widths = {
            1: 95,   # Level
            2: 110,  # Duration
            3: 110,  # Deviation %
            4: 250,  # Pacing Role
            5: 180,  # Tension Tier
            6: 280,  # Choke Risk
            7: 350   # Balancing Advice
        }

        return AnalyzerResult(
            sheet_name=self.get_sheet_name(),
            display_title=self.get_display_title(),
            headers=headers,
            rows=rows,
            column_widths=col_widths,
            summary_metrics={
                "mean_duration": round(mean_dur, 1),
                "choke_points": choke_points
            }
        )
