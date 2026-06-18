/* ==========================================
   東京天気 & コーデ ロジック
   ========================================== */

// 東京23区の座標リスト
const WARD_COORDS = {
  chiyoda: { lat: 35.6940, lon: 139.7536 },
  chuo: { lat: 35.6706, lon: 139.7715 },
  minato: { lat: 35.6581, lon: 139.7515 },
  shinjuku: { lat: 35.6938, lon: 139.7034 },
  bunkyo: { lat: 35.7073, lon: 139.7528 },
  taito: { lat: 35.7126, lon: 139.7802 },
  sumida: { lat: 35.7107, lon: 139.8015 },
  koto: { lat: 35.6728, lon: 139.8174 },
  shinagawa: { lat: 35.6092, lon: 139.7302 },
  meguro: { lat: 35.6415, lon: 139.6981 },
  ota: { lat: 35.5612, lon: 139.7160 },
  setagaya: { lat: 35.6466, lon: 139.6532 },
  shibuya: { lat: 35.6620, lon: 139.7038 },
  nakano: { lat: 35.7074, lon: 139.6638 },
  suginami: { lat: 35.6995, lon: 139.6355 },
  toshima: { lat: 35.7263, lon: 139.7155 },
  kita: { lat: 35.7528, lon: 139.7336 },
  arakawa: { lat: 35.7360, lon: 139.7836 },
  itabashi: { lat: 35.7512, lon: 139.7093 },
  nerima: { lat: 35.7356, lon: 139.6516 },
  adachi: { lat: 35.7750, lon: 139.8044 },
  katsushika: { lat: 35.7436, lon: 139.8471 },
  edogawa: { lat: 35.7067, lon: 139.8673 }
};

let chartInstance = null;
let currentChartType = 'temp';
let globalHourlyData = null;

// ==========================================
// 初期化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initDate();
  
  const wardSelect = document.getElementById('ward-select');
  wardSelect.addEventListener('change', fetchAllData);

  const refreshBtn = document.getElementById('refresh-btn');
  refreshBtn.addEventListener('click', fetchAllData);

  // タブ切り替え
  document.querySelectorAll('.ctab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentChartType = e.target.getAttribute('data-chart');
      renderChart();
    });
  });

  fetchAllData();
});

function initDate() {
  const d = new Date();
  const week = ['日','月','火','水','木','金','土'];
  document.getElementById('header-date').innerText = 
    `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${week[d.getDay()]}）`;
  
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  document.getElementById('update-time').innerText = `${h}:${m} 更新`;
}

// ==========================================
// データ取得 API
// ==========================================
async function fetchAllData() {
  const wardKey = document.getElementById('ward-select').value;
  const coords = WARD_COORDS[wardKey];

  showLoader(true);

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=Asia%2FTokyo`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&current=pm10,pm2_5,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen&timezone=Asia%2FTokyo`;

    // 2つのAPIを同時にリクエストして待ち時間を半分に短縮
    const [resW, resA] = await Promise.all([
      fetch(weatherUrl),
      fetch(aqiUrl)
    ]);

    if (!resW.ok) {
      const errTxt = await resW.text();
      console.error('Weather API Error:', resW.status, errTxt);
      throw new Error(`Weather API Error: ${resW.status}`);
    }
    const wData = await resW.json();

    let aqData = null;
    if (resA.ok) {
      aqData = await resA.json();
    }


    updateUI(wData, aqData);
    
    // チャート用に保存
    globalHourlyData = wData.hourly;
    renderChart();

    showLoader(false);
    initDate(); // 更新時間をリフレッシュ

  } catch (error) {
    console.error(error);
    document.getElementById('weather-desc').innerText = "データ取得に失敗しました。";
    showLoader(false);
  }
}

function showLoader(show) {
  const loader = document.getElementById('loader');
  const app = document.getElementById('app');
  if (show) {
    loader.style.opacity = '1';
    loader.style.pointerEvents = 'auto';
    app.style.opacity = '0.5';
  } else {
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    app.style.opacity = '1';
  }
}

// ==========================================
// UI更新
// ==========================================
function updateUI(wData, aqData) {
  const cur = wData.current;
  const day = wData.daily;

  // --- HERO 左 ---
  const t = cur.temperature_2m;
  document.getElementById('current-temp').innerText = Math.round(t);
  document.getElementById('feels-like').innerText = Math.round(cur.apparent_temperature) + '°';
  document.getElementById('temp-max').innerText = Math.round(day.temperature_2m_max[0]) + '°';
  document.getElementById('temp-min').innerText = Math.round(day.temperature_2m_min[0]) + '°';

  // 天気コード解析
  const { label, icon, theme } = parseWeatherCode(cur.weather_code, cur.is_day);
  document.getElementById('weather-icon').innerText = icon;
  document.getElementById('weather-desc').innerText = label;
  document.body.setAttribute('data-weather', theme);

  // 挨拶
  const h = new Date().getHours();
  let greet = "こんにちは！";
  if (h < 5) greet = "こんばんは！";
  else if (h < 11) greet = "おはようございます！";
  else if (h < 18) greet = "こんにちは！";
  else greet = "こんばんは！";
  document.getElementById('greeting').innerText = greet;

  // 降水確率は hourly の直近24時間から最大値を取得
  const nowIdx = wData.hourly.time.findIndex(t => new Date(t) >= new Date());
  const startIdx = nowIdx > -1 ? nowIdx : 0;
  const rainProbs = wData.hourly.precipitation_probability.slice(startIdx, startIdx + 24);
  const maxRainProb = Math.max(...rainProbs, 0);

  // クイック統計
  document.getElementById('qs-rain').innerText = maxRainProb + '%';
  document.getElementById('qs-humidity').innerText = cur.relative_humidity_2m + '%';
  document.getElementById('qs-wind').innerText = cur.wind_speed_10m.toFixed(1) + ' m/s';
  document.getElementById('qs-wind-dir').innerText = getWindDir(cur.wind_direction_10m);
  document.getElementById('qs-uv').innerText = day.uv_index_max[0] ? day.uv_index_max[0].toFixed(1) : '--';

  // アドバイス
  const advice = generateAdvice(t, maxRainProb, day.uv_index_max[0]);
  document.getElementById('advice-text').innerText = advice;


  // --- 空気質 ---
  if (aqData && aqData.current) {
    const pm25 = aqData.current.pm2_5;
    const pm10 = aqData.current.pm10;
    
    document.getElementById('pm25-val').innerText = pm25.toFixed(1);
    document.getElementById('qs-pm25').innerText = pm25.toFixed(1);
    
    document.getElementById('pm10-val').innerText = pm10.toFixed(1);

    const p25Badge = getAQIBadge(pm25, [12, 35, 55]);
    const el25 = document.getElementById('pm25-badge');
    el25.innerText = p25Badge.lbl; el25.style.background = p25Badge.col;
    document.getElementById('qs-pm25-lv').innerText = p25Badge.lbl;

    const p10Badge = getAQIBadge(pm10, [20, 50, 100]);
    const el10 = document.getElementById('pm10-badge');
    el10.innerText = p10Badge.lbl; el10.style.background = p10Badge.col;

    // 花粉
    // APIではスギヒノキがひとまとめに無いので、birch/alderを合成
    const birch = (aqData.current.birch_pollen || 0) + (aqData.current.alder_pollen || 0);
    const grass = aqData.current.grass_pollen || 0;
    const ragweed = aqData.current.ragweed_pollen || 0;
    const mugwort = aqData.current.mugwort_pollen || 0;

    renderPollen('birch', birch);
    renderPollen('grass', grass);
    renderPollen('ragweed', ragweed);
    renderPollen('mugwort', mugwort);
  }

  // --- コーデ (HERO 右) ---
  const outfit = buildOutfit(day.temperature_2m_max[0], maxRainProb, day.uv_index_max[0], cur.weather_code);

  
  document.getElementById('outfit-badge').innerText = outfit.badge;
  document.getElementById('outfit-headline').innerText = outfit.headline;
  document.getElementById('outfit-temp-tag').innerText = outfit.tempTag;

  // 絵文字ストリップ
  const eStrip = document.getElementById('emoji-strip');
  eStrip.innerHTML = outfit.emojis.map(e => `
    <div class="estrip-item">
      <span class="estrip-icon">${e.i}</span>
      <span class="estrip-lbl">${e.n}</span>
    </div>
  `).join('');

  // カテゴリリスト
  const oCats = document.getElementById('outfit-cats');
  oCats.innerHTML = outfit.categories.map(c => `
    <div class="ocat-row">
      <div class="ocat-icon">${c.i}</div>
      <div class="ocat-info">
        <div class="ocat-name">${c.n}</div>
        <div class="ocat-val">${c.v}</div>
      </div>
    </div>
  `).join('');

  // 持ちもの
  const cSec = document.getElementById('carry-section');
  const cChips = document.getElementById('carry-chips');
  if (outfit.carry.length > 0) {
    cSec.style.display = 'block';
    cChips.innerHTML = outfit.carry.map(c => `<span class="c-chip">${c}</span>`).join('');
  } else {
    cSec.style.display = 'none';
  }

}

// ==========================================
// 女性向け コーデ生成ロジック
// (レインコート・長靴なし。雨は傘のみ)
// ==========================================
function buildOutfit(tempMax, rainProb, uv, wCode) {
  const isRain = rainProb >= 60 || [51,53,55,61,63,65,80,81,82,95,96,99].includes(wCode);
  const isHeavyRain = rainProb >= 80 || [63,65,81,82,95,96,99].includes(wCode);
  const isSnow = [71,73,75,77,85,86].includes(wCode);

  let res = {
    badge: '', headline: '', tempTag: `最高 ${Math.round(tempMax)}°C`,
    emojis: [], categories: [], carry: []
  };

  if (isRain) {
    res.badge = "☔ 雨の日";
    res.headline = `降水確率 ${rainProb}%。濡れにくいアイテムで`;
    res.emojis = [
      { i: tempMax >= 20 ? '🧥' : '🥼', n: '撥水アウター' },
      { i: isHeavyRain ? '☂️' : '🌂', n: isHeavyRain ? '長傘' : '折り畳み傘' },
      { i: '🎒', n: '防水バッグ' },
      { i: '👟', n: '撥水スニーカー' }
    ];
    res.categories = [
      { i: '🧥', n: 'アウター', v: tempMax >= 20 ? '薄手の撥水ジャケット' : '撥水加工のトレンチ / コート' },
      { i: '👚', n: 'トップス', v: tempMax >= 20 ? 'さらっとしたブラウス' : '薄手ニット' },
      { i: '👖', n: 'ボトムス', v: 'ダークカラーの速乾パンツ (裾が広がらないもの)' },
      { i: '👟', n: 'シューズ', v: '撥水スニーカー or 水に強いローファー' }
    ];
    res.carry = isHeavyRain ? ['長傘（必須）', 'ハンカチ・タオル', '替えの靴下'] : ['折り畳み傘', 'ウェットティッシュ'];
  } else if (tempMax >= 28) {
    res.badge = "☀️ 猛暑";
    res.headline = "とにかく涼しく！UV対策も万全に";
    res.emojis = [ { i: '👒', n: '帽子' }, { i: '🕶️', n: 'サングラス' }, { i: '👗', n: 'ワンピース' }, { i: '👡', n: 'サンダル' }, { i: '🌂', n: '日傘' } ];
    res.categories = [
      { i: '🧥', n: 'アウター', v: '基本不要 (冷房対策に薄手カーディガン)' },
      { i: '👚', n: 'トップス', v: 'ノースリーブ or 通気性の良いTシャツ' },
      { i: '👖', n: 'ボトムス', v: 'リネンパンツ or ふんわりスカート' },
      { i: '👟', n: 'シューズ', v: '涼しげなサンダル' }
    ];
    res.carry = ['日傘', '日焼け止め', '汗拭きシート', '飲み物'];
  } else if (tempMax >= 22) {
    res.badge = "🌤️ 温暖";
    res.headline = "軽やかな服装で快適に過ごせます";
    res.emojis = [ { i: '🧥', n: 'カーデ' }, { i: '👚', n: 'ブラウス' }, { i: '👖', n: 'デニム' }, { i: '👟', n: 'スニーカー' } ];
    res.categories = [
      { i: '🧥', n: 'アウター', v: '薄手カーディガン or デニムジャケット' },
      { i: '👚', n: 'トップス', v: '長袖ブラウス or カットソー' },
      { i: '👖', n: 'ボトムス', v: 'ワイドパンツ or フレアスカート' },
      { i: '👟', n: 'シューズ', v: '歩きやすいスニーカー or パンプス' }
    ];
    res.carry = uv > 5 ? ['日傘', '日焼け止め'] : ['折り畳み傘(念のため)'];
  } else if (tempMax >= 15) {
    res.badge = "🍃 快適";
    res.headline = "重ね着で体温調節しやすいスタイルを";
    res.emojis = [ { i: '🧥', n: 'ジャケット' }, { i: '👚', n: 'シャツ' }, { i: '👖', n: 'スラックス' }, { i: '👜', n: 'バッグ' } ];
    res.categories = [
      { i: '🧥', n: 'アウター', v: 'ライトジャケット or トレンチコート' },
      { i: '👚', n: 'トップス', v: '薄手ニット or コットンシャツ' },
      { i: '👖', n: 'ボトムス', v: 'スラックス or ミディ丈スカート' },
      { i: '👟', n: 'シューズ', v: 'ローファー or フラットシューズ' }
    ];
    res.carry = ['ストール', 'リップクリーム'];
  } else if (tempMax >= 8) {
    res.badge = "🍂 肌寒い";
    res.headline = "冬物アウターと暖かインナーの出番";
    res.emojis = [ { i: '🧥', n: 'コート' }, { i: '🧣', n: 'マフラー' }, { i: '🧶', n: 'ニット' }, { i: '🥾', n: 'ブーツ' } ];
    res.categories = [
      { i: '🧥', n: 'アウター', v: 'ウールコート or キルティングジャケット' },
      { i: '👚', n: 'トップス', v: '厚手ニット + あったかインナー' },
      { i: '👖', n: 'ボトムス', v: '厚手素材のパンツ or タイツ+スカート' },
      { i: '👟', n: 'シューズ', v: 'ショートブーツ' }
    ];
    res.carry = ['マフラー', 'カイロ'];
  } else {
    res.badge = "❄️ 極寒";
    res.headline = "厳しい寒さ。完全防寒で暖かく！";
    res.emojis = [ { i: '🧥', n: 'ダウン' }, { i: '🧣', n: 'マフラー' }, { i: '🧤', n: '手袋' }, { i: '🥾', n: 'ロングブーツ' } ];
    res.categories = [
      { i: '🧥', n: 'アウター', v: 'ロングダウン or 厚手ウールコート' },
      { i: '👚', n: 'トップス', v: 'タートルネックニット + 極暖インナー' },
      { i: '👖', n: 'ボトムス', v: '裏起毛パンツ or 厚手タイツ重ね穿き' },
      { i: '👟', n: 'シューズ', v: '防寒ブーツ' }
    ];
    res.carry = ['マフラー', '手袋', 'カイロ', '保湿クリーム'];
  }

  if (isSnow && !isRain) {
    res.badge = "⛄ 雪";
    res.carry.push('滑りにくい靴');
  }

  return res;
}

// ==========================================
// ユーティリティ
// ==========================================
function parseWeatherCode(c, isDay) {
  let label = "不明", icon = "☁️", theme = "cloudy";
  if (c === 0) { label = "快晴"; icon = isDay ? "☀️" : "🌙"; theme = "sunny"; }
  else if (c === 1 || c === 2) { label = "晴れ時々曇り"; icon = isDay ? "⛅" : "☁️"; theme = "cloudy"; }
  else if (c === 3) { label = "曇り"; icon = "☁️"; theme = "cloudy"; }
  else if (c >= 45 && c <= 48) { label = "霧"; icon = "🌫️"; theme = "cloudy"; }
  else if (c >= 51 && c <= 55) { label = "霧雨"; icon = "🌧️"; theme = "rain"; }
  else if (c >= 61 && c <= 65) { label = "雨"; icon = "☔"; theme = "rain"; }
  else if (c >= 71 && c <= 77) { label = "雪"; icon = "⛄"; theme = "cloudy"; }
  else if (c >= 80 && c <= 82) { label = "にわか雨"; icon = "🌦️"; theme = "rain"; }
  else if (c >= 85 && c <= 86) { label = "雪あられ"; icon = "🌨️"; theme = "cloudy"; }
  else if (c >= 95) { label = "雷雨"; icon = "⛈️"; theme = "rain"; }
  return { label, icon, theme };
}

function getWindDir(deg) {
  const dirs = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
  return dirs[Math.round(deg / 22.5) % 16] + "の風";
}

function generateAdvice(temp, rainProb, uv) {
  if (rainProb >= 80) return "今日は強い雨の予報です。足元に気をつけて。";
  if (rainProb >= 50) return "雨具が必須の1日になりそうです。";
  if (uv >= 6) return "紫外線が強いです。しっかりUV対策を。";
  if (temp >= 30) return "真夏日です。こまめな水分補給を心がけましょう。";
  if (temp <= 5) return "冷え込みが厳しいです。暖かくしてお出かけを。";
  return "お出かけにはまずまずの天気です。";
}

function getAQIBadge(val, thresholds) {
  if (val <= thresholds[0]) return { lbl: '良好', col: '#10b981' };
  if (val <= thresholds[1]) return { lbl: '普通', col: '#f59e0b' };
  if (val <= thresholds[2]) return { lbl: '注意', col: '#ef4444' };
  return { lbl: '危険', col: '#7f1d1d' };
}

function renderPollen(id, val) {
  // val: 0~100程度を想定して 4段階評価
  let level = 0, lbl = '少';
  if (val > 1) { level = 1; lbl = 'やや多'; }
  if (val > 10) { level = 2; lbl = '多'; }
  if (val > 50) { level = 3; lbl = '非常に多'; }

  const dotsWrap = document.getElementById(`${id}-dots`);
  const lblEl = document.getElementById(`${id}-label`);
  if (!dotsWrap) return;

  dotsWrap.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = `dot ${i <= level ? 'active' : ''}`;
    dotsWrap.appendChild(d);
  }
  lblEl.innerText = lbl;
  lblEl.style.color = level >= 2 ? '#ef4444' : 'var(--text-main)';
}

// ==========================================
// チャート描画 (Chart.js)
// ==========================================
function renderChart() {
  if (!globalHourlyData) return;
  
  // 今の時間から24時間分抽出
  const nowIdx = globalHourlyData.time.findIndex(t => new Date(t) >= new Date());
  const startIdx = nowIdx > -1 ? nowIdx : 0;
  
  const labels = globalHourlyData.time.slice(startIdx, startIdx + 24).map(t => {
    return new Date(t).getHours() + '時';
  });

  let data = [];
  let bgColor, borderColor, labelName;

  if (currentChartType === 'temp') {
    data = globalHourlyData.temperature_2m.slice(startIdx, startIdx + 24);
    labelName = '気温 (°C)';
    borderColor = '#3b82f6';
    bgColor = 'rgba(59, 130, 246, 0.2)';
  } else if (currentChartType === 'rain') {
    data = globalHourlyData.precipitation_probability.slice(startIdx, startIdx + 24);
    labelName = '降水確率 (%)';
    borderColor = '#8b5cf6';
    bgColor = 'rgba(139, 92, 246, 0.2)';
  } else if (currentChartType === 'wind') {
    data = globalHourlyData.wind_speed_10m.slice(startIdx, startIdx + 24);
    labelName = '風速 (m/s)';
    borderColor = '#10b981';
    bgColor = 'rgba(16, 185, 129, 0.2)';
  }

  const ctx = document.getElementById('forecast-chart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', sans-serif";

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: labelName,
        data: data,
        borderColor: borderColor,
        backgroundColor: bgColor,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13 },
          bodyFont: { size: 14, weight: 'bold' },
          padding: 10,
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { maxTicksLimit: 8 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
          beginAtZero: currentChartType !== 'temp',
          max: currentChartType === 'rain' ? 100 : undefined
        }
      }
    }
  });
}
