/**
 * main.js — 应用入口
 * 启动流程：加载数据 → 初始化地图与图表 → 绑定界面交互。
 */
import { initData, store } from './data.js';
import { initMap, setData, renderHeat, renderBlocks, renderCommunities, renderSchools } from './map.js';
import { renderDistrictBar, renderTrend, renderCityTrend, renderRadar, renderBlockBar, renderFacility, resizeCharts } from './charts.js';
import { initSchools } from './schools.js';
import { initUI, showDataError } from './ui.js';

/** 应用启动 */
async function boot() {
  try {
    await initData();
  } catch (err) {
    console.error('数据加载失败：', err);
    showDataError();
  }

  // 地图
  initMap();
  setData();
  renderHeat();
  renderBlocks();
  renderCommunities();
  renderSchools();

  // 图表
  renderDistrictBar();
  renderTrend();
  renderCityTrend();
  renderRadar();
  renderBlockBar();
  renderFacility();

  // 学区与界面
  initSchools();
  initUI();

  window.addEventListener('resize', resizeCharts);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
