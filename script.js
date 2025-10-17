// script.js - Canvas rendering (seamless tiles) + Greedy Best-First Search
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Disable smoothing to avoid tiny seams
ctx.imageSmoothingEnabled = false;

// maps provided by user
// 0: road (walkable), 1: wall/house (not walkable), 2: lake/flood (not walkable)
const MAP_NORMAL = [
  [0,0,0,0,0,0,0,0],
  [1,1,1,1,0,1,1,0],
  [1,1,1,1,0,1,1,0],
  [0,0,0,0,0,0,0,0],
  [2,0,1,1,0,1,1,0],
  [2,0,1,1,0,1,1,0],
  [2,0,1,1,0,0,0,0],
  [2,0,1,1,0,1,1,0],
  [2,0,1,1,0,1,1,0],
  [0,0,0,0,0,0,0,0],
  [2,0,1,1,1,1,1,1],
  [2,0,1,1,1,1,1,1],
  [2,0,1,1,1,1,1,1],
];

const MAP_FLOOD = [
  [0,0,0,0,0,0,0,0],
  [1,1,1,1,0,1,1,0],
  [1,1,1,1,0,1,1,0],
  [2,0,0,0,0,0,0,0],
  [2,2,1,1,0,1,1,0],
  [2,2,1,1,0,1,1,0],
  [2,2,1,1,0,0,0,0],
  [2,2,1,1,0,1,1,0],
  [2,2,1,1,0,1,1,0],
  [2,0,0,0,0,0,0,0],
  [2,0,1,1,1,1,1,1],
  [2,0,1,1,1,1,1,1],
  [2,0,1,1,1,1,1,1],
];

// config
let grid = []; // will be clone of MAP_NORMAL or MAP_FLOOD
const ROWS = MAP_NORMAL.length;
const COLS = MAP_NORMAL[0].length;

// compute cell size to fill canvas while preserving aspect ratio
const CELL = Math.floor(Math.min(canvas.width / COLS, canvas.height / ROWS));
canvas.width = CELL * COLS;
canvas.height = CELL * ROWS;

let start = null;
let end = null;
let placing = null; // 'start' | 'end' | null
let path = null;
let animId = null;
let animIndex = 0;
let animVehicle = null;

function cloneMap(m){
  return m.map(row => row.slice());
}

function resetToNormal(){
  grid = cloneMap(MAP_NORMAL);
  path = null;
  stopAnim();
  draw();
}

function setFlood(){
  grid = cloneMap(MAP_FLOOD);
  path = null;
  stopAnim();
  draw();
}

// rounded rect helper
function roundRect(ctx, x, y, w, h, r, fill, stroke){
  const radius = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// draw the map (seamless tiles)
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // overall background very light (like map paper)
  ctx.fillStyle = "#e9f3fb";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // draw tiles tightly — eliminate seams by slightly overfilling
  // use small epsilon to cover antialias gaps
  const eps = 0.5;

  for (let r=0; r<ROWS; r++){
    for (let c=0; c<COLS; c++){
      const val = grid[r][c];
      const x = c * CELL;
      const y = r * CELL;

      if (val === 0) {
        // ROAD -> gray (seamless)
        ctx.fillStyle = "#737373"; // road gray
        // fill a hair extra to avoid thin lines
        ctx.fillRect(x - eps, y - eps, CELL + eps*2, CELL + eps*2);

      } else if (val === 1){
        // HOUSE / WALL -> white block with small pale-yellow inner square (roof)
        // base white
        ctx.fillStyle = "#fffcefff";
        ctx.fillRect(x - eps, y - eps, CELL + eps*2, CELL + eps*2);

        // small inner pale yellow square (mái)
        const pad = Math.max(2, Math.floor(CELL * 0.18));
        const innerW = CELL - pad*2;
        const innerH = CELL - pad*2;
        ctx.fillStyle = "#fffcefff";
        // Draw a slightly smaller rounded inner rect centered
        roundRect(ctx, x + pad, y + pad, innerW, innerH, Math.max(1, Math.floor(CELL*0.06)), true, false);

        // tiny subtle border/shadow to separate adjacent houses (very faint)
        ctx.strokeStyle = "rgba(0,0,0,0.03)";
        ctx.lineWidth = 1;
        roundRect(ctx, x - eps + 0.5, y - eps + 0.5, CELL + eps*2 -1, CELL + eps*2 -1, Math.max(1, Math.floor(CELL*0.03)), false, true);

      } else if (val === 2){
        // LAKE / FLOOD -> light blue with rounded corners
        ctx.fillStyle = "#41bfedff"; // lake light blue
        roundRect(ctx, x - eps, y - eps, CELL + eps*2, CELL + eps*2, Math.max(4, Math.floor(CELL*0.03)), true, false);

        // subtle inner gradient-ish band (simulate water edge)
        // (simple approach: slightly darker ellipse)
        ctx.fillStyle = "rgba(0,0,0,0.02)";
        ctx.beginPath();
        ctx.ellipse(x + CELL/2, y + CELL/2, CELL*0.32, CELL*0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // draw path if exists (red path)
// draw path if exists (highlighted cells)
if (path && path.length) {
  ctx.fillStyle = "#a5e4ff"; // light blue for route highlight
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const x = p.x * CELL;
    const y = p.y * CELL;
    // fill each cell along the path
    roundRect(ctx, x, y, CELL, CELL, Math.max(3, Math.floor(CELL * 0)), true, false);
  }
}


  // draw start/end
  if (start){
    ctx.fillStyle = "#00b050";
    roundRect(ctx, start.x*CELL + CELL*0.12, start.y*CELL + CELL*0.12, CELL*0.76, CELL*0.76, Math.max(2,Math.floor(CELL*0.12)), true, false);
  }
  if (end){
    ctx.fillStyle = "#ffb300";
    roundRect(ctx, end.x*CELL + CELL*0.12, end.y*CELL + CELL*0.12, CELL*0.76, CELL*0.76, Math.max(2,Math.floor(CELL*0.12)), true, false);
  }

  // vehicle animation
  if (animVehicle){
    ctx.fillStyle = "#0047ff";
    const cx = animVehicle.x * CELL + CELL/2;
    const cy = animVehicle.y * CELL + CELL/2;
    roundRect(ctx, cx - CELL*0.35, cy - CELL*0.25, CELL*0.7, CELL*0.5, 4, true, false);
  }
}

// convert mouse click to cell coordinates
function pxToCell(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left) / CELL);
  const y = Math.floor((clientY - rect.top) / CELL);
  return { x, y };
}

// walkable only when cell === 0
function isWalkable(x,y){
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  return grid[y][x] === 0;
}

// heuristic: Manhattan
function heuristic(a,b){
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Greedy Best-First Search implementation
function greedyBestFirst(s, e) {
  if (!isWalkable(s.x, s.y) || !isWalkable(e.x, e.y)) {
    console.warn('Start or end not walkable:', s, e);
    return null;
  }

  const key = p => `${p.x},${p.y}`;
  const openSet = [{ x: s.x, y: s.y }];
  const cameFrom = new Map();
  const visited = new Set();
  visited.add(key(s));

  while (openSet.length > 0) {
    // pick node with smallest heuristic
    let bestIdx = 0;
    let bestH = heuristic(openSet[0], e);
    for (let i = 1; i < openSet.length; i++) {
      const h = heuristic(openSet[i], e);
      if (h < bestH) {
        bestH = h;
        bestIdx = i;
      }
    }

    const current = openSet.splice(bestIdx, 1)[0];
    const curKey = key(current);

    if (current.x === e.x && current.y === e.y) {
      // reconstruct path
      const out = [];
      let k = curKey;
      while (k) {
        const [xx, yy] = k.split(',').map(Number);
        out.push({ x: xx, y: yy });
        k = cameFrom.get(k);
      }
      out.reverse();
      return out;
    }

    // neighbors
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const d of dirs) {
      const nx = current.x + d[0], ny = current.y + d[1];
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      if (!isWalkable(nx, ny)) continue;

      const nKey = `${nx},${ny}`;
      if (visited.has(nKey)) continue;

      visited.add(nKey);
      cameFrom.set(nKey, curKey);
      openSet.push({ x: nx, y: ny });
    }
  }

  console.warn('Greedy BFS: no path found. Start=', s, 'End=', e);
  return null;
}

// animation along path
function startAnim(pathArr){
  stopAnim();
  if (!pathArr || pathArr.length === 0) return;
  animIndex = 0;
  animVehicle = { x: pathArr[0].x, y: pathArr[0].y };
  function step(){
    if (animIndex >= pathArr.length){
      stopAnim();
      return;
    }
    animVehicle.x = pathArr[animIndex].x;
    animVehicle.y = pathArr[animIndex].y;
    draw();
    animIndex++;
    animId = setTimeout(step, 250);
  }
  step();
}
function stopAnim(){
  if (animId) { clearTimeout(animId); animId = null; }
  animVehicle = null;
}

// canvas click handler for placing start/end
canvas.addEventListener('click', (ev) => {
  const cell = pxToCell(ev.clientX, ev.clientY);
  if (cell.x < 0 || cell.x >= COLS || cell.y < 0 || cell.y >= ROWS) return;
  if (placing === 'start'){
    if (!isWalkable(cell.x, cell.y)){ alert('Ô bắt đầu phải là ô đường (0).'); return; }
    start = { x: cell.x, y: cell.y };
    placing = null;
    draw();
  } else if (placing === 'end'){
    if (!isWalkable(cell.x, cell.y)){ alert('Ô đích phải là ô đường (0).'); return; }
    end = { x: cell.x, y: cell.y };
    placing = null;
    draw();
  }
});

// button events
document.getElementById('setStart').addEventListener('click', () => { placing = 'start'; alert('Click ô để đặt điểm xuất phát (phải là ô 0).'); });
document.getElementById('setEnd').addEventListener('click', () => { placing = 'end'; alert('Click ô để đặt điểm đích (phải là ô 0).'); });

document.getElementById('simulateFlood').addEventListener('click', () => {
  setFlood();
});

document.getElementById('clearFlood').addEventListener('click', () => {
  resetToNormal();
});

document.getElementById('findPath').addEventListener('click', () => {
  if (!start || !end){
    alert('Bạn chưa đặt start hoặc end.');
    return;
  }
  if (!isWalkable(start.x, start.y) || !isWalkable(end.x, end.y)){
    alert('Start hoặc End hiện không nằm trên ô đường (0). Hãy đặt lại.');
    return;
  }

  const res = greedyBestFirst(start, end);

  if (!res){
    alert('Không tìm thấy tuyến an toàn (bị chắn bởi tường/hồ/ngập).');
    path = null;
    draw();
    stopAnim();
    return;
  }

  path = res;
  draw();
  startAnim(path);
});

document.getElementById('resetAll').addEventListener('click', () => {
  resetToNormal();
  start = null;
  end = null;
  path = null;
  stopAnim();
});

// init
resetToNormal();
