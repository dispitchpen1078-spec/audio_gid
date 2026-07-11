// ==================== КОНФИГУРАЦИЯ ====================
const CALORIES_PER_STEP = 0.05;
const STEPS_PER_METER = 1.3;
const MAP_BOUNDS = [[0, 0], [1200, 2000]]; // ← ЗАМЕНИТЕ НА РЕАЛЬНЫЙ РАЗМЕР map.png [высота, ширина]

// ==================== ДАННЫЕ ====================
const DEFAULT_CONTENT = {
  points: {
    pool: { id: "pool", title: "Бассейн «Олимпийский»", description: "Олимпийский бассейн с подогреваемой водой.", image: "images/1.jpg", audio: "audio/1.mp3", x: 1276, y: 142, icon: "🏊" },
    building: { id: "building", title: "Главный корпус", description: "Главный корпус пансионата.", image: "images/2.jpg", audio: "audio/2.mp3", x: 1100, y: 300, icon: "🏢" },
    cafe: { id: "cafe", title: "Кафе", description: "Уютное кафе с домашней кухней.", image: "images/3.jpg", audio: "audio/3.mp3", x: 900, y: 500, icon: "☕" },
    playground: { id: "playground", title: "Детская площадка", description: "Детская площадка с качелями и горками.", image: "images/4.jpg", audio: "audio/4.mp3", x: 700, y: 700, icon: "🎠" },
    campfire: { id: "campfire", title: "Площадка для костра", description: "Место для вечерних посиделок у костра.", image: "images/5.jpg", audio: "audio/5.mp3", x: 500, y: 900, icon: "🔥" },
    gym: { id: "gym", title: "Тренажёрный зал", description: "Современный тренажёрный зал.", image: "images/6.jpg", audio: "audio/6.mp3", x: 300, y: 1100, icon: "💪" },
    tennis: { id: "tennis", title: "Теннисный корт", description: "Теннисный корт с профессиональным покрытием.", image: "images/7.jpg", audio: "audio/7.mp3", x: 200, y: 1300, icon: "🎾" },
    football: { id: "football", title: "Футбольное поле", description: "Футбольное поле с искусственным газоном.", image: "images/8.jpg", audio: "audio/8.mp3", x: 100, y: 1500, icon: "⚽" }
  },
  routes: {
    qwerty: { name: "Короткий маршрут", description: "Обзорная экскурсия по основным точкам", points: ["pool", "building", "cafe", "playground"] },
    qwerty1: { name: "Длинный маршрут", description: "Полная экскурсия по всем точкам", points: ["pool", "building", "cafe", "playground", "campfire", "gym", "tennis", "football"] }
  }
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let CONTENT = DEFAULT_CONTENT;
let currentRoute = null;
let currentPointIndex = 0;
let currentPointId = null;
let audio = null;
let audioCache = {};
let map = null;
let userLocationMarker = null;
let userLocationCircle = null;
let watchId = null;
let routePolyline = null;
let markers = [];
let contentLoaded = false;

// ==================== ЗАГРУЗКА КОНТЕНТА ====================
async function loadContent() {
  try {
    const res = await fetch("content.json");
    if (res.ok) {
      const data = await res.json();
      if (data && data.points && Object.keys(data.points).length > 0) {
        CONTENT = data;
        console.log("Loaded content.json from server");
      } else {
        console.log("content.json empty, using default");
      }
    } else {
      console.log("content.json not found (status:", res.status, "), using default");
    }
  } catch (e) {
    console.log("content.json load failed:", e.message, "— using default");
  }
  contentLoaded = true;
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded started");

  // Загружаем контент (с fallback на default)
  await loadContent();

  console.log("Content loaded, initializing UI");

  const urlParams = new URLSearchParams(window.location.search);
  const pointId = urlParams.get("point");
  const routeId = urlParams.get("route");

  if (pointId && CONTENT.points[pointId]) {
    hideSplash();
    currentPointId = pointId;
    showGuideFromMap();
    loadPoint(pointId);
  } else if (routeId && CONTENT.routes[routeId]) {
    currentRoute = routeId;
    hideSplash();
    showRouteSelectForRoute(routeId);
  } else {
    hideSplash();
    showRouteSelect();
  }

  console.log("Initialization complete");
});

function hideSplash() {
  console.log("Hiding splash");
  const splash = document.getElementById("splashScreen");
  if (splash) {
    splash.style.display = "none";
  } else {
    console.log("splashScreen not found");
  }
}

// ==================== ЭКРАН ВЫБОРА МАРШРУТА ====================
function showRouteSelect(firstPointId) {
  console.log("showRouteSelect called, firstPointId:", firstPointId);

  const routeSelect = document.getElementById("routeSelect");
  const guideScreen = document.getElementById("guideScreen");
  const mapScreen = document.getElementById("mapScreen");

  if (routeSelect) routeSelect.style.display = "block";
  if (guideScreen) guideScreen.style.display = "none";
  if (mapScreen) mapScreen.style.display = "none";

  const list = document.getElementById("route-list");
  if (!list) {
    console.error("route-list element not found!");
    return;
  }
  list.innerHTML = "";

  const availableRoutes = [];
  Object.entries(CONTENT.routes || {}).forEach(([id, route]) => {
    if (!firstPointId || (route.points && route.points[0] === firstPointId)) {
      availableRoutes.push({ id, route });
    }
  });

  const header = document.querySelector(".route-header");
  if (header) {
    if (firstPointId && CONTENT.points[firstPointId]) {
      header.innerHTML = `
        <div class="route-icon">🗺️</div>
        <h2>Выберите маршрут</h2>
        <p>Точка: ${CONTENT.points[firstPointId].title}</p>
      `;
    } else {
      header.innerHTML = `
        <div class="route-icon">🗺️</div>
        <h2>Доступные маршруты</h2>
        <p>Выберите маршрут для начала экскурсии</p>
      `;
    }
  }

  if (availableRoutes.length === 0) {
    list.innerHTML = `
      <div class="route-item" style="text-align:center;padding:20px;">
        <h3>😕 Нет доступных маршрутов</h3>
        <p>Маршруты не настроены</p>
      </div>
    `;
    return;
  }

  availableRoutes.forEach(({ id, route }) => {
    const totalDistance = calculateRouteDistance(route);
    const totalSteps = Math.round(totalDistance * STEPS_PER_METER);
    const duration = Math.round(totalDistance / 60);

    const item = document.createElement("div");
    item.className = "route-item";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <h3>${route.name}</h3>
      <p>${route.description || ""}</p>
      <div class="route-meta">
        <span>📍 ${route.points?.length || 0} точек</span>
        <span>📏 ${Math.round(totalDistance)} м</span>
        <span>⏱️ ~${duration} мин</span>
      </div>
    `;
    item.onclick = () => startRoute(id, route.points[0]);
    list.appendChild(item);
  });

  // Кнопка офлайн
  const offlineBtn = document.createElement("button");
  offlineBtn.className = "route-item";
  offlineBtn.style.cssText = "background: #1e3a8a; border-color: #3b82f6; margin-top: 16px; cursor: pointer; width: 100%;";
  offlineBtn.innerHTML = `
    <h3>💾 Скачать маршруты для офлайн</h3>
    <p style="color: #93c5fd;">Все аудио и карта будут доступны без интернета</p>
    <div class="route-meta">
      <span>📦 Кэширование контента</span>
    </div>
  `;
  offlineBtn.onclick = cacheForOffline;
  list.appendChild(offlineBtn);

  console.log("Route select rendered, routes:", availableRoutes.length);
}

function showRouteSelectForRoute(routeId) {
  const route = CONTENT.routes[routeId];
  if (route && route.points && route.points.length > 0) {
    showRouteSelect(route.points[0]);
  } else {
    showRouteSelect();
  }
}

// ==================== МАРШРУТ ====================
function startRoute(routeId, firstPointId) {
  currentRoute = routeId;
  currentPointIndex = 0;
  currentPointId = firstPointId;

  const routeSelect = document.getElementById("routeSelect");
  if (routeSelect) routeSelect.style.display = "none";

  showGuide();
  loadPoint(firstPointId);
}

function calculateRouteDistance(route) {
  if (!route.points || route.points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < route.points.length - 1; i++) {
    const p1 = CONTENT.points[route.points[i]];
    const p2 = CONTENT.points[route.points[i + 1]];
    if (p1 && p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
  }
  return total;
}

function getDistanceToNext() {
  if (!currentRoute || !CONTENT.routes[currentRoute]) return 0;
  const route = CONTENT.routes[currentRoute];
  if (currentPointIndex >= route.points.length - 1) return 0;
  const current = CONTENT.points[route.points[currentPointIndex]];
  const next = CONTENT.points[route.points[currentPointIndex + 1]];
  if (!current || !next) return 0;
  const dx = next.x - current.x;
  const dy = next.y - current.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

// ==================== ГИД ====================
function showGuide() {
  const guideScreen = document.getElementById("guideScreen");
  const routeSelect = document.getElementById("routeSelect");
  const mapScreen = document.getElementById("mapScreen");

  if (guideScreen) guideScreen.style.display = "block";
  if (routeSelect) routeSelect.style.display = "none";
  if (mapScreen) mapScreen.style.display = "none";
}

function loadPoint(pointId) {
  const point = CONTENT.points[pointId];
  if (!point) {
    console.error("Point not found:", pointId);
    return;
  }

  currentPointId = pointId;

  const titleEl = document.getElementById("pointTitle");
  const descEl = document.getElementById("pointDescription");
  const pointImage = document.getElementById("pointImage");
  const distanceEl = document.getElementById("distanceValue");
  const stepsEl = document.getElementById("stepsValue");
  const caloriesEl = document.getElementById("caloriesValue");
  const routeNameEl = document.getElementById("routeName");
  const progressEl = document.getElementById("routeProgress");

  if (titleEl) titleEl.textContent = point.title;
  if (descEl) descEl.textContent = point.description || "";

  if (pointImage) {
    if (point.image) {
      pointImage.src = point.image;
      pointImage.style.display = "";
      pointImage.onerror = () => {
        pointImage.style.display = "none";
      };
    } else {
      pointImage.style.display = "none";
    }
  }

  const dist = getDistanceToNext();
  if (distanceEl) distanceEl.textContent = dist + " м";
  if (stepsEl) stepsEl.textContent = Math.round(dist * STEPS_PER_METER);
  if (caloriesEl) caloriesEl.textContent = Math.round(dist * STEPS_PER_METER * CALORIES_PER_STEP);

  if (routeNameEl && currentRoute) {
    routeNameEl.textContent = CONTENT.routes[currentRoute]?.name || "";
  }

  if (progressEl && currentRoute) {
    const route = CONTENT.routes[currentRoute];
    const progress = route.points ? ((currentPointIndex + 1) / route.points.length * 100) : 0;
    progressEl.style.width = progress + "%";
  }

  initAudio(point.audio);
}

function nextPoint() {
  if (!currentRoute || !CONTENT.routes[currentRoute]) return;
  const route = CONTENT.routes[currentRoute];
  if (currentPointIndex < route.points.length - 1) {
    currentPointIndex++;
    loadPoint(route.points[currentPointIndex]);
  } else {
    showToast("🎉 Маршрут завершён!");
  }
}

function prevPoint() {
  if (!currentRoute || !CONTENT.routes[currentRoute]) return;
  const route = CONTENT.routes[currentRoute];
  if (currentPointIndex > 0) {
    currentPointIndex--;
    loadPoint(route.points[currentPointIndex]);
  }
}

// ==================== АУДИО ====================
function initAudio(audioUrl) {
  console.log("initAudio(), audioUrl:", audioUrl);

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
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
    window.currentAudioUrl = null;
    return;
  }

  if (audioCache[audioUrl]) {
    const cached = audioCache[audioUrl];
    if (!cached.error && cached.duration > 0) {
      console.log("Using cached audio");
      audio = cached;
      setupAudioEvents(audio);
      if (durationEl) durationEl.textContent = formatTime(audio.duration) || "0:00";
      if (playBtn) playBtn.textContent = "▶️";
      window.currentAudioUrl = audioUrl;
      return;
    } else {
      console.log("Cached audio is invalid, removing");
      delete audioCache[audioUrl];
    }
  }

  if (playBtn) playBtn.textContent = "⬇️";
  if (durationEl) durationEl.textContent = "Нажмите ▶️";

  window.currentAudioUrl = audioUrl;
}

function togglePlay() {
  const audioUrl = window.currentAudioUrl;
  console.log("togglePlay(), audioUrl:", audioUrl, "audio exists:", !!audio, "audio.paused:", audio?.paused);

  if (!audioUrl) {
    console.log("No audioUrl, returning");
    return;
  }

  // Если аудио есть, но битое — сбрасываем
  if (audio && audio.error) {
    console.log("Audio has error, resetting");
    audio = null;
  }

  // Если аудио уже создано и играет — пауза
  if (audio && !audio.paused && !audio.ended) {
    console.log("Pausing existing audio");
    audio.pause();
    const playBtn = document.getElementById("playPauseBtn");
    if (playBtn) playBtn.textContent = "▶️";
    return;
  }

  // Если аудио создано и на паузе — play
  if (audio && audio.paused && !audio.ended) {
    console.log("Resuming paused audio");
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.error("Play failed:", err);
        audio = null;
        togglePlay();
      });
    }
    const playBtn = document.getElementById("playPauseBtn");
    if (playBtn) playBtn.textContent = "⏸️";
    return;
  }

  // Если аудио закончилось — начинаем сначала
  if (audio && audio.ended) {
    console.log("Audio ended, restarting");
    audio.currentTime = 0;
    audio.play();
    const playBtn = document.getElementById("playPauseBtn");
    if (playBtn) playBtn.textContent = "⏸️";
    return;
  }

  // Создаём новое аудио
  console.log("Creating new Audio for:", audioUrl);
  showToast("⏳ Загрузка аудио...");

  if (audio) {
    audio.pause();
    audio = null;
  }

  audio = new Audio(audioUrl);
  audio.preload = "auto";
  audio.playsInline = true;

  // Обработка ошибок загрузки
  audio.addEventListener("error", (e) => {
    console.error("Audio load error:", e);
    console.error("Audio error code:", audio.error?.code);
    const code = audio.error?.code;
    let msg = "❌ Ошибка аудио";
    if (code === 2) msg = "❌ Сетевая ошибка";
    if (code === 3) msg = "❌ Формат не поддерживается";
    if (code === 4) msg = "❌ Файл не найден";

    const playBtn = document.getElementById("playPauseBtn");
    const durationEl = document.getElementById("audioDuration");
    if (playBtn) playBtn.textContent = "❌";
    if (durationEl) durationEl.textContent = msg;
    showToast(msg);
  });

  // Когда готово к воспроизведению
  audio.addEventListener("canplaythrough", () => {
    console.log("Audio canplaythrough, duration:", audio.duration);

    if (!audio.duration || isNaN(audio.duration)) {
      console.error("Audio has invalid duration");
      const playBtn = document.getElementById("playPauseBtn");
      if (playBtn) playBtn.textContent = "❌";
      showToast("❌ Ошибка загрузки аудио");
      return;
    }

    audioCache[audioUrl] = audio;
    const durationEl = document.getElementById("audioDuration");
    const playBtn = document.getElementById("playPauseBtn");
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
    if (playBtn) playBtn.textContent = "⏸️";
    audio.play();
  });

  setupAudioEvents(audio);
  audio.load();
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
    console.log("Audio ended");
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

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

// ==================== КАРТА ====================
function showMap() {
  const mapScreen = document.getElementById("mapScreen");
  const guideScreen = document.getElementById("guideScreen");

  if (mapScreen) mapScreen.style.display = "block";
  if (guideScreen) guideScreen.style.display = "none";

  setTimeout(() => {
    initMap();
    drawFullRoute();
    startTrackingLocation();
  }, 100);
}

function showGuideFromMap() {
  stopTrackingLocation();
  const mapScreen = document.getElementById("mapScreen");
  const guideScreen = document.getElementById("guideScreen");

  if (mapScreen) mapScreen.style.display = "none";
  if (guideScreen) guideScreen.style.display = "block";
}

function initMap() {
  if (map) {
    map.invalidateSize();
    return;
  }

  const mapContainer = document.getElementById("mapContainer");
  if (!mapContainer) return;

  map = L.map("mapContainer", {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 4,
    zoomControl: false,
    attributionControl: false
  });

  L.imageOverlay("map.png", MAP_BOUNDS).addTo(map);
  map.fitBounds(MAP_BOUNDS, { padding: [40, 40] });

  // Добавляем маркеры точек
  Object.values(CONTENT.points).forEach(point => {
    const marker = L.marker([point.y, point.x], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:#3b82f6;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${point.icon}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(map);

    marker.bindPopup(`<b>${point.title}</b>`);
    marker.on('click', () => {
      currentPointId = point.id;
      showGuideFromMap();
      loadPoint(point.id);
    });
    markers.push(marker);
  });
}

function drawFullRoute() {
  if (!currentRoute || !CONTENT.routes[currentRoute]) return;
  const route = CONTENT.routes[currentRoute];
  if (!route.points || route.points.length < 2) return;

  const latlngs = route.points.map(id => {
    const p = CONTENT.points[id];
    return p ? [p.y, p.x] : null;
  }).filter(Boolean);

  if (routePolyline) map.removeLayer(routePolyline);
  routePolyline = L.polyline(latlngs, { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(map);

  // Подсветка текущей точки
  const currentPoint = CONTENT.points[route.points[currentPointIndex]];
  if (currentPoint) {
    L.marker([currentPoint.y, currentPoint.x], {
      icon: L.divIcon({
        className: 'current-point-marker',
        html: `<div style="background:#ef4444;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 0 0 0 rgba(239,68,68,0.4);animation:pulse-marker 2s infinite;">${currentPoint.icon}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      }),
      zIndexOffset: 1000
    }).addTo(map);
  }
}

function drawRouteToNext() {
  if (!currentRoute || !CONTENT.routes[currentRoute]) return;
  const route = CONTENT.routes[currentRoute];
  if (currentPointIndex >= route.points.length - 1) return;

  const current = CONTENT.points[route.points[currentPointIndex]];
  const next = CONTENT.points[route.points[currentPointIndex + 1]];
  if (!current || !next) return;

  if (routePolyline) map.removeLayer(routePolyline);
  routePolyline = L.polyline([[current.y, current.x], [next.y, next.x]], {
    color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '10, 10'
  }).addTo(map);
}

function showRouteToNext() {
  showMap();
}

// ==================== ГЕОЛОКАЦИЯ ====================
function startTrackingLocation() {
  if (!navigator.geolocation) {
    console.log("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => updateUserLocation(pos),
    (err) => console.log("Geolocation error:", err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );

  watchId = navigator.geolocation.watchPosition(
    (pos) => updateUserLocation(pos),
    (err) => console.log("Watch error:", err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

function stopTrackingLocation() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
    userLocationMarker = null;
  }
  if (userLocationCircle) {
    map.removeLayer(userLocationCircle);
    userLocationCircle = null;
  }
}

function updateUserLocation(position) {
  if (!map) return;

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  console.log("User location:", lat, lng, "accuracy:", accuracy);
  showToast(`📍 GPS: точность ~${Math.round(accuracy)}м`);

  if (userLocationMarker) map.removeLayer(userLocationMarker);
  if (userLocationCircle) map.removeLayer(userLocationCircle);

  userLocationCircle = L.circle([lat, lng], {
    radius: accuracy,
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.15,
    weight: 1
  }).addTo(map);

  const pulseIcon = L.divIcon({
    className: 'user-location-marker',
    html: `<div class="user-location-dot"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  userLocationMarker = L.marker([lat, lng], {
    icon: pulseIcon,
    zIndexOffset: 2000
  }).addTo(map);

  userLocationMarker.bindPopup("📍 Вы здесь<br>Точность: ~" + Math.round(accuracy) + " м").openPopup();
}

// ==================== QR-КОД ====================
function scanQR() {
  createCameraModal();
  startCamera();
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

let qrScanInterval = null;

function startCamera() {
  const video = document.getElementById("qrVideo");
  const status = document.getElementById("cameraStatus");

  if (!video) return;

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
      video.srcObject = stream;
      if (status) status.textContent = "Камера активна. Сканируйте QR-код...";
      qrScanInterval = setInterval(scanFrame, 500);
    })
    .catch(err => {
      console.error("Camera error:", err);
      if (status) status.textContent = "❌ Нет доступа к камере";
      showToast("❌ Нет доступа к камере");
    });
}

function stopCamera() {
  const video = document.getElementById("qrVideo");
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
  }
  if (qrScanInterval) {
    clearInterval(qrScanInterval);
    qrScanInterval = null;
  }
  const modal = document.getElementById("qrModal");
  if (modal) modal.remove();
}

function scanFrame() {
  const video = document.getElementById("qrVideo");
  const canvas = document.getElementById("qrCanvas");
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);
    if (code) {
      console.log("QR detected:", code.data);
      stopCamera();
      handleQRResult(code.data);
    }
  } catch (e) {
    // jsQR не найден или ошибка
  }
}

function handleQRResult(url) {
  console.log("QR URL:", url);
  try {
    const urlObj = new URL(url);
    const pointId = urlObj.searchParams.get("point");

    if (pointId && CONTENT.points[pointId]) {
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

      currentPointIndex++;
      loadPoint(pointId);
      showToast(`✅ Точка «${CONTENT.points[pointId]?.title}» открыта!`);
    } else {
      showToast("❌ Неверный QR-код");
    }
  } catch (e) {
    showToast("❌ Неверный QR-код");
  }
}

// ==================== ОФЛАЙН-КЭШ ====================
async function cacheForOffline() {
  if (!("serviceWorker" in navigator)) {
    showToast("⚠️ Браузер не поддерживает офлайн");
    return;
  }

  showToast("📦 Кэширование начато...");

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) {
      showToast("⚠️ SW не активен. Перезагрузите страницу.");
      return;
    }

    reg.active.postMessage({ type: "CACHE_ALL" });

    setTimeout(() => {
      showToast("✅ Контент сохранён для офлайн!");
    }, 4000);

  } catch (e) {
    console.error('cacheForOffline error:', e);
    showToast("⚠️ Ошибка: " + e.message);
  }
}

// ==================== УТИЛИТЫ ====================
function showToast(message) {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;z-index:30000;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:1px solid #334155;white-space:nowrap;";
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================
window.scanQR = scanQR;
window.stopCamera = stopCamera;
window.togglePlay = togglePlay;
window.showMap = showMap;
window.showGuideFromMap = showGuideFromMap;
window.nextPoint = nextPoint;
window.prevPoint = prevPoint;
window.showRouteToNext = showRouteToNext;
window.startTrackingLocation = startTrackingLocation;
window.stopTrackingLocation = stopTrackingLocation;
window.cacheForOffline = cacheForOffline;
