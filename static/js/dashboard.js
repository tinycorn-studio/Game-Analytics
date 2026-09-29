let currentProject = "";

document.addEventListener("DOMContentLoaded", () => {
    loadProjects();
});

async function loadProjects() {
    try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        const select = document.getElementById("projectSelect");
        select.innerHTML = "";
        
        if (data.projects && data.projects.length > 0) {
            data.projects.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p;
                opt.textContent = p;
                select.appendChild(opt);
            });
            currentProject = data.projects[0];
            loadProjectDetails(currentProject);
        } else {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "-- Chưa có dự án --";
            select.appendChild(opt);
        }
    } catch (err) {
        console.error("Lỗi tải dự án:", err);
    }
}

async function switchProject(projectName) {
    if (!projectName) return;
    currentProject = projectName;
    await loadProjectDetails(projectName);
}

async function refreshProject() {
    if (currentProject) {
        await loadProjectDetails(currentProject);
    }
}

async function loadProjectDetails(projectName) {
    try {
        const res = await fetch(`/api/project/${projectName}`);
        const data = await res.json();
        
        document.getElementById("inputFolderPath").textContent = data.input_folder_path;
        
        // Update videos dropdown
        const vSelect = document.getElementById("videoSelect");
        vSelect.innerHTML = "";
        if (data.videos && data.videos.length > 0) {
            data.videos.forEach(v => {
                const opt = document.createElement("option");
                opt.value = v;
                opt.textContent = v;
                vSelect.appendChild(opt);
            });
            document.getElementById("videoCount").textContent = `${data.videos.length} video sẵn sàng`;
        } else {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "-- Không có video trong thư mục input_videos --";
            vSelect.appendChild(opt);
            document.getElementById("videoCount").textContent = `0 video`;
        }

        // Update download buttons
        document.getElementById("btnDownloadExcel").href = `/api/project/${projectName}/download/xlsx`;
        document.getElementById("btnDownloadCsv").href = `/api/project/${projectName}/download/csv`;

        // Render level matrix table
        const tbody = document.getElementById("levelTableBody");
        tbody.innerHTML = "";

        if (data.levels && data.levels.length > 0) {
            data.levels.forEach(lvl => {
                const tr = document.createElement("tr");
                const boardImgUrl = `/project/${projectName}/level_image/${lvl.board_image_rel}`;
                const vicImgUrl = `/project/${projectName}/level_image/${lvl.victory_image_rel}`;

                tr.innerHTML = `
                    <td class="level-tag">Level ${lvl.level.toString().padStart(2, '0')}</td>
                    <td>${lvl.start_time_str}</td>
                    <td>${lvl.end_time_str}</td>
                    <td><strong style="color: var(--warning);">${lvl.duration_seconds}s</strong></td>
                    <td>
                        <img src="${boardImgUrl}" class="thumb-preview" title="Xem ảnh bắt đầu" onclick="openPreview('${boardImgUrl}', '${vicImgUrl}', 'Level ${lvl.level}')" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'80\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%231e293b\\'/></svg>'">
                    </td>
                    <td>
                        <img src="${vicImgUrl}" class="thumb-preview" title="Xem ảnh chiến thắng" onclick="openPreview('${boardImgUrl}', '${vicImgUrl}', 'Level ${lvl.level}')" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'80\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%231e293b\\'/></svg>'">
                    </td>
                    <td><span class="status-badge status-ready">${lvl.status || 'Hoàn thành'}</span></td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="openPreview('${boardImgUrl}', '${vicImgUrl}', 'Level ${lvl.level}')">
                            <i class="fa-solid fa-eye"></i> Xem ảnh
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                        Chưa có dữ liệu phân tích. Hãy chọn video và bấm "BẮT ĐẦU PHÂN TÍCH"!
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        console.error("Lỗi tải chi tiết dự án:", err);
    }
}

async function runAnalysis() {
    const vSelect = document.getElementById("videoSelect");
    const videoName = vSelect.value;
    if (!videoName) {
        alert("Vui lòng thả file video vào thư mục input_videos trước khi phân tích!");
        return;
    }

    const btn = document.getElementById("btnRunAnalysis");
    const progress = document.getElementById("progressContainer");
    const bar = document.getElementById("progressBarFill");
    const msg = document.getElementById("progressMessage");
    const pct = document.getElementById("progressPercent");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang phân tích...`;
    progress.style.display = "block";
    bar.style.width = "10%";
    pct.textContent = "10%";
    msg.textContent = "Đang khởi tạo bộ quét Computer Vision...";

    try {
        const response = await fetch(`/api/project/${currentProject}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ video_name: videoName })
        });
        
        const result = await response.json();
        
        if (result.success) {
            bar.style.width = "100%";
            pct.textContent = "100%";
            msg.textContent = `Phân tích hoàn tất! Phát hiện thành công ${result.levels_count} màn chơi.`;
            setTimeout(() => {
                progress.style.display = "none";
                loadProjectDetails(currentProject);
            }, 1000);
        } else {
            alert("Lỗi khi phân tích: " + (result.error || "Không xác định"));
            progress.style.display = "none";
        }
    } catch (err) {
        alert("Lỗi kết nối máy chủ: " + err);
        progress.style.display = "none";
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> BẮT ĐẦU PHÂN TÍCH`;
    }
}

function openPreview(boardUrl, vicUrl, title) {
    document.getElementById("modalLevelTitle").textContent = `${title} - Chi Tiết Bóc Tách`;
    document.getElementById("modalBoardImg").src = boardUrl;
    document.getElementById("modalVictoryImg").src = vicUrl;
    document.getElementById("previewModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("previewModal").style.display = "none";
}

function openNewProjectModal() {
    document.getElementById("newProjectName").value = "";
    document.getElementById("newProjectModal").style.display = "flex";
}

function closeNewProjectModal() {
    document.getElementById("newProjectModal").style.display = "none";
}

async function submitCreateProject() {
    const name = document.getElementById("newProjectName").value.trim();
    if (!name) {
        alert("Vui lòng nhập tên dự án!");
        return;
    }
    try {
        const res = await fetch("/api/projects/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.success) {
            closeNewProjectModal();
            await loadProjects();
            document.getElementById("projectSelect").value = name;
            await switchProject(name);
        } else {
            alert(data.error || "Không tạo được dự án");
        }
    } catch (err) {
        alert("Lỗi: " + err);
    }
}
