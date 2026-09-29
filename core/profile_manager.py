import os
import json
import importlib.util
from typing import Dict, Any, List, Optional
from .base_detector import BaseGameDetector
from .generic_detector import GenericSceneDetector

class ProfileManager:
    def __init__(self, profiles_dir: Optional[str] = None):
        if profiles_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.profiles_dir = os.path.join(base_dir, "profiles")
        else:
            self.profiles_dir = profiles_dir
            
        os.makedirs(self.profiles_dir, exist_ok=True)
        self._profiles_cache: Dict[str, Dict[str, Any]] = {}
        self.reload_profiles()

    def reload_profiles(self):
        """Scans the profiles directory and registers all available game profiles."""
        self._profiles_cache = {}
        
        # Always register the built-in generic fallback
        self._profiles_cache["generic"] = {
            "id": "generic",
            "name": "Bộ Dò Đa Năng (Generic Scene Detector)",
            "description": "Tự động nhận diện chuyển cảnh và popup chiến thắng cho mọi loại game.",
            "orientation": "auto",
            "detector_class": GenericSceneDetector,
            "config": {}
        }
        
        if not os.path.exists(self.profiles_dir):
            return

        for entry in os.listdir(self.profiles_dir):
            folder_path = os.path.join(self.profiles_dir, entry)
            if not os.path.isdir(folder_path):
                continue
                
            config_file = os.path.join(folder_path, "config.json")
            config = {}
            if os.path.exists(config_file):
                try:
                    with open(config_file, "r", encoding="utf-8") as f:
                        config = json.load(f)
                except Exception as e:
                    print(f"Error reading config for {entry}: {e}")
                    
            profile_id = config.get("id", entry)
            profile_name = config.get("name", entry.replace("_", " ").title())
            description = config.get("description", "Game profile tùy chỉnh.")
            orientation = config.get("orientation", "portrait")
            
            detector_class = GenericSceneDetector
            detector_file = os.path.join(folder_path, "detector.py")
            
            if os.path.exists(detector_file):
                try:
                    spec = importlib.util.spec_from_file_location(f"profiles.{profile_id}.detector", detector_file)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Find class inheriting BaseGameDetector
                    for attr_name in dir(module):
                        attr = getattr(module, attr_name)
                        if (isinstance(attr, type) and 
                            issubclass(attr, BaseGameDetector) and 
                            attr not in (BaseGameDetector, GenericSceneDetector)):
                            detector_class = attr
                            break
                except Exception as e:
                    print(f"Error loading custom detector for {profile_id}: {e}")
                    
            self._profiles_cache[profile_id] = {
                "id": profile_id,
                "name": profile_name,
                "description": description,
                "orientation": orientation,
                "detector_class": detector_class,
                "config": config
            }

    def list_profiles(self) -> List[Dict[str, Any]]:
        """Returns metadata for all available profiles."""
        self.reload_profiles()
        res = []
        for p in self._profiles_cache.values():
            res.append({
                "id": p["id"],
                "name": p["name"],
                "description": p["description"],
                "orientation": p["orientation"]
            })
        return sorted(res, key=lambda x: (x["id"] != "generic", x["name"]))

    def get_detector(self, profile_id: str, video_processor) -> BaseGameDetector:
        """Instantiates the detector strategy for the given profile ID."""
        self.reload_profiles()
        profile = self._profiles_cache.get(profile_id) or self._profiles_cache.get("generic")
        detector_class = profile["detector_class"]
        return detector_class(video_processor, profile.get("config", {}))
