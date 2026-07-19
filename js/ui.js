/**
 * ui.js — 界面交互与面板编排
 * 负责：标签页切换、移动端抽屉、筛选按钮、搜索、示例横幅、对比/配套表格渲染、错误态。
 */
import { store, getBlocks } from './data.js';
import { applyFilter, searchHighlight } from './map.js';
import { computeScores } from './facilities.js';
import { fmt } from './config.js';
import { resizeCharts } from './charts.js';

/** 初始化所有界面交互 */
export function initUI() {
  initTabs();
  initDrawer();
  initFilters();
  initSearch();
  initSchoolCardSearch();
  renderRankTable();
  renderFacilityTable();
  showBannerIfSample();
}

/** 标签页切换 */
function initTabs() {
  const btns = document.querySelectorAll('.panel-tabs__btn');
  btns.forEach(btn => btn.addEventListener('click', () => {
    btns.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.panel-section').forEach(sec => {
      const on = sec.dataset.panel === tab;
      sec.hidden = !on;
      sec.classList.toggle('is-active', on);
    });
    resizeCharts(); // 标签切换后重算图表尺寸，避免隐藏标签内图表宽高为 0 而空白
  }));
}

/** 移动端面板抽屉 */
function initDrawer() {
  const toggle = document.getElementById('drawerToggle');
  const pane = document.getElementById('panelPane');
  toggle?.addEventListener('click', () => {
    pane.classList.toggle('is-open');
    toggle.textContent = pane.classList.contains('is-open') ? '↓ 收起' : '↑ 面板';
  });
}

/** 地图筛选模式按钮 */
function initFilters() {
  document.querySelectorAll('.app-filter__btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.app-filter__btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    applyFilter(btn.dataset.mode);
  }));
}

/** 搜索框（防抖） */
function initSearch() {
  const input = document.getElementById('searchInput');
  let t = null;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => searchHighlight(input.value), 300);
  });
}

/** 学校卡片"查看学区范围"按钮 → 地图高亮 */
function initSchoolCardSearch() {
  document.getElementById('schoolList')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-search]');
    if (btn) { searchHighlight(btn.dataset.search); switchTab('school'); }
  });
}

function switchTab(name) {
  document.querySelector(`.panel-tabs__btn[data-tab="${name}"]`)?.click();
}

/** 板块对比排名表 */
function renderRankTable() {
  const tbody = document.querySelector('#rankTable tbody');
  if (!tbody) return;
  const rows = [...getBlocks()].sort((a, b) => b.avg_price - a.avg_price)
    .map(b => `<tr><td>${b.block_name}</td><td>${fmt(b.avg_price)}</td>
      <td style="color:${b.price_change >= 0 ? '#EA4335' : '#34A853'}">${b.price_change >= 0 ? '+' : ''}${b.price_change}%</td>
      <td>${fmt(b.listing_count)}</td></tr>`).join('');
  tbody.innerHTML = rows || '<tr><td colspan="4">暂无数据</td></tr>';
}

/** 配套评分表 */
function renderFacilityTable() {
  const tbody = document.querySelector('#facilityTable tbody');
  if (!tbody) return;
  const rows = computeScores(getBlocks()).map(s =>
    `<tr><td>${s.block_name}</td><td>${s.交通}</td><td>${s.商业}</td><td>${s.医疗}</td><td>${s.教育}</td><td>${s.生态}</td>
     <td style="font-weight:700">${s.综合}</td></tr>`).join('');
  tbody.innerHTML = rows || '<tr><td colspan="7">暂无数据</td></tr>';
}

/** 示例数据横幅 */
function showBannerIfSample() {
  if (store.isSample.communities || store.isSample.blocks || store.isSample.schools) {
    document.getElementById('sampleBanner').hidden = false;
  }
}

/** 数据加载失败提示（附录 B） */
export function showDataError() {
  const banner = document.getElementById('sampleBanner');
  if (banner) { banner.hidden = false; banner.style.background = '#FCE8E6'; banner.style.color = '#C5221F'; banner.innerHTML = '⚠️ 数据加载失败，请检查 data/ 目录下的 JSON 文件与本地服务。'; }
}
