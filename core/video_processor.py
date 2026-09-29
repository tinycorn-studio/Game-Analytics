import os
import cv2

class VideoProcessor:
    def __init__(self, video_path: str, auto_rotate_portrait: bool = True):
        self.video_path = video_path
        self.auto_rotate_portrait = auto_rotate_portrait
        self.cap = cv2.VideoCapture(video_path)
        if not self.cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")
            
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.raw_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.raw_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.duration_seconds = self.total_frames / self.fps if self.fps > 0 else 0
        
        # Determine rotation: If raw is horizontal (e.g. 1280x720) from BlueStacks
        self.needs_rotate_ccw = self.auto_rotate_portrait and (self.raw_width > self.raw_height)
        if self.needs_rotate_ccw:
            self.width = self.raw_height
            self.height = self.raw_width
        else:
            self.width = self.raw_width
            self.height = self.raw_height

    def get_frame_at_second(self, second: float):
        """Retrieve a frame at the specified second, rotated if needed."""
        self.cap.set(cv2.CAP_PROP_POS_MSEC, second * 1000.0)
        ret, frame = self.cap.read()
        if not ret or frame is None:
            return None
        if self.needs_rotate_ccw:
            frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
        return frame

    def save_frame_at_second(self, second: float, output_path: str) -> bool:
        """Save a frame at the specified timestamp to disk."""
        frame = self.get_frame_at_second(second)
        if frame is not None:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            cv2.imwrite(output_path, frame)
            return True
        return False

    def close(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
