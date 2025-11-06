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
            x: {
            title: { display: true, text: 'Tempo (s)' },
            ticks: {
                // Usa os rótulos (segundos) para renderizar em mm:ss
                callback: (value, idx) => {
                const sec = this.getLabelForValue ? this.getLabelForValue(value) : (timelineChart.data.labels[idx] || 0);
                const s = Math.max(0, Number(sec) || 0);
                const mm = Math.floor(s / 60).toString().padStart(2, '0');
                const ss = Math.floor(s % 60).toString().padStart(2, '0');
                return `${mm}:${ss}`;
                }
            }
            },
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
        const transformed = transformCSV(e.target.result);
        if (processCSV(transformed)) {
            DOM.videoPlayer.src = URL.createObjectURL(DOM.videoFile.files[0]);
            DOM.videoContainer.style.display = 'block';
        }
    };

    reader.readAsText(DOM.csvFile.files[0]);
  }

    // === Porta do transform_csv.py para JS ===
    // Converte CSV "cru" (colunas Neutral..Fearful com 'v1;v2;...') para formato longo:
    // [Id..Contador, Emocao, T_1..T_n], separador ';'
    function transformCSV(inputText) {
        const raw = (inputText || '').replace(/\r/g, '').trim();
        if (!raw) return raw;

        // Detecta delimitador do CSV de entrada (originalmente era ',')
        const first = raw.split('\n')[0] || '';
        const inDelim = (first.split(',').length >= first.split(';').length) ? ',' : ';';

        const lines = raw.split('\n');
        const headers = (lines[0] || '').split(inDelim).map(h => h.trim());

        // Mesmas listas do seu script Python
        const idCols = ['Id','Ip','Data-Hora','Nome','Etapas','Amostra','Cod','Contador'];
        const emoCols = ['Neutral','Happy','Sad','Angry','Disgusted','Surprised','Fearful'];

        // Se já estiver em formato longo (tem 'Emocao' e alguma 'T_1'), não transforma
        const alreadyLong = headers.includes('Emocao') && headers.some(h => /^T_\d+$/i.test(h));
        if (alreadyLong) return raw;

        // Carrega linhas em objetos simples
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;
            const cols = line.split(inDelim);
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = (cols[idx] ?? '').trim(); });
            rows.push(obj);
        }

        // Derrete (melt) do Python: para cada row, criamos várias linhas — uma por emoção
        // e guardamos a string 'Valores_Str' para fazer o split por ';'
        const melted = [];
        rows.forEach(r => {
            emoCols.forEach(em => {
            if (!headers.includes(em)) return; // ignora se a coluna não existir
            const valoresStr = String(r[em] ?? '').trim().replace(/;+$/,''); // strip ';' final
            const rec = {};
            idCols.forEach(k => { rec[k] = (r[k] != null ? String(r[k]).trim() : ''); });
            rec.Emocao = em;
            rec.Valores_Str = valoresStr;
            melted.push(rec);
            });
        });

        // Divide 'Valores_Str' por ';' para virar T_1..T_n
        // O Python cria tantas colunas quanto o MAIOR comprimento encontrado
        let maxT = 0;
        const splitted = melted.map(rec => {
            const vec = (rec.Valores_Str ? rec.Valores_Str.split(';') : []);
            maxT = Math.max(maxT, vec.length);
            return { rec, vec };
        });

        // Cabeçalho de saída (ordem = idCols + 'Emocao' + T_1..T_n)
        const outDelim = ';';
        const tHeaders = Array.from({ length: maxT }, (_, i) => 'T_' + (i + 1));
        const outHeaders = [...idCols, 'Emocao', ...tHeaders];
        const out = [outHeaders.join(outDelim)];

        // Linhas de saída: mantém 'Contador' do CSV original (igual ao Python)
        splitted.forEach(({ rec, vec }) => {
            const base = idCols.map(k => {
            const v = rec[k] ?? '';
            return /[;"\n,]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
            });
            base.push(rec.Emocao);

            // Preenche T_1..T_n (string crua; seu processCSV depois converte para número)
            for (let i = 0; i < maxT; i++) {
            const v = vec[i] != null ? String(vec[i]).trim() : '';
            base.push(v);
            }
            out.push(base.join(outDelim));
        });

        return out.join('\n');
    }


  // === Processamento de CSV ===
    function processCSV(text) {
    const raw = text.trim().replace(/\r/g, '');
    const firstLine = raw.split('\n')[0] || '';
    const delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

    const lines = raw.split('\n');
    const headers = lines[0].split(delim).map(h => h.trim());
    const isLong = headers.includes('Emocao') && headers.some(h => /^T_\d+$/i.test(h));

    allEmotionData = {};

    if (isLong) {
        // Formato "longo": uma linha por emoção da pessoa, colunas T_1..T_n com os valores
        const tCols = headers
        .filter(h => /^T_\d+$/i.test(h))
        .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const cols = line.split(delim);
        if (cols.length < headers.length) continue;

        const row = {};
        headers.forEach((h, idx) => { row[h] = (cols[idx] ?? '').trim(); });
        rows.push(row);
        }

        // Agrupa por pessoa (Nome > Id)
        const grouped = {};
        rows.forEach(r => {
        const pid = r.Id || 'Pessoa';
        const emo = (r.Emocao || r.Emotion || '').trim(); // já vem em inglês no seu CSV
        if (!grouped[pid]) grouped[pid] = {};
        grouped[pid][emo] = tCols.map(c => {
            const v = String(r[c] ?? '').replace(',', '.');
            const num = parseFloat(v);
            return Number.isFinite(num) ? num : 0;
        });
        });

        // Constrói a série por pessoa no formato { timestamp, emotions: {Angry:..., ...} }
        Object.entries(grouped).forEach(([pid, emosByName]) => {
        const len = Math.max(...Object.values(emosByName).map(arr => arr.length));
        allEmotionData[pid] = Array.from({ length: len }, (_, idx) => {
            const emos = {};
            emotionOrder.forEach(e => {
            const arr = emosByName[e];
            emos[e] = arr ? (arr[idx] ?? 0) : 0;
            });
            return { timestamp: idx, emotions: emos };
        });
        });
    } else {
        // Fallback: "largo" (uma linha por pessoa e colunas Neutral/Happy/... contendo "v1;v2;v3")
        const names = ['Neutral', 'Happy', 'Sad', 'Angry', 'Disgusted', 'Surprised', 'Fearful'];
        for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delim).map(v => v.trim());
        if (cols.length < headers.length) continue;

        const entry = headers.reduce((obj, h, idx) => (obj[h] = cols[idx], obj), {});
        const id = entry.Nome || entry.Id || `Pessoa_${i}`;
        const series = names.reduce((s, em) => {
            s[em] = (entry[em] || '').split(';').map(x => {
            const num = parseFloat(String(x).replace(',', '.'));
            return Number.isFinite(num) ? num : 0;
            });
            return s;
        }, {});

        const max = Math.max(...Object.values(series).map(arr => arr.length));
        allEmotionData[id] = Array.from({ length: max }, (_, t) => {
            const emos = {};
            names.forEach(em => { emos[em] = series[em][t] || 0; });
            return { timestamp: t, emotions: emos };
        });
        }
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
    function updateCharts(data, timeSec) {
        if (!data.length) return;

        const dur = (Number.isFinite(DOM.videoPlayer.duration) && DOM.videoPlayer.duration > 0)
            ? DOM.videoPlayer.duration
            : data.length;

        // Mapeia [0..dur] -> [0..data.length-1]
        const idx = Math.min(
            Math.floor((timeSec / dur) * (data.length - 1)),
            data.length - 1
        );

        const emos = data[idx].emotions;
        const values = emotionOrder.map(e => (emos[e] || 0) * 100);

        // Barras
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

        // Timeline: rótulos agora são os segundos reais
        const len = data.length;
        const labelsSeconds = Array.from({ length: len }, (_, i) => (i / Math.max(1, len - 1)) * dur);
        timelineChart.data.labels = labelsSeconds;
        emotionOrder.forEach((e, i) => {
            timelineChart.data.datasets[i].data = data.map(d => d.emotions[e]);
        });
        timelineChart.update();

        // Radar (valores 0..1)
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
