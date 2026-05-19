/**
 * 彩票走势分析站
 */

const LOTTERY_TYPES = {
  ssq: {
    id: 'ssq',
    name: '双色球',
    zones: [
      { key: 'main', label: '红', min: 1, max: 33, count: 6, ballClass: 'red' },
      { key: 'extra', label: '蓝', min: 1, max: 16, count: 1, ballClass: 'blue' }
    ],
    hasTrendChart: true,
    sumRange: [21, 183]
  },
  dlt: {
    id: 'dlt',
    name: '大乐透',
    zones: [
      { key: 'front', label: '前', min: 1, max: 35, count: 5, ballClass: 'red' },
      { key: 'back', label: '后', min: 1, max: 12, count: 2, ballClass: 'blue' }
    ],
    hasTrendChart: false,
    sumRange: [15, 165]
  },
  fc3d: {
    id: 'fc3d',
    name: '福彩3D',
    digits: { count: 3, min: 0, max: 9 },
    hasTrendChart: false
  },
  pl3: {
    id: 'pl3',
    name: '排列三',
    digits: { count: 3, min: 0, max: 9 },
    hasTrendChart: false
  }
};

class LotteryApp {
  constructor() {
    this.currentType = 'ssq';
    this.currentTab = 'query';
    this.filterIssue = '';
    this.data = window.LOTTERY_DATA || {};
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderAll();
  }

  getConfig() {
    return LOTTERY_TYPES[this.currentType];
  }

  getDraws() {
    const draws = this.data[this.currentType] || [];
    return [...draws].sort((a, b) => String(b.issue).localeCompare(String(a.issue)));
  }

  getFilteredDraws() {
    let draws = this.getDraws();
    if (this.filterIssue.trim()) {
      const q = this.filterIssue.trim();
      draws = draws.filter(d => String(d.issue).includes(q));
    }
    return draws;
  }

  bindEvents() {
    document.querySelectorAll('.lottery-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentType = btn.dataset.type;
        document.querySelectorAll('.lottery-tab').forEach(b => b.classList.toggle('active', b === btn));
        this.renderAll();
      });
    });

    document.querySelectorAll('.feature-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
        document.querySelectorAll('.feature-tab').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    document.getElementById('btnQueryFilter').addEventListener('click', () => {
      this.filterIssue = document.getElementById('filterIssue').value;
      this.renderQuery();
    });

    document.getElementById('btnQueryReset').addEventListener('click', () => {
      this.filterIssue = '';
      document.getElementById('filterIssue').value = '';
      this.renderQuery();
    });

    document.getElementById('queryPageSize').addEventListener('change', () => this.renderQuery());

    document.getElementById('btnTrendRefresh').addEventListener('click', () => this.renderTrend());
    document.getElementById('trendPeriods').addEventListener('change', () => this.renderTrend());
    document.getElementById('trendMetric').addEventListener('change', () => this.renderTrend());

    document.getElementById('statsPeriods').addEventListener('change', () => this.renderStats());

    document.getElementById('btnRandom1').addEventListener('click', () => this.renderPicker(1));
    document.getElementById('btnRandom5').addEventListener('click', () => this.renderPicker(5));
    document.getElementById('btnCopyPick').addEventListener('click', () => this.copyPicker());
    document.getElementById('btnFilterPick').addEventListener('click', () => this.filterPick());
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${tab}`).classList.add('active');
    if (tab === 'trend') this.renderTrend();
    if (tab === 'stats') this.renderStats();
  }

  renderAll() {
    this.updateFooter();
    this.toggleTrendUI();
    this.renderQuery();
    if (this.currentTab === 'trend') this.renderTrend();
    if (this.currentTab === 'stats') this.renderStats();
    document.getElementById('pickerResult').innerHTML =
      '<span class="picker-placeholder">点击下方按钮生成号码</span>';
    document.getElementById('pickerFilterBox').classList.toggle(
      'hidden',
      !['ssq', 'dlt'].includes(this.currentType)
    );
  }

  updateFooter() {
    const cfg = this.getConfig();
    const draws = this.getDraws();
    document.getElementById('footerLottery').textContent = cfg.name;
    document.getElementById('footerCount').textContent = draws.length;
  }

  toggleTrendUI() {
    const isSsq = this.currentType === 'ssq';
    document.getElementById('trendSsqWrap').classList.toggle('hidden', !isSsq);
    document.getElementById('trendGenericWrap').classList.toggle('hidden', isSsq);
    document.querySelectorAll('.ssq-metric-label').forEach(el => {
      el.classList.toggle('hidden', !isSsq);
    });
  }

  pad(n) {
    return String(n).padStart(2, '0');
  }

  formatBalls(draw) {
    const cfg = this.getConfig();
    if (cfg.digits) {
      return draw.numbers.digits.map(d =>
        `<span class="ball digit">${d}</span>`
      ).join('');
    }
    const parts = [];
    cfg.zones.forEach((zone, i) => {
      if (i > 0) parts.push('<span class="ball-sep">+</span>');
      const nums = draw.numbers[zone.key] || [];
      nums.forEach(n => {
        parts.push(`<span class="ball ${zone.ballClass} ball-mini">${this.pad(n)}</span>`);
      });
    });
    return parts.join('');
  }

  formatBallsLarge(draw) {
    const cfg = this.getConfig();
    if (cfg.digits) {
      return draw.numbers.digits.map(d =>
        `<span class="ball digit">${d}</span>`
      ).join('');
    }
    const parts = [];
    cfg.zones.forEach((zone, i) => {
      if (i > 0) parts.push('<span class="ball-sep">+</span>');
      (draw.numbers[zone.key] || []).forEach(n => {
        parts.push(`<span class="ball ${zone.ballClass}">${this.pad(n)}</span>`);
      });
    });
    return parts.join('');
  }

  calcSum(draw) {
    const cfg = this.getConfig();
    if (cfg.digits) {
      return draw.numbers.digits.reduce((a, b) => a + b, 0);
    }
    const main = draw.numbers.main || draw.numbers.front || [];
    return main.reduce((a, b) => a + b, 0);
  }

  calcSpan(draw) {
    const cfg = this.getConfig();
    if (cfg.digits) {
      const d = draw.numbers.digits;
      return Math.max(...d) - Math.min(...d);
    }
    const main = draw.numbers.main || draw.numbers.front || [];
    return Math.max(...main) - Math.min(...main);
  }

  calcOddCount(draw) {
    const cfg = this.getConfig();
    const nums = cfg.digits
      ? draw.numbers.digits
      : (draw.numbers.main || draw.numbers.front || []);
    return nums.filter(n => n % 2 === 1).length;
  }

  // ========== 开奖查询 ==========
  renderQuery() {
    const draws = this.getFilteredDraws();
    const limit = parseInt(document.getElementById('queryPageSize').value, 10);
    const list = draws.slice(0, limit);

    if (draws.length > 0) {
      const latest = draws[0];
      document.getElementById('latestIssue').textContent = `第 ${latest.issue} 期`;
      document.getElementById('latestDate').textContent = latest.date;
      document.getElementById('latestBalls').innerHTML = this.formatBallsLarge(latest);
    } else {
      document.getElementById('latestIssue').textContent = '暂无数据';
      document.getElementById('latestDate').textContent = '—';
      document.getElementById('latestBalls').innerHTML = '';
    }

    const cfg = this.getConfig();
    const head = document.getElementById('drawTableHead');
    const body = document.getElementById('drawTableBody');

    if (cfg.digits) {
      head.innerHTML = '<tr><th>期号</th><th>日期</th><th>开奖号码</th><th>和值</th><th>跨度</th></tr>';
      body.innerHTML = list.map(d => `
        <tr>
          <td>${d.issue}</td>
          <td>${d.date}</td>
          <td><div class="balls-cell">${this.formatBalls(d)}</div></td>
          <td>${this.calcSum(d)}</td>
          <td>${this.calcSpan(d)}</td>
        </tr>
      `).join('');
    } else {
      const zoneHeaders = cfg.zones.map(z => z.label + '球').join('</th><th>');
      head.innerHTML = `<tr><th>期号</th><th>日期</th><th>${zoneHeaders}</th><th>和值</th></tr>`;
      body.innerHTML = list.map(d => {
        const zoneCells = cfg.zones.map(z => {
          const nums = (d.numbers[z.key] || []).map(n => this.pad(n)).join(' ');
          return `<td>${nums}</td>`;
        }).join('');
        return `
          <tr>
            <td>${d.issue}</td>
            <td>${d.date}</td>
            ${zoneCells}
            <td>${this.calcSum(d)}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // ========== 走势分析 ==========
  getTrendDraws() {
    const n = parseInt(document.getElementById('trendPeriods').value, 10);
    const draws = this.getDraws();
    return draws.slice(0, n).reverse();
  }

  calcOmissionsAt(draws, index, min, max, zoneKey) {
    const omissions = {};
    for (let num = min; num <= max; num++) omissions[num] = 0;
    for (let i = index; i >= 0; i--) {
      const nums = draws[i].numbers[zoneKey] || draws[i].numbers.digits || [];
      const arr = zoneKey === 'digits' ? draws[i].numbers.digits : nums;
      if (zoneKey === 'digits') {
        for (let d = 0; d <= 9; d++) {
          if (arr.includes(d) && omissions[d] === 0) omissions[d] = index - i;
        }
      } else {
        for (let num = min; num <= max; num++) {
          if (arr.includes(num) && omissions[num] === 0) omissions[num] = index - i;
        }
      }
    }
    for (let num = min; num <= max; num++) {
      if (omissions[num] === 0) omissions[num] = index + 1;
    }
    return omissions;
  }

  buildBallTrendTable(draws, min, max, zoneKey, isBlue) {
    let html = '<thead><tr><th class="issue-col">期号</th>';
    for (let i = min; i <= max; i++) html += `<th>${this.pad(i)}</th>`;
    html += '</tr></thead><tbody>';

    draws.forEach((draw, idx) => {
      const nums = zoneKey === 'digits'
        ? draw.numbers.digits
        : (draw.numbers[zoneKey] || []);
      const omissions = this.calcOmissionsAt(draws, idx, min, max, zoneKey);

      html += `<tr><td class="issue-col">${draw.issue}</td>`;
      for (let n = min; n <= max; n++) {
        const hit = zoneKey === 'digits' ? nums.includes(n) : nums.includes(n);
        if (hit) {
          html += `<td class="hit">${this.pad(n)}</td>`;
        } else {
          const om = zoneKey === 'digits' ? omissions[n] : omissions[n];
          html += `<td class="miss">${om > 0 ? om : ''}</td>`;
        }
      }
      html += '</tr>';
    });
    html += '</tbody>';
    return html;
  }

  renderTrend() {
    const draws = this.getTrendDraws();
    const cfg = this.getConfig();

    if (this.currentType === 'ssq') {
      document.getElementById('trendRedTable').innerHTML =
        this.buildBallTrendTable(draws, 1, 33, 'main', false);
      document.getElementById('trendBlueTable').innerHTML =
        this.buildBallTrendTable(draws, 1, 16, 'extra', true);
      this.renderTrendChart(draws);
    } else if (cfg.digits) {
      document.getElementById('trendGenericTable').innerHTML =
        this.buildDigitTrendTable(draws);
    } else if (cfg.zones) {
      document.getElementById('trendGenericTable').innerHTML =
        this.buildDltTrendTable(draws, cfg);
    }
  }

  buildDigitTrendTable(draws) {
    const positions = ['百位', '十位', '个位'];
    let html = '<thead><tr><th class="issue-col">期号</th>';
    positions.forEach(p => {
      for (let d = 0; d <= 9; d++) html += `<th>${p}${d}</th>`;
    });
    html += '</tr></thead><tbody>';

    draws.forEach(draw => {
      html += `<tr><td class="issue-col">${draw.issue}</td>`;
      draw.numbers.digits.forEach((digit, pos) => {
        for (let d = 0; d <= 9; d++) {
          html += d === digit
            ? `<td class="hit">${d}</td>`
            : '<td class="miss"></td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody>';
    return html;
  }

  buildDltTrendTable(draws, cfg) {
    const front = cfg.zones[0];
    const back = cfg.zones[1];
    let html = '<thead><tr><th class="issue-col">期号</th>';
    html += '<th colspan="35">前区 01-35</th><th colspan="12">后区 01-12</th></tr></thead><tbody>';

    draws.forEach(draw => {
      html += `<tr><td class="issue-col">${draw.issue}</td>`;
      for (let n = 1; n <= 35; n++) {
        const hit = draw.numbers.front.includes(n);
        html += hit ? `<td class="hit">${this.pad(n)}</td>` : '<td class="miss"></td>';
      }
      for (let n = 1; n <= 12; n++) {
        const hit = draw.numbers.back.includes(n);
        html += hit ? `<td class="hit">${this.pad(n)}</td>` : '<td class="miss"></td>';
      }
      html += '</tr>';
    });
    html += '</tbody>';
    return html;
  }

  renderTrendChart(draws) {
    const canvas = document.getElementById('trendChart');
    const ctx = canvas.getContext('2d');
    const metric = document.getElementById('trendMetric').value;
    const w = canvas.width;
    const h = canvas.height;
    const pad = { l: 40, r: 20, t: 30, b: 35 };

    const values = draws.map(d => {
      if (metric === 'sum') return this.calcSum(d);
      if (metric === 'span') return this.calcSpan(d);
      return this.calcOddCount(d);
    });

    const labels = { sum: '和值', span: '跨度', odd: '奇数个数' };
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const chartW = w - pad.l - pad.r;
    const chartH = h - pad.t - pad.b;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#c41e3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad.l + (chartW * i) / (values.length - 1 || 1);
      const y = pad.t + chartH - ((v - minV) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    values.forEach((v, i) => {
      const x = pad.l + (chartW * i) / (values.length - 1 || 1);
      const y = pad.t + chartH - ((v - minV) / range) * chartH;
      ctx.fillStyle = '#c41e3a';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText(labels[metric], pad.l, 18);
    ctx.fillText(String(maxV), 4, pad.t + 5);
    ctx.fillText(String(minV), 4, h - pad.b);
  }

  // ========== 数据统计 ==========
  renderStats() {
    const n = parseInt(document.getElementById('statsPeriods').value, 10);
    const draws = this.getDraws().slice(0, n);
    const cfg = this.getConfig();
    const grid = document.getElementById('statsGrid');

    if (draws.length === 0) {
      grid.innerHTML = '<p>暂无数据</p>';
      return;
    }

    const sums = draws.map(d => this.calcSum(d));
    const avgSum = (sums.reduce((a, b) => a + b, 0) / sums.length).toFixed(1);
    const last = draws[0];

    let html = `
      <div class="stat-card"><div class="stat-value">${draws.length}</div><div class="stat-label">统计期数</div></div>
      <div class="stat-card"><div class="stat-value">${avgSum}</div><div class="stat-label">平均和值</div></div>
      <div class="stat-card"><div class="stat-value">${this.calcSum(last)}</div><div class="stat-label">最新和值</div></div>
    `;

    if (cfg.digits) {
      html += `<div class="stat-card"><div class="stat-value">${this.calcSpan(last)}</div><div class="stat-label">最新跨度</div></div>`;
    } else {
      html += `<div class="stat-card"><div class="stat-value">${this.calcOddCount(last)}</div><div class="stat-label">最新奇数个数</div></div>`;
    }

    grid.innerHTML = html;

    this.renderFreqBars(draws, cfg);
  }

  renderFreqBars(draws, cfg) {
    const container = document.getElementById('freqBars');
    let freqMap = [];
    let maxFreq = 0;

    if (cfg.digits) {
      const freq = Array(10).fill(0);
      draws.forEach(d => d.numbers.digits.forEach(n => freq[n]++));
      freqMap = freq.map((c, n) => ({ num: n, count: c }));
      maxFreq = Math.max(...freq, 1);
    } else if (this.currentType === 'ssq') {
      const redFreq = Array(34).fill(0);
      const blueFreq = Array(17).fill(0);
      draws.forEach(d => {
        d.numbers.main.forEach(n => redFreq[n]++);
        d.numbers.extra.forEach(n => blueFreq[n]++);
      });
      const redSorted = [];
      for (let i = 1; i <= 33; i++) redSorted.push({ num: i, count: redFreq[i], zone: '红' });
      redSorted.sort((a, b) => b.count - a.count);
      freqMap = redSorted;
      maxFreq = Math.max(...redFreq, 1);

      const hot = redSorted.slice(0, 5).map(x => this.pad(x.num));
      const cold = redSorted.slice(-5).map(x => this.pad(x.num));
      container.innerHTML = this.buildFreqHtml(freqMap, maxFreq) + `
        <div class="hot-cold-tags">
          <span>热号:</span>
          ${hot.map(n => `<span class="tag hot">${n}</span>`).join('')}
          <span style="margin-left:12px">冷号:</span>
          ${cold.map(n => `<span class="tag cold">${n}</span>`).join('')}
        </div>
      `;
      return;
    } else if (this.currentType === 'dlt') {
      const freq = Array(36).fill(0);
      draws.forEach(d => d.numbers.front.forEach(n => freq[n]++));
      for (let i = 1; i <= 35; i++) freqMap.push({ num: i, count: freq[i] });
      freqMap.sort((a, b) => b.count - a.count);
      maxFreq = Math.max(...freq.slice(1), 1);
    }

    container.innerHTML = this.buildFreqHtml(freqMap.slice(0, 20), maxFreq);
  }

  buildFreqHtml(items, maxFreq) {
    return items.map(item => `
      <div class="freq-item">
        <span class="freq-num">${this.pad(item.num)}</span>
        <div class="freq-bar-wrap">
          <div class="freq-bar" style="width:${(item.count / maxFreq) * 100}%"></div>
        </div>
        <span class="freq-count">${item.count}</span>
      </div>
    `).join('');
  }

  // ========== 选号工具 ==========
  randomUnique(min, max, count) {
    const pool = [];
    for (let i = min; i <= max; i++) pool.push(i);
    const result = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(idx, 1)[0]);
    }
    return result.sort((a, b) => a - b);
  }

  generatePick() {
    const cfg = this.getConfig();
    if (cfg.digits) {
      const digits = [];
      for (let i = 0; i < cfg.digits.count; i++) {
        digits.push(Math.floor(Math.random() * 10));
      }
      return { numbers: { digits } };
    }
    const numbers = {};
    cfg.zones.forEach(z => {
      numbers[z.key] = this.randomUnique(z.min, z.max, z.count);
    });
    return { numbers };
  }

  pickToHtml(pick, index) {
    const fakeDraw = pick;
    return `<div class="picker-line"><span style="color:var(--text-light);margin-right:8px">${index != null ? index + '.' : ''}</span>${this.formatBalls(fakeDraw)}</div>`;
  }

  pickToText(pick) {
    const cfg = this.getConfig();
    if (cfg.digits) return pick.numbers.digits.join(' ');
    return cfg.zones.map(z => (pick.numbers[z.key] || []).map(n => this.pad(n)).join(' ')).join(' + ');
  }

  renderPicker(count) {
    const picks = [];
    for (let i = 0; i < count; i++) picks.push(this.generatePick());
    this.lastPicks = picks;
    document.getElementById('pickerResult').innerHTML =
      picks.map((p, i) => this.pickToHtml(p, count > 1 ? i + 1 : null)).join('');
  }

  filterPick() {
    const cfg = this.getConfig();
    if (!cfg.sumRange) return;
    const min = parseInt(document.getElementById('filterSumMin').value, 10) || cfg.sumRange[0];
    const max = parseInt(document.getElementById('filterSumMax').value, 10) || cfg.sumRange[1];
    let pick = null;
    for (let i = 0; i < 500; i++) {
      const p = this.generatePick();
      const sum = this.calcSum({ numbers: p.numbers });
      if (sum >= min && sum <= max) {
        pick = p;
        break;
      }
    }
    if (!pick) {
      this.showToast('未找到符合条件的组合，请放宽和值范围');
      return;
    }
    this.lastPicks = [pick];
    document.getElementById('pickerResult').innerHTML = this.pickToHtml(pick);
    this.showToast(`已生成，和值 ${this.calcSum({ numbers: pick.numbers })}`);
  }

  copyPicker() {
    if (!this.lastPicks || !this.lastPicks.length) {
      this.showToast('请先生成号码');
      return;
    }
    const text = this.lastPicks.map(p => this.pickToText(p)).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('已复制到剪贴板');
    }).catch(() => {
      this.showToast(text);
    });
  }

  showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LotteryApp();
});
