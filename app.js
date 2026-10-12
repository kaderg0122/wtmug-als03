/* ============================================================
   HAVA DURUMU PWA — Open-Meteo (hareketli arka plan)
   ============================================================ */

const $ = (s) => document.querySelector(s);

const API = {
  geocode: 'https://geocoding-api.open-meteo.com/v1/search',
  forecast: 'https://api.open-meteo.com/v1/forecast',
  reverse: 'https://api.bigdatacloud.net/data/reverse-geocode-client'
};

/* ---------- WMO hava kodu → açıklama + emoji ---------- */
const WMO = {
  0:  ['Açık', '☀️'],
  1:  ['Az bulutlu', '🌤️'],
  2:  ['Parçalı bulutlu', '⛅'],
  3:  ['Kapalı', '☁️'],
  45: ['Puslu', '🌫️'],
  48: ['Kırağılı pus', '🌫️'],
  51: ['Hafif çisenti', '🌦️'],
  53: ['Çisenti', '🌦️'],
  55: ['Yoğun çisenti', '🌧️'],
  56: ['Hafif dondurucu çisenti', '🌧️'],
  57: ['Dondurucu çisenti', '🌧️'],
  61: ['Hafif yağmur', '🌦️'],
  63: ['Yağmurlu', '🌧️'],
  65: ['Şiddetli yağmur', '🌧️'],
  66: ['Hafif dondurucu yağmur', '🌧️'],
  67: ['Dondurucu yağmur', '🌧️'],
  71: ['Hafif kar', '🌨️'],
  73: ['Kar', '🌨️'],
  75: ['Yoğun kar', '❄️'],
  77: ['Kar taneleri', '🌨️'],
  80: ['Hafif sağanak', '🌦️'],
  81: ['Sağanak', '🌧️'],
  82: ['Şiddetli sağanak', '⛈️'],
  85: ['Hafif kar sağanağı', '🌨️'],
  86: ['Kar sağanağı', '❄️'],
  95: ['Gök gürültülü', '⛈️'],
  96: ['Dolulu fırtına', '⛈️'],
  99: ['Şiddetli dolulu fırtına', '⛈️']
};

function wmoInfo(code) {
  return WMO[code] || ['Bilinmiyor', '❓'];
}

/* ============================================================
   TEMA
   ============================================================ */
const themeToggle = $('#themeToggle');
const themeIcon = $('#themeIcon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('weather-theme', theme);
}

(function initTheme() {
  const saved = localStorage.getItem('weather-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
})();

themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   HAVA DURUMUNA GÖRE ARKA PLAN + HAREKETLİ SAHNE
   ============================================================ */
function applyWeatherBackground(code, isDay) {
  let cls = 'clear';

  if (code === 0) cls = 'clear';
  else if (code === 1 || code === 2) cls = 'partly-cloudy';
  else if (code === 3) cls = 'cloudy';
  else if (code === 45 || code === 48) cls = 'fog';
  else if (code >= 51 && code <= 57) cls = 'rain';
  else if (code >= 61 && code <= 67) cls = 'rain';
  else if (code >= 71 && code <= 77) cls = 'snow';
  else if (code >= 80 && code <= 82) cls = 'rain';
  else if (code === 85 || code === 86) cls = 'snow';
  else if (code >= 95) cls = 'thunder';

  const body = document.body;
  [...body.classList].forEach((c) => {
    if (c.startsWith('weather-')) body.classList.remove(c);
  });

  body.classList.add('weather-' + cls);
  if (!isDay) body.classList.add('weather-night');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const colorMap = {
      clear: isDay ? '#0284c7' : '#020617',
      'partly-cloudy': isDay ? '#0369a1' : '#0a0f1e',
      cloudy: isDay ? '#475569' : '#0f172a',
      fog: isDay ? '#94a3b8' : '#1e293b',
      rain: isDay ? '#1e293b' : '#020617',
      snow: isDay ? '#94a3b8' : '#1e293b',
      thunder: '#1e1b4b'
    };
    meta.content = colorMap[cls] || '#0d6efd';
  }

  buildWeatherScene(cls, isDay);
}

/* ============================================================
   HAREKETLİ SAHNE
   ============================================================ */
function buildWeatherScene(cls, isDay) {
  const bg = document.getElementById('weatherBg');
  if (!bg) {
    console.warn('[Scene] #weatherBg bulunamadı!');
    return;
  }

  bg.innerHTML = '';
  const parts = [];

  // Güneş
  if (cls === 'clear' && isDay) {
    parts.push('<div class="scene-sun"></div>');
  }

  // Yıldızlar (gece)
  if (!isDay) {
    const starCount = cls === 'clear' ? 90 : 50;
    parts.push(makeStars(starCount));
  }

  // Bulutlar
  if (cls === 'cloudy' || cls === 'partly-cloudy' ||
      cls === 'rain' || cls === 'thunder' || cls === 'fog') {
    const count = cls === 'partly-cloudy' ? 3
                : cls === 'cloudy'        ? 6
                : cls === 'fog'           ? 4
                : 5;
    parts.push(makeClouds(count, isDay));
  }

  // Pus
  if (cls === 'fog') parts.push('<div class="scene-fog"></div>');

  // Yağmur
  if (cls === 'rain' || cls === 'thunder') {
    const count = cls === 'thunder' ? 90 : 70;
    parts.push(makeRain(count));
  }

  // Kar
  if (cls === 'snow') parts.push(makeSnow(70));

  // Şimşek
  if (cls === 'thunder') parts.push('<div class="scene-lightning"></div>');

  bg.innerHTML = parts.join('');
  console.log(`[Scene] Kuruldu: ${cls}${isDay ? ' (gündüz)' : ' (gece)'} — ${parts.length} katman`);
}

function makeStars(count) {
  let html = '<div class="scene-stars">';
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100).toFixed(2);
    const y = (Math.random() * 75).toFixed(2);
    const size = (2 + Math.random() * 3).toFixed(2);
    const dur = (1.8 + Math.random() * 2.5).toFixed(2);
    const delay = (Math.random() * 3).toFixed(2);
    html += `<span class="scene-star" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s"></span>`;
  }
  return html + '</div>';
}

function makeClouds(count, isDay) {
  let html = '<div class="scene-clouds">';
  for (let i = 0; i < count; i++) {
    const y = (3 + Math.random() * 45).toFixed(2);
    const w = (240 + Math.random() * 180).toFixed(0);
    const h = (70 + Math.random() * 40).toFixed(0);
    const dur = (40 + Math.random() * 40).toFixed(1);
    const delay = (-Math.random() * dur).toFixed(1);
    const opacity = isDay
      ? (0.75 + Math.random() * 0.2).toFixed(2)
      : (0.45 + Math.random() * 0.25).toFixed(2);
    html += `<div class="scene-cloud" style="top:${y}%;width:${w}px;height:${h}px;opacity:${opacity};animation-duration:${dur}s;animation-delay:${delay}s"></div>`;
  }
  return html + '</div>';
}

function makeRain(count) {
  let html = '<div class="scene-rain">';
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100).toFixed(2);
    const len = (50 + Math.random() * 80).toFixed(0);
    const dur = (0.5 + Math.random() * 0.5).toFixed(2);
    const delay = (-Math.random() * dur).toFixed(2);
    const opacity = (0.6 + Math.random() * 0.4).toFixed(2);
    html += `<span class="scene-rain-drop" style="left:${x}%;height:${len}px;opacity:${opacity};animation-duration:${dur}s;animation-delay:${delay}s"></span>`;
  }
  return html + '</div>';
}

function makeSnow(count) {
  let html = '<div class="scene-snow">';
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100).toFixed(2);
    const size = (4 + Math.random() * 6).toFixed(1);
    const dur = (5 + Math.random() * 7).toFixed(1);
    const delay = (-Math.random() * dur).toFixed(1);
    const opacity = (0.7 + Math.random() * 0.3).toFixed(2);
    html += `<span class="scene-snow-flake" style="left:${x}%;width:${size}px;height:${size}px;opacity:${opacity};animation-duration:${dur}s;animation-delay:${delay}s"></span>`;
  }
  return html + '</div>';
}

/* ============================================================
   ÇEVRİMDIŞI UYARISI
   ============================================================ */
const offlineBanner = $('#offlineBanner');

function updateOnlineStatus() {
  offlineBanner.hidden = navigator.onLine;
}
window.addEventListener('online', () => {
  updateOnlineStatus();
  const last = getLastLocation();
  if (last) loadWeather(last.lat, last.lon, last.name, { silent: true });
});
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

/* ============================================================
   SON KONUM
   ============================================================ */
function saveLastLocation(loc) {
  try { localStorage.setItem('weather-last-location', JSON.stringify(loc)); } catch (e) {}
}
function getLastLocation() {
  try {
    const raw = localStorage.getItem('weather-last-location');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/* ============================================================
   UI YARDIMCILARI
   ============================================================ */
const loadingEl = $('#loading');
const resultEl  = $('#result');
const errorEl   = $('#errorMsg');

function showLoading(on) { loadingEl.hidden = !on; }
function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }
function clearError() { errorEl.hidden = true; errorEl.textContent = ''; }

/* ============================================================
   ŞEHİR ARAMA
   ============================================================ */
async function searchCity(name) {
  const url = `${API.geocode}?name=${encodeURIComponent(name)}&count=10&language=tr&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Arama servisi yanıt vermedi');
  const data = await res.json();
  return data.results || [];
}

/* ============================================================
   HAVA DURUMU
   ============================================================ */
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '7',
    wind_speed_unit: 'kmh',
    temperature_unit: 'celsius'
  });

  const url = `${API.forecast}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Hava durumu servisi yanıt vermedi');
  return await res.json();
}

/* ============================================================
   TERS KONUM
   ============================================================ */
async function reverseGeocode(lat, lon) {
  try {
    const url = `${API.reverse}?latitude=${lat}&longitude=${lon}&localityLanguage=tr`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || null;
  } catch (e) { return null; }
}

/* ============================================================
   RENDER
   ============================================================ */
const cityNameEl     = $('#cityName');
const lastUpdateEl   = $('#lastUpdate');
const currentIconEl  = $('#currentIcon');
const currentTempEl  = $('#currentTemp');
const currentDescEl  = $('#currentDesc');
const currentHumEl   = $('#currentHumidity');
const currentWindEl  = $('#currentWind');
const currentFeelsEl = $('#currentFeels');
const forecastListEl = $('#forecastList');

const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function formatUpdateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `Son güncelleme: ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function render(data, displayName) {
  const cur = data.current;
  const daily = data.daily;

  applyWeatherBackground(cur.weather_code, cur.is_day === 1);

  const [desc, icon] = wmoInfo(cur.weather_code);

  cityNameEl.textContent = displayName;
  lastUpdateEl.textContent = formatUpdateTime(new Date());

  currentIconEl.textContent = icon;
  currentTempEl.textContent = Math.round(cur.temperature_2m);
  currentDescEl.textContent = desc;

  currentHumEl.textContent   = `${cur.relative_humidity_2m}%`;
  currentWindEl.textContent  = `${Math.round(cur.wind_speed_10m)} km/s`;
  currentFeelsEl.textContent = `${Math.round(cur.apparent_temperature)}°`;

  forecastListEl.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + 'T00:00:00');
    const [dDesc, dIcon] = wmoInfo(daily.weather_code[i]);
    const tMax = Math.round(daily.temperature_2m_max[i]);
    const tMin = Math.round(daily.temperature_2m_min[i]);

    const isToday = date.getTime() === today.getTime();
    const dayName = isToday ? 'Bugün' : DAYS_TR[date.getDay()];
    const daySub = `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}`;

    const li = document.createElement('li');
    li.className = 'forecast-item';
    li.innerHTML = `
      <div class="fc-day">
        <span class="fc-day-name">${dayName}</span>
        <span class="fc-day-sub">${daySub} · ${dDesc}</span>
      </div>
      <span class="fc-icon" aria-hidden="true">${dIcon}</span>
      <div class="fc-temps">
        <span class="fc-max">${tMax}°</span>
        <span class="fc-min">${tMin}°</span>
      </div>
    `;
    forecastListEl.appendChild(li);
  }

  resultEl.hidden = false;
}

/* ============================================================
   YÜKLEME AKIŞI
   ============================================================ */
async function loadWeather(lat, lon, displayName, opts = {}) {
  if (!opts.silent) {
    clearError();
    showLoading(true);
    resultEl.hidden = true;
  }

  try {
    const data = await fetchWeather(lat, lon);

    let name = displayName;
    if (!name) name = await reverseGeocode(lat, lon) || 'Konumum';

    render(data, name);
    saveLastLocation({ lat, lon, name });
  } catch (err) {
    console.error(err);
    if (!navigator.onLine) {
      showError('İnternet bağlantısı yok. Lütfen bağlantını kontrol et.');
    } else {
      showError('Hava durumu alınamadı. Lütfen tekrar dene.');
    }
  } finally {
    showLoading(false);
  }
}

/* ============================================================
   ŞEHİR FORMU
   ============================================================ */
const searchForm = $('#searchForm');
const cityInput  = $('#cityInput');

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = cityInput.value.trim();
  if (!query) return;

  clearError();
  showLoading(true);
  resultEl.hidden = true;

  if (!navigator.onLine) {
    showLoading(false);
    showError('Çevrimdışısın — şehir araması için internet bağlantısı gerekli.');
    return;
  }

  try {
    const results = await searchCity(query);

    if (results.length === 0) {
      showLoading(false);
      showError(`"${query}" için sonuç bulunamadı. Şehir adını kontrol et.`);
      return;
    }

    const best = results.sort((a, b) => (b.population || 0) - (a.population || 0))[0];
    const label = [best.name, best.admin1, best.country].filter(Boolean).join(', ');

    await loadWeather(best.latitude, best.longitude, label, { silent: true });
  } catch (err) {
    console.error(err);
    showLoading(false);
    showError('Arama sırasında bir hata oluştu. Lütfen tekrar dene.');
  }
});

/* ============================================================
   KONUM BUTONU
   ============================================================ */
const locationBtn = $('#locationBtn');

locationBtn.addEventListener('click', () => {
  clearError();

  if (!('geolocation' in navigator)) {
    showError('Bu tarayıcı konum özelliğini desteklemiyor.');
    return;
  }

  showLoading(true);
  resultEl.hidden = true;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      await loadWeather(latitude, longitude, null, { silent: true });
    },
    (err) => {
      showLoading(false);
      let msg = 'Konum alınamadı.';
      if (err.code === err.PERMISSION_DENIED) {
        msg = 'Konum izni reddedildi. Tarayıcı ayarlarından izin ver.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = 'Konum bilgisi şu anda kullanılamıyor.';
      } else if (err.code === err.TIMEOUT) {
        msg = 'Konum alma zaman aşımına uğradı.';
      }
      showError(msg);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
});

/* ============================================================
   AÇILIŞ — varsayılan sahne hemen gösterilsin
   ============================================================ */
(function init() {
  // Hemen bir varsayılan sahne kur (gündüz açık hava)
  applyWeatherBackground(0, true);

  // Son konum varsa hava durumunu yükle (sahne otomatik güncellenir)
  const last = getLastLocation();
  if (last) {
    loadWeather(last.lat, last.lon, last.name, { silent: true });
  }
})();

/* ============================================================
   SERVICE WORKER
   ============================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => console.log('SW kayıtlı:', reg.scope))
      .catch((err) => console.error('SW hatası:', err));
  });
}