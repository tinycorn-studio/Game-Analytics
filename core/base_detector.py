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

    def detect_hud_active(self, frame: np.ndarray, timestamp: float) -> bool:
        """
        (Optional) Checks if the in-game HUD (settings, level badge, top bar) is active.
        Subclasses should override with game-specific UI anchors.
        Default: checks if top bar region has content and is not black/blank.
        """
        if frame is None:
            return False
        h, w = frame.shape[:2]
        top_bar = frame[:int(h * 0.12), :]
        return float(np.std(top_bar)) > 20.0

    def detect_modal_dialog(self, frame: np.ndarray, timestamp: float) -> bool:
        """
        (Optional) Checks if a tutorial popup, speech bubble, or modal dialog is covering the center.
        Subclasses should override.
        """
        return False

    def calculate_board_density(self, frame: np.ndarray, timestamp: float) -> float:
        """
        Calculates the visual element density / texture complexity in the board area.
        Used to track elements falling/spawning into the board until fully populated.
        """
        if frame is None:
            return 0.0
        h, w = frame.shape[:2]
        board = frame[int(0.35 * h):int(0.85 * h), int(0.10 * w):int(0.90 * w)]
        import cv2
        gray = cv2.cvtColor(board, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        return float(np.sum(edges > 0))

    def detect_board_populated(self, frame: np.ndarray, timestamp: float) -> bool:
        """
        (Optional) Checks if the board area is populated with elements/bubbles rather than empty background.
        """
        return self.calculate_board_density(frame, timestamp) > 6000

    def get_board_start_timestamp(self, victory_event: Dict[str, Any], prev_victory_event: Optional[Dict[str, Any]]) -> float:
        """
        Intelligently scans the transition window between previous victory and current victory
        to pinpoint the exact pristine board start moment:
        1. In-game HUD is active (detect_hud_active is True)
        2. No modal tutorial/popup covering the board (detect_modal_dialog is False)
        3. Board is fully populated with elements (reaching initial peak density after drop animation)
        4. Earliest stable frame before player moves
        """
        v_end = prev_victory_event["end"] if prev_victory_event else None
        v_start = victory_event["start"]

        # Search window: from previous victory end + 0.5s up to 45 seconds later (capped before victory)
        search_start = max(0.0, (v_end + 0.5) if v_end is not None else 10.0)
        search_end = min(v_start - 2.0, search_start + 45.0)

        if search_start >= search_end:
            return search_start

        timeline = []
        for t in np.arange(search_start, search_end, 0.5):
            frame = self.vp.get_frame_at_second(t)
            if frame is None:
                continue

            if not self.detect_hud_active(frame, t):
                continue

            if self.detect_modal_dialog(frame, t):
                continue

            density = self.calculate_board_density(frame, t)
            timeline.append((t, density))

        if timeline:
            # During level initialization, elements drop/animate onto the board.
            # We look at the first window (~15s) of active gameplay to identify the initial full board density peak.
            # The pristine start frame is when elements have fully settled (reaching >= 85% of peak initial density).
            initial_window = timeline[:30]
            max_initial_density = max(score for t, score in initial_window)
            threshold = max(6000.0, max_initial_density * 0.85)

            candidates = [t for t, score in initial_window if score >= threshold]
            if candidates:
                return candidates[0]
            return timeline[0][0]

        # Safe fallback
        fallback = (v_end + 3.0) if v_end is not None else 22.0
        return min(fallback, v_start - 1.0)

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
