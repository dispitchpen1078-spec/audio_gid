// ==================== ВСТРОЕННЫЕ ДАННЫЕ (GitHub Pages fallback) ====================
const DEFAULT_CONTENT = {
  points: {
    pool: { 
      id: "pool", 
      title: "Бассейн «Олимпийский»", 
      description: "Открытый бассейн, построенный в 1985 году. Глубина от 1.2 до 2.5 метров. Работает с 7:00 до 22:00.", 
      image: "images/1.jpg", 
      audio: "audio/1.mp3", 
      x: 1276, 
      y: 142, 
      icon: "🏊" 
    },
    building: { 
      id: "building", 
      title: "Главный корпус", 
      description: "Центральное здание пансионата. Здесь находится ресепшн, столовая и конференц-зал.", 
      image: "images/2.jpg", 
      audio: "audio/2.mp3", 
      x: 1181, 
      y: 817, 
      icon: "🏢" 
    },
    cafe: { 
      id: "cafe", 
      title: "Кафе «Лесная поляна»", 
      description: "Уютное кафе с видом на парк. Открыто с 8:00 до 23:00. Домашняя выпечка и свежий кофе.", 
      image: "images/3.jpg", 
      audio: "audio/3.mp3", 
      x: 719, 
      y: 756, 
      icon: "☕" 
    },
    playground: { 
      id: "playground", 
      title: "Детская площадка", 
      description: "Современная игровая зона для детей от 3 до 12 лет. Качели, горки, песочница.", 
      image: "images/4.jpg", 
      audio: "audio/4.mp3", 
      x: 124, 
      y: 701, 
      icon: "🎠" 
    },
    campfire: { 
      id: "campfire", 
      title: "Зона отдыха у костра", 
      description: "Оборудованная площадка для вечерних посиделок у костра. Дрова предоставляются.", 
      image: "images/5.jpg", 
      audio: "audio/5.mp3", 
      x: 1127, 
      y: 447, 
      icon: "🔥" 
    },
    gym: { 
      id: "gym", 
      title: "Тренажёрный зал", 
      description: "Фитнес-зал с современным оборудованием. Открыт круглосуточно для проживающих.", 
      image: "images/6.jpg", 
      audio: "audio/6.mp3", 
      x: 1551, 
      y: 438, 
      icon: "💪" 
    },
    tennis: { 
      id: "tennis", 
      title: "Теннисный корт", 
      description: "Профессиональное покрытие. Ракетки и мячи выдаются бесплатно.", 
      image: "images/7.jpg", 
      audio: "audio/7.mp3", 
      x: 1018, 
      y: 746, 
      icon: "🎾" 
    },
    football: { 
      id: "football", 
      title: "Футбольное поле", 
      description: "Стандартное футбольное поле с искусственным газоном. Ворота и мячи на месте.", 
      image: "images/8.jpg", 
      audio: "audio/8.mp3", 
      x: 170, 
      y: 904, 
      icon: "⚽" 
    },
    point_1783670488368: { 
      id: "point_1783670488368", 
      title: "Парк", 
      description: "Большой парк Звёздного", 
      image: "", 
      audio: "", 
      x: 596, 
      y: 758, 
      icon: "📍" 
    }
  },
  routes: {
    qwerty: { 
      name: "Короткий Маршрут", 
      description: "20 минут, 1000 шагов", 
      points: ["cafe", "point_1783670488368", "playground", "football"], 
      waypoints: [[{x:659,y:755}],[{x:380,y:761},{x:192,y:759}],[{x:124,y:832},{x:140,y:875}]] 
    },
    qwerty1: { 
      name: "Длинный маршрут", 
      description: "30 минут, 3000 шагов", 
      points: ["cafe", "tennis", "building", "gym", "pool", "campfire", "point_1783670488368", "playground", "football"], 
      waypoints: [[{x:864,y:755}],[{x:1091,y:779}],[{x:1192,y:451},{x:1249,y:405}],[{x:1496,y:310},{x:1405,y:252},{x:1306,y:178}],[{x:1221,y:216},{x:1515,y:333},{x:1477,y:385},{x:1184,y:399},{x:1129,y:403},{x:1103,y:406},{x:1076,y:428},{x:1077,y:452}],[{x:1116,y:669}],[{x:221,y:762}],[{x:126,y:814}]] 
    }
  }
};

// ==================== КОНФИГУРАЦИЯ ====================
const MAP_SCALE_METERS_PER_PIXEL = 0.26;
const STEPS_PER_METER = 1.3;
const CALORIES_PER_STEP = 0.05;
const MAP_BOUNDS = [[0, 0], [1080, 1920]];

// ==================== СОСТОЯНИЕ ====================
let CONTENT = DEFAULT_CONTENT;
let currentRoute = null;
let currentPointIndex = -1;
let currentPointId = null;
let visitedPoints = new Set();
let audio = null;
let map = null;
let routeLayer = null;
let markers = {};
let audioCache = {};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener("DOMContentLoaded", async () => {
  await loadContent();

  const urlParams = new URLSearchParams(window.location.search);
  const pointId = urlParams.get("point");
  const routeId = urlParams.get("route");

  if (pointId && CONTENT.points[pointId]) {
    currentPointId = pointId;
    const isFirstPointOfAnyRoute = isFirstPoint(pointId);

    if (isFirstPointOfAnyRoute && !routeId) {
      hideSplash();
      showRouteSelect(pointId);
    } else if (routeId && CONTENT.routes[routeId]) {
      currentRoute = routeId;
      const route = CONTENT.routes[currentRoute];
      currentPointIndex = route.points.indexOf(pointId);
      visitedPoints.add(pointId);
      saveVisitedPoints();
      hideSplash();
      showGuide();
      loadPoint(pointId);
    } else {
      hideSplash();
      showGuide();
      loadPoint(pointId);
    }
  } else if (routeId && CONTENT.routes[routeId]) {
    currentRoute = routeId;
    hideSplash();
    showRouteSelectForRoute(routeId);
  } else {
    hideSplash();
    showRouteSelect();
  }
});

async function loadContent() {
  try {
    const res = await fetch("content.json");
    if (res.ok) {
      const data = await res.json();
      if (data.points && Object.keys(data.points).length > 0) {
        CONTENT = data;
        console.log("Loaded content.json from server");
      } else {
        CONTENT = DEFAULT_CONTENT;
      }
    } else {
      console.log("Server returned", res.status, "- using embedded data");
      CONTENT = DEFAULT_CONTENT;
    }
  } catch (e) {
    console.log("Using embedded data:", e.message);
    CONTENT = DEFAULT_CONTENT;
  }
  const saved = localStorage.getItem("visitedPoints");
  if (saved) visitedPoints = new Set(JSON.parse(saved));
}

function saveVisitedPoints() {
  localStorage.setItem("visitedPoints", JSON.stringify([...visitedPoints]));
}

function isFirstPoint(pointId) {
  for (const route of Object.values(CONTENT.routes || {})) {
    if (route.points && route.points[0] === pointId) return true;
  }
  return false;
}

function hideSplash() {
  const splash = document.getElementById("splash");
  if (splash) splash.style.display = "none";
}

// ==================== ВЫБОР МАРШРУТА ====================
function showRouteSelect(firstPointId) {
  const routeSelect = document.getElementById("routeSelect");
  const guideScreen = document.getElementById("guideScreen");
  const mapScreen = document.getElementById("mapScreen");

  if (routeSelect) routeSelect.style.display = "block";
  if (guideScreen) guideScreen.style.display = "none";
  if (mapScreen) mapScreen.style.display = "none";

  const list = document.getElementById("route-list");
  if (!list) return;
  list.innerHTML = "";

  const availableRoutes = [];
  Object.entries(CONTENT.routes || {}).forEach(([id, route]) => {
    if (route.points && route.points[0] === firstPointId) {
      availableRoutes.push({ id, route });
    }
  });

  if (availableRoutes.length === 0) {
    showGuide();
    loadPoint(firstPointId);
    return;
  }

  const header = document.querySelector(".route-header");
  if (header) {
    header.innerHTML = `
      <div class="route-icon">🗺️</div>
      <h2>Выберите маршрут</h2>
      <p>Точка: ${CONTENT.points[firstPointId]?.title || "Старт"}</p>
    `;
  }

  availableRoutes.forEach(({ id, route }) => {
    const totalDistance = calculateRouteDistance(route);
    const totalSteps = Math.round(totalDistance * STEPS_PER_METER);
    const duration = Math.round(totalDistance / 60);

    const item = document.createElement("div");
    item.className = "route-item";
    item.innerHTML = `
      <h3>${route.name}</h3>
      <p>${route.description || ""}</p>
      <div class="route-meta">
        <span>📍 ${route.points?.length || 0} точек</span>
        <span>📏 ${Math.round(totalDistance)} м</span>
        <span>⏱️ ~${duration} мин</span>
      </div>
    `;
    item.onclick = () => startRoute(id, firstPointId);
    list.appendChild(item);
  });

  const offlineBtn = document.createElement("button");
  offlineBtn.className = "route-item";
  offlineBtn.style.cssText = "background: #1e3a8a; border-color: #3b82f6; margin-top: 16px; cursor: pointer;";
  offlineBtn.innerHTML = `
    <h3>💾 Скачать маршруты для офлайн</h3>
    <p style="color: #93c5fd;">Все аудио и карта будут доступны без интернета</p>
    <div class="route-meta">
      <span>📦 Кэширование контента</span>
    </div>
  `;
  offlineBtn.onclick = cacheForOffline;
  list.appendChild(offlineBtn);
}

function showRouteSelectForRoute(routeId) {
  showRouteSelect(CONTENT.routes[routeId].points[0]);
}

function startRoute(routeId, firstPointId) {
  currentRoute = routeId;
  currentPointIndex = 0;
  currentPointId = firstPointId;
  visitedPoints.add(firstPointId);
  saveVisitedPoints();
  localStorage.setItem("currentRoute", routeId);
  localStorage.setItem("currentPointId", firstPointId);

  showGuide();
  loadPoint(firstPointId);
}

async function cacheForOffline() {
  if ("serviceWorker" in navigator) {
    showToast("📦 Кэширование начато...");
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active) {
        reg.active.postMessage({ type: "CACHE_ALL" });
        showToast("✅ Контент сохранён для офлайн!");
      } else {
        showToast("⚠️ Service Worker не активен");
      }
    } catch (e) {
      showToast("⚠️ Кэширование недоступно");
    }
  } else {
    showToast("⚠️ Ваш браузер не поддерживает офлайн-режим");
  }
}

// ==================== ГЛАВНЫЙ ЭКРАН ====================
function showGuide() {
  const routeSelect = document.getElementById("routeSelect");
  const guideScreen = document.getElementById("guideScreen");
  const mapScreen = document.getElementById("mapScreen");

  if (routeSelect) routeSelect.style.display = "none";
  if (guideScreen) guideScreen.style.display = "flex";
  if (mapScreen) mapScreen.style.display = "none";
  document.body.style.overflow = "auto";
}

function loadPoint(pointId) {
  const point = CONTENT.points[pointId];
  if (!point) return;

  const pointImage = document.getElementById("pointImage");
  const pointIcon = document.getElementById("pointIcon");
  const pointNumber = document.getElementById("pointNumber");
  const pointTitle = document.getElementById("pointTitle");
  const pointDesc = document.getElementById("pointDesc");
  const routeBadge = document.getElementById("routeBadge");
  const pointCounter = document.getElementById("pointCounter");

  if (pointImage) {
    if (point.image) {
      pointImage.src = point.image;
      pointImage.style.display = "";
    } else {
      pointImage.style.display = "none";
    }
  }
  if (pointIcon) pointIcon.textContent = point.icon || "📍";
  if (pointNumber) pointNumber.textContent = currentPointIndex + 1;
  if (pointTitle) pointTitle.textContent = point.title || "Без названия";
  if (pointDesc) pointDesc.textContent = point.description || "";

  const route = CONTENT.routes[currentRoute];
  if (routeBadge) routeBadge.textContent = route?.name || "Маршрут";
  if (pointCounter) pointCounter.textContent = `${currentPointIndex + 1} / ${route?.points?.length || 0}`;

  updateStats();
  initAudio(point.audio);
  updateNextPointSection();
}

function updateStats() {
  const route = CONTENT.routes[currentRoute];
  if (!route || currentPointIndex < 0) return;

  let totalDistance = 0;
  for (let i = 0; i < currentPointIndex; i++) {
    totalDistance += getSegmentDistance(route, i);
  }

  const steps = Math.round(totalDistance * STEPS_PER_METER);
  const calories = Math.round(steps * CALORIES_PER_STEP);

  const statMeters = document.getElementById("statMeters");
  const statSteps = document.getElementById("statSteps");
  const statCalories = document.getElementById("statCalories");

  if (statMeters) statMeters.textContent = Math.round(totalDistance);
  if (statSteps) statSteps.textContent = steps;
  if (statCalories) statCalories.textContent = calories;
}

function getSegmentDistance(route, segmentIndex) {
  const fromId = route.points[segmentIndex];
  const toId = route.points[segmentIndex + 1];
  const from = CONTENT.points[fromId];
  const to = CONTENT.points[toId];
  if (!from || !to) return 0;

  const waypoints = route.waypoints?.[segmentIndex] || [];
  let dist = 0;
  let prev = { x: from.x, y: from.y };

  for (const wp of waypoints) {
    dist += Math.sqrt((wp.x - prev.x) ** 2 + (wp.y - prev.y) ** 2) * MAP_SCALE_METERS_PER_PIXEL;
    prev = wp;
  }

  dist += Math.sqrt((to.x - prev.x) ** 2 + (to.y - prev.y) ** 2) * MAP_SCALE_METERS_PER_PIXEL;
  return dist;
}

function calculateRouteDistance(route) {
  if (!route.points || route.points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < route.points.length - 1; i++) {
    total += getSegmentDistance(route, i);
  }
  return total;
}

function updateNextPointSection() {
  const route = CONTENT.routes[currentRoute];
  if (!route) return;

  const nextIndex = currentPointIndex + 1;
  const hasNext = nextIndex < route.points.length;

  const section = document.getElementById("nextPointSection");
  const qrSection = document.getElementById("qrScanSection");

  if (!hasNext) {
    if (section) {
      section.innerHTML = `
        <div style="text-align:center;padding:20px;">
          <div style="font-size:48px;margin-bottom:12px;">🎉</div>
          <h3 style="color:#fff;margin-bottom:8px;">Маршрут завершён!</h3>
          <p style="color:#94a3b8;font-size:14px;">Вы посетили все точки</p>
          <button class="next-point-btn" onclick="location.reload()" style="margin-top:16px;background:#3b82f6;">
            <span>🔄 Начать заново</span>
          </button>
        </div>
      `;
    }
    if (qrSection) qrSection.style.display = "none";
    return;
  }

  const nextPointId = route.points[nextIndex];
  const nextPoint = CONTENT.points[nextPointId];
  const distance = getSegmentDistance(route, currentPointIndex);

  const nextPointName = document.getElementById("nextPointName");
  const nextPointDistance = document.getElementById("nextPointDistance");
  const nextPointBtn = document.getElementById("nextPointBtn");

  if (nextPointName) nextPointName.textContent = nextPoint?.title || "Следующая точка";
  if (nextPointDistance) nextPointDistance.textContent = `${Math.round(distance)} м`;

  if (qrSection) qrSection.style.display = "block";
  if (nextPointBtn) nextPointBtn.onclick = () => showRouteToNext();
}

// ==================== АУДИОПЛЕЕР ====================
function initAudio(audioUrl) {
  if (audio) {
    audio.pause();
    audio = null;
  }

  const playBtn = document.getElementById("playPauseBtn");
  const durationEl = document.getElementById("audioDuration");
  const progressFill = document.getElementById("audioProgressFill");
  const currentEl = document.getElementById("audioCurrent");

  if (playBtn) playBtn.textContent = "▶️";
  if (durationEl) durationEl.textContent = "0:00";
  if (progressFill) progressFill.style.width = "0%";
  if (currentEl) currentEl.textContent = "0:00";

  if (!audioUrl) {
    if (playBtn) playBtn.textContent = "🔇";
    return;
  }

  if (audioCache[audioUrl]) {
    audio = audioCache[audioUrl];
    setupAudioEvents(audio);
    if (durationEl) durationEl.textContent = formatTime(audio.duration) || "0:00";
    if (playBtn) playBtn.textContent = "▶️";
    return;
  }

  if (playBtn) playBtn.textContent = "⬇️";
  if (durationEl) durationEl.textContent = "Нажмите ▶️";

  audio = null;
  window.currentAudioUrl = audioUrl;
}

function setupAudioEvents(audioObj) {
  audioObj.addEventListener("timeupdate", () => {
    if (!audioObj.duration) return;
    const pct = (audioObj.currentTime / audioObj.duration) * 100;
    const progressFill = document.getElementById("audioProgressFill");
    const currentEl = document.getElementById("audioCurrent");
    if (progressFill) progressFill.style.width = pct + "%";
    if (currentEl) currentEl.textContent = formatTime(audioObj.currentTime);
  });

  audioObj.addEventListener("ended", () => {
    const playBtn = document.getElementById("playPauseBtn");
    if (playBtn) playBtn.textContent = "▶️";
    showToast("🎧 Аудиогид завершён!");
  });

  audioObj.addEventListener("error", (e) => {
    console.error("Audio error:", e);
    const playBtn = document.getElementById("playPauseBtn");
    if (playBtn) playBtn.textContent = "❌";
    showToast("❌ Ошибка аудио");
  });

  const progressBar = document.getElementById("audioProgressBar");
  if (progressBar) {
    progressBar.onclick = (e) => {
      if (!audioObj || !audioObj.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audioObj.currentTime = pct * audioObj.duration;
    };
  }
}

function togglePlay() {
  const audioUrl = window.currentAudioUrl;
  if (!audioUrl) return;

  if (!audio || audio.src !== audioUrl) {
    showToast("⏳ Загрузка аудио...");

    audio = new Audio(audioUrl);
    audio.preload = "auto";

    setupAudioEvents(audio);

    audio.addEventListener("canplaythrough", () => {
      audioCache[audioUrl] = audio;
      const durationEl = document.getElementById("audioDuration");
      const playBtn = document.getElementById("playPauseBtn");
      if (durationEl) durationEl.textContent = formatTime(audio.duration);
      if (playBtn) playBtn.textContent = "⏸️";
      audio.play();
    });

    audio.load();
    return;
  }

  if (audio.paused) {
    audio.play();
    const playBtn = document.getElementById("playPauseBtn");
    if (playBtn) playBtn.textContent = "⏸️";
  } else {
    audio.pause();
    const playBtn = document.getElementById("playPauseBtn");
    if (playBtn) playBtn.textContent = "▶️";
  }
}

function seekAudio(seconds) {
  if (!audio) return;
  audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
}

function setSpeed(speed) {
  if (!audio) return;
  audio.playbackRate = speed;
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.classList.toggle("active", parseFloat(btn.dataset.speed) === speed);
  });
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ==================== КАРТА ====================
function showRouteToNext() {
  const route = CONTENT.routes[currentRoute];
  if (!route) return;

  const nextIndex = currentPointIndex + 1;
  if (nextIndex >= route.points.length) return;

  const nextPointId = route.points[nextIndex];
  const nextPoint = CONTENT.points[nextPointId];

  const mapTitle = document.getElementById("mapTitle");
  const mapInstruction = document.getElementById("mapInstruction");

  if (mapTitle) mapTitle.textContent = `Путь к: ${nextPoint?.title || "следующая"}`;
  if (mapInstruction) mapInstruction.innerHTML = `Идите по <b>зелёной линии</b> к «${nextPoint?.title || "следующая"}»`;

  const guideScreen = document.getElementById("guideScreen");
  const mapScreen = document.getElementById("mapScreen");

  if (guideScreen) guideScreen.style.display = "none";
  if (mapScreen) mapScreen.style.display = "flex";

  setTimeout(() => {
    initMap();
    drawRouteToNext();
  }, 100);
}

function showMap() {
  const mapTitle = document.getElementById("mapTitle");
  const mapInstruction = document.getElementById("mapInstruction");

  if (mapTitle) mapTitle.textContent = "Маршрут";
  if (mapInstruction) mapInstruction.textContent = "Красная — вы здесь. Зелёная — следующая.";

  const guideScreen = document.getElementById("guideScreen");
  const mapScreen = document.getElementById("mapScreen");

  if (guideScreen) guideScreen.style.display = "none";
  if (mapScreen) mapScreen.style.display = "flex";

  setTimeout(() => {
    initMap();
    drawFullRoute();
  }, 100);
}

function showGuideFromMap() {
  const mapScreen = document.getElementById("mapScreen");
  const guideScreen = document.getElementById("guideScreen");

  if (mapScreen) mapScreen.style.display = "none";
  if (guideScreen) guideScreen.style.display = "flex";

  if (map) {
    map.remove();
    map = null;
  }
}

function initMap() {
  if (map) {
    map.remove();
    map = null;
  }

  map = L.map("map", { crs: L.CRS.Simple, zoomControl: false, minZoom: -4, maxZoom: 2, attributionControl: false });
  L.imageOverlay("map.png", MAP_BOUNDS).addTo(map);
  map.fitBounds(MAP_BOUNDS, { padding: [40, 40] });
}

function drawRouteToNext() {
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  const route = CONTENT.routes[currentRoute];
  const fromId = route.points[currentPointIndex];
  const toId = route.points[currentPointIndex + 1];
  const from = CONTENT.points[fromId];
  const to = CONTENT.points[toId];

  if (!from || !to) return;

  const latlngs = [[from.y, from.x]];
  const waypoints = route.waypoints?.[currentPointIndex] || [];
  waypoints.forEach(wp => latlngs.push([wp.y, wp.x]));
  latlngs.push([to.y, to.x]);

  routeLayer = L.polyline(latlngs, { 
    color: "#10b981", 
    weight: 6, 
    opacity: 0.9,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map);

  addArrowsToPath(latlngs, "#10b981");

  const currentIcon = L.divIcon({ 
    className: "current-point-marker", 
    html: from.icon || "📍", 
    iconSize: [40, 40], 
    iconAnchor: [20, 20] 
  });
  L.marker([from.y, from.x], { icon: currentIcon, zIndexOffset: 1000 }).addTo(map);

  const nextIcon = L.divIcon({ 
    className: "next-point-marker", 
    html: to.icon || "📍", 
    iconSize: [36, 36], 
    iconAnchor: [18, 18] 
  });
  L.marker([to.y, to.x], { icon: nextIcon, zIndexOffset: 900 }).addTo(map);

  map.fitBounds(latlngs, { padding: [80, 80] });
}

function drawFullRoute() {
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  const route = CONTENT.routes[currentRoute];
  if (!route) return;

  const latlngs = [];

  for (let i = 0; i < route.points.length; i++) {
    const pt = CONTENT.points[route.points[i]];
    if (!pt) continue;
    latlngs.push([pt.y, pt.x]);

    if (i < route.points.length - 1) {
      const waypoints = route.waypoints?.[i] || [];
      waypoints.forEach(wp => latlngs.push([wp.y, wp.x]));
    }
  }

  routeLayer = L.polyline(latlngs, { 
    color: "#3b82f6", 
    weight: 4, 
    opacity: 0.7,
    dashArray: "8, 6"
  }).addTo(map);

  addArrowsToPath(latlngs, "#3b82f6");

  route.points.forEach((pid, idx) => {
    const pt = CONTENT.points[pid];
    if (!pt) return;

    let className, size, zIndex;
    if (pid === currentPointId) {
      className = "current-point-marker";
      size = [40, 40];
      zIndex = 1000;
    } else if (visitedPoints.has(pid)) {
      className = "visited-point-marker";
      size = [32, 32];
      zIndex = 100;
    } else {
      className = "next-point-marker";
      size = [36, 36];
      zIndex = 500;
    }

    const icon = L.divIcon({ className, html: pt.icon || "📍", iconSize: size, iconAnchor: [size[0]/2, size[1]/2] });
    L.marker([pt.y, pt.x], { icon, zIndexOffset: zIndex }).addTo(map);
  });

  map.fitBounds(latlngs, { padding: [60, 60] });
}

function addArrowsToPath(latlngs, color) {
  for (let i = 0; i < latlngs.length - 1; i++) {
    const from = latlngs[i];
    const to = latlngs[i + 1];
    const dist = Math.sqrt((to[0]-from[0])**2 + (to[1]-from[1])**2);
    const steps = Math.max(1, Math.floor(dist / 150));

    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      const pos = [from[0] + (to[0]-from[0])*t, from[1] + (to[1]-from[1])*t];
      const angle = Math.atan2(to[1]-from[1], to[0]-from[0]) * 180 / Math.PI;

      const arrowIcon = L.divIcon({
        className: "route-arrow",
        html: `<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid ${color};transform:rotate(${angle-90}deg);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      L.marker(pos, { icon: arrowIcon, zIndexOffset: 50 }).addTo(map);
    }
  }
}

// ==================== QR-СКАНИРОВАНИЕ ====================
let videoStream = null;
let scanInterval = null;

function checkCameraSupport() {
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const isSecure = window.isSecureContext || location.protocol === 'https:';
  return { hasGetUserMedia, isSecure };
}

async function scanQR() {
  console.log("=== scanQR() ВЫЗВАН ===");

  const support = checkCameraSupport();

  if (!support.isSecure) {
    showToast("❌ Нужен HTTPS для камеры");
    console.error("Not secure context");
    return;
  }

  if (!support.hasGetUserMedia) {
    showToast("❌ Камера не поддерживается");
    console.error("No getUserMedia");
    return;
  }

  showToast("📷 Открываю камеру...");

  try {
    await openCamera();
  } catch (e) {
    console.error("Camera error:", e);
    showToast("❌ Ошибка камеры: " + e.message);
  }
}

async function openCamera() {
  createCameraModal();

  videoStream = await navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: "environment" },
    audio: false
  });

  const video = document.getElementById("qrVideo");
  video.srcObject = videoStream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  await video.play();
  updateCameraStatus("🔍 Наведите на QR-код...");

  if ("BarcodeDetector" in window) {
    startBarcodeDetection(video);
  } else {
    startJsQRDetection(video);
  }
}

function startBarcodeDetection(video) {
  const detector = new BarcodeDetector({ formats: ["qr_code"] });

  scanInterval = setInterval(async () => {
    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        stopCamera();
        handleQRResult(barcodes[0].rawValue);
      }
    } catch (e) {}
  }, 300);
}

async function startJsQRDetection(video) {
  if (!window.jsQR) {
    await loadScript("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js");
  }

  const canvas = document.getElementById("qrCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  scanInterval = setInterval(() => {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert"
    });

    if (code) {
      stopCamera();
      handleQRResult(code.data);
    }
  }, 300);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(script);
  });
}

function createCameraModal() {
  const old = document.getElementById("qrModal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "qrModal";
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="background:#1e293b;border-radius:16px;width:100%;max-width:360px;overflow:hidden;border:1px solid #334155;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #334155;">
          <h2 style="font-size:16px;color:#fff;margin:0;">📷 Сканирование QR</h2>
          <button onclick="stopCamera()" style="background:#334155;border:none;color:#94a3b8;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>
        </div>
        <p id="cameraStatus" style="text-align:center;color:#94a3b8;font-size:13px;padding:10px 16px 0;margin:0;">Запуск камеры...</p>
        <div style="position:relative;width:260px;height:260px;margin:12px auto;border-radius:12px;overflow:hidden;background:#0f172a;">
          <video id="qrVideo" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1);"></video>
          <canvas id="qrCanvas" style="display:none;"></canvas>
          <div style="position:absolute;inset:16px;border:2px solid rgba(16,185,129,0.3);border-radius:8px;">
            <div style="position:absolute;top:-2px;left:-2px;width:16px;height:16px;border-top:3px solid #10b981;border-left:3px solid #10b981;"></div>
            <div style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-top:3px solid #10b981;border-right:3px solid #10b981;"></div>
            <div style="position:absolute;bottom:-2px;left:-2px;width:16px;height:16px;border-bottom:3px solid #10b981;border-left:3px solid #10b981;"></div>
            <div style="position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-bottom:3px solid #10b981;border-right:3px solid #10b981;"></div>
          </div>
        </div>
        <div style="padding:10px 16px 16px;text-align:center;">
          <p style="color:#64748b;font-size:12px;margin:0;">Наведите камеру на QR-код</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function updateCameraStatus(text) {
  const status = document.getElementById("cameraStatus");
  if (status) status.textContent = text;
}

function stopCamera() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
  const modal = document.getElementById("qrModal");
  if (modal) modal.remove();
}

function handleQRResult(url) {
  console.log("handleQRResult:", url);
  let pointId = null;

  try {
    const urlObj = new URL(url);
    pointId = urlObj.searchParams.get("point");
  } catch (e) {
    if (CONTENT.points[url]) pointId = url;
    const match = url.match(/[?&]point=([^&]+)/);
    if (match) pointId = match[1];
  }

  console.log("pointId:", pointId);

  if (!pointId || !CONTENT.points[pointId]) {
    showToast("❌ QR-код не распознан");
    return;
  }

  const route = currentRoute ? CONTENT.routes[currentRoute] : null;

  if (!route) {
    currentPointId = pointId;
    showGuideFromMap();
    loadPoint(pointId);
    showToast(`✅ Точка «${CONTENT.points[pointId]?.title}» открыта!`);
    return;
  }

  const expectedNextId = route.points[currentPointIndex + 1];

  if (pointId !== expectedNextId) {
    showToast(`⚠️ Это не следующая точка! Следующая: ${CONTENT.points[expectedNextId]?.title || expectedNextId}`);
    return;
  }

  visitedPoints.add(pointId);
  saveVisitedPoints();
  currentPointId = pointId;
  currentPointIndex++;

  showToast(`✅ Точка «${CONTENT.points[pointId]?.title}» открыта!`);
  showGuideFromMap();
  loadPoint(pointId);
}

function onArrived() {
  scanQR();
}

// ==================== УТИЛИТЫ ====================
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Глобальные функции для inline onclick
window.scanQR = scanQR;
window.stopCamera = stopCamera;
window.onArrived = onArrived;
window.showGuideFromMap = showGuideFromMap;
window.showRouteToNext = showRouteToNext;
window.showMap = showMap;
window.togglePlay = togglePlay;
window.seekAudio = seekAudio;
window.setSpeed = setSpeed;
