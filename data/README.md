# 数据文件说明（data/）

本目录为平台唯一数据源，前端通过 `fetch` 读取。请按以下 schema 提供/维护数据。

## house_price.json（小区房价）
```json
{
  "_meta": { "source": "你的真实数据源", "is_sample": false, "update_time": "2026-07-19" },
  "communities": [ { ... } ]
}
```
每条 community 字段（规格书 3.2）：
`community_id, community_name, district, block, address, latitude, longitude, avg_price, total_price, area, layout, floor, orientation, build_year, decoration, listing_count, price_change, data_source, update_time`

## school_district.json（学区）
```json
{ "_meta": { "is_sample": false }, "schools": [ { ... } ] }
```
字段：`school_id, school_name, school_type(小学/初中/高中), school_level(省重点/市重点/普通), district, block, address, latitude, longitude, official_website, feeder_communities, feeder_schools, admission_policy, policy_source, policy_update`

## block_info.json（板块）
```json
{ "_meta": { "is_sample": false }, "blocks": [ { ... } ] }
```
字段：`block_id, block_name, district, polygon_coords, avg_price, price_change, listing_count, schools, metro_lines, metro_stations, commercial, medical, ecological`

## 接入方式
- **手动**：直接替换本目录 JSON 文件（保持 schema 与 `_meta.is_sample=false`）。
- **自动**：配置 `AMAP_KEY` 后，GitHub Actions 每日用高德 POI 刷新 `school_district.json` 与 `block_info.json` 的配套字段；房价仍由你提供。

> ⚠️ 当前仓库内为**示例/真实学校混合数据**：`school_district.json` 的学校来自 OpenStreetMap（真实），`house_price.json` 与 `block_info.json` 价格为示例，请替换。
