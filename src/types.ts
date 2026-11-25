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

export interface WatchedIndex {
  /** /v/{id} 的 id 集合 */
  urls: Set<string>;
  /** 番号集合 */
  numbers: Set<string>;
}
