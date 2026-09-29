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
