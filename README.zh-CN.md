# OpenClaw — Kosbling Edition

[English (default)](README.md) | 简体中文

基于 [OpenClaw](https://github.com/openclaw/openclaw) 的定制 fork，用于 [Kosbling AI Studio](https://kosbling.ai) 电商助手平台。

## 与上游的关系

- 上游仓库：`https://github.com/openclaw/openclaw.git`
- 同步方式：`git merge --no-ff` 保留合并记录
- 当前基线：`upstream/main`（2026-03-14 已同步，包含 `v2026.3.13-1`）

## 定制改动

所有改动在源码中标记 `// KOSBLING-PATCH`。

### 功能改造

- **Model 隔离**（`src/agents/edition-isolation.ts` + 多个文件）
  - 根级 `modelIsolation` 配置块，提供 `main` / `secondary` 两条隔离模型通道
  - 普通交互会话走 `main`，cron 和 subagent 流程走 `secondary`
  - `/model`、持久化 session override、`sessions.patch`、`sessions_spawn`、cron payload model、spawn 显式 model 都走同一套隔离归一化逻辑
  - 组内模型请求会保留，组外模型请求会被改写回当前组的有效模型
  - 支持 per-agent model override 和 main 组 token guardrail
  - 详细演进和对应 commit 见：[CHANGELOG.zh-CN.md#model-隔离演进时间线](CHANGELOG.zh-CN.md#model-隔离演进时间线)
  - 详见下方 [Model 隔离](#model-隔离) 章节

- **CLI Banner 品牌标识**（`src/cli/banner.ts`）
  - ASCII art 下方 `✦ Kosbling Edition ✦`，单行 banner `[Kosbling Edition]`

- **Web UI 定制版标识**（`ui/src/ui/app-render.ts` + `ui/src/styles/layout.css`）
  - 在上游新版控制台 UI 结构下，侧边栏继续保留可见的 `Kosbling Edition` 标记

- **CLI `--version` 显示 git commit hash**（`src/cli/program/context.ts`）
  - `openclaw -v` 输出格式：`2026.3.13-kosbling.7 (dee8c1468e)`

- **更新机制禁用**（`src/infra/update-startup.ts` + `src/cli/update-cli/update-command.ts` + `src/config/io.ts`）
  - `openclaw update` 提示用 git pull 方式
  - 启动时 update check 和 config version warning 跳过

- **System Prompt 注入**（`src/agents/system-prompt.ts`）
  - 所有 agent 的 system prompt 中包含 Kosbling Edition 说明
  - 包括 model isolation 配置参考和定制版行为说明

- **内置 `skill-creator` 技能**（`skills/skill-creator/**`）
  - 新增一套可复用的 Codex 技能，用于创建、审查、改进、打包和评估 AgentSkills
  - 包含配套 reviewer agents、打包/校验脚本、schema 参考资料和评估查看器

- **工具抓取路径的全局网络 SSRF 策略**（`src/infra/net/trusted-network-ssrf.ts` + 相关 tools/config）
  - 新增根级 `network.ssrfPolicy`，作为非浏览器网络工具的默认 SSRF 策略
  - 当前继承路径：`web_fetch`、`image` 远程 URL 加载、消息附件 URL 抓取
  - `tools.web.fetch.ssrfPolicy` 仍保留为每工具覆写（优先级高于 `network.ssrfPolicy`）
  - 兼容旧配置：若未设置 `network.ssrfPolicy`，运行时会回退到 `browser.ssrfPolicy`
  - 推荐稳态：全局行为用 `network.ssrfPolicy`，浏览器策略保持 browser 作用域内

### Bug 修复

> 标注 `[上游]` 的是官方代码的 bug，`[Kosbling]` 的是我们改造引入需要配套的修复。

- **`[Kosbling]` `fallbackConfigured` 不检查 `modelIsolation` fallbacks**（`src/agents/pi-embedded-runner/run.ts`）
  - 上游 `fallbackConfigured` 只检查 `agents.defaults.model.fallbacks`，不检查 `modelIsolation` 配置的 fallbacks，导致所有 failover 检查被跳过
  - 修复：扩展 `fallbackConfigured` 同时检查 `modelIsolation.enabled` + `main/secondary.fallbacks`

- **`[Kosbling]` /status 误报 fallback**（`src/auto-reply/status.ts`）
  - session 首次请求前，edition isolation 分支会错误显示 fallback 状态
  - 修复：加 `hasRuntimeModel` 检查，无运行时 model 时不显示 fallback

- **`[上游]` `block_deliver.dm_enable` 在飞书私聊（`p2p`）下不生效**（`src/channels/chat-type.ts` + tests）
  - 上游仅将 `direct`/`dm` 识别为私聊，未把飞书 `p2p` 映射到 `direct`
  - 导致 `block_deliver.block_disable=true` 且 `dm_enable=true` 时，飞书私聊仍被当成非 DM 进行切割
  - 修复：补齐 `p2p -> direct` 归一化映射，确保 DM 豁免逻辑按预期生效
  - 已提交官方 PR：[openclaw/openclaw#49819](https://github.com/openclaw/openclaw/pull/49819)
- **`[上游]` transcript-only `gateway-injected` assistant 消息泄漏到外部渠道**（`src/agents/pi-embedded-subscribe.handlers.messages.ts`）
  - 正常 assistant 回复可能先发出，随后一条 transcript-only 的 `provider=openclaw` / `model=gateway-injected` assistant 消息进入同一条对外投递链路，外部渠道会表现得像重复回复。
  - 修复：在 embedded subscribe 的 `handleMessageStart` / `handleMessageUpdate` / `handleMessageEnd` 中统一过滤 transcript-only injected assistant 消息。
  - 已提交官方 PR：[openclaw/openclaw#49779](https://github.com/openclaw/openclaw/pull/49779)
- **`[上游]` 订阅已有 embedded session 时会重放历史 assistant 回复**（`src/agents/pi-embedded-subscribe.ts` + handlers/tests）
  - 当订阅一个已有 embedded session 时，`session.messages` 中已经存在的历史 assistant 消息可能重新进入对外投递链路，表现得像重复回复。
  - 修复：在 embedded subscribe 处理中忽略 preexisting assistant 消息，同时保持新的 assistant 回复继续正常外发。
  - 已提交官方 PR：[openclaw/openclaw#50176](https://github.com/openclaw/openclaw/pull/50176)
- **`[上游]` 同一 embedded session 连续 Feishu 追问时，上一轮晚到的 assistant final 可能被误算进下一轮**（`src/agents/pi-embedded-subscribe.handlers.messages.ts` + tests）
  - 当用户在群里紧接着上一条 assistant 回复继续追问时，上一轮 run 的晚到 `message_end` 可能出现在下一轮 run 已经建立订阅之后。
  - 结果：下一轮会把这条上一轮的 assistant final 当成自己刚观察到的新回复，再次外发到 Feishu，表现成重复消息。
  - 修复：embedded subscribe 现在只接受当前 run 真正观察到 `message_start` 或实时 text delta 的 assistant 消息，上一轮晚到 final 会被忽略，不再重复发送。
- **`[上游]` provider 瞬态 INTERNAL 错误按可重试 timeout 分类**（`src/agents/pi-embedded-helpers/failover-matches.ts`）
  - `got status: INTERNAL` 和 `{"status":"INTERNAL","code":500}` 这类返回会归类为可重试的 timeout 风格 failover 错误。
  - 已提交官方 PR：[openclaw/openclaw#50148](https://github.com/openclaw/openclaw/pull/50148)

### 已被上游覆盖（不再是 fork 独有）

- **HTTP provider 错误现在会在上游触发 model fallback**（`src/agents/pi-embedded-runner/run.ts`）
  - 上游 embedded runner 已处理 `lastAssistant.stopReason="error"` 的 failover 路径，旧的 fork 专属 rethrow 补丁不再需要。
- **model fallback 可观测性已由上游接管**（`src/agents/model-fallback.ts`）
  - fork 里额外输出到 stdout 的 fallback attempt 日志已不再需要，上游现在有结构化 fallback decision 日志。
- **Models merge 模式下 provider baseUrl 优先级与 api 变化刷新**（`src/agents/models-config.ts`）
  - 旧的 fork 合并/baseUrl 保留补丁已移除，当前统一走上游 `planOpenClawModelsJson` 流程与上游测试覆盖。
- **HTTP 529 failover 分类**（`src/agents/failover-error.ts`）
  - 旧的 fork 状态码映射补丁已移除，当前统一走上游 `classifyFailoverReasonFromHttpStatus`（含 `529 -> rate_limit`）。
- **ACP `sessions.patch` 对 `acp:*` 会话键的血缘校验**（`src/gateway/sessions-patch.ts`）
  - 上游现已支持在 ACP 会话键上写入 spawn lineage 字段，旧的 fork 补丁可以继续移除。
- **Gateway 受管重启与孤儿进程防护**（`src/infra/process-respawn.ts`）
  - 当前实现来自上游，包含 supervisor marker 识别和 launchd kickstart 逻辑。
- **WebChat 在空 `final` 下保留流式文本**（`ui/src/ui/controllers/chat.ts` + `ui/src/ui/chat/grouped-render.ts`）
  - 上游现已在 `final` 无可见 assistant 内容时保留已流出的文本，因此先前的 fork UI 补丁不再必要。

### Model 隔离

Kosbling Edition 的 model 隔离，不只是把主对话和后台任务分成两组模型。
这块后来经过多次补丁和收敛，现在的实际行为已经演化成“一套覆盖主要模型选择入口的隔离归一化层”。
如果要按 commit 回看这项功能是怎么演进出来的，见 [CHANGELOG.zh-CN.md#model-隔离演进时间线](CHANGELOG.zh-CN.md#model-隔离演进时间线)。

`openclaw.json` 配置：

```json5
{
  modelIsolation: {
    enabled: true,
    main: {
      model: "anthropic/claude-opus-4-6",
      fallbacks: ["anthropic/claude-sonnet-4-6"],
      tokenGuardrail: {
        enabled: true,
        windowMinutes: 5,
        maxTokens: 20000,
      },
    },
    secondary: {
      model: "anthropic/claude-sonnet-4-6",
      fallbacks: ["anthropic/claude-haiku-3-5"],
    },
    agents: {
      writer: {
        model: "anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

### 它实际控制什么

- `main` 组：普通 agent 对话，例如私聊、群聊、TUI、WebChat 等主交互会话
- `secondary` 组：cron 运行和 subagent 运行
- fallback 严格留在组内，不会跨组串用
- 如果 `modelIsolation.enabled` 缺失或为 `false`，就回到官方原版行为

### 实际模型解析顺序

隔离开启后，运行时不是简单读一下 `main.model` / `secondary.model` 就结束，而是会按下面顺序解析每次运行的有效模型：

1. 先根据 session key 判断当前属于哪一组
2. 读取该组的主模型和 fallback 列表
3. 如果配置了 `modelIsolation.agents.<agentId>.model`，只有当它属于当前组 allowlist（主模型 + fallbacks）时才生效
4. 最终得到这次运行的组内有效模型

所以 per-agent override 不是第三条自由通道，而是“受当前组 allowlist 约束的组内覆写”。

### 哪些模型入口会被隔离归一化

现在不是只拦 `/model`，而是下面这些入口都会走同一套隔离归一化逻辑：

- `/model` 和其他聊天指令触发的模型切换
- 持久化的 session model override
- `sessions.patch`
- `sessions_spawn`
- cron `payload.model`
- subagent spawn / 内部运行初始化时传入的显式 model

实际效果是：

- 请求当前组 allowlist 内的模型：保留原请求
- 请求当前组之外的模型：自动改写回当前组的有效模型
- 请求非法模型字符串：仍然按正常错误处理

所以现在更准确的描述，不是“全部封死”，而是“所有主要入口都按当前隔离组做归一化”。

### Block 投递策略（新增）

```json5
{
  agents: {
    defaults: {
      block_deliver: {
        block_disable: true, // 对非 webchat 的 channel-target 禁用 block 投递
        dm_enable: true, // block_disable 开启时，私聊仍允许 block 投递
      },
    },
  },
}
```

- `block_disable`: `true` 时，非 `webchat` 目标不再接收 block/stream 分片，只接收最终回复。
- `dm_enable`: 在 `block_disable=true` 时，`direct` 私聊仍可接收 block/stream 分片。
  - 飞书补充：`p2p` 会被归一化为 `direct`。

行为：

- `enabled: false` 或不存在 → 走官方原版逻辑，零影响
- `enabled: true` → `main` 用于交互会话，`secondary` 用于 cron/subagent
- 两组完全隔离，fallback 不穿透，全挂则报错
- 所有主要模型选择入口都会按当前隔离组归一化，不允许跨 lane 漂移
- 会话级 `/model` 覆写仍会持久化，但运行时生效模型会被隔离策略重新归一化
- fallback 顺序也跟随当前隔离组（`main` / `secondary`）
- `/status` 只有在真正发生运行时 fallback 后才显示 fallback 行
- `/status` 的 Edition 行会保留当前隔离组基线

关于自定义 provider merge 行为（`openclaw.json` vs 每 agent 的 `models.json`），参见 [Models registry](https://docs.openclaw.ai/concepts/models#models-registry-modelsjson)。
模型/fallback 漂移后如需重置 token-window 缓存，可运行：`openclaw sessions cleanup --enforce --clear-context-tokens`（可选追加 `--clear-total-tokens-fresh`）。

### Model 隔离 token 护栏（main 组）

`modelIsolation.main.tokenGuardrail` 可为 main 组会话增加按 agent 维度的 token 护栏。
当该 agent 的 main 组会话在配置时间窗口内的加权 token 使用量超过阈值时，会暂停该 agent 的 main 组运行，直到你手动关闭该护栏。

作用域说明：

- 只影响 main 组；secondary 组 cron/subagent 不会被这个护栏暂停
- 状态按 agent 维度落盘到各自 agent 目录
- 当前状态可由 Gateway/UI 查询，也可通过下面的 CLI 命令手动解除

```json5
{
  modelIsolation: {
    enabled: true,
    main: {
      tokenGuardrail: {
        enabled: true,
        windowMinutes: 5,
        maxTokens: 20000,
      },
    },
  },
}
```

当前加权口径：

- `input * 1`
- `cacheRead * 0.1`
- `cacheWrite * 1.2`
- `output * 5`

按 agent 关闭护栏：

```bash
openclaw agents isolation-guardrail disable --agent <agent-id>
```

### 配置迁移

旧配置路径 `edition.modelIsolation` 和 `kosbling.modelIsolation` 会在启动时自动迁移到根级 `modelIsolation`。

## 开发规范

### 改动记录

所有改动必须同步更新本 README：

- **功能改造** → 记录在「功能改造」区
- **Bug 修复** → 记录在「Bug 修复」区
- 如涉及上游 bug，附上相关 issue 链接
- 如某个已记录的功能或修复已经向上游提交 PR，在对应条目后补充 `已提交官方 PR：...` 标记

### 功能改动必须同步 System Prompt

任何功能改动都必须考虑是否需要更新 `src/agents/system-prompt.ts` 中的 Kosbling Edition section。

### 代码标记

所有定制改动必须加 `// KOSBLING-PATCH` 注释，便于 upstream 同步时识别冲突。

## 安装

### 前置条件

- Node.js 22+
- pnpm

### 首次安装（目标机器）

```bash
git clone https://github.com/Openbling-ai/openclaw.git ~/.openclaw-kosbling
cd ~/.openclaw-kosbling
./build-and-link.sh
```

### 更新

```bash
cd ~/.openclaw-kosbling
git pull
./build-and-link.sh
```

### 开发机

在 fork 源码目录运行 `./build-and-link.sh` 只会构建，不会注册全局 CLI（避免与运行仓库冲突）。

改完代码后：

```bash
./build-and-link.sh          # 仅构建，验证编译通过
git add -A && git commit     # 提交
git push origin main         # 推送
```

然后在运行仓库（`~/.openclaw-kosbling`）pull + build 部署。

## 版本管理

版本格式：`{upstream_version}-kosbling.{patch}`

例如：`2026.3.13-kosbling.7`

中文变更日志：[`CHANGELOG.zh-CN.md`](./CHANGELOG.zh-CN.md)

版本号维护在仓库根目录的 `VERSION` 文件中，`build-and-link.sh` 构建时自动读取并写入 `package.json`。

### 发版流程

```bash
# 1. 更新 VERSION 文件
echo "2026.3.13-kosbling.7" > VERSION

# 2. 提交推送
git add -A && git commit -m "release: v2026.3.13-kosbling.7"
git push origin main
```

## 同步上游

```bash
git fetch upstream
git checkout upstream
git merge v2026.2.xx
git checkout main
git merge upstream --no-ff -m "Merge upstream v2026.2.xx"
git push origin main upstream
```

## 分支说明

- `main` — 主开发分支，包含所有 Kosbling Edition 定制
- `upstream` — 跟踪上游 OpenClaw，用于同步合并

## 许可证

沿用上游 OpenClaw 许可证。
