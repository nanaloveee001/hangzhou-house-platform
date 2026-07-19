/**
 * map.js — 地图可视化模块（Leaflet + OSM + leaflet.heat）
 * 负责：房价热力图、板块多边形着色、小区/学校标记、弹窗、筛选、搜索高亮。
 */
import { HEAT_GRADIENT, priceColor, SCHOOL_COLORS, HANGZHOU_CENTER, HANGZHOU_ZOOM, fmtPrice, fmt } from './config.js';
import { getCommunities, getSchools, getBlocks } from './data.js';

let map = null;
const layers = { heat: null, blocks: null, communities: null, schools: null };
let allSchools = [], allCommunities = [];

/** 初始化地图 */
export function initMap() {
  map = L.map('map', { zoomControl: true }).setView(HANGZHOU_CENTER, HANGZHOU_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  layers.heat = L.layerGroup().addTo(map);
  layers.blocks = L.layerGroup().addTo(map);
  layers.communities = L.layerGroup().addTo(map);
  layers.schools = L.layerGroup().addTo(map);
}

/** 渲染房价热力图 */
export function renderHeat() {
  layers.heat.clearLayers();
  const pts = allCommunities
    .filter(c => c.latitude && c.longitude && c.avg_price)
    .map(c => [c.latitude, c.longitude, Math.min(c.avg_price / 80000, 1)]);
  if (pts.length) L.heatLayer(pts, { radius: 28, blur: 20, maxZoom: 13, gradient: HEAT_GRADIENT }).addTo(layers.heat);
}

/** 渲染板块多边形着色 */
export function renderBlocks() {
  layers.blocks.clearLayers();
  getBlocks().forEach(b => {
    if (!b.polygon_coords || !b.polygon_coords.length) return;
    const color = priceColor(b.avg_price || 0);
    L.polygon(b.polygon_coords, { color, weight: 2, fillColor: color, fillOpacity: 0.18 })
      .bindPopup(blockPopupHtml(b)).addTo(layers.blocks);
  });
}

/** 渲染小区标记（带价格标签） */
export function renderCommunities() {
  layers.communities.clearLayers();
  allCommunities.forEach(c => {
    if (!c.latitude || !c.longitude) return;
    const color = priceColor(c.avg_price || 0);
    L.circleMarker([c.latitude, c.longitude], { radius: 6, color: '#fff', weight: 1, fillColor: color, fillOpacity: 0.85 })
      .bindTooltip(`${c.community_name}<br>${fmtPrice(c.avg_price)}`, { direction: 'top' })
      .bindPopup(communityPopupHtml(c)).addTo(layers.communities);
  });
}

/** 渲染学校标记（按层次着色，5.3） */
export function renderSchools() {
  layers.schools.clearLayers();
  allSchools.forEach(s => {
    if (!s.latitude || !s.longitude) return;
    const color = SCHOOL_COLORS[s.school_type] || SCHOOL_COLORS['未知'];
    const shape = s.school_type === '小学' ? '50%' : s.school_type === '初中' ? '0' : '50%';
    const icon = L.divIcon({
      className: 'school-icon',
      html: `<div style="width:14px;height:14px;background:${color};border-radius:${shape};border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7]
    });
    L.marker([s.latitude, s.longitude], { icon }).bindPopup(schoolPopupHtml(s)).addTo(layers.schools);
  });
}

/**
 * 应用筛选模式
 * @param {string} mode all|school|low|block
 */
export function applyFilter(mode) {
  const show = (g, on) => {
    if (!g) return;
    if (on && !map.hasLayer(g)) map.addLayer(g);
    if (!on && map.hasLayer(g)) map.removeLayer(g);
  };
  if (mode === 'all') {
    renderCommunities(); renderHeat();
    show(layers.heat, true); show(layers.communities, true);
    show(layers.schools, true); show(layers.blocks, true);
  } else if (mode === 'school') {
    show(layers.schools, true); show(layers.blocks, true);
    show(layers.heat, false); show(layers.communities, false);
  } else if (mode === 'low') {
    filterLowPrice();
    show(layers.communities, true); show(layers.heat, true);
    show(layers.schools, false); show(layers.blocks, false);
  } else if (mode === 'block') {
    show(layers.blocks, true);
    show(layers.heat, false); show(layers.communities, false); show(layers.schools, false);
  }
}

/** 低价房源模式：隐藏非低价小区 */
function filterLowPrice() {
  layers.communities.clearLayers();
  allCommunities.filter(c => (c.avg_price || 0) < 45000).forEach(c => {
    if (!c.latitude || !c.longitude) return;
    const color = priceColor(c.avg_price || 0);
    L.circleMarker([c.latitude, c.longitude], { radius: 7, color: '#fff', weight: 1, fillColor: color, fillOpacity: 0.9 })
      .bindPopup(communityPopupHtml(c)).addTo(layers.communities);
  });
}

/**
 * 搜索高亮：定位学校或小区并打开弹窗
 * @param {string} query 关键词
 */
export function searchHighlight(query) {
  if (!query) return;
  const q = query.trim().toLowerCase();
  const school = allSchools.find(s => s.school_name && s.school_name.toLowerCase().includes(q));
  if (school) { focusMarker(school.latitude, school.longitude, layers.schools); return; }
  const comm = allCommunities.find(c => c.community_name && c.community_name.toLowerCase().includes(q));
  if (comm) { focusMarker(comm.latitude, comm.longitude, layers.communities); return; }
}

/** 定位到坐标并放大 */
function focusMarker(lat, lng, group) {
  map.setView([lat, lng], 15);
  group.eachLayer(layer => {
    if (layer.getLatLng && layer.getLatLng().lat === lat && layer.getLatLng().lng === lng) layer.openPopup();
  });
}

/** 缓存数据引用（供搜索/筛选使用） */
export function setData() {
  allSchools = getSchools();
  allCommunities = getCommunities();
}

/* ---------- 弹窗 HTML ---------- */
function communityPopupHtml(c) {
  return `<div class="popup">
    <div class="popup__title">${c.community_name}</div>
    <div class="popup__row"><span class="popup__label">均价</span><span class="popup__price">${fmtPrice(c.avg_price)}</span>
      <span class="popup__label">环比</span><span>${c.price_change != null ? (c.price_change >= 0 ? '+' : '') + c.price_change + '%' : '—'}</span></div>
    <div class="popup__row"><span class="popup__label">户型</span><span>${c.layout || '—'} · ${c.area || '—'}㎡</span></div>
    <div class="popup__row"><span class="popup__label">板块</span><span>${c.block || '—'}（${c.district || '—'}）</span></div>
    <div class="popup__row"><span class="popup__label">配套</span><span>地铁/商业/医疗待爬虫补全</span></div>
    <a class="popup__btn" href="#" onclick="return false;">查看详情</a>
  </div>`;
}

function blockPopupHtml(b) {
  return `<div class="popup">
    <div class="popup__title">${b.block_name}</div>
    <div class="popup__row"><span class="popup__label">行政区</span><span>${b.district}</span></div>
    <div class="popup__row"><span class="popup__label">均价</span><span class="popup__price">${fmtPrice(b.avg_price)}</span></div>
    <div class="popup__row"><span class="popup__label">在售</span><span>${fmt(b.listing_count)} 套</span></div>
    <div class="popup__row"><span class="popup__label">重点学区</span><span>${(b.schools || []).join('、') || '—'}</span></div>
    <div class="popup__row"><span class="popup__label">交通</span><span>${(b.metro_lines || []).join('、') || '—'}</span></div>
  </div>`;
}

function schoolPopupHtml(s) {
  return `<div class="popup">
    <div class="popup__title">${s.school_name}</div>
    <div class="popup__row"><span class="popup__label">层次</span><span>${s.school_type || '未知'}</span>
      <span class="popup__label">等级</span><span>${s.school_level || '待补全'}</span></div>
    <div class="popup__row"><span class="popup__label">地址</span><span>${s.address || '待补全'}</span></div>
    <div class="popup__row"><span class="popup__label">对口</span><span>${(s.feeder_communities || []).join('、') || '待补全'}</span></div>
    ${s.official_website ? `<a class="popup__btn" href="${s.official_website}" target="_blank" rel="noopener">学校官网 →</a>` : '<span class="popup__label">官网：待补全</span>'}
  </div>`;
}
