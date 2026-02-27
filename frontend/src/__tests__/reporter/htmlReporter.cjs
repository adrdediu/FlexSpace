// src/__tests__/reporter/htmlReporter.cjs
// Custom Jest reporter that generates a polished, self-contained HTML report.
// Drop-in replacement / complement to jest-html-reporters.
// Output: <rootDir>/test-report/report.html

'use strict';

const fs = require('fs');
const path = require('path');

class HtmlReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options || {};
    // Use globalConfig.rootDir so this works regardless of cwd.
    // Never rely on <rootDir> strings — those are Jest config tokens only.
    const root = globalConfig.rootDir || process.cwd();
    this._outputDir = path.join(root, 'test-report');
    this._outputFile = path.join(this._outputDir, 'report.html');
    this._results = [];
    this._startTime = Date.now();
  }

  onTestResult(_test, testResult) {
    const suite = {
      suiteName: testResult.testFilePath
        .replace(process.cwd(), '')
        .replace(/\\/g, '/')
        .replace(/^\//, ''),
      duration: testResult.perfStats.end - testResult.perfStats.start,
      tests: testResult.testResults.map(t => ({
        fullName: t.fullName,
        ancestorTitles: t.ancestorTitles,
        title: t.title,
        status: t.status,         // 'passed' | 'failed' | 'pending'
        duration: t.duration || 0,
        failureMessages: t.failureMessages || [],
      })),
    };
    this._results.push(suite);
  }

  onRunComplete(_contexts, results) {
    const elapsed = ((Date.now() - this._startTime) / 1000).toFixed(2);

    const totals = {
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      pending: results.numPendingTests,
      total: results.numTotalTests,
      suites: results.numTotalTestSuites,
      elapsed,
      timestamp: new Date().toLocaleString(),
    };

    if (!fs.existsSync(this._outputDir)) {
      fs.mkdirSync(this._outputDir, { recursive: true });
    }

    const html = buildHtml(this._results, totals);
    fs.writeFileSync(this._outputFile, html, 'utf8');
    console.log(`\n📊 HTML report saved → ${this._outputFile}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML builder
// ─────────────────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusIcon(status) {
  if (status === 'passed')  return '<span class="icon pass-icon">✓</span>';
  if (status === 'failed')  return '<span class="icon fail-icon">✕</span>';
  return '<span class="icon skip-icon">○</span>';
}

function formatDuration(ms) {
  if (!ms || ms < 1) return '<1ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function buildSuiteRows(suites) {
  return suites.map((suite, si) => {
    const suitePass  = suite.tests.filter(t => t.status === 'passed').length;
    const suiteFail  = suite.tests.filter(t => t.status === 'failed').length;
    const suiteSkip  = suite.tests.filter(t => t.status === 'pending').length;
    const suiteState = suiteFail > 0 ? 'failed' : 'passed';

    const testRows = suite.tests.map((t, ti) => {
      const failures = t.failureMessages.map(msg =>
        `<pre class="failure-msg">${esc(msg.slice(0, 1200))}${msg.length > 1200 ? '\n… (truncated)' : ''}</pre>`
      ).join('');

      return `
        <tr class="test-row ${t.status}" data-suite="${si}">
          <td class="test-status-cell">${statusIcon(t.status)}</td>
          <td class="test-name-cell">
            <span class="ancestor">${esc(t.ancestorTitles.join(' › '))}</span>
            <span class="test-title">${esc(t.title)}</span>
            ${failures ? `<div class="failures">${failures}</div>` : ''}
          </td>
          <td class="test-duration">${formatDuration(t.duration)}</td>
        </tr>`;
    }).join('');

    return `
      <tbody class="suite-group" id="suite-${si}">
        <tr class="suite-header ${suiteState}" onclick="toggleSuite(${si})">
          <td colspan="3">
            <div class="suite-header-inner">
              <span class="suite-chevron" id="chev-${si}">▼</span>
              <span class="suite-path">${esc(suite.suiteName)}</span>
              <span class="suite-badges">
                ${suitePass  ? `<span class="badge pass-badge">${suitePass} passed</span>` : ''}
                ${suiteFail  ? `<span class="badge fail-badge">${suiteFail} failed</span>` : ''}
                ${suiteSkip  ? `<span class="badge skip-badge">${suiteSkip} skipped</span>` : ''}
                <span class="badge time-badge">${formatDuration(suite.duration)}</span>
              </span>
            </div>
          </td>
        </tr>
        ${testRows}
      </tbody>`;
  }).join('');
}

function buildHtml(suites, totals) {
  const passRate = totals.total > 0
    ? Math.round((totals.passed / totals.total) * 100)
    : 0;

  const overallState = totals.failed > 0 ? 'failed' : 'passed';

  const suiteRows = buildSuiteRows(suites);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlexSpace · Test Report</title>
  <style>
    /* ── Reset & Base ──────────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --pass:   #22c55e;
      --fail:   #ef4444;
      --skip:   #f59e0b;
      --bg:     #0f1117;
      --surface:#161b27;
      --card:   #1c2333;
      --border: #2a3349;
      --text:   #e2e8f0;
      --muted:  #64748b;
      --accent: #6366f1;
      --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
      --font-ui: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-ui);
      font-size: 14px;
      line-height: 1.6;
      min-height: 100vh;
    }

    /* ── Header ────────────────────────────────────────────────────────── */
    .header {
      background: linear-gradient(135deg, #1a1f35 0%, #0f1117 60%);
      border-bottom: 1px solid var(--border);
      padding: 32px 48px 28px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 36px; height: 36px;
      background: var(--accent);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800; color: #fff;
      letter-spacing: -1px;
      flex-shrink: 0;
    }

    .brand-text h1 {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
    }

    .brand-text p {
      font-size: 12px;
      color: var(--muted);
      margin-top: 2px;
    }

    .header-meta {
      text-align: right;
      font-size: 12px;
      color: var(--muted);
      line-height: 1.8;
    }

    .header-meta strong { color: var(--text); }

    /* ── Status Banner ─────────────────────────────────────────────────── */
    .status-banner {
      padding: 0 48px;
      margin-top: -1px;
    }

    .status-bar {
      height: 4px;
      border-radius: 0 0 4px 4px;
      background: var(--pass);
    }

    .status-bar.failed { background: var(--fail); }

    /* ── Summary Cards ─────────────────────────────────────────────────── */
    .summary {
      padding: 32px 48px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
      position: relative;
      overflow: hidden;
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }

    .card.pass-card::before  { background: var(--pass); }
    .card.fail-card::before  { background: var(--fail); }
    .card.skip-card::before  { background: var(--skip); }
    .card.total-card::before { background: var(--accent); }
    .card.time-card::before  { background: #8b5cf6; }

    .card-value {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -2px;
      line-height: 1;
      margin-bottom: 6px;
    }

    .pass-card  .card-value { color: var(--pass); }
    .fail-card  .card-value { color: var(--fail); }
    .skip-card  .card-value { color: var(--skip); }
    .total-card .card-value { color: var(--accent); }
    .time-card  .card-value { color: #a78bfa; font-size: 28px; }

    .card-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--muted);
    }

    /* ── Progress bar ──────────────────────────────────────────────────── */
    .progress-wrap {
      padding: 0 48px 32px;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .progress-label strong { color: var(--text); }

    .progress-track {
      height: 8px;
      background: var(--border);
      border-radius: 99px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 99px;
      background: linear-gradient(90deg, var(--pass), #86efac);
      transition: width 0.6s ease;
    }

    .progress-fill.has-failures {
      background: linear-gradient(90deg, var(--pass), #86efac ${passRate}%, var(--fail) ${passRate}%);
    }

    /* ── Toolbar ───────────────────────────────────────────────────────── */
    .toolbar {
      padding: 0 48px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 6px 16px;
      border-radius: 99px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      font-family: var(--font-ui);
    }

    .filter-btn:hover,
    .filter-btn.active {
      background: var(--card);
      color: var(--text);
      border-color: var(--accent);
    }

    .filter-btn.pass-btn.active  { border-color: var(--pass); color: var(--pass); }
    .filter-btn.fail-btn.active  { border-color: var(--fail); color: var(--fail); }
    .filter-btn.skip-btn.active  { border-color: var(--skip); color: var(--skip); }

    .expand-all-btn {
      margin-left: auto;
      padding: 6px 16px;
      border-radius: 99px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      font-size: 12px;
      cursor: pointer;
      font-family: var(--font-ui);
      transition: all 0.15s;
    }

    .expand-all-btn:hover {
      background: var(--card);
      color: var(--text);
    }

    /* ── Table ─────────────────────────────────────────────────────────── */
    .results-wrap {
      padding: 0 48px 48px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    .suite-header {
      cursor: pointer;
      user-select: none;
    }

    .suite-header td {
      padding: 0;
    }

    .suite-header-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 2px;
      transition: background 0.15s;
    }

    .suite-header:hover .suite-header-inner {
      background: var(--card);
    }

    .suite-header.failed .suite-header-inner {
      border-left: 3px solid var(--fail);
    }

    .suite-header.passed .suite-header-inner {
      border-left: 3px solid var(--pass);
    }

    .suite-chevron {
      color: var(--muted);
      font-size: 10px;
      transition: transform 0.2s;
      flex-shrink: 0;
    }

    .suite-chevron.collapsed { transform: rotate(-90deg); }

    .suite-path {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text);
      flex: 1;
    }

    .suite-badges {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .badge {
      padding: 2px 10px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
    }

    .pass-badge  { background: rgba(34,197,94,0.15);  color: var(--pass); }
    .fail-badge  { background: rgba(239,68,68,0.15);  color: var(--fail); }
    .skip-badge  { background: rgba(245,158,11,0.15); color: var(--skip); }
    .time-badge  { background: rgba(99,102,241,0.12); color: #818cf8; }

    /* Test rows */
    .test-row td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(42,51,73,0.5);
      vertical-align: top;
    }

    .test-row:last-child td { border-bottom: none; }

    .test-row.passed { background: transparent; }
    .test-row.failed { background: rgba(239,68,68,0.04); }
    .test-row.pending { background: rgba(245,158,11,0.03); opacity: 0.7; }

    .test-status-cell {
      width: 36px;
      text-align: center;
      padding-top: 10px;
    }

    .icon { font-size: 13px; font-weight: 700; }
    .pass-icon { color: var(--pass); }
    .fail-icon { color: var(--fail); }
    .skip-icon { color: var(--skip); }

    .test-name-cell { padding-left: 4px; }

    .ancestor {
      display: block;
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 2px;
    }

    .test-title {
      font-size: 13px;
      color: var(--text);
    }

    .test-duration {
      width: 80px;
      text-align: right;
      font-size: 11px;
      color: var(--muted);
      font-family: var(--font-mono);
      padding-top: 10px;
      white-space: nowrap;
    }

    /* Failure messages */
    .failures {
      margin-top: 10px;
    }

    .failure-msg {
      background: rgba(239,68,68,0.06);
      border: 1px solid rgba(239,68,68,0.2);
      border-left: 3px solid var(--fail);
      border-radius: 6px;
      padding: 12px 16px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: #fca5a5;
      white-space: pre-wrap;
      overflow-x: auto;
      margin-top: 6px;
      line-height: 1.7;
    }

    /* Hidden rows when filtering */
    .test-row.hidden { display: none; }
    .suite-group.all-hidden .suite-header { display: none; }

    /* ── Footer ────────────────────────────────────────────────────────── */
    .footer {
      border-top: 1px solid var(--border);
      padding: 20px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--muted);
    }

    /* ── Responsive ────────────────────────────────────────────────────── */
    @media (max-width: 700px) {
      .header, .summary, .toolbar, .results-wrap, .progress-wrap, .footer {
        padding-left: 16px;
        padding-right: 16px;
      }
      .summary { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header class="header">
    <div class="brand">
      <div class="brand-logo">FS</div>
      <div class="brand-text">
        <h1>FlexSpace Frontend</h1>
        <p>Test Report</p>
      </div>
    </div>
    <div class="header-meta">
      <div>Run at <strong>${esc(totals.timestamp)}</strong></div>
      <div>Duration <strong>${esc(totals.elapsed)}s</strong></div>
      <div>${totals.suites} suite${totals.suites !== 1 ? 's' : ''}</div>
    </div>
  </header>

  <!-- Status bar -->
  <div class="status-banner">
    <div class="status-bar ${overallState}"></div>
  </div>

  <!-- Summary cards -->
  <section class="summary">
    <div class="card pass-card">
      <div class="card-value">${totals.passed}</div>
      <div class="card-label">Passed</div>
    </div>
    <div class="card fail-card">
      <div class="card-value">${totals.failed}</div>
      <div class="card-label">Failed</div>
    </div>
    <div class="card skip-card">
      <div class="card-value">${totals.pending}</div>
      <div class="card-label">Skipped</div>
    </div>
    <div class="card total-card">
      <div class="card-value">${totals.total}</div>
      <div class="card-label">Total Tests</div>
    </div>
    <div class="card time-card">
      <div class="card-value">${esc(totals.elapsed)}s</div>
      <div class="card-label">Duration</div>
    </div>
  </section>

  <!-- Progress bar -->
  <div class="progress-wrap">
    <div class="progress-label">
      <span>Pass rate</span>
      <strong>${passRate}%</strong>
    </div>
    <div class="progress-track">
      <div class="progress-fill ${totals.failed > 0 ? 'has-failures' : ''}"
           style="width: ${passRate}%"></div>
    </div>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <button class="filter-btn active" onclick="filter('all', this)">All</button>
    <button class="filter-btn fail-btn" onclick="filter('failed', this)">Failed</button>
    <button class="filter-btn pass-btn" onclick="filter('passed', this)">Passed</button>
    <button class="filter-btn skip-btn" onclick="filter('pending', this)">Skipped</button>
    <button class="expand-all-btn" onclick="toggleAll()">Collapse all</button>
  </div>

  <!-- Results table -->
  <div class="results-wrap">
    <table>
      ${suiteRows}
    </table>
  </div>

  <footer class="footer">
    <span>Generated by FlexSpace custom Jest reporter</span>
    <span>Jest ${esc(process.env.npm_package_devDependencies_jest || '')}</span>
  </footer>

  <script>
    let allExpanded = true;
    let activeFilter = 'all';

    function toggleSuite(idx) {
      const tbody = document.getElementById('suite-' + idx);
      const chev  = document.getElementById('chev-' + idx);
      const rows  = tbody.querySelectorAll('.test-row');
      const isHidden = rows.length > 0 && rows[0].style.display === 'none';
      rows.forEach(r => r.style.display = isHidden ? '' : 'none');
      chev.classList.toggle('collapsed', !isHidden);
    }

    function toggleAll() {
      const btn = document.querySelector('.expand-all-btn');
      allExpanded = !allExpanded;
      document.querySelectorAll('.test-row').forEach(r => {
        if (!r.classList.contains('hidden')) {
          r.style.display = allExpanded ? '' : 'none';
        }
      });
      document.querySelectorAll('.suite-chevron').forEach(c => {
        c.classList.toggle('collapsed', !allExpanded);
      });
      btn.textContent = allExpanded ? 'Collapse all' : 'Expand all';
    }

    function filter(status, btn) {
      activeFilter = status;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.test-row').forEach(r => {
        if (status === 'all') {
          r.classList.remove('hidden');
          r.style.display = '';
        } else {
          const match = r.classList.contains(status);
          r.classList.toggle('hidden', !match);
          r.style.display = match ? '' : 'none';
        }
      });

      // Hide suite headers where all tests are filtered out
      document.querySelectorAll('.suite-group').forEach(tbody => {
        const visibleTests = tbody.querySelectorAll('.test-row:not(.hidden)');
        const header = tbody.querySelector('.suite-header');
        if (header) header.style.display = visibleTests.length === 0 ? 'none' : '';
      });
    }

    // Auto-expand failed suites on load, collapse passed ones if there are failures
    window.addEventListener('DOMContentLoaded', () => {
      const hasFailed = document.querySelectorAll('.test-row.failed').length > 0;
      if (hasFailed) {
        document.querySelectorAll('.suite-group').forEach((tbody, idx) => {
          const hasSuiteFail = tbody.querySelectorAll('.test-row.failed').length > 0;
          if (!hasSuiteFail) {
            // collapse passing suites so failures are prominent
            const rows = tbody.querySelectorAll('.test-row');
            const chev = document.getElementById('chev-' + idx);
            rows.forEach(r => r.style.display = 'none');
            if (chev) chev.classList.add('collapsed');
          }
        });
      }
    });
  </script>
</body>
</html>`;
}

module.exports = HtmlReporter;
