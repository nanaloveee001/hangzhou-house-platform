/**
 * schools.js — 学区分析模块
 * 负责：学区筛选器联动、学校卡片列表渲染（6.2 卡片式布局）。
 */
import { getSchools, getBlocks } from './data.js';
import { DISTRICTS } from './config.js';

let blockAvg = {};

/** 初始化：填充行政区下拉并首次渲染 */
export function initSchools() {
  blockAvg = {};
  getBlocks().forEach(b => { blockAvg[b.block_name] = b.avg_price; });
  const sel = document.getElementById('schoolDistrict');
  const present = [...new Set(getSchools().map(s => s.district).filter(d => d && d !== '待补全'))];
  present.forEach(d => {
    const opt = document.createElement('option'); opt.value = d; opt.textContent = d + '区'; sel.appendChild(opt);
  });
  ['schoolType', 'schoolLevel', 'schoolDistrict'].forEach(id =>
    document.getElementById(id).addEventListener('change', renderSchoolList));
  renderSchoolList();
}

/** 根据筛选条件渲染学校卡片列表 */
export function renderSchoolList() {
  const type = document.getElementById('schoolType').value;
  const level = document.getElementById('schoolLevel').value;
  const district = document.getElementById('schoolDistrict').value;
  const list = document.getElementById('schoolList');
  const schools = getSchools().filter(s =>
    (type === 'all' || s.school_type === type) &&
    (level === 'all' || s.school_level === level) &&
    (district === 'all' || s.district === district)
  );
  if (!schools.length) { list.innerHTML = '<div class="panel-note">未找到匹配的学校，请调整筛选条件。</div>'; return; }
  list.innerHTML = schools.map(cardHtml).join('');
}

/** 生成单张学校卡片 HTML（6.2 规范） */
function cardHtml(s) {
  const badge = s.school_level && s.school_level !== '待补全' ? s.school_level : (s.school_type || '未知');
  const avg = s.block && blockAvg[s.block] ? blockAvg[s.block] : null;
  const webBtn = s.official_website
    ? `<a class="school-card__btn" href="${s.official_website}" target="_blank" rel="noopener">查看官网 →</a>` : '';
  return `<article class="school-card">
    <div class="school-card__head">
      <span class="school-card__name">${s.school_name}</span>
      <span class="school-card__badge">${badge}</span>
    </div>
    <div class="school-card__meta">${s.district || '—'} · ${s.block || '—'}</div>
    <div class="school-card__meta">学区房均价：<span class="school-card__price">${avg ? fmt(avg) + ' 元/㎡' : '待补全'}</span>${avg ? `（示例板块均价）` : ''}</div>
    <div class="school-card__meta">对口小区：${(s.feeder_communities || []).join('、') || '待补全'}</div>
    <div class="school-card__actions">
      <button class="school-card__btn" data-search="${s.school_name}">查看学区范围</button>
      ${webBtn}
    </div>
  </article>`;
}

function fmt(n) { return Number(n).toLocaleString('zh-CN'); }
