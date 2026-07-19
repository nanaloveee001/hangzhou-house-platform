/**
 * charts.js — 图表可视化模块（ECharts）
 * 包含：行政区均价柱状图、均价走势、板块对比雷达/柱状、配套评分。
 */
import { getDistrictStats, getBlocks, getCommunities, getCityTrend } from './data.js';
import { computeScores } from './facilities.js';
import { fmt } from './config.js';

/** 行政区均价排名柱状图 */
export function renderDistrictBar() {
  const stats = getDistrictStats();
  if (!stats.length) return empty('chartDistrictBar');
  const chart = echarts.init(document.getElementById('chartDistrictBar'));
  chart.setOption({
    title: { text: '各行政区均价排名', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', valueFormatter: v => fmt(v) + ' 元/㎡' },
    grid: { left: 60, right: 20, top: 36, bottom: 20 },
    xAxis: { type: 'category', data: stats.map(s => s.district), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { formatter: v => v / 10000 + '万' } },
    series: [{ type: 'bar', data: stats.map(s => s.avg), itemStyle: { color: '#1A73E8' },
      label: { show: true, position: 'top', fontSize: 10, formatter: p => (p.value / 10000).toFixed(1) + '万' } }]
  });
  register(chart);
}

/** 整体均价近 6 个月走势（示例，待真实历史数据） */
export function renderTrend() {
  const stats = getDistrictStats();
  const base = stats.length ? Math.round(stats.reduce((a, s) => a + s.avg, 0) / stats.length) : 50000;
  const months = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  const series = months.map((_, i) => Math.round(base * (1 + (i - 3) * 0.015)));
  const chart = echarts.init(document.getElementById('chartTrend'));
  chart.setOption({
    title: { text: '整体均价走势（示例）', textStyle: { fontSize: 14 }, subtext: '待真实历史数据替换', subtextStyle: { fontSize: 10, color: '#EA4335' } },
    tooltip: { trigger: 'axis', valueFormatter: v => fmt(v) + ' 元/㎡' },
    grid: { left: 60, right: 20, top: 50, bottom: 24 },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', axisLabel: { formatter: v => v / 10000 + '万' } },
    series: [{ type: 'line', data: series, smooth: true, itemStyle: { color: '#34A853' }, areaStyle: { opacity: 0.1 } }]
  });
  register(chart);
}

/** 杭州官方房价指数·环比涨跌幅（国家统计局 70 城，真实数据）
 *  数据见 data/city_trend.json；缺失月份以 null 表示并在图中跨接连线，不编造。 */
export function renderCityTrend() {
  const t = getCityTrend();
  const el = document.getElementById('chartCityTrend');
  if (!t || !t.months || !t.months.length || !el) {
    if (el) el.innerHTML = '<div style="padding:20px;color:#80868b;font-size:13px">官方指数数据未加载</div>';
    return;
  }
  const months = t.months;
  const newMom = t.new_home.mom, newYoy = t.new_home.yoy;
  const secMom = t.second_hand.mom, secYoy = t.second_hand.yoy;
  const fmtv = v => (v == null ? '待补' : (v > 0 ? '+' : '') + v.toFixed(1) + '%');
  const chart = echarts.init(el);
  chart.setOption({
    title: {
      text: '杭州官方房价指数·环比涨跌幅',
      subtext: '来源：国家统计局 70 大中城市商品住宅销售价格指数（杭州）· 真实数据',
      textStyle: { fontSize: 14 }, subtextStyle: { fontSize: 10, color: '#5f6368' }
    },
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const i = params[0].dataIndex;
        return `${months[i]}<br/>` +
          `<span style="color:#EA4335">● 新建</span> 环比 ${fmtv(newMom[i])}｜同比 ${fmtv(newYoy[i])}<br/>` +
          `<span style="color:#34A853">● 二手</span> 环比 ${fmtv(secMom[i])}｜同比 ${fmtv(secYoy[i])}`;
      }
    },
    legend: { data: ['新建商品住宅', '二手住宅'], top: 34, left: 'center', textStyle: { fontSize: 11 } },
    grid: { left: 48, right: 20, top: 76, bottom: 26 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10, rotate: 30 } },
    yAxis: { type: 'value', name: '环比%', axisLabel: { formatter: v => v + '%' }, scale: true },
    series: [
      {
        name: '新建商品住宅', type: 'line', data: newMom, connectNulls: true, smooth: true, symbolSize: 6,
        itemStyle: { color: '#EA4335' }, lineStyle: { width: 2 },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#9aa0a6', type: 'dashed' },
          data: [{ yAxis: 0, label: { formatter: '0%', position: 'end', fontSize: 10, color: '#9aa0a6' } }] }
      },
      {
        name: '二手住宅', type: 'line', data: secMom, connectNulls: true, smooth: true, symbolSize: 6,
        itemStyle: { color: '#34A853' }, lineStyle: { width: 2 }
      }
    ]
  });
  register(chart);
}

/** 板块均价对比（横向条形图，避免竖向标签重叠） */
export function renderBlockBar() {
  const blocks = [...getBlocks()].sort((a, b) => b.avg_price - a.avg_price);
  if (!blocks.length) return empty('chartBlockBar');
  const chart = echarts.init(document.getElementById('chartBlockBar'));
  const maxPrice = Math.max(...blocks.map(b => b.avg_price || 0));
  const xMax = Math.ceil(maxPrice / 10000) * 10000;
  chart.setOption({
    tooltip: { trigger: 'axis', valueFormatter: v => fmt(v) + ' 元/㎡' },
    grid: { left: 90, right: 50, top: 16, bottom: 30 },
    xAxis: {
      type: 'value', max: xMax, interval: Math.max(10000, Math.round(xMax / 4)),
      axisLabel: { formatter: v => v / 10000 + '万' }
    },
    yAxis: {
      type: 'category', data: blocks.map(b => b.block_name),
      axisLabel: { fontSize: 12, width: 88, overflow: 'break', interval: 0 }
    },
    series: [{
      type: 'bar', data: blocks.map(b => b.avg_price), itemStyle: { color: '#1A73E8' },
      label: { show: true, position: 'right', fontSize: 10, formatter: p => (p.value / 10000).toFixed(1) + '万' }
    }]
  });
  register(chart);
}

/** 板块对比雷达图（均价/涨跌幅/在售/学区/配套 归一化） */
export function renderRadar() {
  const blocks = [...getBlocks()].sort((a, b) => b.avg_price - a.avg_price).slice(0, 5);
  if (!blocks.length) return empty('chartRadar');
  const norm = (v, arr) => { const max = Math.max(...arr), min = Math.min(...arr); return max === min ? 0.5 : (v - min) / (max - min); };
  const priceArr = blocks.map(b => b.avg_price), chgArr = blocks.map(b => b.price_change),
        listArr = blocks.map(b => b.listing_count), schArr = blocks.map(b => (b.schools || []).length),
        facArr = blocks.map(b => (b.commercial || []).length + (b.medical || []).length + (b.ecological || []).length);
  const indicators = [
    { name: '均价', max: 1 }, { name: '涨跌幅', max: 1 }, { name: '在售量', max: 1 },
    { name: '学区', max: 1 }, { name: '配套', max: 1 }
  ];
  const series = blocks.map((b, i) => ({
    value: [norm(b.avg_price, priceArr), norm(b.price_change, chgArr), norm(b.listing_count, listArr),
            norm((b.schools || []).length, schArr), norm(facArr[i], facArr)],
    name: b.block_name
  }));
  const chart = echarts.init(document.getElementById('chartRadar'));
  chart.setOption({
    tooltip: {},
    legend: { type: 'scroll', top: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    radar: { indicator: indicators, radius: '68%', center: ['50%', '58%'] },
    series: [{ type: 'radar', data: series }]
  });
  register(chart);
}

/** 配套评分雷达图 */
export function renderFacility() {
  const blocks = getBlocks();
  const scores = computeScores(blocks);
  if (!scores.length) return empty('chartFacility');
  const dims = ['交通', '商业', '医疗', '教育', '生态'];
  const indicators = dims.map(d => ({ name: d, max: 5 }));
  const series = scores.slice(0, 6).map(s => ({ value: [s.交通, s.商业, s.医疗, s.教育, s.生态], name: s.block_name }));
  const chart = echarts.init(document.getElementById('chartFacility'));
  chart.setOption({
    tooltip: {}, legend: { type: 'scroll', top: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    radar: { indicator: indicators, radius: '68%', center: ['50%', '58%'] },
    series: [{ type: 'radar', data: series }]
  });
  register(chart);
}

const charts = [];
function register(c) { charts.push(c); }
/** 窗口缩放时重绘所有图表 */
export function resizeCharts() { charts.forEach(c => c.resize()); }
function empty(id) { document.getElementById(id).innerHTML = '<div style="padding:20px;color:#80868b;font-size:13px">暂无数据</div>'; }
