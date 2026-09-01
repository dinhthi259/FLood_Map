const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// ====== BẢN ĐỒ CƠ BẢN ======
const MAP_NORMAL = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
[0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
[0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ====== BẢN ĐỒ NGẬP ======
const MAP_FLOOD = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
[0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
[0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
[0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,3],
[0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,3],
[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const ROWS = MAP_NORMAL.length;
const COLS = MAP_NORMAL[0].length;
const CELL = Math.floor(Math.min(canvas.width / COLS, canvas.height / ROWS));
canvas.width = CELL * COLS;
canvas.height = CELL * ROWS;

// ====== TRẠNG THÁI ======
let isFloodMode = false;
let isChan = false;
let wasFlooded = false; // biến đánh dấu đã từng gặp ngập
let grid = MAP_NORMAL.map((r) => r.slice());

// ====== GÁN DỮ LIỆU VỊ TRÍ ======
const ngoQuyenCells = [
  
];

let gridData = [];
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const found = ngoQuyenCells.find((c) => c.x === x && c.y === y);
    gridData.push({
      id: `C${y}_${x}`,
      x,
      y,
      keyword: found ? found.name : "",
    });
  }
}

// ====== HÀM CƠ BẢN ======
function isWalkable(x, y) {
  return grid[y] && grid[y][x] === 0;
}
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function greedyBestFirst(s, e, avoidSet = new Set()) {
  const key = (p) => `${p.x},${p.y}`;
  const open = [s];
  const came = new Map();
  const visited = new Set([key(s)]);
  while (open.length) {
    open.sort((a, b) => heuristic(a, e) - heuristic(b, e));
    const cur = open.shift();
    const curKey = key(cur);
    if (cur.x === e.x && cur.y === e.y) {
      const out = [];
      let k = curKey;
      while (k) {
        const [xx, yy] = k.split(",").map(Number);
        out.push({ x: xx, y: yy });
        k = came.get(k);
      }
      return out.reverse();
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cur.x + dx,
        ny = cur.y + dy;
      if (!isWalkable(nx, ny)) {
        isChan = true;
        continue;
      }

      const nk = key({ x: nx, y: ny });
      if (visited.has(nk) || avoidSet.has(nk)) continue;
      visited.add(nk);
      came.set(nk, curKey);
      open.push({ x: nx, y: ny });
    }
  }
  return null;
}

function isPathFlooded(path) {
  for (const p of path) {
    if (MAP_FLOOD[p.y][p.x] === 3) {
      // 3 là ô ngập
      return true;
    }
  }
  return false;
}

// ====== VẼ BẢN ĐỒ ======
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e9f3fb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const val = grid[r][c];
      const x = c * CELL,
        y = r * CELL;
      if (val === 0) {
        ctx.fillStyle = "#bfbfbf";
        ctx.fillRect(x, y, CELL, CELL);
      } else if (val === 1) {
        ctx.fillStyle = "#fdf9d8ff";
        ctx.fillRect(x, y, CELL, CELL);
        const pad = CELL * 0.25;
        ctx.fillRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2);
      } else if (val === 2) {
        ctx.fillStyle = isFloodMode ? "#a8d8ea" : "#a8d8ea";
        ctx.fillRect(x, y, CELL, CELL);
      } else if (val === 3) {
        ctx.fillStyle = "#ba2121ff";
        ctx.fillRect(x, y, CELL, CELL);
      }
    }
    // ====== GHI TÊN ĐƯỜNG CÓ XOAY ======
    ctx.font = `${CELL * 0.4}px Arial`;
    ctx.fillStyle = "#222020ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const roadGroups = {};
    ngoQuyenCells.forEach((c) => {
      // Lấy phần sau số, ví dụ "01 Ngô Quyền" -> "Ngô Quyền"
      const street = c.name.replace(/^\d+\s*/, "");
      if (!roadGroups[street]) roadGroups[street] = [];
      roadGroups[street].push(c);
    });

    Object.entries(roadGroups).forEach(([street, cells]) => {
      // Tính trung tâm tuyến
      const avgX = cells.reduce((sum, c) => sum + c.x, 0) / cells.length;
      const avgY = cells.reduce((sum, c) => sum + c.y, 0) / cells.length;

      // Tính góc xoay dựa trên ô đầu và cuối
      const first = cells[0];
      const last = cells[cells.length - 1];
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const angle = Math.atan2(dy, dx);

      // Vẽ chữ xoay theo hướng đường
      ctx.save(); // lưu trạng thái gốc
      ctx.translate(avgX * CELL + CELL / 2, avgY * CELL + CELL / 2);
      ctx.rotate(angle);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.strokeText(street, 0, 0);
      ctx.fillText(street, 0, 0);
      ctx.restore(); // khôi phục trạng thái
    });
  }

  // Vẽ tuyến đường
  if (currentPath) {
    ctx.fillStyle =
      isFloodMode && isPathFlooded(currentPath) ? "#ff6b6b" : "#007aff";
    currentPath.forEach((p) =>
      ctx.fillRect(p.x * CELL, p.y * CELL, CELL, CELL)
    );
  }
  // ====== GHI TÊN ĐƯỜNG CÓ XOAY ======
  ctx.font = `${CELL * 0.4}px Arial`;
  ctx.fillStyle = "#872d2dff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const roadGroups = {};
  ngoQuyenCells.forEach((c) => {
    // Lấy phần sau số, ví dụ "01 Ngô Quyền" -> "Ngô Quyền"
    const street = c.name.replace(/^\d+\s*/, "");
    if (!roadGroups[street]) roadGroups[street] = [];
    roadGroups[street].push(c);
  });

  Object.entries(roadGroups).forEach(([street, cells]) => {
    // Tính trung tâm tuyến
    const avgX = cells.reduce((sum, c) => sum + c.x, 0) / cells.length;
    const avgY = cells.reduce((sum, c) => sum + c.y, 0) / cells.length;

    // Tính góc xoay dựa trên ô đầu và cuối
    const first = cells[0];
    const last = cells[cells.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const angle = Math.atan2(dy, dx);

    // Vẽ chữ xoay theo hướng đường
    ctx.save(); // lưu trạng thái gốc
    ctx.translate(avgX * CELL + CELL / 2, avgY * CELL + CELL / 2);
    ctx.rotate(angle);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.strokeText(street, 0, 0);
    ctx.fillText(street, 0, 0);
    ctx.restore(); // khôi phục trạng thái
  });

  // Vẽ điểm đầu - cuối
  const sid = startInput.dataset.id,
    eid = endInput.dataset.id;
  if (sid) {
    const s = gridData.find((g) => g.id === sid);
    if (s) {
      ctx.beginPath();
      ctx.arc(
        s.x * CELL + CELL / 2,
        s.y * CELL + CELL / 2,
        CELL / 4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "#2ecc71";
      ctx.fill();
    }
  }
  if (eid) {
    const e = gridData.find((g) => g.id === eid);
    if (e) {
      ctx.beginPath();
      ctx.arc(
        e.x * CELL + CELL / 2,
        e.y * CELL + CELL / 2,
        CELL / 4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "#e74c3c";
      ctx.fill();
    }
  }
}
// ====== THÔNG BÁO NGẬP ======
const floodNotice = document.getElementById("floodNotice");
const closeNoticeBtn = document.getElementById("closeNoticeBtn");
closeNoticeBtn.addEventListener("click", () => {
  floodNotice.style.display = "none";
});
// ====== GIAO DIỆN ======
const toggleBtn = document.getElementById("toggleFloodBtn");
toggleBtn.addEventListener("click", () => {
  isFloodMode = !isFloodMode;
  grid = (isFloodMode ? MAP_FLOOD : MAP_NORMAL).map((r) => r.slice());
  toggleBtn.textContent = isFloodMode ? "Chế độ ngập: BẬT" : "Chế độ ngập: TẮT";
  draw();

  // Khi bật ngập => hiện cảnh báo
  if (isFloodMode) {
    floodNotice.style.display = "block";
  } else {
    floodNotice.style.display = "none";
  }
});

const startInput = document.getElementById("startInput");
const endInput = document.getElementById("endInput");
const findBtn = document.getElementById("findPathBtn");
const suggestionsBox = document.getElementById("suggestions");
let activeField = null;
[startInput, endInput].forEach((i) => {
  i.addEventListener("focus", () => (activeField = i));
  i.addEventListener("input", () => {
    const val = i.value.toLowerCase();
    const matches = gridData.filter((c) =>
      c.keyword.toLowerCase().includes(val)
    );
    if (!matches.length) {
      suggestionsBox.style.display = "none";
      return;
    }
    suggestionsBox.innerHTML = matches
      .map((m) => `<div data-id="${m.id}">${m.keyword || m.id}</div>`)
      .join("");
    suggestionsBox.style.display = "block";
  });
});
suggestionsBox.addEventListener("click", (e) => {
  if (e.target.dataset.id) {
    activeField.value = e.target.textContent;
    activeField.dataset.id = e.target.dataset.id;
    suggestionsBox.style.display = "none";
  }
});

let currentPath = null;

findBtn.addEventListener("click", async () => {
  const sid = startInput.dataset.id,
    eid = endInput.dataset.id;
  if (!sid || !eid) {
    alert("Vui lòng chọn vị trí và điểm đến.");
    return;
  }

  const s = gridData.find((g) => g.id === sid),
    e = gridData.find((g) => g.id === eid);

  if (!s || !e || !isWalkable(s.x, s.y) || !isWalkable(e.x, e.y)) {
    alert("Không hợp lệ (ô không đi được).");
    return;
  }

  // ✅ Hiện popup loading
  const loadingPopup = document.getElementById("loadingPopup");
  loadingPopup.style.display = "flex";

  // ✅ Chờ 3 giây mô phỏng hệ thống xử lý
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // ✅ Ẩn popup sau khi chờ xong
  loadingPopup.style.display = "none";

  // --- 1️⃣ Tìm tuyến đường ngắn nhất ---
  let bestPath = greedyBestFirst({ x: s.x, y: s.y }, { x: e.x, y: e.y });

  // --- 2️⃣ Kiểm tra ngập ---
  if (isFloodMode && bestPath && isPathFlooded(bestPath)) {
    if (isChan === true) {
      await new Promise((res) => setTimeout(res, 100));
      console.log(
        "⚠️ Tuyến đường ngắn nhất hiện đang ngập, không thể di chuyển.\nTôi sẽ đề xuất tuyến đường khác cho bạn."
      );
    }

    // --- 3️⃣ Tạo danh sách ô ngập để tránh ---
    const avoidSet = new Set();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (MAP_FLOOD[y][x] === 3) avoidSet.add(`${x},${y}`);
      }
    }

    // --- 4️⃣ Tìm tuyến đường khác ---
    const altPath = greedyBestFirst(
      { x: s.x, y: s.y },
      { x: e.x, y: e.y },
      avoidSet
    );

    if (altPath && altPath.length > 0) {
      currentPath = altPath;
    } else {
      await new Promise((res) => setTimeout(res, 100));
      alert("🚫 Không tìm thấy tuyến đường an toàn nào khả dụng.");
      currentPath = null;
    }
  } else {
    // --- Không ngập hoặc tuyến hợp lệ ---
    currentPath = bestPath;
  }

  draw();
});

// ========== CHỨC NĂNG BÁO CÁO / CỨU HỘ ==========
const btnRescue = document.getElementById("btnRescue");
// const reportPopup = document.getElementById("reportPopup");
// const issueFormPopup = document.getElementById("issueFormPopup");
const rescueFormPopup = document.getElementById("rescueFormPopup");

// // mở popup chọn hành động
// reportBtn.addEventListener("click", () => {
//   reportPopup.style.display = "flex";
// });

// // đóng popup
// document.querySelectorAll(".popup-close").forEach((btn) =>
//   btn.addEventListener("click", () => {
//     document
//       .querySelectorAll(".popup-overlay")
//       .forEach((p) => (p.style.display = "none"));
//   })
// );

// // chọn báo cáo sự cố
// document
//   .getElementById("btnReportIssue")
//   .addEventListener("click", () => {
//     reportPopup.style.display = "none";
//     issueFormPopup.style.display = "flex";
//   });

// chọn cứu hộ
document.getElementById("btnRescue").addEventListener("click", () => {
  rescueFormPopup.style.display = "flex";
});

// gửi báo cáo sự cố

// xác nhận cứu hộ
document
  .getElementById("confirmRescueBtn")
  .addEventListener("click", async () => {
    const name = document.getElementById("rescueName").value.trim();
    const phone = document.getElementById("rescuePhone").value.trim();
    const addr = document.getElementById("rescueAddress").value.trim();
    const desc = document.getElementById("rescueDesc").value.trim();

    if (!name || !phone || !addr || !desc) {
      alert("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (
      !confirm(
        "⚠️ Bạn có chắc chắn muốn gửi yêu cầu cứu hộ không?\nLưu ý: Báo sai sự thật sẽ bị xử lý theo pháp luật."
      )
    )
      return;

    try {
      await sendEmail(name, phone, addr, desc);
      alert("✅ Yêu cầu cứu hộ của bạn đã được gửi đến trung tâm.");
      rescueFormPopup.style.display = "none";
    } catch (err) {
      console.error("Lỗi gửi email:", err);
      alert("❌ Gửi email thất bại. Vui lòng thử lại sau.");
    }
  });
document.getElementById("huy").addEventListener("click", async () => {
  rescueFormPopup.style.display = "none";
});

// Hàm gửi email qua EmailJS
async function sendEmail(name, phone, address, desc) {
  const templateParams = {
    rescue_name: name,
    rescue_phone: phone,
    rescue_address: address,
    rescue_desc: desc,
  };

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: "service_ih1vkhc", // 🔹 thay bằng service ID của bạn
      template_id: "template_6noiann", // 🔹 thay bằng template ID của bạn
      user_id: "Xs6XzRo559iGDXWjV", // 🔹 thay bằng public key (EmailJS public key)
      template_params: templateParams,
    }),
  });

  if (!response.ok) {
    throw new Error("Không thể gửi email");
  }
}

draw();

// ====== KẾT NỐI VỚI FLASK (CẬP NHẬT NGẬP TỰ ĐỘNG) ======
async function checkFloodStatus() {
  try {
    const res = await fetch("http://localhost:5000/status");
    const data = await res.json();

    const shouldFlood = data.flood === true;

    if (shouldFlood !== isFloodMode) {
      isFloodMode = shouldFlood;
      grid = (isFloodMode ? MAP_FLOOD : MAP_NORMAL).map((r) => r.slice());
      toggleBtn.textContent = isFloodMode
        ? "Chế độ ngập: BẬT"
        : "Chế độ ngập: TẮT";
      draw();

      // ✅ Hiển thị cảnh báo khi server tự động bật ngập
      if (isFloodMode) {
        floodNotice.style.display = "block";
      } else {
        floodNotice.style.display = "none";
      }

      // ✅ Nếu đang có tuyến đường thì tự tính lại
      if (startInput.dataset.id && endInput.dataset.id) {
        findBtn.click();
      }
    }
  } catch (err) {
    console.error("Không thể kết nối Flask server:", err);
  }
}

// Kiểm tra trạng thái mỗi 3 giây
setInterval(checkFloodStatus, 3000);
