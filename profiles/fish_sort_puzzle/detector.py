import numpy as np
from core.base_detector import BaseGameDetector

class FishSortPuzzleDetector(BaseGameDetector):
    """
    Dedicated Detector Strategy for Fish Sort Puzzle by Shycheese.
    Detects the golden 'VICTORY!' text banner in the upper-middle region.
    """
    def detect_victory(self, frame: np.ndarray, timestamp: float) -> bool:
        if frame is None:
            return False
        h, w = frame.shape[:2]
        
        # Upper middle region where 'VICTORY!' banner appears
        y1, y2 = int(h * 0.08), int(h * 0.20)
        x1, x2 = int(w * 0.12), int(w * 0.88)
        sub = frame[y1:y2, x1:x2]
        
        # Bright golden yellow text filter: B < 80, G > 180, R > 210
        yellow_mask = (sub[:, :, 0] < 80) & (sub[:, :, 1] > 180) & (sub[:, :, 2] > 210)
        yellow_count = np.sum(yellow_mask)
        
        threshold = self.config.get("victory_threshold", 6000)
        return yellow_count > threshold

    def detect_hud_active(self, frame: np.ndarray, timestamp: float) -> bool:
        """
        Detects if the in-game Settings Gear Icon is visible at the top-right.
        Gear icon is white pixels on rounded rect: y: 3-11%, x: 78-92%.
        """
        if frame is None:
            return False
        h, w = frame.shape[:2]
        gear = frame[int(0.03 * h):int(0.11 * h), int(0.78 * w):int(0.92 * w)]
        white_gear = np.sum((gear[:, :, 0] > 200) & (gear[:, :, 1] > 200) & (gear[:, :, 2] > 200))
        return white_gear > 2200

    def detect_modal_dialog(self, frame: np.ndarray, timestamp: float) -> bool:
        """
        Detects if a tutorial dialog or speech bubble is covering the center area.
        Speech bubble has bright cyan color: B > 180, G > 180, R < 100.
        """
        if frame is None:
            return False
        h, w = frame.shape[:2]
        center = frame[int(0.40 * h):int(0.65 * h), int(0.20 * w):int(0.80 * w)]
        cyan_dialog = np.sum((center[:, :, 0] > 180) & (center[:, :, 1] > 180) & (center[:, :, 2] < 100))
        return cyan_dialog > 15000

    def get_difficulty_label(self, duration_seconds: int) -> str:
        if duration_seconds <= 25:
            return "🟢 Rất dễ (Tutorial)"
        elif duration_seconds <= 90:
            return "🟢 Dễ"
        elif duration_seconds <= 150:
            return "🟡 Trung bình"
        elif duration_seconds <= 200:
            return "🔴 Khó (Thử thách)"
        else:
            return "🟣 Rất khó"
