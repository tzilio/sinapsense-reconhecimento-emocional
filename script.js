(() => {
  // === Constantes e referências de DOM ===
  const emotionColors = {
    Angry: '#e74c3c',
    Fearful: '#c0392b',
    Happy: '#f39c12',
    Surprised: '#f1c40f',
    Sad: '#2ecc71',
    Disgusted: '#27ae60',
    Neutral: '#3498db'
  };
  const emotionOrder = ['Angry', 'Fearful', 'Happy', 'Surprised', 'Sad', 'Disgusted', 'Neutral'];

  const DOM = {
    videoPlayer: document.getElementById('videoPlayer'),
    timeSlider: document.getElementById('timeSlider'),
    currentTimeDisplay: document.getElementById('currentTime'),
    totalTimeDisplay: document.getElementById('totalTime'),
    currentEmotionDisplay: document.getElementById('currentEmotion'),
    emotionDetails: document.getElementById('emotionDetails'),
    personList: document.getElementById('personList'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    videoContainer: document.getElementById('videoContainer'),
    showAverageBtn: document.getElementById('showAverageBtn'),
    chartSelector: document.getElementById('chartSelector'),
    csvFile: document.getElementById('csvFile'),
    videoFile: document.getElementById('videoFile'),
    barCanvas: document.getElementById('barChart').getContext('2d'),
    lineCanvas: document.getElementById('timelineChart').getContext('2d'),
    radarCanvas: document.getElementById('radarChart').getContext('2d')
  };

  // === Estado ===
  let allEmotionData = {};
  let currentEmotionData = [];
  let showingAverage = false;
  let barChart, timelineChart, radarChart;

  // === Inicialização ===
  function init() {
    setupCharts();
    setupEventListeners();
    checkFiles();
    showChart('bar');
  }
  document.addEventListener('DOMContentLoaded', init);

  // === Configuração de Gráficos ===
  function setupCharts() {
    setupBarChart();
    setupTimelineChart();
    setupRadarChart();
  }

  function setupBarChart() {
    barChart = new Chart(DOM.barCanvas, {
      type: 'bar',
      data: {
        labels: emotionOrder,
        datasets: [{
          label: 'Intensidade da Emoção (%)',
          data: Array(emotionOrder.length).fill(0),
          backgroundColor: emotionOrder.map(e => emotionColors[e]),
          borderColor: emotionOrder.map(e => darkenColor(emotionColors[e], 20)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: 'Emoções' } },
          y: { beginAtZero: true, max: 100, title: { display: true, text: 'Intensidade (%)' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.raw.toFixed(1)}%`
            }
          }
        }
      }
    });
  }

  function setupTimelineChart() {
    timelineChart = new Chart(DOM.lineCanvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: emotionOrder.map(e => ({
          label: e,
          data: [],
          fill: false,
          borderColor: emotionColors[e],
          tension: 0.2,
          pointRadius: 0
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: 'Tempo (s)' } },
          y: { min: 0, max: 1, title: { display: true, text: 'Intensidade' } }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(1)}%`
            }
          }
        }
      }
    });
  }

  function setupRadarChart() {
    radarChart = new Chart(DOM.radarCanvas, {
      type: 'radar',
      data: {
        labels: emotionOrder,
        datasets: [{
          label: '',
          data: Array(emotionOrder.length).fill(0),
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderColor: '#3498db',
          pointBackgroundColor: '#3498db',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 1,
            ticks: { stepSize: 0.2 },
            pointLabels: { font: { size: 14 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${(ctx.raw * 100).toFixed(1)}%`
            }
          }
        }
      }
    });
  }

  // === Eventos ===
  function setupEventListeners() {
    DOM.csvFile.addEventListener('change', checkFiles);
    DOM.videoFile.addEventListener('change', checkFiles);
    DOM.analyzeBtn.addEventListener('click', onAnalyze);
    DOM.showAverageBtn.addEventListener('click', toggleAverage);
    DOM.chartSelector.addEventListener('change', e => showChart(e.target.value));

    DOM.videoPlayer.addEventListener('loadedmetadata', () => {
      DOM.totalTimeDisplay.textContent = formatTime(DOM.videoPlayer.duration);
    });
    DOM.videoPlayer.addEventListener('timeupdate', () => {
      const ct = DOM.videoPlayer.currentTime;
      DOM.timeSlider.value = (ct / DOM.videoPlayer.duration) * 100;
      DOM.currentTimeDisplay.textContent = formatTime(ct);
      updateCharts(currentEmotionData, ct);
    });
    DOM.timeSlider.addEventListener('input', () => {
      const seek = (DOM.timeSlider.value / 100) * DOM.videoPlayer.duration;
      DOM.videoPlayer.currentTime = seek;
    });
  }

  // === Funções de Controle de Arquivos ===
  function checkFiles() {
    const ok = DOM.csvFile.files.length && DOM.videoFile.files.length;
    DOM.analyzeBtn.disabled = !ok;
  }

  function onAnalyze() {
    if (!DOM.csvFile.files.length) return alert('Selecione um arquivo CSV.');
    if (!DOM.videoFile.files.length) return alert('Selecione um vídeo.');

    const reader = new FileReader();
    reader.onload = e => {
      if (processCSV(e.target.result)) {
        DOM.videoPlayer.src = URL.createObjectURL(DOM.videoFile.files[0]);
        DOM.videoContainer.style.display = 'block';
      }
    };
    reader.readAsText(DOM.csvFile.files[0]);
  }

  // === Processamento de CSV ===
  function processCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const names = ['Neutral','Happy','Sad','Angry','Disgusted','Surprised','Fearful'];

    allEmotionData = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(v => v.trim());
      if (cols.length < headers.length) continue;

      const entry = headers.reduce((obj, h, idx) => (obj[h]=cols[idx], obj), {});
      const id = entry.Id || `Pessoa_${i}`;
      const series = names.reduce((s, em) => {
        s[em] = (entry[em]||'').split(';').map(parseFloat);
        return s;
      }, {});

      const max = Math.max(...Object.values(series).map(arr => arr.length));
      allEmotionData[id] = Array.from({length: max}, (_, t) => {
        const emos = {};
        names.forEach(em => emos[em] = series[em][t] || 0);
        return { timestamp: t, emotions: emos };
      });
    }

    renderPersonList();
    return true;
  }

  // === Lista de Pessoas e Média ===
  function renderPersonList() {
    DOM.personList.innerHTML = '';
    const ids = Object.keys(allEmotionData);
    if (!ids.length) {
      DOM.personList.innerHTML = '<p>Nenhuma pessoa encontrada</p>';
      DOM.showAverageBtn.disabled = true;
      return;
    }
    DOM.showAverageBtn.disabled = false;

    ids.forEach(id => {
      const div = document.createElement('div');
      div.className = 'person-item';
      div.textContent = `Pessoa ${id}`;
      div.onclick = () => {
        document.querySelectorAll('.person-item').forEach(el => el.classList.remove('active'));
        div.classList.add('active');
        showingAverage = false;
        DOM.showAverageBtn.textContent = 'Mostrar Média de Todas as Pessoas';
        loadPerson(id);
      };
      DOM.personList.appendChild(div);
    });

    // Seleciona a primeira
    DOM.personList.firstChild.classList.add('active');
    loadPerson(ids[0]);
  }

  function loadPerson(id) {
    currentEmotionData = allEmotionData[id];
    updateCharts(currentEmotionData, 0);
  }

  function toggleAverage() {
    if (showingAverage) {
      const active = document.querySelector('.person-item.active');
      if (active) loadPerson(active.textContent.replace('Pessoa ',''));
      DOM.showAverageBtn.textContent = 'Mostrar Média de Todas as Pessoas';
    } else {
      currentEmotionData = calculateAverage();
      updateCharts(currentEmotionData, 0);
      document.querySelectorAll('.person-item').forEach(el => el.classList.remove('active'));
      DOM.showAverageBtn.textContent = 'Voltar para Pessoa Selecionada';
    }
    showingAverage = !showingAverage;
  }

  function calculateAverage() {
    const ids = Object.keys(allEmotionData);
    const max = Math.max(...ids.map(id => allEmotionData[id].length));
    const avg = [];
    for (let t = 0; t < max; t++) {
      const sum = emotionOrder.reduce((o,e) => (o[e]=0,o), {});
      let cnt = 0;
      ids.forEach(id => {
        if (t < allEmotionData[id].length) {
          const emos = allEmotionData[id][t].emotions;
          emotionOrder.forEach(e => sum[e] += emos[e]);
          cnt++;
        }
      });
      avg.push({ timestamp: t, emotions: emotionOrder.reduce((o,e) => (o[e]=sum[e]/cnt, o), {}) });
    }
    return avg;
  }

  // === Atualização dos Gráficos e Detalhes ===
  function updateCharts(data, time) {
    if (!data.length) return;

    const idx = Math.min(Math.floor(time), data.length - 1);
    const emos = data[idx].emotions;
    const values = emotionOrder.map(e => (emos[e] || 0) * 100);

    // Barra
    barChart.data.datasets[0].data = values;
    barChart.update();

    // Emoção dominante
    const maxVal = Math.max(...values);
    const dom = emotionOrder[values.indexOf(maxVal)];
    DOM.currentEmotionDisplay.textContent = `${dom} (${maxVal.toFixed(1)}%)`;
    DOM.currentEmotionDisplay.style.backgroundColor = `${emotionColors[dom]}40`;
    DOM.currentEmotionDisplay.style.color = getContrastColor(emotionColors[dom]);

    // Detalhes
    renderEmotionDetails(emos);

    // Timeline
    timelineChart.data.labels = data.map(d => d.timestamp);
    emotionOrder.forEach((e, i) => {
      timelineChart.data.datasets[i].data = data.map(d => d.emotions[e]);
    });
    timelineChart.update();

    // Radar
    radarChart.data.datasets[0].data = emotionOrder.map(e => emos[e]);
    radarChart.update();
  }

  function renderEmotionDetails(emos) {
    DOM.emotionDetails.innerHTML = '';
    Object.entries(emos)
      .sort((a,b) => b[1] - a[1])
      .forEach(([e,v]) => {
        const div = document.createElement('div');
        div.innerHTML = `
          <div>${e}: ${(v * 100).toFixed(1)}%</div>
          <div class="emotion-bar">
            <div class="emotion-fill" style="width:${v * 100}%;background-color:${emotionColors[e]};"></div>
          </div>`;
        DOM.emotionDetails.appendChild(div);
      });
  }

  // === Utilitários ===
  function showChart(type) {
    ['bar','timeline','radar'].forEach(t => {
      document.getElementById(`${t}Chart`).style.display = t === type ? 'block' : 'none';
    });
  }

  function formatTime(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  }

  function darkenColor(hex, pct) {
    const num = parseInt(hex.slice(1),16);
    const amt = Math.round(2.55 * pct);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0xff) - amt;
    const B = (num & 0xff) - amt;
    return '#' + (0x1000000 + (R<0?0:R)*0x10000 + (G<0?0:G)*0x100 + (B<0?0:B)).toString(16).slice(1);
  }

  function getContrastColor(hex) {
    const r = parseInt(hex.substr(1,2),16),
          g = parseInt(hex.substr(3,2),16),
          b = parseInt(hex.substr(5,2),16),
          lum = (0.299*r + 0.587*g + 0.114*b)/255;
    return lum > 0.5 ? '#000':'#fff';
  }
})();
