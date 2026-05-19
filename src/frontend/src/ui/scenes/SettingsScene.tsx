import React, { useEffect, useState } from "react";
import type { SettingsPageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler } from "../navigation.js";
import type { UiHostAction } from "../host-action.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";

export const SettingsScene: React.FC<{
  vm: SettingsPageViewModel;
  onNavigate?: AppNavigateHandler;
  onAction?: (action: UiHostAction) => Promise<void> | void;
}> = ({ vm, onNavigate, onAction }) => {
  const navigate = onNavigate ?? (() => {});
  const dispatch = onAction ?? (() => {});
  const [providerId, setProviderId] = useState(vm.provider.providerId);
  const [modelName, setModelName] = useState(vm.provider.modelName);
  const [endpoint, setEndpoint] = useState(vm.provider.endpoint);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setProviderId(vm.provider.providerId);
    setModelName(vm.provider.modelName);
    setEndpoint(vm.provider.endpoint);
  }, [vm.provider.providerId, vm.provider.modelName, vm.provider.endpoint]);

  const saveProviderConfig = async () => {
    await dispatch({
      type: "settings.saveProviderConfig",
      request: {
        providerId: providerId.trim() || "deepseek",
        modelName: modelName.trim() || "deepseek-v4-flash",
        endpoint: endpoint.trim(),
        apiKey: apiKey.trim()
      }
    });
    setApiKey("");
  };

  return (
    <SceneShell
      sceneId="settings"
      tone="settings"
      eyebrow="系统控制台"
      title={vm.title}
      subtitle="在这里配置运行提供商、模型和密钥，并直接看到当前配置是否已经应用到本地运行时。"
      backAction={
        <ActionButton action={{ label: "返回模式大厅", kind: "navigate-back", enabled: true }} onClick={() => navigate({ scene: "menu" })} />
      }
      actions={<ActionButton action={vm.actions.backToMenu} onClick={() => navigate({ scene: "menu" })} />}
      contentClassName="psy-settings-layout"
    >
      <div className="psy-settings-clusters">
        <section className="psy-settings-cluster">
          <div className="psy-settings-cluster__header">
            <div className="psy-section-label">模型提供商</div>
            <span className="psy-status-pill">{vm.provider.apiKeyConfigured ? "已接入密钥" : "本地演示模式"}</span>
          </div>
          <h2 className="psy-block__title">{vm.provider.providerId} / {vm.provider.modelName}</h2>
          <p className="psy-block__copy">
            当前运行模式：{vm.provider.providerVersion}。{vm.provider.endpoint || "未覆盖默认端点。"}
          </p>
          <div className="psy-settings-meta">
            <span>{vm.provider.timeoutMs} 毫秒</span>
            <span>{vm.provider.maxRetries} 次重试</span>
            <span>{vm.provider.apiKeyConfigured ? `密钥已配置 ${vm.provider.apiKeyPreview}` : "密钥未配置"}</span>
          </div>
          {vm.providerTest ? (
            <div className="psy-settings-meta">
              <span>{vm.providerTest.success ? "连接正常" : "连接失败"}</span>
              <span>{vm.providerTest.latencyMs} 毫秒</span>
              {vm.providerTest.errorMessage ? <span>{vm.providerTest.errorMessage}</span> : null}
            </div>
          ) : (
            <p className="psy-meta-text">保存配置后可继续测试连接，结果会直接显示在这里。</p>
          )}
        </section>

        <section className="psy-settings-cluster">
          <div className="psy-settings-cluster__header">
            <div className="psy-section-label">运行配置</div>
            <span className="psy-status-pill">保存后即时重建</span>
          </div>
          <h2 className="psy-block__title">DeepSeek / 本地演示切换</h2>
          <div className="psy-composer">
            <label className="psy-settings-field">
              <span className="psy-section-label">提供商</span>
              <input className="psy-text-input" value={providerId} onChange={(event) => setProviderId(event.target.value)} placeholder="deepseek" />
            </label>
            <label className="psy-settings-field">
              <span className="psy-section-label">模型</span>
              <input className="psy-text-input" value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="deepseek-v4-flash" />
            </label>
            <label className="psy-settings-field">
              <span className="psy-section-label">接口地址</span>
              <input className="psy-text-input" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://api.deepseek.com" />
            </label>
            <label className="psy-settings-field">
              <span className="psy-section-label">DeepSeek API 密钥</span>
              <input className="psy-text-input" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-..." />
            </label>
            <div className="psy-action-row">
              <ActionButton action={vm.actions.saveProviderConfig} onClick={saveProviderConfig} />
              <ActionButton action={vm.actions.testProviderConnection} onClick={() => dispatch({ type: "settings.testProviderConnection" })} />
            </div>
            <p className="psy-meta-text">填入 API 密钥并保存后，主进程会重建运行时。未配置密钥时，应用会继续使用本地演示后端。</p>
          </div>
        </section>
      </div>

      <aside className="psy-panel psy-settings-panel--aside">
        <div className="psy-section-label">导出与目录</div>
        <h2 className="psy-block__title">{vm.dataDirectory.rootPath}</h2>
        <p className="psy-block__copy">
          当前导出格式：{vm.exportSettings.selectedFormat}。容量估算：{vm.dataDirectory.totalSizeEstimate}。
        </p>
        <div className="psy-scope-list">
          {vm.dataDirectory.scopes.map((scope) => (
            <div key={scope.scope} className="psy-scope-item">
              <span className="psy-consent-item__mark" />
              <div>{scope.scope}：{scope.path}（{scope.exists ? "可用" : "缺失"}）</div>
            </div>
          ))}
        </div>
        <div className="psy-settings-meta">
          <span>{vm.exportSettings.lastExport ? `最近导出：${vm.exportSettings.lastExport.fileName}` : "尚未导出"}</span>
          <span>{vm.cleanup.lastCleanup ? `最近清理：${vm.cleanup.lastCleanup.slice(0, 16)}` : "尚未清理"}</span>
        </div>
        <div className="psy-action-row">
          <ActionButton action={vm.actions.changeDataDirectory} onClick={() => dispatch({ type: "settings.refreshDataDirectory" })} />
          <ActionButton action={vm.actions.exportData} onClick={() => dispatch({ type: "settings.runExport" })} />
          <ActionButton action={vm.actions.runCleanup} onClick={() => dispatch({ type: "settings.runCleanup" })} />
        </div>
      </aside>
    </SceneShell>
  );
};
