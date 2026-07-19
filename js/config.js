/**
 * config.js — 全局配置与工具函数
 * 包含：配色规范(5.1/5.2)、学校图标规范(5.3)、行政区列表、格式化工具。
 */

/** 热力图渐变色阶（低→高），对应 5.2 规范 */
export const HEAT_GRADIENT = {
  0.2: '#95E1D3', 0.4: '#4ECDC4', 0.6: '#45B7D1', 0.8: '#FF8C00', 1.0: '#FF0000'
};

/** 房价分段色值（5.2 分段映射表），单位 元/㎡ */
export const PRICE_BANDS = [
  { max: 30000, color: '#95E1D3', name: '价格洼地' },
  { max: 40000, color: '#4ECDC4', name: '中低价位' },
  { max: 50000, color: '#45B7D1', name: '中等价位' },
  { max: 60000, color: '#FF8C00', name: '中高价位' },
  { max: Infinity, color: '#FF0000', name: '高价区域' }
];

/** 学校标记配色（5.3 规范） */
export const SCHOOL_COLORS = {
  '小学': '#34A853', '初中': '#1A73E8', '高中': '#EA4335', '高校': '#9C27B0', '幼儿园': '#FBBC04', '未知': '#9AA0A6'
};

/** 行政区列表（6.2），用于筛选器与图表 */
export const DISTRICTS = ['上城', '拱墅', '西湖', '滨江', '萧山', '余杭', '临平', '钱塘', '富阳', '临安'];

/** 杭州中心点（用于地图初始化） */
export const HANGZHOU_CENTER = [30.25, 120.16];
export const HANGZHOU_ZOOM = 11;

/**
 * 根据均价返回对应的分段颜色
 * @param {number} price 均价（元/㎡）
 * @returns {string} 颜色值
 */
export function priceColor(price) {
  for (const band of PRICE_BANDS) {
    if (price < band.max) return band.color;
  }
  return PRICE_BANDS[PRICE_BANDS.length - 1].color;
}

/**
 * 数字千分位格式化
 * @param {number} n 数值
 * @returns {string} 格式化字符串
 */
export function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('zh-CN');
}

/**
 * 价格格式化（带 元/㎡）
 * @param {number} n 均价
 * @returns {string}
 */
export function fmtPrice(n) {
  return fmt(n) + ' 元/㎡';
}
