import{_ as a,o as i,c as n,ag as l}from"./chunks/framework.CmaAMB6e.js";const F=JSON.parse('{"title":"10 · Shell 脚本入门","description":"","frontmatter":{"概念":"Shell 脚本入门","技能":"linux","阶段":"2-核心能力层","状态":"⬜未开始","更新日期":"2026-08-01T00:00:00.000Z"},"headers":[],"relativePath":"linux/concepts/10-shell-scripting.md","filePath":"linux/concepts/10-shell-scripting.md","lastUpdated":null}'),t={name:"linux/concepts/10-shell-scripting.md"};function e(p,s,h,k,o,d){return i(),n("div",null,[...s[0]||(s[0]=[l(`<h1 id="_10-·-shell-脚本入门" tabindex="-1">10 · Shell 脚本入门 <a class="header-anchor" href="#_10-·-shell-脚本入门" aria-label="Permalink to &quot;10 · Shell 脚本入门&quot;">​</a></h1><h2 id="概念简介" tabindex="-1">概念简介 <a class="header-anchor" href="#概念简介" aria-label="Permalink to &quot;概念简介&quot;">​</a></h2><p>前端把重复工作写成 JS 脚本（build、lint、部署脚本）；Linux 把重复工作写成 <strong>Shell 脚本</strong>——备份、部署、日志清理、监控，全部是 <code>.sh</code>。它是运维的「自动化最小单元」：语法轻、一次成型、哪里都能跑。不会写脚本的运维等于只会手动部署的前端。</p><p>本概念是 Shell 编程入门：<strong>脚本结构</strong>（#!/bin/bash + 可执行权限）、<strong>变量与引号</strong>、<strong>条件判断</strong>（if/test）、<strong>循环</strong>（for/while）、<strong>函数</strong>、<strong>调试</strong>（set -x）。学完能写出第一个真正有用的自动化脚本（如日志清理）。更进阶的参数解析与健壮性在阶段 5 的「Shell 脚本进阶」篇。</p><h2 id="核心内容" tabindex="-1">核心内容 <a class="header-anchor" href="#核心内容" aria-label="Permalink to &quot;核心内容&quot;">​</a></h2><h4 id="_1-脚本结构-shebang-可执行权限" tabindex="-1">1. 脚本结构：shebang + 可执行权限 <a class="header-anchor" href="#_1-脚本结构-shebang-可执行权限" aria-label="Permalink to &quot;1. 脚本结构：shebang + 可执行权限&quot;">​</a></h4><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 第一个脚本：hello.sh</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cat</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &gt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/hello.sh</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;&lt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;EOF&#39;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">#!/bin/bash</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 注释用中文，# 开头是注释，shebang 声明解释器</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">echo &quot;Hello, Linux!&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">EOF</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 三步跑起来：加执行权限 → 执行</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chmod</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +x</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/hello.sh</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/tmp/hello.sh</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">              # 用相对/绝对路径执行（直接敲 hello.sh 会找不到）</span></span></code></pre></div><p><strong>为什么必须 <code>#!/bin/bash</code></strong>：它告诉内核用哪个解释器跑这个文件。写成 <code>#!/usr/bin/env bash</code> 更灵活（类比 package.json bin 里的 <code>#!/usr/bin/env node</code>）。</p><p><strong>两个执行方式的区别</strong>：</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">bash</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/hello.sh</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         # 显式用 bash 解释，不需要执行权限</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">source</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/hello.sh</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">       # 在【当前】shell 里执行：脚本里 export 的变量会留下</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/tmp/hello.sh</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">              # 新起子 shell 执行：脚本里改的环境变量不影响当前会话</span></span></code></pre></div><h4 id="_2-变量与引号-脚本里的数据" tabindex="-1">2. 变量与引号：脚本里的数据 <a class="header-anchor" href="#_2-变量与引号-脚本里的数据" aria-label="Permalink to &quot;2. 变量与引号：脚本里的数据&quot;">​</a></h4><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cat</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &gt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/deploy.sh</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;&lt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;EOF&#39;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">#!/bin/bash</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 变量与引号：脚本的&quot;数据类型基础&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">app_dir=&quot;/var/www/app&quot;           # 赋值：等号两边无空格</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">backup_dir=&quot;\${app_dir}/backup&quot;   # \${} 花括号明确变量边界</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">echo &quot;备份目录: \${backup_dir}&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user=&quot;alice&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">echo &quot;用户: $user&quot;               # 双引号内 $ 会展开</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">echo &#39;用户: $user&#39;               # 单引号内原样输出</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 脚本内使用命令结果</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">today=$(date +%Y%m%d)</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">echo &quot;今天: \${today}&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 特殊变量：位置参数</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">echo &quot;脚本名: $0，参数个数: $#，第一个参数: $1&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 用法：./deploy.sh /var/www  → $1=/var/www</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">EOF</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chmod</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +x</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/deploy.sh</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/tmp/deploy.sh</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /var/www</span></span></code></pre></div><h4 id="_3-条件判断-if-test" tabindex="-1">3. 条件判断：if / test / [ ] <a class="header-anchor" href="#_3-条件判断-if-test" aria-label="Permalink to &quot;3. 条件判断：if / test / [ ]&quot;">​</a></h4><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cat</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &gt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/check.sh</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;&lt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;EOF&#39;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">#!/bin/bash</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 条件判断：核心是 test 表达式，[ ] 是 test 的简写（注意空格）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 文件判断（运维最高频）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">if [ -f /etc/nginx/nginx.conf ]; then</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;配置文件存在&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">else</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;配置文件不存在&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">fi                          # if 必须以 fi 结束</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 常用文件判断：-f 文件 -d 目录 -e 存在 -s 非空 -w 可写</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">[ -d /var/log ] &amp;&amp; echo &quot;日志目录在&quot;     # &amp;&amp; 短路：前面成立才执行后面</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 数值与字符串判断</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">count=10</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">if [ &quot;$count&quot; -gt 5 ]; then             # -gt 大于（-lt -ge -le -eq）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;count 大于 5&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">fi</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">name=&quot;admin&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">if [ &quot;$name&quot; = &quot;admin&quot; ]; then          # 字符串比较 =；!= 不相等</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;管理员&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">elif [ &quot;$name&quot; = &quot;guest&quot; ]; then</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;访客&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">else</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;未知用户&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">fi</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 组合条件：-a 且 / -o 或（或用 [[ ]] 写 &amp;&amp; ||，更现代）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">if [ -f /etc/nginx/nginx.conf ] &amp;&amp; [ -d /var/www ]; then</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;条件都满足&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">fi</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">EOF</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chmod</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +x</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/check.sh</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/tmp/check.sh</span></span></code></pre></div><p><strong>坑点预警</strong>：<code>[</code> 后面、<code>]</code> 前面、<code>=</code> 两边都必须有空格，<code>[ &quot;$name&quot;=&quot;admin&quot; ]</code>（没空格）会静默出错——脚本报错玄学的头号来源。</p><h4 id="_4-循环-for-while" tabindex="-1">4. 循环：for / while <a class="header-anchor" href="#_4-循环-for-while" aria-label="Permalink to &quot;4. 循环：for / while&quot;">​</a></h4><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cat</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &gt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/backup-rotate.sh</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;&lt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;EOF&#39;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">#!/bin/bash</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># for：遍历列表（清理 7 天前的备份文件——真实运维脚本雏形）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">backup_dir=&quot;/tmp/backups&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">mkdir -p &quot;$backup_dir&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">for day in {1..7}; do</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    touch &quot;\${backup_dir}/backup-2026080\${day}.tar.gz&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">done</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 遍历文件：for 文件名 in 通配符结果</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">for file in \${backup_dir}/*.tar.gz; do</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;待处理: \${file}&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">done</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># while：条件循环（经典：逐行读文件）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">line_no=1</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">while read -r line; do</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;第 \${line_no} 行: \${line}&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    line_no=$((line_no + 1))     # 算术运算 $(( ))</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">done &lt; /etc/hostname             # 重定向喂给 while 读</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">EOF</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chmod</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +x</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/backup-rotate.sh</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/tmp/backup-rotate.sh</span></span></code></pre></div><p><strong>for 与通配符</strong>：<code>for f in *.log</code> 靠 shell 展开通配符拿到文件列表；没有匹配时 <code>f</code> 会等于字面 <code>*.log</code>——前面 shell 基础篇的坑在脚本里同样存在。</p><h4 id="_5-函数-复用代码块" tabindex="-1">5. 函数：复用代码块 <a class="header-anchor" href="#_5-函数-复用代码块" aria-label="Permalink to &quot;5. 函数：复用代码块&quot;">​</a></h4><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cat</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &gt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/func-demo.sh</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;&lt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;EOF&#39;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">#!/bin/bash</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 函数：先定义后调用（调用时无需括号）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">log_info() {</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;[$(date +%H:%M:%S)] [INFO] $1&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">log_error() {</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    echo &quot;[$(date +%H:%M:%S)] [ERROR] $1&quot; &gt;&amp;2   # 错误走 stderr</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 返回值：$? 捕获命令/函数退出码（0 成功，非 0 失败）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">check_file() {</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    if [ -f &quot;$1&quot; ]; then</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">        return 0</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    else</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">        return 1</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    fi</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">log_info &quot;开始部署&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">check_file /etc/hostname &amp;&amp; log_info &quot;文件存在&quot; || log_error &quot;文件缺失&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"># 退出码即状态：脚本里用 $? 或 &amp;&amp; || 短路判断成败</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">EOF</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chmod</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +x</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/func-demo.sh</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/tmp/func-demo.sh</span></span></code></pre></div><p><strong>函数 vs 别名</strong>：函数能传参、能流程控制，脚本里的「别名」一律用函数实现（alias 在脚本中不生效）。</p><h4 id="_6-调试-set-x-与套路" tabindex="-1">6. 调试：set -x 与套路 <a class="header-anchor" href="#_6-调试-set-x-与套路" aria-label="Permalink to &quot;6. 调试：set -x 与套路&quot;">​</a></h4><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cat</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &gt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/debug-demo.sh</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;&lt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;EOF&#39;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">#!/bin/bash</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">set -e          # 任何命令失败立即退出（防止错误被忽略，生产脚本必加）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">set -u          # 使用未定义变量即报错（抓拼写错误）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">set -x          # 打印每条命令的执行过程（调试开关，类比 console.log 打点）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">app_dir=&quot;/var/www/app&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">echo &quot;开始处理 \${app_dir}&quot;</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">cd &quot;$app_dir&quot; 2&gt;/dev/null || { echo &quot;目录不存在，退出&quot;; exit 1; }</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">EOF</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chmod</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +x</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/debug-demo.sh</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/tmp/debug-demo.sh</span></span></code></pre></div><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 三件套：set -e -u -x 是脚本的「严格模式」三件套</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">#  -e 失败即停（默认脚本会忽略错误继续跑——静默失败是运维大忌）</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">#  -u 变量未定义即报（抓 typo）</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">#  -x 执行过程可见（调试完记得删，或改用 bash -x 临时调试）</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">bash</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> -x</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /tmp/debug-demo.sh</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   # 不改脚本也能 -x 调试</span></span></code></pre></div><p><strong>错误处理心法</strong>：默认 Shell 脚本「命令失败不中断」——和前端「异常不抛出继续跑」一样危险。生产脚本 <code>set -e</code> 起步，关键步骤显式 <code>|| exit 1</code> 兜底。</p><h2 id="常见陷阱" tabindex="-1">常见陷阱 <a class="header-anchor" href="#常见陷阱" aria-label="Permalink to &quot;常见陷阱&quot;">​</a></h2><ul><li><strong><code>[</code> 前后没空格</strong>：<code>[ -f $file]</code> 或 <code>[$file]</code> 全部语法错误或静默错判；<code>[</code> 和 <code>]</code> 都是独立单词，必须空格隔开。</li><li><strong>变量加引号</strong>：<code>if [ -f $file ]</code> 在 <code>$file</code> 为空或含空格时炸掉——脚本里所有变量引用都写 <code>&quot;$var&quot;</code>。</li><li><strong>chmod +x 忘了</strong>：<code>./script.sh</code> 报 <code>Permission denied</code>；要么加执行权限，要么 <code>bash script.sh</code>。</li><li><strong>set -e 救回静默失败</strong>：不写 <code>set -e</code> 时，rm 失败、cd 失败脚本都继续跑，最后「成功」了但其实全没做——一切自动化先 <code>set -e</code>。</li><li><strong>Windows/编辑器换行符</strong>：脚本报 <code>$&#39;\\r&#39;: command not found</code>——是 CRLF 换行惹的祸，<code>sed -i &#39;s/\\r$//&#39; script.sh</code> 或编辑器改 LF。</li><li><strong>source 与执行的差异</strong>：<code>bash script.sh</code> 里 export 的变量不会留在当前终端，要「当前会话生效」必须 <code>source</code>。</li></ul><h2 id="练习建议" tabindex="-1">练习建议 <a class="header-anchor" href="#练习建议" aria-label="Permalink to &quot;练习建议&quot;">​</a></h2><ol><li><strong>基础</strong>：写一个 hello 脚本跑通「shebang + chmod +x + 执行」四步；再写一个带 <code>$1</code> 位置参数的脚本，接收你的名字并问候。</li><li><strong>进阶</strong>：写「日志备份」脚本：把 /var/log 下 7 天前的 .log 文件用 tar 打包压缩归档到 /tmp/archives（for 循环 + 文件判断 + tar 命令组合），关键步骤输出中文日志。</li><li><strong>综合</strong>：写「部署前检查」脚本：检查 nginx 配置存在、80 端口未被占用、磁盘空间剩余 &gt; 1G，三项任一不满足就以非零码退出并输出中文报错（用函数 + set -e + &amp;&amp; || 组合），形成可复用的检查工具。</li></ol><blockquote><p>用 <code>/practice linux Shell 脚本入门</code> 生成更多针对性练习。</p></blockquote><h2 id="前端对照" tabindex="-1">前端对照 <a class="header-anchor" href="#前端对照" aria-label="Permalink to &quot;前端对照&quot;">​</a></h2><table tabindex="0"><thead><tr><th>前端 / JS</th><th>Shell 脚本</th></tr></thead><tbody><tr><td>package.json scripts</td><td>.sh 脚本文件</td></tr><tr><td>#!/usr/bin/env node</td><td>#!/bin/bash</td></tr><tr><td>const 变量 / 模板字符串</td><td>变量 + \${} 拼接</td></tr><tr><td>if / else / else if</td><td>if / elif / else + fi</td></tr><tr><td>forEach / for...of</td><td>for 循环遍历列表</td></tr><tr><td>while 读数组</td><td>while read 逐行处理</td></tr><tr><td>函数定义</td><td>function 定义（同名语法）</td></tr><tr><td>console.log 调试</td><td>set -x / echo</td></tr><tr><td>throw / try-catch</td><td>set -e + exit 1</td></tr><tr><td>lint 的「未定义变量」报错</td><td>set -u</td></tr></tbody></table><h2 id="参考链接" tabindex="-1">参考链接 <a class="header-anchor" href="#参考链接" aria-label="Permalink to &quot;参考链接&quot;">​</a></h2><ul><li><a href="https://tldp.org/LDP/Bash-Beginners-Guide/html/" target="_blank" rel="noreferrer">Bash Guide for Beginners（TLDP）</a></li><li><a href="https://www.gnu.org/software/bash/manual/bash.html" target="_blank" rel="noreferrer">Bash 参考手册（GNU 官方）</a></li><li><a href="https://google.github.io/styleguide/shellguide.html" target="_blank" rel="noreferrer">Google Shell 风格指南</a></li></ul>`,34)])])}const c=a(t,[["render",e]]);export{F as __pageData,c as default};
