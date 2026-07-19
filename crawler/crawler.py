"""
crawler.py — 杭州房价分析数据爬虫（合规版）

数据来源（仅官方/合规 API，不爬链家/贝壳等禁止源）：
  - 高德 Web 服务 API（POI 文本搜索 / 周边搜索）：学校、地铁、商业、医疗、生态配套
  - 用户提供的真实房价数据（house_price.json）：爬虫不生成价格

高德 Key 仅从环境变量 AMAP_KEY 读取（GitHub Actions Secrets / 本地 export），
绝不写入前端或代码库，满足规格书 7.1 安全要求。

节流说明：
  - REQUEST_INTERVAL：每次 API 调用后强制间隔，平滑请求速率，避免触发 QPS 限制。
  - QPS 限制自动重试：命中 CUQPS_HAS_EXCEEDED_THE_LIMIT 时按指数退避重试，
    不丢数据、不中断。

运行：
  export AMAP_KEY="你的高德Key"
  python crawler/crawler.py
"""
import os
import json
import sys
import time
import datetime
import requests

AMAP_KEY = os.environ.get('AMAP_KEY')
CITY = '杭州'
CITYCODE = '330100'
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

# ---- 请求节流参数（避免触发高德 QPS 限制）----
REQUEST_INTERVAL = 0.4   # 每次成功 API 调用后的基础间隔（秒）
QPS_RETRY_WAIT = 2.0     # 命中 QPS 限制后的初始等待（秒）
QPS_MAX_RETRIES = 6      # QPS 限制最多重试次数
PAGE_SIZE = 25           # 每页 POI 数量（高德上限）
MAX_PAGES = 12           # 每个关键词最多抓取页数（防止每日配额/运行时间过长）

SCHOOL_KEYWORDS = ['小学', '初中', '高中', '九年一贯制']
FACILITY_KEYWORDS = {
    'metro_stations': '地铁站',
    'commercial': '商场',
    'medical': '医院',
    'ecological': '公园',
}


def _get(url, params, retries=0):
    """调用高德 Web API 并返回 JSON 结果列表；命中 QPS 限制时指数退避重试。"""
    params = dict(params, key=AMAP_KEY, output='json')
    try:
        r = requests.get(url, params=params, timeout=15)
        data = r.json()
    except Exception as e:
        print(f"  [error] 请求失败: {e}", file=sys.stderr)
        return []

    if data.get('status') != '1':
        info = data.get('info', '')
        # 命中 QPS 限制 → 退避重试，不丢数据
        if 'QPS' in info and retries < QPS_MAX_RETRIES:
            wait = QPS_RETRY_WAIT * (retries + 1)
            print(f"  [retry] 命中 QPS 限制，{wait:.1f}s 后第 {retries+1} 次重试...", file=sys.stderr)
            time.sleep(wait)
            return _get(url, params, retries + 1)
        print(f"  [warn] API 返回异常: {info}", file=sys.stderr)
        return []

    # 成功一次后稍作间隔，平滑后续请求
    time.sleep(REQUEST_INTERVAL)
    return data.get('pois', [])


def fetch_schools():
    """通过高德 POI 文本搜索分页获取杭州学校（真实开放数据）。"""
    schools = []
    for kw in SCHOOL_KEYWORDS:
        page = 1
        kw_count = 0
        while page <= MAX_PAGES:
            pois = _get('https://restapi.amap.com/v3/place/text',
                        {'keywords': kw, 'city': CITY, 'citylimit': 'true',
                         'offset': PAGE_SIZE, 'page': page})
            if not pois:
                break
            for p in pois:
                loc = p.get('location', '')
                if ',' not in loc:
                    continue
                lng, lat = loc.split(',')
                schools.append({
                    'school_id': f"AMAP/{p.get('id','')}",
                    'school_name': p.get('name', '未知'),
                    'school_type': kw if kw != '九年一贯制' else '九年一贯制',
                    'school_level': '待补全',
                    'district': p.get('adname', '待补全'),
                    'block': '待补全',
                    'address': p.get('address', '待补全'),
                    'latitude': round(float(lat), 6),
                    'longitude': round(float(lng), 6),
                    'official_website': '',
                    'feeder_communities': [],
                    'feeder_schools': [],
                    'admission_policy': '待补全',
                    'policy_source': '待补全',
                    'policy_update': '',
                })
                kw_count += 1
            # 本页不足一页，说明已到末尾
            if len(pois) < PAGE_SIZE:
                break
            page += 1
        print(f'  [{kw}] 抓取 {kw_count} 条')
    # 去重（同名学校只保留一条）
    seen = set()
    uniq = []
    for s in schools:
        if s['school_name'] in seen:
            continue
        seen.add(s['school_name'])
        uniq.append(s)
    return uniq


def enrich_blocks():
    """对已存在的 block_info.json 各板块，用高德周边搜索补全配套。"""
    path = os.path.join(DATA_DIR, 'block_info.json')
    if not os.path.exists(path):
        print('[skip] 缺少 block_info.json，跳过板块补全', file=sys.stderr)
        return
    with open(path, encoding='utf-8') as f:
        block_data = json.load(f)
    for b in block_data.get('blocks', []):
        coords = b.get('polygon_coords')
        if not coords:
            continue
        # 取多边形中心（平均）作为周边搜索中心，比首点更准确
        lats = [c[0] for c in coords]
        lngs = [c[1] for c in coords]
        lat = sum(lats) / len(lats)
        lng = sum(lngs) / len(lngs)
        for field, kw in FACILITY_KEYWORDS.items():
            pois = _get('https://restapi.amap.com/v3/place/around',
                        {'location': f'{lng},{lat}', 'keywords': kw, 'radius': 3000,
                         'citylimit': 'true', 'offset': 15, 'page': 1})
            b[field] = [p.get('name') for p in pois if p.get('name')][:8]
    block_data['_meta'] = {
        'source': '高德 Web 服务 API（真实开放数据） + 板块中心近似坐标',
        'is_sample': False,
        'note': '配套经高德周边搜索补全；学区划分/等级仍待教育局源或用户补全；房价来自用户数据。',
        'update_time': datetime.date.today().isoformat(),
    }
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(block_data, f, ensure_ascii=False, indent=2)
    print(f'  已补全 {len(block_data.get("blocks", []))} 个板块配套')


def main():
    if not AMAP_KEY:
        print('[error] 未设置环境变量 AMAP_KEY。请在 GitHub Actions Secrets 或本地 export 中配置高德 Key。', file=sys.stderr)
        print('         申请流程见 docs/API-Key-配置指南.md', file=sys.stderr)
        sys.exit(1)
    print('开始抓取学校 POI（高德，分页 + QPS 退避重试）...')
    schools = fetch_schools()
    out = {
        '_meta': {
            'source': '高德 Web 服务 API（真实开放数据，合规）',
            'is_sample': False,
            'note': '学校名称/坐标为真实高德数据；学区划分/等级/对口/政策待教育局源补全。',
            'update_time': datetime.date.today().isoformat(),
        },
        'schools': schools,
    }
    with open(os.path.join(DATA_DIR, 'school_district.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'  写入 {len(schools)} 所学校（去重后）')
    enrich_blocks()
    print('抓取完成。房价数据请由用户提供真实 house_price.json。')


if __name__ == '__main__':
    main()
