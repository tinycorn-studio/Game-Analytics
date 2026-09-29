from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import numpy as np

def format_timestamp(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"

class BaseGameDetector(ABC):
    """
    Abstract Base Class for all Game-Specific Level Detectors.
    Each game strategy implements detection logic for its specific victory/defeat cues,
    custom metrics (stars, moves, score), and initial board framing.
    """
    def __init__(self, video_processor, config: Optional[Dict[str, Any]] = None):
        self.vp = video_processor
        self.config = config or {}

    @abstractmethod
    def detect_victory(self, frame: np.ndarray, timestamp: float) -> bool:
        """
        Returns True if the given frame at timestamp displays a Level Victory / Clear state.
        """
        pass

    def detect_defeat(self, frame: np.ndarray, timestamp: float) -> bool:
        """
        (Optional) Returns True if the given frame displays a Game Over / Level Failed state.
        Default is False.
        """
        return False

    def get_board_start_timestamp(self, victory_event: Dict[str, Any], prev_victory_event: Optional[Dict[str, Any]]) -> float:
        """
        Calculates the timestamp for the initial board screenshot (board_start.jpg).
        Default: 2 seconds after previous victory ended (or 22s for level 1).
        """
        start_time = (prev_victory_event["end"] + 2.0) if prev_victory_event else 22.0
        v_start = victory_event["start"]
        board_time = start_time + 1.5
        if board_time >= v_start:
            board_time = start_time
        return board_time

    def get_victory_screenshot_timestamp(self, victory_event: Dict[str, Any]) -> float:
        """
        Calculates the best timestamp for the victory screenshot (victory.jpg).
        Default: middle of the victory duration.
        """
        return victory_event.get("mid", (victory_event["start"] + victory_event["end"]) / 2.0)

    def extract_custom_metrics(self, board_frame: Optional[np.ndarray], victory_frame: Optional[np.ndarray]) -> Dict[str, Any]:
        """
        (Optional) Extracts custom game-specific metrics (stars, moves left, score, coins).
        """
        return {}

    def get_difficulty_label(self, duration_seconds: int) -> str:
        """
        Standard difficulty pacing classifier based on clear duration.
        Can be overridden by custom game strategies.
        """
        if duration_seconds <= 25:
            return "🟢 Rất dễ (Tutorial)"
        elif duration_seconds <= 90:
            return "🟢 Dễ"
        elif duration_seconds <= 150:
            return "🟡 Trung bình"
        elif duration_seconds <= 210:
            return "🔴 Khó (Thử thách)"
        else:
            return "🟣 Rất khó"
