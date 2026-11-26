/** 列表页解析出的一张影片卡片 */
export interface VideoCard {
  /** /v/ 后面的 id, 例如 nKPQY */
  urlId: string;
  /** 番号, 例如 PGD-298 */
  number: string;
  /** 标题 (去掉番号前缀) */
  title: string;
  /** 评分, 无评分时为 null */
  score: number | null;
  /** 评分人数 */
  scoreCount: number | null;
  /** 发行日期 YYYY-MM-DD */
  premiered: string;
  /** 是否含磁链 */
  hasMagnet: boolean;
  /** 是否可在线播放 */
  playable: boolean;
  /** 详情页地址 */
  href: string;
}

export type PageKind = "video" | "watched" | "want" | "list" | "list-detail" | "other";

/** 一条看过记录, 两个字段至少有一个非空 */
export interface WatchedRecord {
  /** /v/{id}, 缺省表示只有番号 */
  urlId?: string;
  /** 番号 (如 PGD-298), 缺省表示只有 urlId */
  number?: string;
}

export interface WatchedIndex {
  /** 结构化记录, 存储与导出的唯一来源 */
  records: WatchedRecord[];
  /** 由 records 派生的 urlId 集合, 仅用于匹配 */
  urls: Set<string>;
  /** 由 records 派生的番号集合, 仅用于匹配 */
  numbers: Set<string>;
}
