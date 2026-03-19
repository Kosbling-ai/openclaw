# 变更日志（中文版）

[English (default)](CHANGELOG.md) | 简体中文

文档主页：https://docs.openclaw.ai

> Kosbling Edition 精简变更日志。
> 仅记录对本 fork 实际有用的更新：上游同步节点、fork 定制行为变化、重要修复。

## Unreleased

- 上游同步目标已推进到 `v2026.3.13-1`。
- 文档流程：README 与 CHANGELOG 现为 fork 双语自维护文档；每次涉及用户可见行为的提交都要评估并同步中英文版本。
- Cron 隔离会话：在 fresh run（`forceNew`/过期重建）时清空继承的 `sessionFile`，避免新 `sessionId` 仍指向旧 transcript 文件。
- Web UI：在上游新版控制台壳层更新后，恢复侧边栏中的 `Kosbling Edition` 可见标识。

## Model 隔离演进时间线

- `8974918104` 初版 fork 功能：把主对话与 cron/subagent 分到不同模型通道。
- `ce60f9ef8d` 第一版强约束：隔离开启时直接禁止临时模型切换。
- `60287ff919` 增加 per-agent override，但要求它必须落在当前组 allowlist 内。
- `09a024afcc` 在 `/status` 中显示当前隔离组。
- `6203e08177` 让 `/status` 的 model 行反映隔离后实际选中的运行时模型。
- `bbe260d7be` 修正 `/status` fallback 行，只在真正发生 fallback 后显示。
- `c068fa0ea9` 将配置从旧命名空间迁移到根级 `modelIsolation`。
- `256d35c00f` 修复隔离模式下首次请求前的 fallback 误报。
- `ddd0bec980` 统一运行时模型解析，并开始通过共享隔离逻辑收口 override 约束。
- `4412588128` 把 sessions、spawn、cron 上的 model override 统一纳入隔离归一化。
- `a2b54ffbe9` 让 `sessions_spawn` 显式 model 请求也走同一套隔离归一化路径。
- `d5ec256e4d` 让持久化的 session model override 也遵守隔离后的有效模型解析。
- `7bf6d0f1a6` 增加 main 组 token guardrail 控制。
- `e3c29e8840` 将 guardrail 统计切换为加权 token 口径。
- `a2aa1a1e03` 对齐主要模型选择入口，让 `/model`、session override、`sessions.patch`、cron payload、spawn model 最终都遵守同一套隔离规则。

## 2026.3.8

- 上游基线同步至包含 `v2026.3.8`。
- 增加 model isolation main 组 token 护栏（加权统计 + WebChat/CLI 手动重置）。
- 增加 CLI 会话清理参数：`--clear-context-tokens` 与可选 `--clear-total-tokens-fresh`。
- 持续移除已被上游覆盖的 fork 补丁（models merge/baseUrl 优先级、failover 状态分类）。

## 2026.3.7

- 增强 fork 的 model isolation 行为与状态/运行时一致性。
- 改进 embedded runner 的 provider 失败 fallback 触发与日志可见性。
- 修复 channel DM 归一化（`p2p -> direct`），确保 block-deliver 行为一致。

## 维护约定

- 只写简洁、用户可感知的更新。
- 优先单行要点，不重复上游完整 release notes。
- 新增内容追加到当前活跃版本段末尾。
