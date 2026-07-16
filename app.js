"use strict";

/* =========================================================
   アートメモ帳  —  メモ帳 / デジタルアート / 関数電卓
   ========================================================= */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function fmtDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    alert("保存に失敗しました。ストレージ容量が不足している可能性があります。\nギャラリーの古い作品を削除すると空きが増えます。");
    return false;
  }
}

/* =========================================================
   タブ切り替え
   ========================================================= */
$$(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    $$(".view").forEach((v) => v.classList.remove("active"));
    $("#view-" + btn.dataset.view).classList.add("active");
    if (btn.dataset.view === "art") Art.onShow();
  });
});

/* =========================================================
   メモ帳
   ========================================================= */
const Memo = (() => {
  const KEY = "artmemo.notes";
  let notes = storageGet(KEY, []);
  let currentId = null;
  let saveTimer = null;

  const listEl = $("#memoList");
  const titleEl = $("#memoTitle");
  const bodyEl = $("#memoBody");
  const searchEl = $("#memoSearch");
  const infoEl = $("#memoInfo");
  const countEl = $("#memoCount");
  const pinBtn = $("#memoPin");
  const viewEl = $("#view-memo");

  function persist() { storageSet(KEY, notes); }

  function current() { return notes.find((n) => n.id === currentId) || null; }

  function sorted(list) {
    return [...list].sort((a, b) =>
      (b.pinned - a.pinned) || (b.updated - a.updated));
  }

  function renderList() {
    const q = searchEl.value.trim().toLowerCase();
    const visible = sorted(notes.filter((n) =>
      !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)));

    listEl.innerHTML = "";
    for (const n of visible) {
      const li = document.createElement("li");
      li.classList.toggle("active", n.id === currentId);
      const title = document.createElement("div");
      title.className = "m-title";
      title.textContent = (n.pinned ? "📌 " : "") + (n.title || "無題のメモ");
      const prev = document.createElement("div");
      prev.className = "m-prev";
      prev.textContent = n.body.replace(/\s+/g, " ").slice(0, 40) || "(本文なし)";
      const date = document.createElement("div");
      date.className = "m-date";
      date.textContent = fmtDate(n.updated);
      li.append(title, prev, date);
      li.addEventListener("click", () => select(n.id));
      listEl.appendChild(li);
    }
    viewEl.classList.toggle("empty", notes.length === 0);
  }

  function renderEditor() {
    const n = current();
    if (!n) return;
    titleEl.value = n.title;
    bodyEl.value = n.body;
    pinBtn.classList.toggle("pinned", !!n.pinned);
    infoEl.textContent = `作成: ${fmtDate(n.created)}　更新: ${fmtDate(n.updated)}`;
    countEl.textContent = `${n.body.length} 文字`;
  }

  function select(id) {
    flushSave();
    currentId = id;
    renderList();
    renderEditor();
  }

  function createNote() {
    const n = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: "",
      body: "",
      pinned: false,
      created: Date.now(),
      updated: Date.now(),
    };
    notes.push(n);
    persist();
    select(n.id);
    titleEl.focus();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 400);
  }

  function flushSave() {
    clearTimeout(saveTimer);
    const n = current();
    if (!n) return;
    if (n.title === titleEl.value && n.body === bodyEl.value) return;
    n.title = titleEl.value;
    n.body = bodyEl.value;
    n.updated = Date.now();
    persist();
    renderList();
    infoEl.textContent = `作成: ${fmtDate(n.created)}　更新: ${fmtDate(n.updated)}`;
  }

  titleEl.addEventListener("input", () => { scheduleSave(); });
  bodyEl.addEventListener("input", () => {
    countEl.textContent = `${bodyEl.value.length} 文字`;
    scheduleSave();
  });
  searchEl.addEventListener("input", renderList);
  $("#memoNew").addEventListener("click", createNote);

  pinBtn.addEventListener("click", () => {
    const n = current();
    if (!n) return;
    n.pinned = !n.pinned;
    n.updated = Date.now();
    persist();
    renderList();
    renderEditor();
  });

  $("#memoDelete").addEventListener("click", () => {
    const n = current();
    if (!n) return;
    if (!confirm(`「${n.title || "無題のメモ"}」を削除しますか?`)) return;
    notes = notes.filter((x) => x.id !== n.id);
    persist();
    const rest = sorted(notes);
    currentId = rest.length ? rest[0].id : null;
    renderList();
    renderEditor();
  });

  $("#memoDownload").addEventListener("click", () => {
    const n = current();
    if (!n) return;
    flushSave();
    const blob = new Blob([n.body], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (n.title || "memo") + ".txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#memoExport").addEventListener("click", () => {
    flushSave();
    const blob = new Blob([JSON.stringify({ app: "artmemo", notes }, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `memo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#memoImport").addEventListener("click", () => $("#memoImportFile").click());
  $("#memoImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const imported = Array.isArray(data) ? data : data.notes;
        if (!Array.isArray(imported)) throw new Error();
        let added = 0;
        for (const n of imported) {
          if (!n || typeof n.body !== "string") continue;
          if (notes.some((x) => x.id === n.id)) continue;
          notes.push({
            id: n.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
            title: String(n.title || ""),
            body: n.body,
            pinned: !!n.pinned,
            created: n.created || Date.now(),
            updated: n.updated || Date.now(),
          });
          added++;
        }
        persist();
        renderList();
        alert(`${added} 件のメモを読み込みました。`);
      } catch {
        alert("読み込みに失敗しました。バックアップJSONファイルを選択してください。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // 初期表示
  if (notes.length) currentId = sorted(notes)[0].id;
  renderList();
  renderEditor();

  return { flushSave };
})();

/* =========================================================
   デジタルアート
   ========================================================= */
const Art = (() => {
  /* ---- 状態 ---- */
  let W = 1200, H = 900;                 // キャンバス実サイズ
  let layers = [];                       // {id, name, canvas, ctx, visible, opacity, blend}
  let activeLayer = 0;
  let layerSeq = 1;

  let tool = "pen";
  let brushSize = 12;
  let brushOpacity = 1;
  let smoothing = 0.3;                   // 手ぶれ補正 0-0.8
  let color = { h: 220, s: 0.7, v: 0.25 };

  let view = { scale: 1, tx: 0, ty: 0 };
  let spaceDown = false;

  const undoStack = [];
  const redoStack = [];
  const UNDO_MAX = 25;

  const wrap = $("#artWrap");
  const canvas = $("#artCanvas");
  const ctx = canvas.getContext("2d");

  // ストロークバッファ(描画中の線を不透明度一定で合成するため)
  const buf = document.createElement("canvas");
  const bufCtx = buf.getContext("2d");
  let strokeActive = false;
  let strokeIsEraser = false;
  let strokeSnapshot = null;             // ストローク開始時のレイヤー(キャンセル/アンドゥ用)
  let lastPt = null;                     // 手ぶれ補正後の直近点
  let airCarry = 0;                      // エアブラシのスタンプ間隔繰り越し

  const pointers = new Map();            // ピンチ操作用
  let pinchStart = null;

  const RECENT_KEY = "artmemo.recentColors";
  const GALLERY_KEY = "artmemo.gallery";
  const WORK_KEY = "artmemo.artwork";    // 作業中の絵の自動保存

  /* ---- 色変換 ---- */
  function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r, g, b;
    if (h < 60)       [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else              [r, g, b] = [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return { h, s: max === 0 ? 0 : d / max, v: max };
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function currentRgb() { return hsvToRgb(color.h, color.s, color.v); }
  function currentHex() { return rgbToHex(...currentRgb()); }

  /* ---- レイヤー ---- */
  function makeLayer(name) {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    return {
      id: layerSeq++,
      name: name || `レイヤー ${layerSeq - 1}`,
      canvas: c,
      ctx: c.getContext("2d", { willReadFrequently: true }),
      visible: true,
      opacity: 1,
      blend: "source-over",
    };
  }

  function initCanvas(w, h, keepLayers) {
    W = w; H = h;
    buf.width = W; buf.height = H;
    if (!keepLayers) {
      layers = [makeLayer("背景"), makeLayer()];
      activeLayer = 1;
      undoStack.length = 0;
      redoStack.length = 0;
    }
    fitView();
    renderLayerList();
    render();
  }

  /* ---- ビュー(ズーム/パン) ---- */
  function fitView() {
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const scale = Math.min((rect.width - 40) / W, (rect.height - 40) / H, 4);
    view.scale = Math.max(scale, 0.05);
    view.tx = (rect.width - W * view.scale) / 2;
    view.ty = (rect.height - H * view.scale) / 2;
    updateZoomLabel();
  }

  function zoomAt(cx, cy, factor) {
    const ns = Math.min(Math.max(view.scale * factor, 0.05), 16);
    view.tx = cx - (cx - view.tx) * (ns / view.scale);
    view.ty = cy - (cy - view.ty) * (ns / view.scale);
    view.scale = ns;
    updateZoomLabel();
    render();
  }

  function updateZoomLabel() {
    $("#artZoomLabel").textContent = Math.round(view.scale * 100) + "%";
  }

  function screenToCanvas(x, y) {
    return [(x - view.tx) / view.scale, (y - view.ty) / view.scale];
  }

  /* ---- 描画(表示) ---- */
  let checkerPattern = null;
  function getChecker() {
    if (checkerPattern) return checkerPattern;
    const p = document.createElement("canvas");
    p.width = p.height = 20;
    const pc = p.getContext("2d");
    pc.fillStyle = "#c8c8c8"; pc.fillRect(0, 0, 20, 20);
    pc.fillStyle = "#efefef";
    pc.fillRect(0, 0, 10, 10); pc.fillRect(10, 10, 10, 10);
    checkerPattern = ctx.createPattern(p, "repeat");
    return checkerPattern;
  }

  function render() {
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw; canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.scale, view.scale);

    // 透明部分の市松模様
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = getChecker();
    ctx.fillRect(view.tx, view.ty, W * view.scale, H * view.scale);
    ctx.restore();

    ctx.imageSmoothingEnabled = view.scale < 1;
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      if (!l.visible) continue;
      ctx.globalAlpha = l.opacity;
      ctx.globalCompositeOperation = l.blend;
      ctx.drawImage(l.canvas, 0, 0);
      // 描画中のストロークをアクティブレイヤーの上に重ねる
      if (i === activeLayer && strokeActive && !strokeIsEraser) {
        ctx.globalAlpha = l.opacity * brushOpacity;
        ctx.drawImage(buf, 0, 0);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // キャンバス枠
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 1 / view.scale;
    ctx.strokeRect(0, 0, W, H);
    ctx.restore();
  }

  /* ---- アンドゥ/リドゥ ---- */
  function pushUndo(layerIdx) {
    const l = layers[layerIdx];
    undoStack.push({ layerId: l.id, data: l.ctx.getImageData(0, 0, W, H) });
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0;
    updateUndoButtons();
  }

  function applyHistory(fromStack, toStack) {
    while (fromStack.length) {
      const entry = fromStack.pop();
      const idx = layers.findIndex((l) => l.id === entry.layerId);
      if (idx === -1) continue; // レイヤーが削除済みならスキップ
      toStack.push({ layerId: entry.layerId, data: layers[idx].ctx.getImageData(0, 0, W, H) });
      layers[idx].ctx.putImageData(entry.data, 0, 0);
      render();
      updateLayerThumb(idx);
      break;
    }
    updateUndoButtons();
  }

  const undo = () => applyHistory(undoStack, redoStack);
  const redo = () => applyHistory(redoStack, undoStack);

  function updateUndoButtons() {
    $("#artUndo").disabled = undoStack.length === 0;
    $("#artRedo").disabled = redoStack.length === 0;
  }

  /* ---- ブラシエンジン ---- */
  function strokeStyleFor(toolName) {
    // ツール毎の実効サイズ/アルファ等
    switch (toolName) {
      case "pen":      return { widthScale: 1,   cap: "round", stampAlpha: 1 };
      case "marker":   return { widthScale: 1.7, cap: "butt",  stampAlpha: 1 };
      case "pencil":   return { widthScale: 0.7, cap: "round", stampAlpha: 0.45 };
      case "airbrush": return { widthScale: 2.2, cap: "round", stampAlpha: 0.09 };
      case "eraser":   return { widthScale: 1.3, cap: "round", stampAlpha: 1 };
      default:         return { widthScale: 1,   cap: "round", stampAlpha: 1 };
    }
  }

  function beginStroke(x, y, pressure) {
    const l = layers[activeLayer];
    if (!l || !l.visible) return;
    strokeActive = true;
    strokeIsEraser = tool === "eraser";
    strokeSnapshot = l.ctx.getImageData(0, 0, W, H);
    bufCtx.clearRect(0, 0, W, H);
    airCarry = 0;
    lastPt = { x, y, p: pressure };
    drawSegment(lastPt, { x, y, p: pressure });
    render();
  }

  function moveStroke(x, y, pressure) {
    if (!strokeActive) return;
    // 手ぶれ補正: 目標点へ向けて lastPt を部分的に移動
    const k = 1 - smoothing;
    const nx = lastPt.x + (x - lastPt.x) * k;
    const ny = lastPt.y + (y - lastPt.y) * k;
    const np = lastPt.p + (pressure - lastPt.p) * k;
    const to = { x: nx, y: ny, p: np };
    drawSegment(lastPt, to);
    lastPt = to;
    render();
  }

  function drawSegment(a, b) {
    const style = strokeStyleFor(tool);
    const target = strokeIsEraser ? layers[activeLayer].ctx : bufCtx;
    const [r, g, bl] = currentRgb();

    target.save();
    if (strokeIsEraser) {
      target.globalCompositeOperation = "destination-out";
      target.globalAlpha = brushOpacity;
    }

    if (tool === "airbrush" || tool === "pencil") {
      // スタンプ方式
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const radius = Math.max(brushSize * style.widthScale * (0.3 + 0.7 * b.p) / 2, 0.5);
      const spacing = tool === "airbrush" ? Math.max(radius * 0.35, 1) : Math.max(radius * 0.4, 0.7);
      let d = airCarry;
      while (d <= dist) {
        const t = dist === 0 ? 0 : d / dist;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        if (tool === "airbrush") {
          const grad = target.createRadialGradient(px, py, 0, px, py, radius);
          grad.addColorStop(0, `rgba(${r},${g},${bl},${style.stampAlpha})`);
          grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
          target.fillStyle = grad;
          target.beginPath();
          target.arc(px, py, radius, 0, Math.PI * 2);
          target.fill();
        } else {
          const jx = (Math.random() - 0.5) * radius * 0.6;
          const jy = (Math.random() - 0.5) * radius * 0.6;
          target.fillStyle = `rgba(${r},${g},${bl},${style.stampAlpha})`;
          target.beginPath();
          target.arc(px + jx, py + jy, Math.max(radius * 0.5, 0.4), 0, Math.PI * 2);
          target.fill();
        }
        if (dist === 0) break;
        d += spacing;
      }
      airCarry = dist === 0 ? airCarry : d - dist;
    } else {
      // 線分方式(ペン/マーカー/消しゴム)
      const width = Math.max(brushSize * style.widthScale * (0.3 + 0.7 * b.p), 0.5);
      if (!strokeIsEraser) target.strokeStyle = `rgb(${r},${g},${bl})`;
      else target.strokeStyle = "rgba(0,0,0,1)";
      target.lineWidth = width;
      target.lineCap = style.cap;
      target.lineJoin = "round";
      target.beginPath();
      target.moveTo(a.x, a.y);
      // 完全に同一点なら点を打つ
      if (a.x === b.x && a.y === b.y) target.lineTo(b.x + 0.01, b.y);
      else target.lineTo(b.x, b.y);
      target.stroke();
    }
    target.restore();
  }

  function endStroke() {
    if (!strokeActive) return;
    strokeActive = false;
    const l = layers[activeLayer];
    // アンドゥ登録(開始時のスナップショットを使用)
    undoStack.push({ layerId: l.id, data: strokeSnapshot });
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0;
    updateUndoButtons();

    if (!strokeIsEraser) {
      l.ctx.save();
      l.ctx.globalAlpha = brushOpacity;
      l.ctx.drawImage(buf, 0, 0);
      l.ctx.restore();
      bufCtx.clearRect(0, 0, W, H);
    }
    strokeSnapshot = null;
    lastPt = null;
    render();
    updateLayerThumb(activeLayer);
    scheduleWorkSave();
  }

  function cancelStroke() {
    if (!strokeActive) return;
    strokeActive = false;
    if (strokeSnapshot) layers[activeLayer].ctx.putImageData(strokeSnapshot, 0, 0);
    bufCtx.clearRect(0, 0, W, H);
    strokeSnapshot = null;
    lastPt = null;
    render();
  }

  /* ---- 塗りつぶし ---- */
  function floodFill(sx, sy) {
    sx = Math.floor(sx); sy = Math.floor(sy);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    const l = layers[activeLayer];
    pushUndo(activeLayer);
    const img = l.ctx.getImageData(0, 0, W, H);
    const data = img.data;
    const idx0 = (sy * W + sx) * 4;
    const tr = data[idx0], tg = data[idx0 + 1], tb = data[idx0 + 2], ta = data[idx0 + 3];
    const [fr, fg, fb] = currentRgb();
    const fa = Math.round(brushOpacity * 255);
    if (tr === fr && tg === fg && tb === fb && ta === fa) return;

    const TOL = 40;
    const match = (i) =>
      Math.abs(data[i] - tr) <= TOL &&
      Math.abs(data[i + 1] - tg) <= TOL &&
      Math.abs(data[i + 2] - tb) <= TOL &&
      Math.abs(data[i + 3] - ta) <= TOL;

    const stack = [[sx, sy]];
    const seen = new Uint8Array(W * H);
    while (stack.length) {
      const [x, y] = stack.pop();
      let x0 = x;
      // 左端まで走査
      while (x0 >= 0 && !seen[y * W + x0] && match((y * W + x0) * 4)) x0--;
      x0++;
      let spanUp = false, spanDown = false;
      let xi = x0;
      while (xi < W && !seen[y * W + xi] && match((y * W + xi) * 4)) {
        const pi = (y * W + xi) * 4;
        data[pi] = fr; data[pi + 1] = fg; data[pi + 2] = fb; data[pi + 3] = fa;
        seen[y * W + xi] = 1;
        if (y > 0) {
          const up = !seen[(y - 1) * W + xi] && match(((y - 1) * W + xi) * 4);
          if (up && !spanUp) { stack.push([xi, y - 1]); spanUp = true; }
          else if (!up) spanUp = false;
        }
        if (y < H - 1) {
          const dn = !seen[(y + 1) * W + xi] && match(((y + 1) * W + xi) * 4);
          if (dn && !spanDown) { stack.push([xi, y + 1]); spanDown = true; }
          else if (!dn) spanDown = false;
        }
        xi++;
      }
    }
    l.ctx.putImageData(img, 0, 0);
    render();
    updateLayerThumb(activeLayer);
    scheduleWorkSave();
  }

  /* ---- スポイト ---- */
  function pickColor(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const flat = flatten(false);
    const d = flat.getContext("2d").getImageData(x, y, 1, 1).data;
    if (d[3] === 0) return;
    color = rgbToHsv(d[0], d[1], d[2]);
    syncColorUI();
  }

  function flatten(whiteBg) {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const fc = c.getContext("2d");
    if (whiteBg) { fc.fillStyle = "#fff"; fc.fillRect(0, 0, W, H); }
    for (const l of layers) {
      if (!l.visible) continue;
      fc.globalAlpha = l.opacity;
      fc.globalCompositeOperation = l.blend;
      fc.drawImage(l.canvas, 0, 0);
    }
    return c;
  }

  /* ---- ポインタ入力 ---- */
  let panning = false;
  let panStart = null;

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });

    if (pointers.size === 2) {
      // 2本指 → ピンチ開始。描き途中の線は取り消す
      cancelStroke();
      panning = false;
      const pts = [...pointers.values()];
      pinchStart = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
        view: { ...view },
      };
      return;
    }

    const [cx, cy] = screenToCanvas(e.offsetX, e.offsetY);

    if (tool === "hand" || spaceDown || e.button === 1) {
      panning = true;
      panStart = { x: e.offsetX, y: e.offsetY, tx: view.tx, ty: view.ty };
      return;
    }
    if (tool === "fill") { floodFill(cx, cy); return; }
    if (tool === "eyedrop") { pickColor(cx, cy); return; }
    if (e.altKey) { pickColor(cx, cy); return; }

    const pressure = e.pointerType === "pen" ? (e.pressure || 0.5) : 1;
    beginStroke(cx, cy, pressure);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) {
      // ホバー中は何もしない
      return;
    }
    pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });

    if (pointers.size === 2 && pinchStart) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const factor = dist / Math.max(pinchStart.dist, 1);
      const ns = Math.min(Math.max(pinchStart.view.scale * factor, 0.05), 16);
      view.scale = ns;
      view.tx = cx - (pinchStart.cx - pinchStart.view.tx) * (ns / pinchStart.view.scale);
      view.ty = cy - (pinchStart.cy - pinchStart.view.ty) * (ns / pinchStart.view.scale);
      updateZoomLabel();
      render();
      return;
    }

    if (panning && panStart) {
      view.tx = panStart.tx + (e.offsetX - panStart.x);
      view.ty = panStart.ty + (e.offsetY - panStart.y);
      render();
      return;
    }

    if (strokeActive) {
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of events) {
        const rect = canvas.getBoundingClientRect();
        const ox = ev.clientX - rect.left;
        const oy = ev.clientY - rect.top;
        const [cx, cy] = screenToCanvas(ox, oy);
        const pressure = e.pointerType === "pen" ? (ev.pressure || 0.5) : 1;
        moveStroke(cx, cy, pressure);
      }
    }
  });

  function pointerEnd(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 0) {
      panning = false;
      panStart = null;
      endStroke();
    }
  }
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 0) { panning = false; cancelStroke(); }
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(e.offsetX, e.offsetY, factor);
  }, { passive: false });

  /* ---- カラーピッカー ---- */
  const svCanvas = $("#svPicker");
  const svCtx = svCanvas.getContext("2d");
  const hueCanvas = $("#huePicker");
  const hueCtx = hueCanvas.getContext("2d");
  const hexInput = $("#colorHex");
  const colorCurrent = $("#colorCurrent");

  const SWATCH_COLORS = [
    "#000000", "#4a4a4a", "#9a9a9a", "#ffffff",
    "#e03131", "#f76707", "#f5c211", "#8bc34a",
    "#2e9e44", "#12b8a6", "#228be6", "#4263eb",
    "#7048e8", "#d6336c", "#a5714f", "#ffd9c0",
  ];
  let recentColors = storageGet(RECENT_KEY, []);

  function drawSvPicker() {
    const w = svCanvas.width, h = svCanvas.height;
    const [r, g, b] = hsvToRgb(color.h, 1, 1);
    // ベース色
    svCtx.fillStyle = `rgb(${r},${g},${b})`;
    svCtx.fillRect(0, 0, w, h);
    // 白→透明(横)
    let grad = svCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    svCtx.fillStyle = grad;
    svCtx.fillRect(0, 0, w, h);
    // 透明→黒(縦)
    grad = svCtx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    svCtx.fillStyle = grad;
    svCtx.fillRect(0, 0, w, h);
    // カーソル
    const cx = color.s * w, cy = (1 - color.v) * h;
    svCtx.beginPath();
    svCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    svCtx.strokeStyle = color.v > 0.6 && color.s < 0.5 ? "#000" : "#fff";
    svCtx.lineWidth = 2;
    svCtx.stroke();
  }

  function drawHuePicker() {
    const w = hueCanvas.width, h = hueCanvas.height;
    const grad = hueCtx.createLinearGradient(0, 0, 0, h);
    for (let i = 0; i <= 6; i++) {
      const [r, g, b] = hsvToRgb(i * 60 % 360, 1, 1);
      grad.addColorStop(i / 6, `rgb(${r},${g},${b})`);
    }
    hueCtx.fillStyle = grad;
    hueCtx.fillRect(0, 0, w, h);
    const y = (color.h / 360) * h;
    hueCtx.fillStyle = "#fff";
    hueCtx.fillRect(0, Math.max(0, Math.min(h - 3, y - 1.5)), w, 3);
    hueCtx.strokeStyle = "#000";
    hueCtx.strokeRect(0.5, Math.max(0, Math.min(h - 3, y - 1.5)) + 0.5, w - 1, 2);
  }

  function syncColorUI() {
    drawSvPicker();
    drawHuePicker();
    const hex = currentHex();
    hexInput.value = hex;
    colorCurrent.style.background = hex;
    drawBrushPreview();
  }

  function attachPickerDrag(el, handler) {
    let dragging = false;
    el.addEventListener("pointerdown", (e) => {
      dragging = true;
      el.setPointerCapture(e.pointerId);
      handler(e);
    });
    el.addEventListener("pointermove", (e) => { if (dragging) handler(e); });
    el.addEventListener("pointerup", () => { dragging = false; pushRecentColor(); });
  }

  attachPickerDrag(svCanvas, (e) => {
    const r = svCanvas.getBoundingClientRect();
    color.s = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    color.v = 1 - Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    syncColorUI();
  });

  attachPickerDrag(hueCanvas, (e) => {
    const r = hueCanvas.getBoundingClientRect();
    color.h = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 0.9999) * 360;
    syncColorUI();
  });

  hexInput.addEventListener("change", () => {
    const rgb = hexToRgb(hexInput.value);
    if (rgb) {
      color = rgbToHsv(...rgb);
      pushRecentColor();
    }
    syncColorUI();
  });

  function setColorHex(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    color = rgbToHsv(...rgb);
    syncColorUI();
  }

  function pushRecentColor() {
    const hex = currentHex();
    recentColors = [hex, ...recentColors.filter((c) => c !== hex)].slice(0, 12);
    storageSet(RECENT_KEY, recentColors);
    renderSwatches();
  }

  function renderSwatches() {
    const make = (hex) => {
      const d = document.createElement("div");
      d.className = "swatch";
      d.style.background = hex;
      d.title = hex;
      d.addEventListener("click", () => { setColorHex(hex); pushRecentColor(); });
      return d;
    };
    const sw = $("#swatches");
    sw.innerHTML = "";
    SWATCH_COLORS.forEach((c) => sw.appendChild(make(c)));
    const rc = $("#recentColors");
    rc.innerHTML = "";
    recentColors.forEach((c) => rc.appendChild(make(c)));
  }

  /* ---- ブラシ設定UI ---- */
  const previewCanvas = $("#brushPreview");
  const previewCtx = previewCanvas.getContext("2d");

  function drawBrushPreview() {
    const w = previewCanvas.width, h = previewCanvas.height;
    previewCtx.clearRect(0, 0, w, h);
    const [r, g, b] = currentRgb();
    const size = Math.min(brushSize, h - 8);
    previewCtx.save();
    previewCtx.globalAlpha = tool === "eraser" ? 1 : brushOpacity;
    if (tool === "airbrush") {
      for (let x = 14; x < w - 14; x += 3) {
        const t = (x - 14) / (w - 28);
        const y = h / 2 + Math.sin(t * Math.PI * 2) * h * 0.22;
        const rad = Math.max(size * 1.1 * (0.5 + 0.5 * Math.sin(t * Math.PI)), 1);
        const grad = previewCtx.createRadialGradient(x, y, 0, x, y, rad);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.09)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        previewCtx.fillStyle = grad;
        previewCtx.beginPath(); previewCtx.arc(x, y, rad, 0, Math.PI * 2); previewCtx.fill();
      }
    } else {
      previewCtx.strokeStyle = tool === "eraser" ? "#999" : `rgb(${r},${g},${b})`;
      previewCtx.lineCap = tool === "marker" ? "butt" : "round";
      previewCtx.lineJoin = "round";
      previewCtx.beginPath();
      for (let x = 14; x <= w - 14; x += 2) {
        const t = (x - 14) / (w - 28);
        const y = h / 2 + Math.sin(t * Math.PI * 2) * h * 0.22;
        if (x === 14) previewCtx.moveTo(x, y); else previewCtx.lineTo(x, y);
      }
      previewCtx.lineWidth = Math.max(size * (0.3 + 0.7 * 0.8), 1);
      if (tool === "pencil") previewCtx.globalAlpha *= 0.6;
      previewCtx.stroke();
    }
    previewCtx.restore();
  }

  $("#brushSize").addEventListener("input", (e) => {
    brushSize = +e.target.value;
    $("#brushSizeVal").textContent = brushSize;
    drawBrushPreview();
  });
  $("#brushOpacity").addEventListener("input", (e) => {
    brushOpacity = +e.target.value / 100;
    $("#brushOpacityVal").textContent = e.target.value + "%";
    drawBrushPreview();
  });
  $("#brushSmooth").addEventListener("input", (e) => {
    smoothing = +e.target.value / 100;
    $("#brushSmoothVal").textContent = e.target.value;
  });

  /* ---- ツール切り替え ---- */
  const TOOL_DEFAULTS = {}; // ツールごとにサイズ等を記憶
  function setTool(name) {
    TOOL_DEFAULTS[tool] = { size: brushSize, opacity: brushOpacity };
    tool = name;
    const saved = TOOL_DEFAULTS[name];
    if (saved) {
      brushSize = saved.size;
      brushOpacity = saved.opacity;
      $("#brushSize").value = brushSize;
      $("#brushSizeVal").textContent = brushSize;
      $("#brushOpacity").value = Math.round(brushOpacity * 100);
      $("#brushOpacityVal").textContent = Math.round(brushOpacity * 100) + "%";
    }
    $$("#artTools .tool[data-tool]").forEach((b) =>
      b.classList.toggle("active", b.dataset.tool === name));
    canvas.style.cursor =
      name === "hand" ? "grab" :
      name === "eyedrop" ? "copy" :
      name === "fill" ? "cell" : "crosshair";
    drawBrushPreview();
  }

  $$("#artTools .tool[data-tool]").forEach((b) =>
    b.addEventListener("click", () => setTool(b.dataset.tool)));

  /* ---- レイヤーUI ---- */
  const layerListEl = $("#layerList");
  const thumbCache = new Map(); // layerId -> canvas

  function renderLayerList() {
    layerListEl.innerHTML = "";
    // 上のレイヤーをリスト上部に表示
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const li = document.createElement("li");
      li.classList.toggle("active", i === activeLayer);

      const eye = document.createElement("span");
      eye.className = "l-eye" + (l.visible ? "" : " off");
      eye.textContent = "👁";
      eye.title = "表示/非表示";
      eye.addEventListener("click", (e) => {
        e.stopPropagation();
        l.visible = !l.visible;
        renderLayerList();
        render();
        scheduleWorkSave();
      });

      const thumb = document.createElement("div");
      thumb.className = "l-thumb";
      let tc = thumbCache.get(l.id);
      if (!tc) {
        tc = document.createElement("canvas");
        tc.width = 36; tc.height = 27;
        thumbCache.set(l.id, tc);
        drawThumb(l, tc);
      }
      thumb.appendChild(tc);

      const name = document.createElement("span");
      name.className = "l-name";
      name.textContent = l.name;
      name.title = "ダブルクリックで名前変更";
      name.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const nn = prompt("レイヤー名", l.name);
        if (nn) { l.name = nn; renderLayerList(); scheduleWorkSave(); }
      });

      const move = document.createElement("span");
      move.className = "l-move";
      const up = document.createElement("button");
      up.textContent = "▲"; up.title = "上へ";
      up.addEventListener("click", (e) => { e.stopPropagation(); moveLayer(i, 1); });
      const down = document.createElement("button");
      down.textContent = "▼"; down.title = "下へ";
      down.addEventListener("click", (e) => { e.stopPropagation(); moveLayer(i, -1); });
      move.append(up, down);

      li.append(eye, thumb, name, move);
      li.addEventListener("click", () => {
        activeLayer = i;
        renderLayerList();
        syncLayerOpts();
      });
      layerListEl.appendChild(li);
    }
    syncLayerOpts();
  }

  function drawThumb(l, tc) {
    const c = tc.getContext("2d");
    c.clearRect(0, 0, tc.width, tc.height);
    const s = Math.min(tc.width / W, tc.height / H);
    c.drawImage(l.canvas, (tc.width - W * s) / 2, (tc.height - H * s) / 2, W * s, H * s);
  }

  function updateLayerThumb(idx) {
    const l = layers[idx];
    if (!l) return;
    const tc = thumbCache.get(l.id);
    if (tc) drawThumb(l, tc);
  }

  function syncLayerOpts() {
    const l = layers[activeLayer];
    if (!l) return;
    $("#layerBlend").value = l.blend;
    $("#layerOpacity").value = Math.round(l.opacity * 100);
  }

  function moveLayer(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= layers.length) return;
    [layers[i], layers[j]] = [layers[j], layers[i]];
    if (activeLayer === i) activeLayer = j;
    else if (activeLayer === j) activeLayer = i;
    renderLayerList();
    render();
    scheduleWorkSave();
  }

  $("#layerAdd").addEventListener("click", () => {
    if (layers.length >= 12) { alert("レイヤーは12枚までです。"); return; }
    const l = makeLayer();
    layers.splice(activeLayer + 1, 0, l);
    activeLayer = activeLayer + 1;
    renderLayerList();
    render();
    scheduleWorkSave();
  });

  $("#layerDup").addEventListener("click", () => {
    if (layers.length >= 12) { alert("レイヤーは12枚までです。"); return; }
    const src = layers[activeLayer];
    const l = makeLayer(src.name + " コピー");
    l.ctx.drawImage(src.canvas, 0, 0);
    l.opacity = src.opacity;
    l.blend = src.blend;
    layers.splice(activeLayer + 1, 0, l);
    activeLayer = activeLayer + 1;
    renderLayerList();
    render();
    scheduleWorkSave();
  });

  $("#layerMerge").addEventListener("click", () => {
    if (activeLayer === 0) { alert("一番下のレイヤーは結合できません。"); return; }
    const src = layers[activeLayer];
    const dst = layers[activeLayer - 1];
    if (!confirm(`「${src.name}」を「${dst.name}」に結合しますか?`)) return;
    dst.ctx.save();
    dst.ctx.globalAlpha = src.opacity;
    dst.ctx.globalCompositeOperation = src.blend;
    dst.ctx.drawImage(src.canvas, 0, 0);
    dst.ctx.restore();
    thumbCache.delete(src.id);
    layers.splice(activeLayer, 1);
    activeLayer = activeLayer - 1;
    undoStack.length = 0; redoStack.length = 0;
    updateUndoButtons();
    renderLayerList();
    updateLayerThumb(activeLayer);
    render();
    scheduleWorkSave();
  });

  $("#layerClear").addEventListener("click", () => {
    pushUndo(activeLayer);
    layers[activeLayer].ctx.clearRect(0, 0, W, H);
    render();
    updateLayerThumb(activeLayer);
    scheduleWorkSave();
  });

  $("#layerDelete").addEventListener("click", () => {
    if (layers.length <= 1) { alert("最後のレイヤーは削除できません。"); return; }
    const l = layers[activeLayer];
    if (!confirm(`「${l.name}」を削除しますか?`)) return;
    thumbCache.delete(l.id);
    layers.splice(activeLayer, 1);
    activeLayer = Math.max(0, activeLayer - 1);
    undoStack.length = 0; redoStack.length = 0;
    updateUndoButtons();
    renderLayerList();
    render();
    scheduleWorkSave();
  });

  $("#layerBlend").addEventListener("change", (e) => {
    layers[activeLayer].blend = e.target.value;
    render();
    scheduleWorkSave();
  });
  $("#layerOpacity").addEventListener("input", (e) => {
    layers[activeLayer].opacity = +e.target.value / 100;
    render();
  });
  $("#layerOpacity").addEventListener("change", scheduleWorkSave);

  /* ---- ツールバー(ズーム/アンドゥ/保存) ---- */
  $("#artUndo").addEventListener("click", undo);
  $("#artRedo").addEventListener("click", redo);
  $("#artZoomIn").addEventListener("click", () => {
    const r = wrap.getBoundingClientRect();
    zoomAt(r.width / 2, r.height / 2, 1.25);
  });
  $("#artZoomOut").addEventListener("click", () => {
    const r = wrap.getBoundingClientRect();
    zoomAt(r.width / 2, r.height / 2, 1 / 1.25);
  });
  $("#artZoomFit").addEventListener("click", () => { fitView(); render(); });

  $("#artSaveImg").addEventListener("click", () => {
    const white = confirm("背景を白にしますか?\n(キャンセル = 透過PNG)");
    const c = flatten(white);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `art-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    a.click();
  });

  /* ---- 新規キャンバス ---- */
  const newModal = $("#newCanvasModal");
  $("#artNew").addEventListener("click", () => newModal.classList.remove("hidden"));
  $("#newCanvasCancel").addEventListener("click", () => newModal.classList.add("hidden"));
  $$("#newCanvasModal .presets .btn").forEach((b) =>
    b.addEventListener("click", () => {
      const [w, h] = b.dataset.size.split("x").map(Number);
      $("#newCanvasW").value = w;
      $("#newCanvasH").value = h;
    }));
  $("#newCanvasOk").addEventListener("click", () => {
    const w = Math.min(Math.max(+$("#newCanvasW").value || 1200, 64), 4096);
    const h = Math.min(Math.max(+$("#newCanvasH").value || 900, 64), 4096);
    newModal.classList.add("hidden");
    thumbCache.clear();
    initCanvas(w, h, false);
    scheduleWorkSave();
  });

  /* ---- ギャラリー ---- */
  const galleryModal = $("#galleryModal");

  function serializeWork(name) {
    return {
      id: Date.now().toString(36),
      name: name || "無題",
      date: Date.now(),
      w: W, h: H,
      activeLayer,
      layers: layers.map((l) => ({
        name: l.name, visible: l.visible, opacity: l.opacity, blend: l.blend,
        data: l.canvas.toDataURL("image/png"),
      })),
      thumb: (() => {
        const t = document.createElement("canvas");
        const s = Math.min(240 / W, 180 / H);
        t.width = Math.max(Math.round(W * s), 1);
        t.height = Math.max(Math.round(H * s), 1);
        t.getContext("2d").drawImage(flatten(false), 0, 0, t.width, t.height);
        return t.toDataURL("image/png");
      })(),
    };
  }

  function loadWork(work, done) {
    W = work.w; H = work.h;
    buf.width = W; buf.height = H;
    thumbCache.clear();
    layers = [];
    activeLayer = Math.min(work.activeLayer || 0, work.layers.length - 1);
    undoStack.length = 0; redoStack.length = 0;
    updateUndoButtons();
    let remaining = work.layers.length;
    work.layers.forEach((ld, i) => {
      const l = makeLayer(ld.name);
      l.visible = ld.visible !== false;
      l.opacity = ld.opacity != null ? ld.opacity : 1;
      l.blend = ld.blend || "source-over";
      layers[i] = l;
      const img = new Image();
      img.onload = () => {
        l.ctx.drawImage(img, 0, 0);
        updateLayerThumb(i);
        if (--remaining === 0) { renderLayerList(); fitView(); render(); if (done) done(); }
      };
      img.onerror = () => {
        if (--remaining === 0) { renderLayerList(); fitView(); render(); if (done) done(); }
      };
      img.src = ld.data;
    });
  }

  $("#artGallerySave").addEventListener("click", () => {
    const name = prompt("作品名を入力してください", "作品 " + fmtDate(Date.now()));
    if (name === null) return;
    const gallery = storageGet(GALLERY_KEY, []);
    gallery.unshift(serializeWork(name));
    if (storageSet(GALLERY_KEY, gallery)) alert("ギャラリーに保存しました。");
  });

  $("#artGallery").addEventListener("click", () => {
    renderGallery();
    galleryModal.classList.remove("hidden");
  });
  $("#galleryClose").addEventListener("click", () => galleryModal.classList.add("hidden"));
  galleryModal.addEventListener("click", (e) => {
    if (e.target === galleryModal) galleryModal.classList.add("hidden");
  });

  function renderGallery() {
    const grid = $("#galleryGrid");
    const gallery = storageGet(GALLERY_KEY, []);
    grid.innerHTML = "";
    if (!gallery.length) {
      const p = document.createElement("p");
      p.className = "gallery-empty";
      p.textContent = "保存された作品はまだありません。⭐ボタンで作品を保存できます。";
      grid.appendChild(p);
      return;
    }
    for (const work of gallery) {
      const item = document.createElement("div");
      item.className = "gallery-item";
      const img = document.createElement("img");
      img.src = work.thumb;
      img.alt = work.name;
      img.title = "クリックで開く";
      img.addEventListener("click", () => {
        if (!confirm(`「${work.name}」を開きますか?\n現在の絵は上書きされます。`)) return;
        loadWork(work, scheduleWorkSave);
        galleryModal.classList.add("hidden");
      });
      const meta = document.createElement("div");
      meta.className = "g-meta";
      const nm = document.createElement("div");
      nm.className = "g-name";
      nm.textContent = work.name;
      const dt = document.createElement("div");
      dt.className = "g-date";
      dt.textContent = `${fmtDate(work.date)}  ${work.w}×${work.h}`;
      const actions = document.createElement("div");
      actions.className = "g-actions";
      const del = document.createElement("button");
      del.className = "btn tiny danger";
      del.textContent = "削除";
      del.addEventListener("click", () => {
        if (!confirm(`「${work.name}」を削除しますか?`)) return;
        const g = storageGet(GALLERY_KEY, []).filter((x) => x.id !== work.id);
        storageSet(GALLERY_KEY, g);
        renderGallery();
      });
      actions.appendChild(del);
      meta.append(nm, dt, actions);
      item.append(img, meta);
      grid.appendChild(item);
    }
  }

  /* ---- 作業中の絵の自動保存 ---- */
  let workSaveTimer = null;
  function scheduleWorkSave() {
    clearTimeout(workSaveTimer);
    workSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(WORK_KEY, JSON.stringify(serializeWork("(作業中)")));
      } catch {
        // 容量不足時は自動保存を諦める(手動のギャラリー保存でエラー表示)
      }
    }, 1500);
  }

  /* ---- キーボードショートカット ---- */
  document.addEventListener("keydown", (e) => {
    const inArtView = $("#view-art").classList.contains("active");
    if (!inArtView) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault(); undo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" ||
        (e.shiftKey && e.key.toLowerCase() === "z"))) {
      e.preventDefault(); redo(); return;
    }
    if (e.key === " ") { spaceDown = true; canvas.style.cursor = "grab"; e.preventDefault(); return; }
    const map = { b: "pen", p: "pencil", m: "marker", a: "airbrush", e: "eraser", g: "fill", i: "eyedrop", h: "hand" };
    const t = map[e.key.toLowerCase()];
    if (t && !e.ctrlKey && !e.metaKey && !e.altKey) setTool(t);
    if (e.key === "[") { $("#brushSize").value = Math.max(1, brushSize - 2); $("#brushSize").dispatchEvent(new Event("input")); }
    if (e.key === "]") { $("#brushSize").value = Math.min(200, brushSize + 2); $("#brushSize").dispatchEvent(new Event("input")); }
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === " ") { spaceDown = false; setTool(tool); }
  });

  /* ---- リサイズ ---- */
  const ro = new ResizeObserver(() => {
    if ($("#view-art").classList.contains("active")) render();
  });
  ro.observe(wrap);

  /* ---- 初期化 ---- */
  let shown = false;
  function onShow() {
    if (!shown) {
      shown = true;
      const saved = storageGet(WORK_KEY, null);
      if (saved && Array.isArray(saved.layers) && saved.layers.length) {
        W = saved.w; H = saved.h;
        buf.width = W; buf.height = H;
        loadWork(saved);
      } else {
        initCanvas(1200, 900, false);
      }
      syncColorUI();
      renderSwatches();
      drawBrushPreview();
      setTool("pen");
    }
    // 表示直後はレイアウト確定を待ってからフィット
    requestAnimationFrame(() => { fitView(); render(); });
  }

  updateUndoButtons();

  return { onShow };
})();

/* =========================================================
   関数電卓
   ========================================================= */
const Calc = (() => {
  const HIST_KEY = "artmemo.calcHistory";
  let degMode = true;
  let memory = 0;
  let history = storageGet(HIST_KEY, []);
  let lastAnswer = 0;

  const display = $("#calcDisplay");
  const sub = $("#calcSub");
  const histList = $("#calcHistList");

  /* ---- 式パーサ(トークナイザ → 逆ポーランド → 評価) ---- */
  const FUNCS = {
    sin: (x) => Math.sin(degMode ? x * Math.PI / 180 : x),
    cos: (x) => Math.cos(degMode ? x * Math.PI / 180 : x),
    tan: (x) => Math.tan(degMode ? x * Math.PI / 180 : x),
    asin: (x) => degMode ? Math.asin(x) * 180 / Math.PI : Math.asin(x),
    acos: (x) => degMode ? Math.acos(x) * 180 / Math.PI : Math.acos(x),
    atan: (x) => degMode ? Math.atan(x) * 180 / Math.PI : Math.atan(x),
    log: Math.log10,
    ln: Math.log,
    sqrt: Math.sqrt,
    abs: Math.abs,
    exp: Math.exp,
  };
  const CONSTS = { pi: Math.PI, e: Math.E, ans: () => lastAnswer };

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    const s = src.replace(/\s+/g, "")
      .replace(/π/g, "pi")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-");
    while (i < s.length) {
      const ch = s[i];
      if (/[0-9.]/.test(ch)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const num = s.slice(i, j);
        if ((num.match(/\./g) || []).length > 1) throw new Error("数値エラー");
        tokens.push({ t: "num", v: parseFloat(num) });
        i = j;
      } else if (/[a-z]/i.test(ch)) {
        let j = i;
        while (j < s.length && /[a-z]/i.test(s[j])) j++;
        const word = s.slice(i, j).toLowerCase();
        if (FUNCS[word]) tokens.push({ t: "func", v: word });
        else if (word in CONSTS) {
          const c = CONSTS[word];
          tokens.push({ t: "num", v: typeof c === "function" ? c() : c });
        } else throw new Error(`不明な語: ${word}`);
        i = j;
      } else if ("+-*/^%(),".includes(ch)) {
        tokens.push({ t: ch });
        i++;
      } else {
        throw new Error(`不明な文字: ${ch}`);
      }
    }
    return tokens;
  }

  function toRPN(tokens) {
    const out = [];
    const ops = [];
    const prec = { "u-": 5, "%": 5, "^": 4, "*": 3, "/": 3, "+": 2, "-": 2 };
    const rightAssoc = { "^": true, "u-": true };
    let prev = null; // 直前トークン種別(単項マイナス判定用)

    for (const tk of tokens) {
      if (tk.t === "num") {
        out.push(tk);
        prev = "num";
      } else if (tk.t === "func") {
        ops.push(tk);
        prev = "func";
      } else if (tk.t === "(") {
        ops.push(tk);
        prev = "(";
      } else if (tk.t === ")") {
        while (ops.length && ops[ops.length - 1].t !== "(") out.push(ops.pop());
        if (!ops.length) throw new Error("括弧が対応していません");
        ops.pop();
        if (ops.length && ops[ops.length - 1].t === "func") out.push(ops.pop());
        prev = "num";
      } else if (tk.t === "%") {
        // 後置%(100で割る)
        out.push({ t: "op", v: "%" });
        prev = "num";
      } else {
        // 演算子
        let op = tk.t;
        if (op === "-" && (prev === null || prev === "op" || prev === "(" || prev === "func")) {
          op = "u-";
        }
        if (op === "+" && (prev === null || prev === "op" || prev === "(" || prev === "func")) {
          prev = "op"; // 単項プラスは無視
          continue;
        }
        while (ops.length) {
          const top = ops[ops.length - 1];
          if (top.t === "(") break;
          const topOp = top.t === "op" ? top.v : null;
          if (topOp === null) break;
          const pTop = prec[topOp], pCur = prec[op];
          if (pTop > pCur || (pTop === pCur && !rightAssoc[op])) out.push(ops.pop());
          else break;
        }
        ops.push({ t: "op", v: op });
        prev = "op";
      }
    }
    while (ops.length) {
      const op = ops.pop();
      if (op.t === "(") throw new Error("括弧が対応していません");
      out.push(op);
    }
    return out;
  }

  function evalRPN(rpn) {
    const st = [];
    for (const tk of rpn) {
      if (tk.t === "num") st.push(tk.v);
      else if (tk.t === "func") {
        if (!st.length) throw new Error("式エラー");
        st.push(FUNCS[tk.v](st.pop()));
      } else if (tk.t === "op") {
        if (tk.v === "u-") {
          if (!st.length) throw new Error("式エラー");
          st.push(-st.pop());
        } else if (tk.v === "%") {
          if (!st.length) throw new Error("式エラー");
          st.push(st.pop() / 100);
        } else {
          if (st.length < 2) throw new Error("式エラー");
          const b = st.pop(), a = st.pop();
          switch (tk.v) {
            case "+": st.push(a + b); break;
            case "-": st.push(a - b); break;
            case "*": st.push(a * b); break;
            case "/":
              if (b === 0) throw new Error("0で割れません");
              st.push(a / b); break;
            case "^": st.push(Math.pow(a, b)); break;
          }
        }
      }
    }
    if (st.length !== 1) throw new Error("式エラー");
    return st[0];
  }

  function evaluate(expr) {
    const rpn = toRPN(tokenize(expr));
    const result = evalRPN(rpn);
    if (!isFinite(result) || isNaN(result)) throw new Error("計算エラー");
    return result;
  }

  function formatResult(n) {
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    const s = n.toPrecision(12);
    return String(parseFloat(s));
  }

  /* ---- UI ---- */
  const grid = $("#calcGrid");
  function insert(text) {
    const start = display.selectionStart ?? display.value.length;
    const end = display.selectionEnd ?? display.value.length;
    display.value = display.value.slice(0, start) + text + display.value.slice(end);
    const pos = start + text.length;
    display.setSelectionRange(pos, pos);
    display.focus();
  }

  function buildGrid() {
    grid.innerHTML = "";
    // 5列 × 8行
    const layout = [
      { k: "sin(",  label: "sin", cls: "fn" }, { k: "cos(", label: "cos", cls: "fn" },
      { k: "tan(",  label: "tan", cls: "fn" }, { k: "(",    label: "(",   cls: "op" },
      { k: ")",     label: ")",   cls: "op" },

      { k: "asin(", label: "sin⁻¹", cls: "fn" }, { k: "acos(", label: "cos⁻¹", cls: "fn" },
      { k: "atan(", label: "tan⁻¹", cls: "fn" }, { k: "pi",  label: "π",  cls: "fn" },
      { k: "e",     label: "e",   cls: "fn" },

      { k: "log(",  label: "log", cls: "fn" }, { k: "ln(",  label: "ln", cls: "fn" },
      { k: "sqrt(", label: "√",  cls: "fn" }, { k: "^2",   label: "x²", cls: "fn" },
      { k: "^",     label: "xʸ", cls: "fn" },

      { k: "MC",    label: "MC", cls: "fn" }, { k: "MR",   label: "MR", cls: "fn" },
      { k: "M+",    label: "M+", cls: "fn" }, { k: "M-",   label: "M−", cls: "fn" },
      { k: "ans",   label: "Ans", cls: "fn" },

      { k: "C",     label: "C",  cls: "danger-key" }, { k: "BS", label: "⌫", cls: "danger-key" },
      { k: "%",     label: "%",  cls: "op" }, { k: "/",   label: "÷",  cls: "op" },
      { k: "*",     label: "×",  cls: "op" },

      { k: "7", label: "7" }, { k: "8", label: "8" }, { k: "9", label: "9" },
      { k: "-", label: "−", cls: "op" }, { k: "+", label: "＋", cls: "op" },

      { k: "4", label: "4" }, { k: "5", label: "5" }, { k: "6", label: "6" },
      { k: ".", label: "." }, { k: "00", label: "00" },

      { k: "1", label: "1" }, { k: "2", label: "2" }, { k: "3", label: "3" },
      { k: "0", label: "0" }, { k: "=", label: "=", cls: "eq" },
    ];
    for (const item of layout) {
      const b = document.createElement("button");
      b.textContent = item.label;
      if (item.cls) b.className = item.cls;
      b.addEventListener("click", () => onKey(item.k));
      grid.appendChild(b);
    }
  }

  function onKey(k) {
    switch (k) {
      case "C": display.value = ""; sub.textContent = ""; display.focus(); break;
      case "BS": {
        const start = display.selectionStart ?? display.value.length;
        if (start > 0) {
          display.value = display.value.slice(0, start - 1) + display.value.slice(display.selectionEnd ?? start);
          display.setSelectionRange(start - 1, start - 1);
        }
        display.focus();
        break;
      }
      case "=": calculate(); break;
      case "MC": memory = 0; updateMemInd(); break;
      case "MR": insert(formatResult(memory)); break;
      case "M+": case "M-": {
        try {
          const v = evaluate(display.value || "0");
          memory += (k === "M+" ? v : -v);
          updateMemInd();
        } catch (err) {
          sub.textContent = err.message;
        }
        break;
      }
      default: insert(k);
    }
  }

  function updateMemInd() {
    $("#calcMemInd").textContent = memory !== 0 ? `M = ${formatResult(memory)}` : "";
  }

  function calculate() {
    const expr = display.value.trim();
    if (!expr) return;
    try {
      const result = evaluate(expr);
      lastAnswer = result;
      const resStr = formatResult(result);
      sub.textContent = expr + " =";
      display.value = resStr;
      display.setSelectionRange(resStr.length, resStr.length);
      history.unshift({ expr, result: resStr, date: Date.now() });
      history = history.slice(0, 60);
      storageSet(HIST_KEY, history);
      renderHistory();
    } catch (err) {
      sub.textContent = "⚠ " + err.message;
    }
  }

  function renderHistory() {
    histList.innerHTML = "";
    if (!history.length) {
      const p = document.createElement("li");
      p.className = "calc-hist-empty";
      p.textContent = "履歴はありません";
      histList.appendChild(p);
      return;
    }
    for (const h of history) {
      const li = document.createElement("li");
      const ex = document.createElement("div");
      ex.className = "h-expr";
      ex.textContent = h.expr + " =";
      const res = document.createElement("div");
      res.className = "h-result";
      res.textContent = h.result;
      li.append(ex, res);
      li.title = "クリックで結果を入力";
      li.addEventListener("click", () => { insert(h.result); });
      histList.appendChild(li);
    }
  }

  display.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); calculate(); }
  });

  $("#calcDeg").addEventListener("click", () => {
    degMode = true;
    $("#calcDeg").classList.add("active");
    $("#calcRad").classList.remove("active");
  });
  $("#calcRad").addEventListener("click", () => {
    degMode = false;
    $("#calcRad").classList.add("active");
    $("#calcDeg").classList.remove("active");
  });
  $("#calcHistClear").addEventListener("click", () => {
    if (!history.length) return;
    if (!confirm("計算履歴をすべて削除しますか?")) return;
    history = [];
    storageSet(HIST_KEY, history);
    renderHistory();
  });

  buildGrid();
  renderHistory();
  updateMemInd();

  return {};
})();

/* 離脱時にメモを確実に保存 */
window.addEventListener("beforeunload", () => Memo.flushSave());
