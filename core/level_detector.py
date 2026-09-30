import os
import cv2
import numpy as np
from typing import List, Dict, Any, Callable, Optional
from .video_processor import VideoProcessor
from .base_detector import BaseGameDetector, format_timestamp

class LevelCoordinator:
    """
    Coordinates video scanning, level boundary segmentation,
    and asset extraction by delegating to a Game Strategy Detector.
    """
    def __init__(self, video_processor: VideoProcessor, detector: BaseGameDetector):
        self.vp = video_processor
        self.detector = detector

    def scan_video(self, progress_callback: Optional[Callable[[float, str], None]] = None) -> List[Dict[str, Any]]:
        """
        Scans through the video at 1-second intervals using the configured game detector.
        Clusters victory events and computes level boundaries.
        """
        duration = int(self.vp.duration_seconds)
        vic_seconds = []
        
        for s in range(0, duration):
            if progress_callback and s % 20 == 0:
                pct = (s / max(1, duration)) * 75.0
                progress_callback(pct, f"Đang quét video: {format_timestamp(s)} / {format_timestamp(duration)}...")
                
            frame = self.vp.get_frame_at_second(s)
            if frame is not None and self.detector.detect_victory(frame, s):
                vic_seconds.append(s)

        # Cluster consecutive victory seconds into distinct victory events
        events = []
        if vic_seconds:
            curr = [vic_seconds[0]]
            for s in vic_seconds[1:]:
                if s <= curr[-1] + 3:
                    curr.append(s)
                else:
                    events.append({
                        "start": curr[0],
                        "end": curr[-1],
                        "mid": curr[len(curr) // 2]
                    })
                    curr = [s]
            events.append({
                "start": curr[0],
                "end": curr[-1],
                "mid": curr[len(curr) // 2]
            })

        levels = []
        prev_victory_event = None
        
        for idx, ev in enumerate(events, start=1):
            board_shot_time = self.detector.get_board_start_timestamp(ev, prev_victory_event)
            vic_shot_time = self.detector.get_victory_screenshot_timestamp(ev)
            
            # Start of level gameplay matches the pristine board layout
            level_start_sec = board_shot_time
            duration_sec = max(1, int(ev["start"] - level_start_sec))
            difficulty = self.detector.get_difficulty_label(duration_sec)
            
            levels.append({
                "level": idx,
                "start_second": level_start_sec,
                "end_second": ev["start"],
                "duration_seconds": duration_sec,
                "start_time_str": format_timestamp(level_start_sec),
                "end_time_str": format_timestamp(ev["start"]),
                "board_shot_time": board_shot_time,
                "victory_shot_time": vic_shot_time,
                "difficulty": difficulty,
                "status": "Hoàn thành"
            })
            
            prev_victory_event = ev

        # Fallback if no victory events found
        if not levels:
            levels.append({
                "level": 1,
                "start_second": 0,
                "end_second": duration,
                "duration_seconds": duration,
                "start_time_str": "00:00",
                "end_time_str": format_timestamp(duration),
                "board_shot_time": 2.0,
                "victory_shot_time": max(2.0, duration - 2.0),
                "difficulty": "Chưa xác định",
                "status": "Đang phân tích"
            })

        return levels

    def export_level_assets(self, levels: List[Dict[str, Any]], output_levels_dir: str, progress_callback: Optional[Callable[[float, str], None]] = None):
        """
        Saves board_start.jpg and victory.jpg for each level into level_XX folder.
        """
        total = len(levels)
        for i, lvl in enumerate(levels):
            lvl_num = lvl["level"]
            lvl_folder = os.path.join(output_levels_dir, f"level_{lvl_num:02d}")
            os.makedirs(lvl_folder, exist_ok=True)
            
            board_path = os.path.join(lvl_folder, "board_start.jpg")
            vic_path = os.path.join(lvl_folder, "victory.jpg")
            
            self.vp.save_frame_at_second(lvl["board_shot_time"], board_path)
            self.vp.save_frame_at_second(lvl["victory_shot_time"], vic_path)
            
            lvl["board_image_rel"] = f"level_{lvl_num:02d}/board_start.jpg"
            lvl["victory_image_rel"] = f"level_{lvl_num:02d}/victory.jpg"
            
            if progress_callback:
                pct = 75.0 + ((i + 1) / max(1, total)) * 25.0
                progress_callback(pct, f"Đã trích xuất hình ảnh Level {lvl_num}...")


# Backward compatibility alias
LevelDetector = LevelCoordinator
