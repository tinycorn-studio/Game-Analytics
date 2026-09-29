import os
import sys
import glob
import pandas as pd
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from core.video_processor import VideoProcessor
from core.level_detector import LevelDetector
from core.report_generator import ReportGenerator

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass


app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/projects", methods=["GET"])
def get_projects():
    projects = []
    if os.path.exists(PROJECTS_DIR):
        for entry in os.listdir(PROJECTS_DIR):
            p = os.path.join(PROJECTS_DIR, entry)
            if os.path.isdir(p):
                projects.append(entry)
    return jsonify({"projects": sorted(projects)})

@app.route("/api/projects/create", methods=["POST"])
def create_project():
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"success": False, "error": "Tên dự án không được để trống"}), 400
    
    # Sanitize name
    name = "".join(c for c in name if c.isalnum() or c in ("_", "-"))
    proj_dir = os.path.join(PROJECTS_DIR, name)
    if os.path.exists(proj_dir):
        return jsonify({"success": False, "error": "Dự án đã tồn tại"}), 400
        
    os.makedirs(os.path.join(proj_dir, "input_videos"), exist_ok=True)
    os.makedirs(os.path.join(proj_dir, "levels"), exist_ok=True)
    return jsonify({"success": True, "name": name})

@app.route("/api/project/<name>", methods=["GET"])
def get_project_details(name):
    proj_dir = os.path.join(PROJECTS_DIR, name)
    if not os.path.exists(proj_dir):
        return jsonify({"error": "Không tìm thấy dự án"}), 404
        
    input_dir = os.path.join(proj_dir, "input_videos")
    levels_dir = os.path.join(proj_dir, "levels")
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(levels_dir, exist_ok=True)
    
    # List input videos (.mp4, .mkv, .mov, .avi)
    videos = []
    for f in os.listdir(input_dir):
        if f.lower().endswith((".mp4", ".mkv", ".mov", ".avi")):
            videos.append(f)
            
    # Load level report if exists
    csv_path = os.path.join(proj_dir, "report.csv")
    levels = []
    if os.path.exists(csv_path):
        try:
            df = pd.read_csv(csv_path, encoding="utf-8-sig")
            for _, row in df.iterrows():
                # Extract level number from "Level XX"
                lvl_str = str(row.get("Level", "1"))
                try:
                    lvl_num = int("".join(filter(str.isdigit, lvl_str)))
                except:
                    lvl_num = 1
                    
                levels.append({
                    "level": lvl_num,
                    "start_time_str": str(row.get("Thời gian bắt đầu", "")),
                    "end_time_str": str(row.get("Thời gian kết thúc", "")),
                    "duration_seconds": int(row.get("Thời lượng giải (giây)", 0)),
                    "board_image_rel": str(row.get("Ảnh bắt đầu màn", "")),
                    "victory_image_rel": str(row.get("Ảnh chiến thắng", "")),
                    "status": str(row.get("Trạng thái", "Completed"))
                })
        except Exception as e:
            print("Error loading report.csv:", e)
            
    return jsonify({
        "name": name,
        "input_folder_path": input_dir,
        "videos": sorted(videos),
        "levels": levels
    })

@app.route("/api/project/<name>/analyze", methods=["POST"])
def analyze_video(name):
    proj_dir = os.path.join(PROJECTS_DIR, name)
    if not os.path.exists(proj_dir):
        return jsonify({"success": False, "error": "Dự án không tồn tại"}), 404
        
    data = request.json or {}
    video_name = data.get("video_name")
    if not video_name:
        return jsonify({"success": False, "error": "Chưa chọn file video"}), 400
        
    video_path = os.path.join(proj_dir, "input_videos", video_name)
    if not os.path.exists(video_path):
        return jsonify({"success": False, "error": "File video không tồn tại trên đĩa"}), 404
        
    levels_dir = os.path.join(proj_dir, "levels")
    os.makedirs(levels_dir, exist_ok=True)
    
    try:
        # Run computer vision pipeline
        with VideoProcessor(video_path, auto_rotate_portrait=True) as vp:
            detector = LevelDetector(vp)
            levels = detector.scan_video()
            detector.export_level_assets(levels, levels_dir)
            
        # Export Excel and CSV reports
        ReportGenerator.generate_reports(levels, proj_dir)
        
        return jsonify({
            "success": True,
            "levels_count": len(levels),
            "levels": levels
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/project/<name>/level_image/<path:filename>")
def serve_level_image(name, filename):
    levels_dir = os.path.join(PROJECTS_DIR, name, "levels")
    return send_from_directory(levels_dir, filename)

@app.route("/api/project/<name>/download/<fmt>")
def download_report(name, fmt):
    proj_dir = os.path.join(PROJECTS_DIR, name)
    if fmt == "xlsx":
        file_path = os.path.join(proj_dir, "report.xlsx")
        return send_file(file_path, as_attachment=True, download_name=f"{name}_level_matrix.xlsx")
    elif fmt == "csv":
        file_path = os.path.join(proj_dir, "report.csv")
        return send_file(file_path, as_attachment=True, download_name=f"{name}_level_matrix.csv")
    return jsonify({"error": "Unsupported format"}), 400

if __name__ == "__main__":
    print("Khởi động Game Level Deconstructor tại http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
