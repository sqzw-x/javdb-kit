import { useCallback, useRef, useState } from "react";

import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "../config";
import { download, syncWatched, timestamp } from "../features/exporter";
import { markList } from "../features/marker";
import { pageKind } from "../site";
import { clearIndex, exportIndex, loadIndex, mergeRecords, saveIndex } from "../store";
import { toast } from "./toast";

type Tab = "overview" | "settings" | "data";

export interface PanelProps {
  open: boolean;
  onClose: () => void;
}

const PAGE_LABEL: Record<string, string> = {
  video: "影片详情",
  watched: "看过列表",
  want: "想看列表",
  list: "清单",
  "list-detail": "清单详情",
  other: "其他页面",
};

export function Panel({ open, onClose }: PanelProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [indexSize, setIndexSize] = useState(() => loadIndex().urls.size);
  const [busy, setBusy] = useState<string | null>(null);
  const stopRef = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const runSync = useCallback(async () => {
    if (busy) return;
    stopRef.current = false;
    setBusy("准备同步…");
    const index = loadIndex();
    try {
      const result = await syncWatched(index, {
        interval: settings.exporter.interval,
        shouldStop: () => stopRef.current,
        onProgress: ({ page, cards }) => setBusy(`同步中: 第 ${page} 页 / 已读取 ${cards} 条`),
      });
      saveIndex(index);
      setIndexSize(index.urls.size);
      // 同步完成后立刻刷新当前页徽标, 不必手动刷新
      markList(index, settings);
      toast(`已同步 ${result.pages} 页, 新增 ${result.added} 条`, "success");
    } catch (err) {
      console.error(err);
      toast(`同步失败: ${(err as Error).message}`, "danger");
    } finally {
      setBusy(null);
    }
  }, [busy, settings]);

  const exportIndexFile = useCallback(() => {
    download(`javdb-kit-watched-${timestamp()}.json`, JSON.stringify(exportIndex(loadIndex()), null, 2));
    toast("已导出本地索引", "success");
  }, []);

  const onPickFile = useCallback(() => fileRef.current?.click(), []);

  const onFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const added = mergeRecords(loadIndex(), JSON.parse(text));
      setIndexSize(loadIndex().urls.size);
      toast(added > 0 ? `已导入 ${added} 条` : "没有新增记录", added > 0 ? "success" : "info");
    } catch (err) {
      toast(`导入失败: ${(err as Error).message}`, "danger");
    }
  }, []);

  const onClear = useCallback(() => {
    if (!window.confirm("确定清空本地看过索引吗?")) return;
    clearIndex();
    setIndexSize(0);
    toast("已清空本地索引", "success");
  }, []);

  if (!open) return null;

  const settingsForm = (
    <div className="jdk-settings">
      <label className="checkbox">
        <input
          type="checkbox"
          checked={settings.player.unmute}
          onChange={(e) => updateSettings({ ...settings, player: { ...settings.player, unmute: e.target.checked } })}
        />
        &nbsp;播放预告片时自动解除静音
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={settings.player.autoSpeed}
          onChange={(e) => updateSettings({ ...settings, player: { ...settings.player, autoSpeed: e.target.checked } })}
        />
        &nbsp;按预告片时长自动设置倍速
      </label>
      <p className="jdk-hint">
        时长 &lt; {DEFAULT_SETTINGS.player.mediumAfter} 秒保持 1×;{DEFAULT_SETTINGS.player.mediumAfter}–
        {DEFAULT_SETTINGS.player.longAfter} 秒为 {DEFAULT_SETTINGS.player.mediumRate}×;超过{" "}
        {DEFAULT_SETTINGS.player.longAfter} 秒为 {DEFAULT_SETTINGS.player.longRate}×。只设置一次, 之后你可以自行改倍速。
      </p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={settings.marker.enabled}
          onChange={(e) => updateSettings({ ...settings, marker: { ...settings.marker, enabled: e.target.checked } })}
        />
        &nbsp;在列表页标记看过的影片
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={settings.marker.markMaybe}
          onChange={(e) => updateSettings({ ...settings, marker: { ...settings.marker, markMaybe: e.target.checked } })}
        />
        &nbsp;番号命中时再显示「可能看过」
      </label>
    </div>
  );

  return (
    <div className="modal is-active jdk-modal">
      <div className="modal-background" onClick={onClose} />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">JavDB Kit</p>
          <button className="delete" aria-label="close" onClick={onClose} />
        </header>
        <section className="modal-card-body">
          <div className="tabs is-boxed">
            <ul>
              <li className={tab === "overview" ? "is-active" : undefined}>
                <a
                  href="#overview"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("overview");
                  }}
                >
                  概览
                </a>
              </li>
              <li className={tab === "settings" ? "is-active" : undefined}>
                <a
                  href="#settings"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("settings");
                  }}
                >
                  设置
                </a>
              </li>
              <li className={tab === "data" ? "is-active" : undefined}>
                <a
                  href="#data"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("data");
                  }}
                >
                  数据
                </a>
              </li>
            </ul>
          </div>

          <div className="jdk-tab-content">
            {tab === "overview" && (
              <div>
                <p>
                  本地看过索引: <strong>{indexSize}</strong> 条
                </p>
                <p>当前页面: {PAGE_LABEL[pageKind()] ?? "其他页面"}</p>
                {busy && <progress className="progress is-small is-info" max="100" />}
                {busy && <p className="jdk-hint">{busy}</p>}
                <div className="buttons" style={{ marginTop: 12 }}>
                  <button className="button is-small is-info" disabled={Boolean(busy)} onClick={runSync}>
                    从「看过」列表同步索引
                  </button>
                  {busy && (
                    <button className="button is-small" onClick={() => (stopRef.current = true)}>
                      停止
                    </button>
                  )}
                </div>
                <p className="jdk-hint">同步会逐页读取你账号下的看过列表, 大约每页 0.4 秒, 只读不改数据。</p>
              </div>
            )}

            {tab === "settings" && settingsForm}

            {tab === "data" && (
              <div>
                <div className="buttons">
                  <button className="button is-small" onClick={exportIndexFile}>
                    导出本地索引
                  </button>
                  <button className="button is-small" onClick={onPickFile}>
                    导入记录
                  </button>
                  <button className="button is-small is-danger is-light" onClick={onClear}>
                    清空索引
                  </button>
                </div>
                <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={onFileChange} />
              </div>
            )}
          </div>
        </section>
        <footer className="modal-card-foot">
          <span className="jdk-hint">设置会自动保存</span>
        </footer>
      </div>
    </div>
  );
}
