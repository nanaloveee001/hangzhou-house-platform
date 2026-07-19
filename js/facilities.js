/**
 * facilities.js — 配套评估评分模块
 * 评分体系（6.4）：交通30% / 商业25% / 医疗20% / 教育15% / 生态10%，各维度 5 分制。
 */

/** 维度权重 */
const WEIGHTS = { 交通: 0.30, 商业: 0.25, 医疗: 0.20, 教育: 0.15, 生态: 0.10 };

/**
 * 将配套数量映射为 1–5 分（数量越多分越高，封顶 5）
 * @param {number} count 配套项数量
 * @returns {number}
 */
function scoreByCount(count) {
  return Math.max(1, Math.min(5, 1 + (count || 0)));
}

/**
 * 计算所有板块的配套评分
 * @param {Array} blocks 板块列表
 * @returns {Array<{block_name:string,交通:number,商业:number,医疗:number,教育:number,生态:number,综合:number}>}
 */
export function computeScores(blocks) {
  return blocks.map(b => {
    const 交通 = scoreByCount((b.metro_lines || []).length);
    const 商业 = scoreByCount((b.commercial || []).length);
    const 医疗 = scoreByCount((b.medical || []).length);
    const 教育 = scoreByCount((b.schools || []).length);
    const 生态 = scoreByCount((b.ecological || []).length);
    const 综合 = +(交通 * WEIGHTS.交通 + 商业 * WEIGHTS.商业 + 医疗 * WEIGHTS.医疗 + 教育 * WEIGHTS.教育 + 生态 * WEIGHTS.生态).toFixed(2);
    return { block_name: b.block_name, 交通, 商业, 医疗, 教育, 生态, 综合 };
  }).sort((a, b) => b.综合 - a.综合);
}
