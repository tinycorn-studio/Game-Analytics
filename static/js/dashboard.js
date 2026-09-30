let currentProject = "";
let currentGDTab = "Level Matrix";
let allGDSheets = {};
let currentLevels = [];

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
            await loadProjectDetails(currentProject);
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

function switchGDTab(tabName) {
    currentGDTab = tabName;
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    const mapBtnId = {
        "Level Matrix": "tabBtn_LevelMatrix",
        "Mechanics Catalog": "tabBtn_MechanicsCatalog",
        "Level Curve & Mechanics": "tabBtn_LevelCurve",
        "Boosters & Unlocks": "tabBtn_Boosters",
        "Pacing & Difficulty": "tabBtn_Pacing",
        "Executive Summary": "tabBtn_Summary"
    };
    const activeBtn = document.getElementById(mapBtnId[tabName]);
    if (activeBtn) activeBtn.classList.add("active");
    renderActiveTab();
}

function updateKPISummary(sheetsData, levels) {
    const kpiSection = document.getElementById("kpiSummarySection");
    if (!kpiSection) return;
    kpiSection.style.display = "grid";

    const lvlCount = levels ? levels.length : 0;
    const totalSec = levels ? levels.reduce((acc, l) => acc + (parseInt(l.duration_seconds) || 0), 0) : 0;
    const mins = (totalSec / 60).toFixed(1);
    document.getElementById("kpiTotalLevels").textContent = `${lvlCount} Màn`;
    document.getElementById("kpiTotalDuration").textContent = `${mins} phút (${totalSec}s)`;

    const avgSec = lvlCount > 0 ? (totalSec / lvlCount).toFixed(1) : 0;
    document.getElementById("kpiAvgDuration").textContent = `${avgSec}s / màn`;

    const pacingSheet = sheetsData ? sheetsData["Pacing & Difficulty"] : null;
    let chokes = ["Màn 04", "Màn 06"];
    if (pacingSheet && pacingSheet.summary_metrics && pacingSheet.summary_metrics.choke_points && pacingSheet.summary_metrics.choke_points.length > 0) {
        chokes = pacingSheet.summary_metrics.choke_points;
    }
    document.getElementById("kpiChokePoints").textContent = chokes.join(", ");

    const boosterSheet = sheetsData ? sheetsData["Boosters & Unlocks"] : null;
    if (boosterSheet && boosterSheet.rows) {
        document.getElementById("kpiBoostersCount").textContent = `${boosterSheet.rows.length} Trợ Thủ`;
    }
}

function renderActiveTab() {
    const thead = document.getElementById("levelTableHead");
    const tbody = document.getElementById("levelTableBody");
    const titleSpan = document.getElementById("activeSheetTitle");
    if (!thead || !tbody) return;

    thead.innerHTML = "";
    tbody.innerHTML = "";

    const sheetData = allGDSheets[currentGDTab];
    if (titleSpan) {
        titleSpan.textContent = sheetData ? sheetData.display_title : currentGDTab;
    }

    if (!sheetData || !sheetData.rows || sheetData.rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                    Chưa có dữ liệu cho tab "${currentGDTab}". Hãy chọn video và bấm "BẮT ĐẦU PHÂN TÍCH"!
                </td>
            </tr>
        `;
        return;
    }

    // 1. Render Headers
    const trHead = document.createElement("tr");
    sheetData.headers.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        const hLow = h.toLowerCase();
        const isTextCol = hLow.includes("mô tả") || hLow.includes("công dụng") || hLow.includes("áp lực") || hLow.includes("tương tác") || hLow.includes("khuyến nghị") || hLow.includes("lời thoại") || hLow.includes("quy tắc") || hLow.includes("tác động");
        if (isTextCol) {
            th.classList.add("col-text", "text-left");
        } else {
            th.classList.add("col-nowrap", "text-center");
        }
        trHead.appendChild(th);
    });
    // Add action column if Level Matrix
    if (currentGDTab === "Level Matrix") {
        const thAct = document.createElement("th");
        thAct.textContent = "Hành Động";
        thAct.classList.add("col-nowrap", "text-center");
        trHead.appendChild(thAct);
    }
    thead.appendChild(trHead);

    // 2. Render Rows
    const cacheBuster = Date.now();
    sheetData.rows.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach((cell, colIdx) => {
            const td = document.createElement("td");
            const hName = (sheetData.headers[colIdx] || "").toLowerCase();
            const cellStr = String(cell != null ? cell : "");
            const isTextCol = hName.includes("mô tả") || hName.includes("công dụng") || hName.includes("áp lực") || hName.includes("tương tác") || hName.includes("khuyến nghị") || hName.includes("lời thoại") || hName.includes("quy tắc") || hName.includes("tác động");

            // Align text columns vs nowrap columns
            if (isTextCol) {
                td.classList.add("col-text", "text-left");
            } else {
                td.classList.add("col-nowrap", "text-center");
            }

            // A. Checkbox cell detection
            if (cell === true || cellStr === "true") {
                td.innerHTML = `<span class="chk-icon-active" title="Có xuất hiện cơ chế này"><i class="fa-solid fa-square-check"></i></span>`;
            } else if (cell === false || cellStr === "false") {
                td.innerHTML = `<span class="chk-icon-inactive" title="Không có"><i class="fa-regular fa-square"></i></span>`;
            }
            // B. Image cell detection (distinguish square icons vs vertical screenshots)
            else if (cellStr.endsWith(".jpg") || cellStr.endsWith(".png")) {
                let imgUrl = `/project/${currentProject}/level_image/${cellStr}?t=${cacheBuster}`;
                let isSquare = cellStr.includes("mechanic_") || cellStr.includes("booster_") || cellStr.includes("icon");
                let imgClass = isSquare ? "thumb-icon-square" : "thumb-preview";
                td.innerHTML = `
                    <img src="${imgUrl}" class="${imgClass}" title="Bấm để xem ảnh phóng to" 
                         onclick="openSinglePreview('${imgUrl}', '${row[0] || 'Image'}')"
                         onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%231e293b\\'/></svg>'">
                `;
            } 
            // C. Tier Badge
            else if (hName === "tier") {
                const tLow = cellStr.toLowerCase();
                let tClass = "tier-normal";
                if (tLow.includes("crazy") || tLow.includes("super hard")) tClass = "tier-crazy";
                else if (tLow.includes("hard")) tClass = "tier-hard";
                td.innerHTML = `<span class="badge-tier ${tClass}">${cellStr}</span>`;
            }
            // D. Mechanic Unlock Milestone
            else if (hName === "mechanic_unlock") {
                if (cellStr && cellStr !== "-" && cellStr !== "None") {
                    td.innerHTML = `<span class="badge-unlock"><i class="fa-solid fa-sparkles"></i> ${cellStr}</span>`;
                } else {
                    td.innerHTML = `<span style="color: var(--text-secondary); opacity: 0.4;">-</span>`;
                }
            }
            // E. Status Badge
            else if ((hName === "status" || hName === "trạng thái") && (cellStr.toLowerCase().includes("done") || cellStr.toLowerCase().includes("hoàn thành"))) {
                td.innerHTML = `<span class="badge-tag badge-safe"><i class="fa-solid fa-check"></i> Done</span>`;
            }
            // F. Choke / Warning badges (ONLY apply to short tags < 35 chars)
            else if (cellStr.length < 35 && (cellStr.includes("Choke Point") || cellStr.includes("NGUY CƠ CAO") || cellStr.includes("Áp lực cao"))) {
                td.innerHTML = `<span class="badge-tag badge-choke">${cellStr}</span>`;
            } else if (cellStr.length < 35 && (cellStr.includes("Rất Thấp") || cellStr.includes("An Toàn") || cellStr.includes("Áp lực thấp") || cellStr.startsWith("Thấp:"))) {
                td.innerHTML = `<span class="badge-tag badge-safe">${cellStr}</span>`;
            } else if (cellStr.length < 35 && (cellStr.startsWith("Bắt buộc") || cellStr === "Trung bình" || cellStr.includes("Áp lực trung bình"))) {
                td.innerHTML = `<span class="badge-tag badge-warning">${cellStr}</span>`;
            } else if (colIdx === 0 && (cellStr.startsWith("Level") || cellStr.startsWith("Màn") || cellStr.startsWith("Lv."))) {
                td.innerHTML = `<strong class="level-tag">${cellStr}</strong>`;
            } else if (colIdx === 1 && currentGDTab === "Pacing & Difficulty") {
                td.innerHTML = `<strong style="color: var(--warning);">${cellStr}s</strong>`;
            } else if (colIdx === 5 && currentGDTab === "Level Matrix") {
                td.innerHTML = `<strong style="color: var(--warning);">${cellStr}s</strong>`;
            } else if (cellStr === "-" || cellStr === "") {
                td.innerHTML = `<span style="color: var(--text-secondary); opacity: 0.4;">-</span>`;
            } else {
                td.textContent = cellStr;
            }
            tr.appendChild(td);
        });

        // Add action button for Level Matrix
        if (currentGDTab === "Level Matrix") {
            const tdAct = document.createElement("td");
            tdAct.classList.add("col-nowrap", "text-center");
            const boardImg = `/project/${currentProject}/level_image/${row[1]}?t=${cacheBuster}`;
            const vicImg = `/project/${currentProject}/level_image/${row[2]}?t=${cacheBuster}`;
            tdAct.innerHTML = `
                <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="openPreview('${boardImg}', '${vicImg}', '${row[0]}')">
                    <i class="fa-solid fa-eye"></i> So Sánh Ảnh
                </button>
            `;
            tr.appendChild(tdAct);
        }

        tbody.appendChild(tr);
    });
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

        currentLevels = data.levels || [];

        // Fetch Game Design Sheets
        try {
            const gdRes = await fetch(`/api/project/${projectName}/game_design_sheets`);
            if (gdRes.ok) {
                const gdData = await gdRes.json();
                allGDSheets = gdData.sheets || {};
                updateKPISummary(allGDSheets, currentLevels);
                renderActiveTab();
                return;
            }
        } catch (eGD) {
            console.warn("Could not load game_design_sheets directly, falling back to levels:", eGD);
        }

        // Fallback: If no game_design_sheets yet
        allGDSheets["Level Matrix"] = {
            display_title: "Ma Trận Màn Chơi (Level Matrix)",
            headers: ["Màn (Level)", "Ảnh Khởi Đầu (Board Start)", "Ảnh Chiến Thắng (Victory)", "Bắt Đầu", "Kết Thúc", "Thời Lượng (s)", "Trạng Thái"],
            rows: currentLevels.map(lvl => [
                `Level ${lvl.level.toString().padStart(2, '0')}`,
                lvl.board_image_rel,
                lvl.victory_image_rel,
                lvl.start_time_str,
                lvl.end_time_str,
                lvl.duration_seconds,
                lvl.status || "Hoàn thành"
            ])
        };
        updateKPISummary(null, currentLevels);
        renderActiveTab();
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
    const boardContainer = document.getElementById("modalBoardContainer");
    const vicContainer = document.getElementById("modalVictoryContainer");
    if (boardContainer) boardContainer.style.display = "block";
    if (vicContainer) vicContainer.style.display = "block";
    const boardLabel = document.getElementById("modalBoardLabel");
    if (boardLabel) boardLabel.innerHTML = `<i class="fa-solid fa-flag"></i> Bố Cục Bắt Đầu Màn`;
    document.getElementById("modalBoardImg").src = boardUrl;
    document.getElementById("modalVictoryImg").src = vicUrl;
    document.getElementById("previewModal").style.display = "flex";
}

function openSinglePreview(imgUrl, title) {
    document.getElementById("modalLevelTitle").textContent = `${title} - Xem Chi Tiết Ảnh`;
    const boardContainer = document.getElementById("modalBoardContainer");
    const vicContainer = document.getElementById("modalVictoryContainer");
    if (boardContainer) boardContainer.style.display = "block";
    if (vicContainer) vicContainer.style.display = "none";
    const boardLabel = document.getElementById("modalBoardLabel");
    if (boardLabel) boardLabel.innerHTML = `<i class="fa-solid fa-image"></i> Ảnh Chi Tiết`;
    document.getElementById("modalBoardImg").src = imgUrl;
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
    const defaultUrl = "https://script.google.com/macros/s/AKfycbzKXOwFxxGt13az1ftoGxYAEy31pLCkVkLhglQmG3Sl6rYUHH0gwJCZA3WdRQS-Iz3XGQ/exec";
    let saved = localStorage.getItem("gsheet_webhook_url") || defaultUrl;
    if (saved.includes("AKfycbxPdGXN2g") || saved.includes("AKfycbxwg4HKat7VcSaG6ePK") || saved.includes("AKfycbzBlkW2VOCk5iB")) {
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


