// 复现 index.html 里 rankSlots 的算法，用多组数据验证
const W = [25, 20, 20, 13, 10, 12];
const units = p => p.reduce((s, v, d) => s + Math.round(v * 100) * W[d], 0);

function buildRanks(singersRaw) {          // 已按分数升序
  const count = singersRaw.length;
  const slots = new Array(count);
  const scoreOf = i => units(singersRaw[i].points);
  let high = count - 1;
  while (high >= 0) {
    let low = high;
    while (low - 1 >= 0 && scoreOf(low - 1) === scoreOf(high)) low--;
    const rank = count - high;
    const tied = high > low;
    for (let k = low; k <= high; k++) slots[k] = { rank, tied };
    high = low - 1;
  }
  return slots;
}

let allOk = true;
function check(name, pointsList) {
  const raw = pointsList.map((p, i) => ({ name: 'A' + (i + 1), points: p }));
  raw.sort((a, b) => units(a.points) - units(b.points));
  const slots = buildRanks(raw);
  const rows = raw.map((s, i) => ({
    name: s.name,
    score: units(s.points) / 10000,
    rank: slots[i].rank,
    tied: slots[i].tied
  }));
  rows.sort((a, b) => a.rank - b.rank || a.score - b.score);
  console.log('--- ' + name + ' ---');
  rows.forEach(r => console.log('  ' + r.name + ' 分=' + r.score.toFixed(4) + ' 名次=#' + r.rank + (r.tied ? ' [并列]' : '')));

  const ranks = rows.map(r => r.rank);
  const sortedOk = ranks.every((v, i) => i === 0 || ranks[i - 1] <= v);
  const groupOk = rows.every((r, i) => {
    for (let j = i + 1; j < rows.length; j++) {
      if (Math.abs(rows[i].score - rows[j].score) < 1e-9) return rows[i].rank === rows[j].rank;
    }
    return true;
  });
  const firstIsOne = ranks[0] === 1;
  // 并列标记一致性：同分同 tied，且 tied 为 true 时组内人数 > 1
  const tieOk = rows.every((r, i) => {
    const sameGroup = rows.filter(o => Math.abs(o.score - r.score) < 1e-9).length;
    return r.tied === (sameGroup > 1);
  });
  const ok = sortedOk && groupOk && firstIsOne && tieOk;
  if (!ok) allOk = false;
  console.log('  断言: 名次有序=' + (sortedOk ? 'OK' : 'FAIL')
    + ' 同分同名次=' + (groupOk ? 'OK' : 'FAIL')
    + ' 头名为#1=' + (firstIsOne ? 'OK' : 'FAIL')
    + ' 并列标记一致=' + (tieOk ? 'OK' : 'FAIL'));
  console.log();
}

const mk = (...vals) => vals.map(v => Array(6).fill(v));
check('全无并列 (5人)', mk(5, 6, 7, 8, 9));
check('两人并列第1', mk(5, 6, 9, 9));
check('两人并列第2', mk(5, 8, 8, 9));
check('三人并列第1', mk(4, 7, 9, 9, 9));
check('两组并列 1,1,3,3,5', mk(3, 9, 9, 7, 7));
check('全部同分', mk(6, 6, 6, 6));
check('单人', mk(7));
check('并列在中段', mk(4, 6, 6, 6, 8, 9));

console.log(allOk ? '=== 全部通过 ===' : '=== 有失败 ===');
process.exit(allOk ? 0 : 1);
