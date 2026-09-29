import cv2
import numpy as np
from typing import Dict, Any, Optional
from .base_detector import BaseGameDetector

class GenericSceneDetector(BaseGameDetector):
    """
    Universal Fallback Detector.
    Works for any mobile puzzle game by detecting modal victory/result dialogs:
    Typically, when a level finishes, games:
    1. Darken the background or display a bright high-contrast centered card.
    2. Exhibit a significant drop in motion/activity or a transition fade.
    """
    def __init__(self, video_processor, config: Optional[Dict[str, Any]] = None):
        super().__init__(video_processor, config)
        self.last_frame = None

    def detect_victory(self, frame: np.ndarray, timestamp: float) -> bool:
        if frame is None:
            return False
        h, w = frame.shape[:2]
        
        # Check central card region (y: 20% to 70%, x: 15% to 85%)
        center_roi = frame[int(h * 0.20):int(h * 0.70), int(w * 0.15):int(w * 0.85)]
        
        # High contrast and bright content in center surrounded by dark background is a common modal popup pattern
        gray = cv2.cvtColor(center_roi, cv2.COLOR_BGR2GRAY)
        std_dev = np.std(gray)
        mean_val = np.mean(gray)
        
        # Also check for celebratory colors (Gold/Yellow/Bright green/cyan ribbons)
        hsv = cv2.cvtColor(center_roi, cv2.COLOR_BGR2HSV)
        bright_celebration = cv2.inRange(hsv, np.array([15, 120, 180]), np.array([40, 255, 255]))
        celebration_ratio = np.sum(bright_celebration > 0) / (center_roi.shape[0] * center_roi.shape[1])
        
        return celebration_ratio > 0.04 and std_dev > 45.0
