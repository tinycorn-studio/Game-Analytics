import os
import cv2
import numpy as np
from typing import List, Dict, Any, Callable
from .video_processor import VideoProcessor

def format_timestamp(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"

class LevelDetector:
    def __init__(self, video_processor: VideoProcessor):
        self.vp = video_processor

    def detect_victory_in_frame(self, frame) -> bool:
        """
        Detects if a frame contains a Victory popup banner.
        Checks for dense yellow/gold text 'VICTORY!' in the top-middle region (y: 100-220, x: 100-620).
        """
        if frame is None:
            return False
        h, w = frame.shape[:2]
        
        # Region where 'VICTORY!' banner appears
        y1, y2 = int(h * 0.08), int(h * 0.20)
        x1, x2 = int(w * 0.12), int(w * 0.88)
        sub = frame[y1:y2, x1:x2]
        
        # Bright golden yellow text filter: B < 80, G > 180, R > 210
        yellow_mask = (sub[:, :, 0] < 80) & (sub[:, :, 1] > 180) & (sub[:, :, 2] > 210)
        yellow_count = np.sum(yellow_mask)
        
        return yellow_count > 6000

    def scan_video(self, progress_callback: Callable[[float, str], None] = None) -> List[Dict[str, Any]]:
        """
        Scans through the video at 1-second intervals to detect level progression.
        Returns a list of detected levels with timestamps and screenshot points.
        """
        duration = int(self.vp.duration_seconds)
        vic_seconds = []
        
        for s in range(0, duration):
            if progress_callback and s % 20 == 0:
                pct = (s / max(1, duration)) * 75.0
                progress_callback(pct, f"Đang quét video: {format_timestamp(s)} / {format_timestamp(duration)}...")
                
            frame = self.vp.get_frame_at_second(s)
            if frame is not None and self.detect_victory_in_frame(frame):
                vic_seconds.append(s)

        # Cluster consecutive victory seconds into distinct victory events
        events = []
        if vic_seconds:
            curr = [vic_seconds[0]]
            for s in vic_seconds[1:]:
                if s <= curr[-1] + 3:
                    curr.append(s)
                else:
                    events.append(curr)
                    curr = [s]
            events.append(curr)

        levels = []
        prev_level_start = 22.0 # Initial game launch timestamp
        
        for idx, ev in enumerate(events, start=1):
            v_start = ev[0]
            v_end = ev[-1]
            mid_victory = ev[len(ev) // 2]
            
            duration_sec = max(1, int(v_start - prev_level_start))
            board_shot_time = prev_level_start + 2.0
            if board_shot_time >= v_start:
                board_shot_time = prev_level_start
                
            levels.append({
                "level": idx,
                "start_second": prev_level_start,
                "end_second": v_start,
                "duration_seconds": duration_sec,
                "start_time_str": format_timestamp(prev_level_start),
                "end_time_str": format_timestamp(v_start),
                "board_shot_time": board_shot_time,
                "victory_shot_time": mid_victory,
                "status": "Hoàn thành"
            })
            
            # Next level starts after victory popup closes (typically ~2s after event end)
            prev_level_start = v_end + 3.0

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
                "status": "Đang phân tích"
            })

        return levels

    def export_level_assets(self, levels: List[Dict[str, Any]], output_levels_dir: str, progress_callback: Callable[[float, str], None] = None):
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
