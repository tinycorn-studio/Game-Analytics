import cv2
import numpy as np
from core.base_detector import BaseGameDetector

class ScrewJamDetector(BaseGameDetector):
    """
    Detector Strategy for Screw Jam / Screw Puzzle games.
    Detects the victory card/dialog with 'Level Completed' / 'Victory' popup and button.
    """
    def detect_victory(self, frame: np.ndarray, timestamp: float) -> bool:
        if frame is None:
            return False
        h, w = frame.shape[:2]
        
        # Center modal area where the victory card/star popup appears
        roi = frame[int(h * 0.25):int(h * 0.65), int(w * 0.15):int(w * 0.85)]
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        
        # Look for green 'Claim' / 'Next' button and golden stars
        green_mask = cv2.inRange(hsv, np.array([35, 120, 120]), np.array([85, 255, 255]))
        yellow_mask = cv2.inRange(hsv, np.array([15, 120, 180]), np.array([35, 255, 255]))
        
        total_pixels = roi.shape[0] * roi.shape[1]
        has_button = (np.sum(green_mask > 0) / total_pixels) > 0.03
        has_stars = (np.sum(yellow_mask > 0) / total_pixels) > 0.03
        
        return has_button and has_stars
