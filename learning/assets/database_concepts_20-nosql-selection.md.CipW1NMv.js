import{_ as s,o as n,c as e,ag as p}from"./chunks/framework.CmaAMB6e.js";const u=JSON.parse('{"title":"20 · NoSQL 选型","description":"","frontmatter":{"概念":"NoSQL 选型","技能":"database","阶段":"4-NoSQL层","状态":"⬜未开始","更新日期":"2026-08-01T00:00:00.000Z"},"headers":[],"relativePath":"database/concepts/20-nosql-selection.md","filePath":"database/concepts/20-nosql-selection.md","lastUpdated":null}'),t={name:"database/concepts/20-nosql-selection.md"};function l(i,a,o,c,r,d){return n(),e("div",null,[...a[0]||(a[0]=[p(`<h1 id="_20-·-nosql-选型" tabindex="-1">20 · NoSQL 选型 <a class="header-anchor" href="#_20-·-nosql-选型" aria-label="Permalink to &quot;20 · NoSQL 选型&quot;">​</a></h1><h2 id="概念简介" tabindex="-1">概念简介 <a class="header-anchor" href="#概念简介" aria-label="Permalink to &quot;概念简介&quot;">​</a></h2><p>学完了 Redis、MongoDB、Elasticsearch,真正的挑战才开始:一个新项目,到底用哪个?选型不是「哪个新用哪个」,而是先想清楚数据的<strong>一致性要求、查询模式、规模与运维成本</strong>,再对号入座。后端行业最贵的技术债之一,就是把 MySQL 的活交给 Redis 干,或者为了「潮」引入整套 NoSQL 却手写事务。</p><p>本篇是 NoSQL 层的收官课:先建立 CAP 定理的直觉(分布式系统不可能三角),再给出四类存储的画像与决策树,然后是生产最常见的「多存储组合」(MySQL + Redis + ES),最后盘点选型的常见错误——包括前端工程师最容易带的「全家桶惯性」。</p><h2 id="核心内容" tabindex="-1">核心内容 <a class="header-anchor" href="#核心内容" aria-label="Permalink to &quot;核心内容&quot;">​</a></h2><h4 id="_1-cap-定理-不可能三角的直觉" tabindex="-1">1. CAP 定理:不可能三角的直觉 <a class="header-anchor" href="#_1-cap-定理-不可能三角的直觉" aria-label="Permalink to &quot;1. CAP 定理:不可能三角的直觉&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 1. CAP 直觉 ----------</span></span>
<span class="line"><span># 网络分区(P)不可避免:机器总会断网/宕机,分布式系统必然面对</span></span>
<span class="line"><span># 分区发生时,必须在两者之间选一个:</span></span>
<span class="line"><span>#   C(Consistency)一致性:所有节点永远读到同一份最新数据</span></span>
<span class="line"><span>#   A(Availability)可用性:每个请求都一定有响应(可能是旧数据)</span></span>
<span class="line"><span># 直觉:分区发生时,一个节点说&quot;我这边数据最新&quot;,你信不信?</span></span>
<span class="line"><span>#   - 信(继续服务)→ 可能读到旧数据 → 牺牲 C,保 A</span></span>
<span class="line"><span>#   - 不信(等它同步)→ 服务暂时不可用 → 牺牲 A,保 C</span></span>
<span class="line"><span># 四个存储的落点(直觉版,非严格二分):</span></span>
<span class="line"><span>#   MySQL:      CP——主从复制,主挂了短暂不可用,但绝不读到分歧数据</span></span>
<span class="line"><span>#   MongoDB:    CP(默认主节点写)+ 副本最终一致</span></span>
<span class="line"><span>#   Redis:      AP——分区时继续服务,可能读到旧缓存(缓存本来就可丢)</span></span>
<span class="line"><span>#   Elasticsearch: AP——分片继续可查,写入可能滞后(所以不能当主库)</span></span>
<span class="line"><span># 关键直觉:选型不是选&quot;哪个都满足&quot;,而是选&quot;牺牲哪个、怎么补偿&quot;</span></span>
<span class="line"><span># (补偿手段:业务幂等、消息重试、最终一致 + 对账)</span></span></code></pre></div><h4 id="_2-四类存储画像-一张表对号入座" tabindex="-1">2. 四类存储画像:一张表对号入座 <a class="header-anchor" href="#_2-四类存储画像-一张表对号入座" aria-label="Permalink to &quot;2. 四类存储画像:一张表对号入座&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 2. 四种存储各管一段 ----------</span></span>
<span class="line"><span># 关系型(MySQL / PostgreSQL)</span></span>
<span class="line"><span>#   强一致 + 事务 + 复杂关联查询;写入扩容量有限(要分库分表)</span></span>
<span class="line"><span>#   适用:订单、用户、账户——&quot;钱与账&quot;和一切不容出错的数据</span></span>
<span class="line"><span># 文档型(MongoDB)</span></span>
<span class="line"><span>#   无 JOIN 的灵活建模,水平扩展好;事务/关联弱于关系型</span></span>
<span class="line"><span>#   适用:内容、画像、埋点、物联网——结构多变、JSON 天然的数据</span></span>
<span class="line"><span># 键值型(Redis)</span></span>
<span class="line"><span>#   极致速度,结构简单;容量受内存限制,持久化弱</span></span>
<span class="line"><span>#   适用:缓存、会话、排行榜、限流、分布式锁</span></span>
<span class="line"><span># 搜索型(Elasticsearch)</span></span>
<span class="line"><span>#   全文检索 + 聚合分析;写入一致性弱,内存/运维成本高</span></span>
<span class="line"><span>#   适用:商品搜索、站内搜索、日志检索</span></span></code></pre></div><h4 id="_3-选型决策树" tabindex="-1">3. 选型决策树 <a class="header-anchor" href="#_3-选型决策树" aria-label="Permalink to &quot;3. 选型决策树&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 3. 决策树(按顺序回答) ----------</span></span>
<span class="line"><span># 问 1:这份数据要事务/强一致吗?</span></span>
<span class="line"><span>#   ├─ 要 → 关系型(MySQL 起步),没有悬念</span></span>
<span class="line"><span>#   └─ 不要 → 继续问</span></span>
<span class="line"><span># 问 2:查询模式是&quot;复杂关联查询&quot;吗?</span></span>
<span class="line"><span>#   ├─ 是 → 关系型(关联是关系型的强项,MongoDB 没有 JOIN)</span></span>
<span class="line"><span>#   └─ 否 → 继续问</span></span>
<span class="line"><span># 问 3:查询是&quot;按 key 快速存取&quot;还是&quot;灵活字段过滤&quot;?</span></span>
<span class="line"><span>#   ├─ 按 key、结构简单、要极快 → 键值型 Redis</span></span>
<span class="line"><span>#   ├─ 灵活字段、嵌套、JSON 天然 → 文档型 MongoDB</span></span>
<span class="line"><span>#   └─ 全文搜索、相关度排序 → Elasticsearch(常作为附加层,见第 4 节)</span></span>
<span class="line"><span># 兜底原则:拿不准 → 关系型。MySQL 能覆盖 80% 的业务,</span></span>
<span class="line"><span># 换 NoSQL 必须有明确理由(规模、性能、模型),而不是&quot;试试新技术&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 决策树的输出是一个&quot;主存储&quot;结论;缓存/搜索等加速层在确认主存储后叠加</span></span></code></pre></div><h4 id="_4-多存储组合-没有全能数据库" tabindex="-1">4. 多存储组合:没有全能数据库 <a class="header-anchor" href="#_4-多存储组合-没有全能数据库" aria-label="Permalink to &quot;4. 多存储组合:没有全能数据库&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 4. 典型电商组合:MySQL + Redis + ES ----------</span></span>
<span class="line"><span># MySQL:订单、库存、用户——强一致、要事务</span></span>
<span class="line"><span># Redis:热点商品缓存、购物车、登录会话、排行榜——要快、可丢</span></span>
<span class="line"><span># ES:   商品搜索——标题/描述分词搜索、相关度排序</span></span>
<span class="line"><span># 数据流(重点!):</span></span>
<span class="line"><span>#   写:应用写 MySQL(权威数据)→ 发消息(或订阅 binlog)</span></span>
<span class="line"><span>#       → 消费端同步到 ES、失效 Redis 缓存</span></span>
<span class="line"><span>#   读:读 Redis(命中直接返回)→ 未命中读 MySQL(回源并回填)</span></span>
<span class="line"><span>#   搜:直接查 ES(数据由同步链路保障)</span></span>
<span class="line"><span># 同步链路三种做法:</span></span>
<span class="line"><span>#   1. 应用代码双写(简单,但漏一处就出现不一致)</span></span>
<span class="line"><span>#   2. 消息队列异步同步(推荐:MQ 失败可重试,最终一致)</span></span>
<span class="line"><span>#   3. binlog 订阅(如 Canal:不侵入业务代码,但引入新组件)</span></span>
<span class="line"><span># 铁律:主库只有一个(MySQL),其余全是&quot;派生数据&quot;</span></span>
<span class="line"><span># 前端类比:React 里&quot;服务端状态&quot;以 React Query 为权威,</span></span>
<span class="line"><span># 派生缓存(localStorage/内存)只是加速层——数据库架构同理</span></span></code></pre></div><h4 id="_5-选型常见错误-黑名单" tabindex="-1">5. 选型常见错误:黑名单 <a class="header-anchor" href="#_5-选型常见错误-黑名单" aria-label="Permalink to &quot;5. 选型常见错误:黑名单&quot;">​</a></h4><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># ---------- 5. 六个经典错误 ----------</span></span>
<span class="line"><span># 1. 用 NoSQL 存&quot;要事务的数据&quot;:在 Redis/MongoDB 里手写事务/补偿,</span></span>
<span class="line"><span>#    复杂度全堆到业务代码上——该用 MySQL 的别躲</span></span>
<span class="line"><span># 2. 把缓存当主库:Redis 重启丢数据那一刻,订单也一起没了</span></span>
<span class="line"><span># 3. 用 ES 做关系型查询:在 ES 里做多表关联、事务——场景完全错位</span></span>
<span class="line"><span># 4. 数据量 100 万就分库分表:分库分表是&quot;最后手段&quot;不是&quot;必选动作&quot;,</span></span>
<span class="line"><span>#    先加索引、读写分离、缓存(见 15/17 篇),MySQL 单机扛得住</span></span>
<span class="line"><span># 5. 只看功能不看运维成本:ES/MongoDB 集群都要专人运维,</span></span>
<span class="line"><span>#    小型团队引入 = 引入一套新的故障源</span></span>
<span class="line"><span># 6. 全家桶惯性:&quot;技术栈清单里有 MongoDB 就用 MongoDB&quot;——</span></span>
<span class="line"><span>#    前端思维的坏习惯:选型应该从数据需求出发,不是从技术清单出发</span></span></code></pre></div><p><strong>要点</strong>:选型先问「要不要事务/强一致」,再问查询模式;MySQL 是默认答案,NoSQL 要有明确理由;生产常态是「MySQL 主库 + Redis 缓存 + ES 搜索」的组合,同步链路是组合的灵魂;CAP 不是考点,是「牺牲什么、怎么补偿」的思考框架。</p><h2 id="常见陷阱" tabindex="-1">常见陷阱 <a class="header-anchor" href="#常见陷阱" aria-label="Permalink to &quot;常见陷阱&quot;">​</a></h2><ul><li><strong>拿 CAP 当「三选二」教条</strong>:CAP 描述的是分区发生时的取舍,不是日常运行状态;别用「我们选 CA」这种伪选项应付面试,也别用「AP 所以可以丢数据」当借口。</li><li><strong>「Redis 快所以把 MySQL 干掉」</strong>:快不等于可靠;缓存层的命是「可以被清掉」,主库的命是「永远不能丢」。</li><li><strong>MongoDB 里做复杂关联</strong>:没有 JOIN,硬关联变成手写 N+1(见 12 篇);查询模式复杂时直接用 MySQL。</li><li><strong>ES 同步链路不做失败兜底</strong>:只双写不重试,一次网络抖动就出现搜不到新数据的幽灵问题;用消息队列 + 重试 + 对账。</li><li><strong>为「新技术」而选型</strong>:换 NoSQL 的理由必须是规模/性能/模型约束,「练手」「炫技」会让团队为你的好奇心买单。</li><li><strong>组合方案没有「主库」概念</strong>:MySQL 写、MySQL 读、Redis 也写——多个写入口,数据迟早分歧;写路径只走主库。</li></ul><h2 id="练习建议" tabindex="-1">练习建议 <a class="header-anchor" href="#练习建议" aria-label="Permalink to &quot;练习建议&quot;">​</a></h2><ol><li><strong>基础</strong>:把第 3 节的决策树当成作业:给出 5 个假想系统(电商订单、博客评论、站内搜索、用户会话、埋点日志),按决策树逐个走一遍并写下结论与理由。</li><li><strong>进阶</strong>:为「电商商品模块」画一张完整架构图:MySQL + Redis + ES 各自管什么、写路径怎么走、同步链路用什么(MQ 还是 binlog 订阅)、缓存怎么失效,并用文字把「一次上架商品的完整数据流」从头到尾写出来。</li><li><strong>综合</strong>:复盘你写过的任何一个真实系统(前端项目也行):如果它要加后端,按本篇决策树你会选什么存储组合?给出 2 个备选方案对比(单 MySQL vs MySQL+Redis),列出各自的优点、代价与风险,写成一页纸的选型设计文档。</li></ol><blockquote><p>用 <code>/practice database NoSQL 选型</code> 生成更多针对性练习。</p></blockquote><h2 id="前端对照" tabindex="-1">前端对照 <a class="header-anchor" href="#前端对照" aria-label="Permalink to &quot;前端对照&quot;">​</a></h2><table tabindex="0"><thead><tr><th>前端</th><th>数据库选型</th></tr></thead><tbody><tr><td>状态管理选型(Redux/Zustand/Jotai)</td><td>存储选型(MySQL/Redis/ES)</td></tr><tr><td>React Query 缓存(可失效)</td><td>Redis(快、可丢)</td></tr><tr><td>服务端状态权威源</td><td>MySQL(强一致、权威)</td></tr><tr><td>全局 store 派生状态</td><td>ES 搜索索引(派生数据)</td></tr><tr><td>localStorage 什么都存(坏味道)</td><td>把 Redis 当主库(坏味道)</td></tr><tr><td>全家桶惯性(生态绑架)</td><td>技术清单驱动选型(错误)</td></tr><tr><td>状态放哪 → 看生命周期</td><td>数据放哪 → 看一致性要求</td></tr></tbody></table><h2 id="参考链接" tabindex="-1">参考链接 <a class="header-anchor" href="#参考链接" aria-label="Permalink to &quot;参考链接&quot;">​</a></h2><ul><li><a href="https://en.wikipedia.org/wiki/CAP_theorem" target="_blank" rel="noreferrer">CAP 定理(Wikipedia)</a></li><li><a href="https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf" target="_blank" rel="noreferrer">Amazon DynamoDB 论文:可用性优先的设计</a></li><li><a href="https://www.mongodb.com/docs/manual/data-modeling/" target="_blank" rel="noreferrer">MongoDB 官方:何时使用文档型</a></li><li><a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html" target="_blank" rel="noreferrer">Elasticsearch:何时使用搜索型</a></li><li><a href="https://redis.io/docs/latest/develop/data-types/" target="_blank" rel="noreferrer">Redis 官方:何时使用键值型</a></li></ul>`,25)])])}const g=s(t,[["render",l]]);export{u as __pageData,g as default};
