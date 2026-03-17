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
