let currentProject = "";

document.addEventListener("DOMContentLoaded", () => {
    loadProjects();
    loadProfiles();
});

async function loadProfiles() {
    try {
        const res = await fetch("/api/profiles");
        const data = await res.json();
        const select = document.getElementById("profileSelect");
        if (!select) return;
        select.innerHTML = '<option value="auto">⚡ Tự động nhận diện theo tên game</option>';
        if (data.profiles && data.profiles.length > 0) {
            data.profiles.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.id;
                opt.textContent = `🎮 ${p.name}`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Lỗi tải profiles:", err);
    }
}

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

    const profileSelect = document.getElementById("profileSelect");
    const profileId = profileSelect ? profileSelect.value : "auto";

    try {
        const response = await fetch(`/api/project/${currentProject}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                video_name: videoName,
                profile_id: profileId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            bar.style.width = "100%";
            pct.textContent = "100%";
            const usedProf = result.profile_used || profileId;
            msg.textContent = `Phân tích hoàn tất với profile [${usedProf}]! Phát hiện ${result.levels_count} màn chơi.`;
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

function openGSheetModal() {
    const defaultUrl = "https://script.google.com/macros/s/AKfycbxwg4HKat7VcSaG6ePK-nnqqGBUz5qA8ff2IeEUHE5_BJ8_dHqlYM9EM9BPJW_Y_EbLuQ/exec";
    let saved = localStorage.getItem("gsheet_webhook_url") || defaultUrl;
    if (saved.includes("AKfycbxPdGXN2g")) {
        saved = defaultUrl;
        localStorage.setItem("gsheet_webhook_url", defaultUrl);
    }
    document.getElementById("gsheetWebhookUrl").value = saved;
    const msg = document.getElementById("gsheetResultMsg");
    msg.style.display = "none";
    document.getElementById("gsheetModal").style.display = "flex";
}

function closeGSheetModal() {
    document.getElementById("gsheetModal").style.display = "none";
}

async function submitExportGSheet() {
    const url = document.getElementById("gsheetWebhookUrl").value.trim();
    if (!url) {
        alert("Vui lòng nhập Webhook URL của Google Apps Script!");
        return;
    }
    
    // Save to localStorage for convenience
    localStorage.setItem("gsheet_webhook_url", url);
    
    const btn = document.getElementById("btnSubmitGSheet");
    const msg = document.getElementById("gsheetResultMsg");
    
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...`;
    msg.style.display = "none";
    
    try {
        const res = await fetch(`/api/project/${currentProject}/export_google_sheet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ webhook_url: url })
        });
        const data = await res.json();
        
        msg.style.display = "block";
        if (data.success) {
            msg.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
            msg.style.color = "var(--success)";
            msg.style.border = "1px solid var(--success)";
            let html = `<strong><i class="fa-solid fa-circle-check"></i> ${data.message}</strong>`;
            if (data.sheet_url) {
                html += `<br><a href="${data.sheet_url}" target="_blank" style="color: var(--accent); font-weight: 600; text-decoration: underline; margin-top: 6px; display: inline-block;">👉 Bấm vào đây để mở Google Sheet</a>`;
            }
            msg.innerHTML = html;
        } else {
            msg.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
            msg.style.color = "var(--danger)";
            msg.style.border = "1px solid var(--danger)";
            msg.innerHTML = `<strong><i class="fa-solid fa-triangle-exclamation"></i> Lỗi:</strong> ${data.error || "Không gửi được dữ liệu"}`;
        }
    } catch (err) {
        msg.style.display = "block";
        msg.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
        msg.style.color = "var(--danger)";
        msg.style.border = "1px solid var(--danger)";
        msg.innerHTML = `<strong><i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối:</strong> ${err}`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Gửi Lên Sheet Ngay`;
    }
}

async function openProjectFolder() {
    if (!currentProject) {
        alert("Vui lòng chọn một dự án trước!");
        return;
    }
    try {
        const res = await fetch(`/api/project/${currentProject}/open_folder`, { method: "POST" });
        const data = await res.json();
        if (!data.success) {
            alert("Không thể mở thư mục: " + (data.error || "Lỗi không xác định"));
        }
    } catch (err) {
        alert("Lỗi khi gọi máy chủ: " + err);
    }
}


