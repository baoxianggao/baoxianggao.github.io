import{_ as a,o as n,c as i,ag as p}from"./chunks/framework.CmaAMB6e.js";const o=JSON.parse('{"title":"29 · 综合实战项目","description":"","frontmatter":{"概念":"综合实战项目","技能":"nodejs","阶段":"6-综合实战","状态":"⬜未开始","更新日期":"2026-08-01T00:00:00.000Z"},"headers":[],"relativePath":"nodejs/concepts/29-capstone-project.md","filePath":"nodejs/concepts/29-capstone-project.md","lastUpdated":null}'),e={name:"nodejs/concepts/29-capstone-project.md"};function l(t,s,h,r,d,k){return n(),i("div",null,[...s[0]||(s[0]=[p(`<h1 id="_29-·-综合实战项目" tabindex="-1">29 · 综合实战项目 <a class="header-anchor" href="#_29-·-综合实战项目" aria-label="Permalink to &quot;29 · 综合实战项目&quot;">​</a></h1><h2 id="概念简介" tabindex="-1">概念简介 <a class="header-anchor" href="#概念简介" aria-label="Permalink to &quot;概念简介&quot;">​</a></h2><p>这是 Node.js 学习线的收官篇：把 21-28 篇的能力（NestJS 架构、并发、缓存、安全、部署、可观测、微服务思维）串进一个<strong>完整可交付的后端项目</strong>。项目主题是「任务管理系统 API」（Task Management API）——既有典型的 CRUD 主流程，又有 JWT 认证、缓存、异步任务、测试、可观测、容器化部署，规模刚好覆盖资深级考核所需的全部能力点。</p><p>它是 <strong>L5 专家/架构师考核的项目载体</strong>：做完本篇全部阶段的验收标准，用 <code>/assess nodejs L5</code> 验证。考核不是看功能多炫，而是看四件事——<strong>架构分层是否清晰且能论证、性能与安全考量是否完整、测试与 CI 是否扎实、可观测是否到位</strong>（标准见 <code>levels.md</code>）。</p><h2 id="核心内容" tabindex="-1">核心内容 <a class="header-anchor" href="#核心内容" aria-label="Permalink to &quot;核心内容&quot;">​</a></h2><h4 id="_1-技术栈与数据模型" tabindex="-1">1. 技术栈与数据模型 <a class="header-anchor" href="#_1-技术栈与数据模型" aria-label="Permalink to &quot;1. 技术栈与数据模型&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 技术栈 ----------</span></span>
<span class="line"><span># 框架:   NestJS(模块化 + DI + 守卫/管道/拦截器)</span></span>
<span class="line"><span># 数据库: PostgreSQL + Prisma(参数化 ORM + 迁移)</span></span>
<span class="line"><span># 缓存:   Redis + ioredis(任务详情缓存 + 限流计数)</span></span>
<span class="line"><span># 队列:   BullMQ(导出任务等异步重活)</span></span>
<span class="line"><span># 认证:   JWT + bcrypt + AuthGuard</span></span>
<span class="line"><span># 测试:   Vitest(单元) + supertest(e2e)</span></span>
<span class="line"><span># 部署:   Docker 多阶段构建 + docker-compose + GitHub Actions</span></span>
<span class="line"><span># 可观测: pino 结构化日志 + prom-client /metrics + /health</span></span></code></pre></div><div class="language-prisma vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">prisma</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// ---------- 数据模型:prisma/schema.prisma ----------</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 模型即表结构定义,prisma migrate 后生成表</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">generator</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> client</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  provider </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;prisma-client-js&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">datasource</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> db</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  provider </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;postgresql&quot;</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   // 开发期可临时用 &quot;sqlite&quot;,上线换 PostgreSQL</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  url      </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> env</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;DATABASE_URL&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">model</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> User</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  id        </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">Int</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">      @id</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> @default</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">autoincrement</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">())</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  email     </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">String</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">   @unique</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  password  </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">String</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">               // 只存 bcrypt 哈希,绝不明文</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  tasks     </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">Task</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">[]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  createdAt </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">DateTime</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> @default</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">now</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">())</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">model</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> Task</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  id        </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">Int</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">      @id</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> @default</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">autoincrement</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">())</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  title     </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">String</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  done      </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">Boolean</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  @default</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  owner     </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">User</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">     @relation</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">fields</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">ownerId</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">], </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">references</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">id</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">])</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  ownerId   </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">Int</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">      // 每张任务表归属一个用户 -&gt; 越权防护的根基(见陷阱)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  createdAt </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">DateTime</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> @default</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">now</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">())</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  updatedAt </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">DateTime</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> @updatedAt</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><h4 id="_2-架构分层-每个模块三层-公共层" tabindex="-1">2. 架构分层：每个模块三层 + 公共层 <a class="header-anchor" href="#_2-架构分层-每个模块三层-公共层" aria-label="Permalink to &quot;2. 架构分层：每个模块三层 + 公共层&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 架构分层 ----------</span></span>
<span class="line"><span>task-api/</span></span>
<span class="line"><span>├── prisma/schema.prisma</span></span>
<span class="line"><span>├── src/</span></span>
<span class="line"><span>│   ├── main.ts                     # 入口:全局管道/过滤器/拦截器装配</span></span>
<span class="line"><span>│   ├── app.module.ts               # 根模块</span></span>
<span class="line"><span>│   ├── common/                     # 公共横切层(不承载业务)</span></span>
<span class="line"><span>│   │   ├── auth.guard.ts           # JWT 认证守卫</span></span>
<span class="line"><span>│   │   ├── logging.interceptor.ts  # 请求日志(requestId + 耗时)</span></span>
<span class="line"><span>│   │   └── http-exception.filter.ts# 统一错误响应格式</span></span>
<span class="line"><span>│   ├── auth/                       # 认证模块:注册/登录/签发 JWT</span></span>
<span class="line"><span>│   │   ├── auth.module.ts</span></span>
<span class="line"><span>│   │   ├── auth.controller.ts</span></span>
<span class="line"><span>│   │   └── auth.service.ts</span></span>
<span class="line"><span>│   ├── tasks/                      # 任务模块(核心业务域)</span></span>
<span class="line"><span>│   │   ├── tasks.module.ts</span></span>
<span class="line"><span>│   │   ├── tasks.controller.ts</span></span>
<span class="line"><span>│   │   ├── tasks.service.ts        # 业务规则:缓存读写、ownerId 过滤</span></span>
<span class="line"><span>│   │   ├── tasks.repository.ts     # 数据访问层:所有 Prisma 调用集中在这</span></span>
<span class="line"><span>│   │   └── dto/create-task.dto.ts  # class-validator 校验规则</span></span>
<span class="line"><span>│   └── queue/                      # 异步任务:导出 CSV</span></span>
<span class="line"><span>│       └── export.processor.ts     # BullMQ 消费者</span></span>
<span class="line"><span>└── test/</span></span>
<span class="line"><span>    ├── auth.e2e-spec.ts</span></span>
<span class="line"><span>    └── tasks.e2e-spec.ts</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 依赖方向(单向,不反向依赖):</span></span>
<span class="line"><span>#   Controller -&gt; Service -&gt; Repository -&gt; Prisma</span></span>
<span class="line"><span>#   守卫/拦截器/过滤器横切各层,不写业务</span></span></code></pre></div><h4 id="_3-阶段-1-3-crud-mvp-地基" tabindex="-1">3. 阶段 1-3：CRUD MVP（地基） <a class="header-anchor" href="#_3-阶段-1-3-crud-mvp-地基" aria-label="Permalink to &quot;3. 阶段 1-3：CRUD MVP（地基）&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 阶段 1:骨架 ----------</span></span>
<span class="line"><span># 范围: NestJS 项目初始化 + Prisma 接入 + /health</span></span>
<span class="line"><span># 步骤:</span></span>
<span class="line"><span>#   1. nest new task-api,清理模板代码</span></span>
<span class="line"><span>#   2. 装 prisma,定义 User/Task 模型,migrate 建表</span></span>
<span class="line"><span>#   3. /health 返回 { status: &quot;ok&quot; }</span></span>
<span class="line"><span># 验收标准(全部满足才算过):</span></span>
<span class="line"><span>#   [ ] npm run start:dev 启动,curl /health 返回 {&quot;status&quot;:&quot;ok&quot;}</span></span>
<span class="line"><span>#   [ ] npx prisma migrate dev 能建表,改动可热重载</span></span>
<span class="line"><span>#   [ ] 已配置统一响应格式骨架(成功/失败包一层)</span></span>
<span class="line"><span></span></span>
<span class="line"><span># ---------- 阶段 2:任务 CRUD ----------</span></span>
<span class="line"><span># 范围: tasks 模块(列表/详情/创建/更新/删除) + 全局异常过滤器</span></span>
<span class="line"><span># 验收标准:</span></span>
<span class="line"><span>#   [ ] curl 完成任务增删改查,不存在的 id 返回 404 且格式统一</span></span>
<span class="line"><span>#   [ ] 非法参数返回 400(ValidationPipe 已全局启用)</span></span>
<span class="line"><span>#   [ ] 分层到位:Controller 无业务逻辑,Repository 无 HTTP 概念</span></span>
<span class="line"><span>#   [ ] 删除后 Prisma 关联数据不残留外键错误(测试过 cascade)</span></span>
<span class="line"><span></span></span>
<span class="line"><span># ---------- 阶段 3:校验与分页 ----------</span></span>
<span class="line"><span># 范围: class-validator 全覆盖 + 分页/排序/筛选</span></span>
<span class="line"><span># 验收标准:</span></span>
<span class="line"><span>#   [ ] 标题 2-50 字、done 布尔类型等规则全部生效</span></span>
<span class="line"><span>#   [ ] 分页返回 { items, total, page, limit },page/limit 有上限</span></span>
<span class="line"><span>#   [ ] 支持按 done 筛选、按 createdAt 排序</span></span>
<span class="line"><span>#   [ ] 查询参数越界不 500,而是 400 或钳制到合理值</span></span></code></pre></div><h4 id="_4-阶段-4-5-认证-缓存-异步任务-资深能力" tabindex="-1">4. 阶段 4-5：认证 + 缓存 + 异步任务（资深能力） <a class="header-anchor" href="#_4-阶段-4-5-认证-缓存-异步任务-资深能力" aria-label="Permalink to &quot;4. 阶段 4-5：认证 + 缓存 + 异步任务（资深能力）&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 阶段 4:JWT 认证与授权 ----------</span></span>
<span class="line"><span># 范围: 注册/登录/bcrypt/AuthGuard/资源归属</span></span>
<span class="line"><span># 验收标准:</span></span>
<span class="line"><span>#   [ ] 注册后数据库里密码是 bcrypt 哈希,登录校验通过返回 JWT</span></span>
<span class="line"><span>#   [ ] 未带/带错 token 访问任务接口返回 401</span></span>
<span class="line"><span>#   [ ] 用户 A 只能看到自己的任务:所有查询带 ownerId 过滤(不是只查全表再前端过滤)</span></span>
<span class="line"><span>#   [ ] 登录接口限流(express-rate-limit,同 IP 15 分钟 5 次)</span></span>
<span class="line"><span>#   [ ] JWT 带过期时间,刷新/失效策略有说明(可先做过期即重登)</span></span>
<span class="line"><span></span></span>
<span class="line"><span># ---------- 阶段 5:缓存 + 异步任务 ----------</span></span>
<span class="line"><span># 范围: Redis 缓存任务详情 + BullMQ 导出任务 CSV</span></span>
<span class="line"><span># 验收标准:</span></span>
<span class="line"><span>#   [ ] 任务详情二次请求命中缓存(压测可见响应时间明显下降)</span></span>
<span class="line"><span>#   [ ] 更新/删除任务后缓存同步失效(先写库后删缓存,不是先更缓存)</span></span>
<span class="line"><span>#   [ ] 「导出我的任务」入队,worker 生成 CSV 写文件,失败自动重试 3 次</span></span>
<span class="line"><span>#   [ ] 导出接口立即返回任务 id,不阻塞等待生成完成</span></span>
<span class="line"><span>#   [ ] 演示过缓存穿透防护:不存在 id 有短期空值缓存</span></span></code></pre></div><h4 id="_5-阶段-6-7-测试-可观测-部署-工程交付" tabindex="-1">5. 阶段 6-7：测试 + 可观测 + 部署（工程交付） <a class="header-anchor" href="#_5-阶段-6-7-测试-可观测-部署-工程交付" aria-label="Permalink to &quot;5. 阶段 6-7：测试 + 可观测 + 部署（工程交付）&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 阶段 6:测试 ----------</span></span>
<span class="line"><span># 范围: 单元(Service + mock Repository) + e2e(认证 + 任务全流程)</span></span>
<span class="line"><span># 验收标准:</span></span>
<span class="line"><span>#   [ ] npm test 全绿,覆盖率 &gt;= 80%</span></span>
<span class="line"><span>#   [ ] e2e 覆盖:注册 -&gt; 登录 -&gt; 建任务 -&gt; 查任务 -&gt; 更新 -&gt; 删除 全链路</span></span>
<span class="line"><span>#   [ ] 测试用独立数据库,测试后清库,不污染开发数据</span></span>
<span class="line"><span>#   [ ] 覆盖「未登录 401」「访问他人任务 403/404」等安全分支</span></span>
<span class="line"><span>#   [ ] CI 里覆盖率不达标即失败(门禁不是摆设)</span></span>
<span class="line"><span></span></span>
<span class="line"><span># ---------- 阶段 7:可观测 + 部署 ----------</span></span>
<span class="line"><span># 范围: 结构化日志 + 指标 + Docker + CI/CD</span></span>
<span class="line"><span># 验收标准:</span></span>
<span class="line"><span>#   [ ] 每条请求日志带 requestId,一次请求的日志可串联检索</span></span>
<span class="line"><span>#   [ ] /metrics 返回 prom-client 指标,含请求耗时直方图</span></span>
<span class="line"><span>#   [ ] Dockerfile 多阶段构建,非 root 运行,启动即 /health 通过</span></span>
<span class="line"><span>#   [ ] docker-compose 编排 app+postgres+redis,一键起整套</span></span>
<span class="line"><span>#   [ ] GitHub Actions: lint + test(覆盖率) + npm audit + docker build 全绿</span></span>
<span class="line"><span>#   [ ] 数据库迁移纳入部署流程(启动时跑 prisma migrate deploy)</span></span></code></pre></div><h4 id="_6-常见坑-项目级别的「踩坑清单」" tabindex="-1">6. 常见坑（项目级别的「踩坑清单」） <a class="header-anchor" href="#_6-常见坑-项目级别的「踩坑清单」" aria-label="Permalink to &quot;6. 常见坑（项目级别的「踩坑清单」）&quot;">​</a></h4><ul><li><strong>认证修好了但漏了 ownerId 过滤</strong>：JWT 验证通过只解决「你是谁」，没解决「你能看谁的」——水平越权是 L5 评审最爱挑的点，每处查询都必须带归属条件。</li><li><strong>测试连开发库</strong>：跑一次测试开发数据被清空，测试与开发互相污染；测试库单独建，<code>afterAll</code> 清理。</li><li><strong>缓存时序错误</strong>：先更新缓存再写库、或删除缓存前有并发读回填——按 Cache-Aside 铁律：先写库、再删缓存。</li><li><strong><code>instances: &#39;max&#39;</code> 却把状态存内存</strong>：任务数据在进程 A，请求落到进程 B 查不到；一切共享状态进 PostgreSQL/Redis。</li><li><strong>队列任务不幂等</strong>：导出任务重试时重复执行产生两份文件；任务处理要支持「同一 job 重复执行结果一致」。</li><li><strong>把密钥提交进仓库</strong>：<code>.env</code> 必须进 <code>.gitignore</code>，提交 <code>.env.example</code> 模板，CI secrets 注入生产变量。</li><li><strong>每阶段不验收就往下走</strong>：欠的技术债（比如跳过测试阶段）会在 L5 答辩时全部暴露；验收标准是自测清单，不是装饰。</li></ul><h4 id="_7-l5-考核-做完之后" tabindex="-1">7. L5 考核：做完之后 <a class="header-anchor" href="#_7-l5-考核-做完之后" aria-label="Permalink to &quot;7. L5 考核：做完之后&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 完成所有验收标准后 ----------</span></span>
<span class="line"><span># 1. 用 /track nodejs 完成 29 更新进度</span></span>
<span class="line"><span># 2. 用 /assess nodejs L5 发起考核(见 levels.md 的 L5 标准)</span></span>
<span class="line"><span># 考核会覆盖:</span></span>
<span class="line"><span>#   知识: 架构/缓存/安全/可观测的取舍论证</span></span>
<span class="line"><span>#   代码: 现场讲解项目代码的职责分层与设计理由</span></span>
<span class="line"><span>#   项目: 答辩本项目 —— 架构图、每个阶段的决策与放弃项</span></span>
<span class="line"><span>#   架构: 给一个需求设计扩展方案(如新增「团队协作」功能怎么改)</span></span>
<span class="line"><span>#   评审: 指出他人代码/自己代码的问题与改进</span></span>
<span class="line"><span># 3. 建议提前准备:项目 README(架构图 + 决策记录 + 验收清单)</span></span>
<span class="line"><span>#    这张 README 本身就是答辩大纲</span></span></code></pre></div><p><strong>要点</strong>：这个项目的价值不在功能，在于「每一步都有验收标准、每个坑都踩过并知道为什么」。完成它意味着你具备了独立交付生产级后端的能力——这正是 L5 的定义。</p><h2 id="常见陷阱" tabindex="-1">常见陷阱 <a class="header-anchor" href="#常见陷阱" aria-label="Permalink to &quot;常见陷阱&quot;">​</a></h2><ul><li>见上文「项目级踩坑清单」：越权遗漏、测试污染、缓存时序、内存态共享、队列非幂等、密钥入库、跳过验收——任何一条都会在考核中暴露。</li><li>额外补充一条：<strong>贪功能不贪质量</strong>——不做「再加一个功能」，而是把已做的每个阶段打磨到验收标准以上，L5 看深度不看数量。</li></ul><h2 id="练习建议" tabindex="-1">练习建议 <a class="header-anchor" href="#练习建议" aria-label="Permalink to &quot;练习建议&quot;">​</a></h2><ol><li><strong>基础</strong>：按阶段 1-3 完成 CRUD MVP，逐条勾选验收标准，跑通 curl 全流程。</li><li><strong>进阶</strong>：按阶段 4-5 完成认证 + 缓存 + 导出队列，验证越权拦截与缓存失效时序。</li><li><strong>综合</strong>：按阶段 6-7 完成测试 + 可观测 + Docker + CI，写项目 README（架构图 + 决策记录 + 验收清单），最后 <code>/assess nodejs L5</code> 考核。</li></ol><blockquote><p>用 <code>/practice nodejs 综合实战项目</code> 生成更多针对性练习。</p></blockquote><h2 id="前端对照" tabindex="-1">前端对照 <a class="header-anchor" href="#前端对照" aria-label="Permalink to &quot;前端对照&quot;">​</a></h2><table tabindex="0"><thead><tr><th>前端项目</th><th>本后端项目</th></tr></thead><tbody><tr><td>React 组件 + 状态管理</td><td>NestJS 模块 + Service 分层</td></tr><tr><td>前端路由守卫</td><td>AuthGuard</td></tr><tr><td>zustand/redux 全局状态</td><td>Redis/PostgreSQL（共享状态外置）</td></tr><tr><td>表单校验库</td><td>class-validator DTO</td></tr><tr><td>前端懒加载</td><td>BullMQ 异步任务</td></tr><tr><td>CI 跑 lint + 测试</td><td>同 + audit + 覆盖率门禁</td></tr><tr><td>Vercel 部署</td><td>Docker + docker-compose</td></tr></tbody></table><h2 id="参考链接" tabindex="-1">参考链接 <a class="header-anchor" href="#参考链接" aria-label="Permalink to &quot;参考链接&quot;">​</a></h2><ul><li><a href="https://docs.nestjs.com/" target="_blank" rel="noreferrer">NestJS 官方文档</a></li><li><a href="https://www.prisma.io/docs" target="_blank" rel="noreferrer">Prisma 官方文档</a></li><li><a href="https://docs.bullmq.io/" target="_blank" rel="noreferrer">BullMQ 官方文档</a></li><li><a href="https://docs.docker.com/" target="_blank" rel="noreferrer">Docker 官方文档</a></li><li><a href="./../levels">本项目等级标准:levels.md</a></li></ul>`,30)])])}const g=a(e,[["render",l]]);export{o as __pageData,g as default};
