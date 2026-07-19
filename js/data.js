/**
 * data.js — 数据加载与存储层
 * 负责 fetch 三个 JSON 数据文件，校验结构，暴露 is_sample 状态与各类 getter。
 */

const DATA_FILES = {
  communities: 'data/house_price.json',
  schools: 'data/school_district.json',
  blocks: 'data/block_info.json',
  cityTrend: 'data/city_trend.json'
};

/** 全局数据存储对象 */
export const store = {
  communities: [],
  schools: [],
  blocks: [],
  cityTrend: null,
  isSample: { communities: false, schools: false, blocks: false },
  loaded: false
};

/**
 * 加载单个 JSON 文件
 * @param {string} url 文件路径
 * @returns {Promise<object>}
 */
async function loadJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`加载失败 ${url} (HTTP ${res.status})`);
  return res.json();
}

/** 加载可选 JSON（文件缺失时不抛错，返回 null，避免拖垮整体启动） */
async function loadJsonOptional(url) {
  try { return await loadJson(url); }
  catch (e) { console.warn('[city_trend] 可选数据加载失败，跳过：', e.message); return null; }
}

/**
 * 初始化数据层：并行加载三个数据源
 * @returns {Promise<void>}
 */
export async function initData() {
  const [house, school, block, trend] = await Promise.all([
    loadJson(DATA_FILES.communities),
    loadJson(DATA_FILES.schools),
    loadJson(DATA_FILES.blocks),
    loadJsonOptional(DATA_FILES.cityTrend)
  ]);
  store.communities = house.communities || [];
  store.schools = school.schools || [];
  store.blocks = block.blocks || [];
  store.cityTrend = trend;
  store.isSample.communities = !!(house._meta && house._meta.is_sample);
  store.isSample.schools = !!(school._meta && school._meta.is_sample);
  store.isSample.blocks = !!(block._meta && block._meta.is_sample);
  store.loaded = true;
}

/** @returns {Array} 小区列表 */
export const getCommunities = () => store.communities;
/** @returns {Array} 学校列表 */
export const getSchools = () => store.schools;
/** @returns {Array} 板块列表 */
export const getBlocks = () => store.blocks;
/** @returns {object|null} 城市官方房价指数趋势（国家统计局70城，杭州） */
export const getCityTrend = () => store.cityTrend;

/**
 * 汇总各行政区均价（由小区数据计算）
 * @returns {Array<{district:string, avg:number, count:number}>}
 */
export function getDistrictStats() {
  const map = {};
  for (const c of store.communities) {
    if (c.avg_price == null) continue;
    const d = c.district || '未知';
    if (!map[d]) map[d] = { sum: 0, count: 0 };
    map[d].sum += c.avg_price; map[d].count += 1;
  }
  return Object.entries(map)
    .map(([district, v]) => ({ district, avg: Math.round(v.sum / v.count), count: v.count }))
    .sort((a, b) => b.avg - a.avg);
}
