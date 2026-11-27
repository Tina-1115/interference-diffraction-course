#!/usr/bin/env python3
"""把 docs/專案報告.md 轉成站內頁面 report.html（修改報告後重跑：python3 docs/build_report.py）。"""
import os, re, markdown
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
md = open(os.path.join(root, 'docs', '專案報告.md'), encoding='utf-8').read()
title = re.match(r'#\s*(.+)', md).group(1).strip()
body = markdown.markdown(re.sub(r'^#\s*.+\n', '', md, count=1), extensions=['tables', 'fenced_code', 'sane_lists'])
body = body.replace('<table>', '<div class="tbl-wrap"><table class="tbl">').replace('</table>', '</table></div>')
html = f'''<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>專案報告｜干涉與繞射線上教材</title>
<link rel="stylesheet" href="assets/css/site.css">
<link rel="stylesheet" href="assets/css/textbook.css">
<style>.report h2{{margin-top:1.8em}}.report code,.report pre{{font-family:var(--mono);font-size:.88em}}.report pre{{background:var(--tb-note-bg);padding:.8rem 1rem;border-radius:10px;overflow-x:auto}}.report li{{margin:.25em 0}}.report table th{{text-align:left}}</style>
<script defer src="assets/js/site.js"></script>
</head>
<body data-page="report" data-prev="resources.html">
<a class="skip" href="#main">跳到主要內容</a>
<main id="main" class="report">
<header class="tb-section-head"><span class="tb-secno">附錄</span><h1>{title}</h1></header>
<p class="small muted">本頁由 docs/專案報告.md 產生；原始檔在 GitHub repo 的 docs 資料夾。</p>
{body}
</main>
<footer class="site-footer"></footer>
</body>
</html>
'''
open(os.path.join(root, 'report.html'), 'w', encoding='utf-8').write(html)
print('report.html written,', len(html), 'bytes')
