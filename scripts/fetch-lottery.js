/**
 * 从 500.com 抓取最近 30 期开奖并生成 data/lottery-data.js
 * 运行: node scripts/fetch-lottery.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'lottery-data.js');

const SOURCES = {
  ssq: 'https://datachart.500.com/ssq/history/newinc/history.php?limit=30',
  dlt: 'https://datachart.500.com/dlt/history/newinc/history.php?limit=30',
  fc3d: 'https://datachart.500.com/sd/history/inc/history.php?limit=30',
  pl3: 'https://datachart.500.com/pls/history/inc/history.php?limit=30'
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function normIssue(short, type) {
  const s = String(short).replace(/\D/g, '');
  if (type === 'fc3d') return s.length >= 7 ? s : `2026${s.padStart(3, '0')}`;
  if (s.length >= 7) return s;
  return '20' + s;
}

function cleanHtml(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function parseSsq(html) {
  html = cleanHtml(html);
  const rows = [];
  const re = /<tr class="t_tr1">[\s\S]*?<\/tr>/g;
  let m;
  while ((m = re.exec(html))) {
    const tds = [...m[0].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((x) => x[1].trim());
    if (tds.length < 8) continue;
    const issue = normIssue(tds[0], 'ssq');
    const main = tds.slice(1, 7).map((n) => parseInt(n, 10));
    const extra = [parseInt(tds[7], 10)];
    const date = tds[tds.length - 1];
    if (!/^\d{5}$/.test(tds[0])) continue;
    if (main.some(isNaN) || isNaN(extra[0]) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({ issue, date, numbers: { main, extra } });
  }
  return rows.slice(0, 30);
}

function parseDlt(html) {
  html = cleanHtml(html);
  const rows = [];
  const re = /<tr class="t_tr1">[\s\S]*?<\/tr>/g;
  let m;
  while ((m = re.exec(html))) {
    const tds = [...m[0].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((x) => x[1].trim());
    if (tds.length < 9) continue;
    if (!/^\d{5}$/.test(tds[0])) continue;
    const issue = normIssue(tds[0], 'dlt');
    const front = tds.slice(1, 6).map((n) => parseInt(n, 10));
    const back = tds.slice(6, 8).map((n) => parseInt(n, 10));
    const date = tds[tds.length - 1];
    if (front.some(isNaN) || back.some(isNaN) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({ issue, date, numbers: { front, back } });
  }
  return rows.slice(0, 30);
}

function parseDigits(html, type) {
  html = cleanHtml(html);
  const rows = [];
  const re = /<tr class="t_tr1">[\s\S]*?<\/tr>/g;
  let m;
  while ((m = re.exec(html))) {
    const tds = [...m[0].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((x) => x[1].trim());
    if (tds.length < 3) continue;
    const issue = normIssue(tds[0], type);
    const digitStr = tds[1].replace(/\s+/g, ' ').trim();
    const digits = digitStr.split(/\s+/).map((n) => parseInt(n, 10));
    if (digits.length !== 3 || digits.some(isNaN)) continue;
    const date = tds[tds.length - 1];
    if (!/^\d{7}$/.test(tds[0]) && !/^\d{5}$/.test(tds[0])) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({ issue, date, numbers: { digits } });
  }
  return rows.slice(0, 30);
}

async function main() {
  console.log('正在从 500.com 获取最近 30 期数据...');
  const result = {};
  const localFallback = {
    ssq: path.join(ROOT, 'ssq_raw.html'),
    dlt: path.join(ROOT, 'dlt_raw.html'),
    fc3d: path.join(ROOT, 'fc3d_raw.html'),
    pl3: path.join(ROOT, 'pl3_raw.html')
  };
  for (const [key, url] of Object.entries(SOURCES)) {
    let html;
    try {
      html = await fetch(url);
      if (!html.includes('t_tr1')) throw new Error('无效响应');
    } catch (e) {
      const fp = localFallback[key];
      if (fs.existsSync(fp)) {
        console.warn(`  ${key}: 在线失败，使用本地缓存 ${path.basename(fp)}`);
        html = fs.readFileSync(fp, 'utf8');
      } else throw e;
    }
    if (key === 'ssq') result.ssq = parseSsq(html);
    else if (key === 'dlt') result.dlt = parseDlt(html);
    else if (key === 'fc3d') result.fc3d = parseDigits(html, 'fc3d');
    else if (key === 'pl3') result.pl3 = parseDigits(html, 'pl3');
    console.log(`  ${key}: ${result[key].length} 期`);
    if (result[key].length === 0) throw new Error(`${key} 解析失败`);
  }
  const js = `/**
 * 彩票开奖数据 - 最近 30 期
 * 数据来源: 500.com 开奖公告（更新: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}）
 * 仅供参考，请以福彩/体彩官方公布为准
 */
window.LOTTERY_DATA = ${JSON.stringify(result, null, 2)};
`;
  fs.writeFileSync(OUT, js, 'utf8');
  console.log('已写入', OUT);
  console.log('最新双色球:', result.ssq[0].issue, result.ssq[0].date, result.ssq[0].numbers);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
