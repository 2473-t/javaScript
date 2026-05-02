/*******************************
 * CF IP Optimizer — Web 配置面板 (script-analyze-echo-response version)
 *
 * ========== 部署 ==========
 * [rewrite_local]
 * ^http:\/\/cfui\.com(\/.*)?$ url script-analyze-echo-response https://YOUR_HOST/cf-optimizer-ui.js
 *
 * ========== 使用 ==========
 * Safari 打开: http://cfui.com → 显示配置页面 → 修改参数 → 保存
 *
 * ========== 修复记录 ==========
 * v1.1: 保存改用 GET query params ($request.body 在 script-response-body 不可用)
 *       + 配置历史记录 (最近5条, 可恢复)
 *       + 保存/运行状态指示器
 *       + "运行优选" 按钮 + 上次结果展示
 *       + 内置订阅生成 (EdgeTunnel)
 *******************************/

const CONFIG_KEY = "cf_opt_config";
const HISTORY_KEY = "cf_opt_config_history";
const SUB_CONFIG_KEY = "cf_sub_config";
const MAX_HISTORY = 5;

const DEFAULTS = {
    workerHost: "",
    testCount: 200,
    batchSize: 20,
    maxLatency: 300,
    latencyTimeout: 3000,
    dlCount: 15,
    dlBytes: 524288,
    dlTimeout: 10000,
    dlConcurrency: 2,
    dlPort: 80,
    useIpv6: false,
    preferColo: "",
    speedtestPath: "/speedtest",
    warmup: true,
    notifyDetail: true,
    customIps: ""
};

const SUB_DEFAULTS = {
    subType: "vless",
    uuid: "",
    servername: "",
    path: "/",
    port: "443",
    network: "ws",
    nodeCount: 3,
    edgeDomain: "",
    edgeKey: "",
    fingerprint: "chrome",
    ech: "true",
    echServer: "cloudflare-ech.com",
    skipCert: "false",
    namePrefix: "CF优选"
};

const NO_CACHE = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
};

function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function jsStr(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
}

function loadConfig() {
    try {
        var raw = $prefs.valueForKey(CONFIG_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function loadHistory() {
    try {
        var raw = $prefs.valueForKey(HISTORY_KEY);
        if (!raw) return [];
        var h = JSON.parse(raw);
        return Array.isArray(h) ? h : [];
    } catch (e) { return []; }
}

function loadSummary() {
    try {
        var raw = $prefs.valueForKey("cf_opt_summary");
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function loadSubConfig() {
    try {
        var raw = $prefs.valueForKey(SUB_CONFIG_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function loadResults() {
    try {
        var raw = $prefs.valueForKey("cf_opt_result");
        if (!raw) return [];
        var r = JSON.parse(raw);
        return Array.isArray(r) ? r : [];
    } catch (e) { return []; }
}

function reqURL() {
    try {
        return $request ? ($request.url || "") : "";
    } catch (e) { return ""; }
}

function formatTime(ts) {
    try {
        var d = new Date(ts);
        var mm = d.getMonth() + 1;
        var dd = d.getDate();
        var h = d.getHours();
        var m = d.getMinutes();
        return (mm < 10 ? "0" : "") + mm + "/" + (dd < 10 ? "0" : "") + dd + " "
            + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    } catch (e) { return ""; }
}

// ── 保存历史 ──
function saveToHistory(config) {
    try {
        var raw = $prefs.valueForKey(HISTORY_KEY);
        var history = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(history)) history = [];
        var entry = { _savedAt: config._savedAt };
        var keys = Object.keys(DEFAULTS);
        for (var i = 0; i < keys.length; i++) {
            entry[keys[i]] = config[keys[i]];
        }
        // 去重: 相同 workerHost + testCount + customIps 视为重复
        var dupIdx = -1;
        for (var j = 0; j < history.length; j++) {
            if (history[j].workerHost === entry.workerHost
                && history[j].testCount === entry.testCount
                && history[j].customIps === entry.customIps) {
                dupIdx = j;
                break;
            }
        }
        if (dupIdx >= 0) history.splice(dupIdx, 1);
        history.unshift(entry);
        if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        $prefs.setValueForKey(JSON.stringify(history), HISTORY_KEY);
    } catch (e) {}
}

// ── 处理保存请求 (GET query params) ──
function handleSave() {
    try {
        var url = reqURL();
        var qIdx = url.indexOf("?data=");
        if (qIdx < 0) {
            return { ok: false, error: "No data in URL" };
        }
        var raw = "";
        try {
            raw = decodeURIComponent(url.substring(qIdx + 6));
        } catch (e) {
            return { ok: false, error: "Invalid URL encoding" };
        }
        var data = JSON.parse(raw);

        if (!data || typeof data !== "object") {
            return { ok: false, error: "Invalid data" };
        }

        var config = {};
        var keys = Object.keys(DEFAULTS);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            config[k] = (data[k] !== undefined) ? data[k] : DEFAULTS[k];
        }
        // Convert numeric fields
        var numFields = ["testCount","batchSize","maxLatency","latencyTimeout",
            "dlCount","dlBytes","dlTimeout","dlConcurrency","dlPort"];
        for (var j = 0; j < numFields.length; j++) {
            var nf = numFields[j];
            config[nf] = parseInt(config[nf]) || DEFAULTS[nf];
        }
        // Convert booleans
        config.useIpv6 = config.useIpv6 === true || config.useIpv6 === "true";
        config.warmup = config.warmup !== false && config.warmup !== "false";
        config.notifyDetail = config.notifyDetail !== false && config.notifyDetail !== "false";

        config._savedAt = Date.now();

        $prefs.setValueForKey(JSON.stringify(config), CONFIG_KEY);
        saveToHistory(config);

        // 处理"运行优选"请求
        var isRun = data._run === true || data._run === "true";
        if (isRun) {
            $prefs.setValueForKey("1", "cf_opt_run_pending");
        }

        return { ok: true, isRun: isRun };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ── 处理订阅参数保存 ──
function handleSubSave() {
    try {
        var url = reqURL();
        var qIdx = url.indexOf("?data=");
        if (qIdx < 0) return { ok: false, error: "No data" };
        var raw = decodeURIComponent(url.substring(qIdx + 6));
        var data = JSON.parse(raw);

        var config = {};
        var keys = Object.keys(SUB_DEFAULTS);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            config[k] = (data[k] !== undefined) ? data[k] : SUB_DEFAULTS[k];
        }
        config.nodeCount = parseInt(config.nodeCount) || SUB_DEFAULTS.nodeCount;
        config.port = String(parseInt(config.port) || SUB_DEFAULTS.port);
        config._savedAt = Date.now();

        $prefs.setValueForKey(JSON.stringify(config), SUB_CONFIG_KEY);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ═══════════════════════════════════════
// 渲染函数
// ═══════════════════════════════════════

function renderStatusBadge(cfg) {
    if (cfg._savedAt) {
        return '<div class="status-ok">'
            + '<span class="status-dot"></span>'
            + '已加载 | Worker: ' + esc(cfg.workerHost || "(未设置)")
            + ' | 保存于 ' + esc(formatTime(cfg._savedAt))
            + '</div>';
    }
    return '<div class="status-new">'
        + '首次使用 — 请填写 Worker 域名并保存配置'
        + '</div>';
}

function renderSummaryCard(summary) {
    if (!summary || !summary.bestIP) return "";
    var ts = summary.timestamp ? esc(formatTime(summary.timestamp)) : "未知";
    var speed = summary.bestSpeed ? summary.bestSpeed.toFixed(1) + "MB/s " : "";
    var colo = summary.bestColo ? summary.bestColo + " " : "";
    return '<div class="card summary-card">'
        + '<div class="card-title">上次优选结果</div>'
        + '<div class="summary-text">' + esc(ts) + '</div>'
        + '<div class="summary-best">最优: ' + esc(summary.bestIP) + ' '
        + esc(summary.bestLatency) + 'ms ' + esc(colo) + esc(speed) + '</div>'
        + '<div class="summary-total">共测 ' + esc(String(summary.totalTested || "?")) + ' 个IP, 有效 '
        + esc(String(summary.validCount || "?")) + ' 个</div>'
        + '</div>';
}

function renderHistoryCard(history) {
    if (!history || history.length === 0) return "";
    var html = '<div class="card"><div class="card-title">配置历史 (点击恢复)</div>';
    for (var i = 0; i < history.length; i++) {
        var h = history[i];
        var label = esc(h.workerHost || "(无Worker)") + " | "
            + esc(String(h.testCount)) + "IP | "
            + (h._savedAt ? esc(formatTime(h._savedAt)) : "");
        // Escape JSON for onclick attribute
        var jsonStr = jsStr(JSON.stringify(h));
        html += '<div class="hist-item" onclick="restoreConfig(\'' + jsonStr + '\')">'
            + '<span class="hist-label">' + esc(label) + '</span>'
            + '<span class="hist-arrow">&rsaquo;</span>'
            + '</div>';
    }
    html += '</div>';
    return html;
}

function renderSubCard(subCfg) {
    var cfg = {};
    var keys = Object.keys(SUB_DEFAULTS);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        cfg[k] = (subCfg[k] !== undefined) ? subCfg[k] : SUB_DEFAULTS[k];
    }
    return '<div class="card">'
        + '<div class="card-title">订阅生成 (EdgeTunnel)</div>'
        + '<div class="row"><span class="lbl">类型</span>'
        + '<select id="s-type">'
        + '<option value="vless"' + (cfg.subType === "vless" ? " selected" : "") + '>VLESS</option>'
        + '<option value="trojan"' + (cfg.subType === "trojan" ? " selected" : "") + '>Trojan</option>'
        + '<option value="vmess"' + (cfg.subType === "vmess" ? " selected" : "") + '>VMess</option>'
        + '</select></div>'
        + '<div class="row"><span class="lbl">UUID/密码<s>必填</s></span><input class="wide" id="s-uuid" value="' + esc(cfg.uuid) + '" placeholder="UUID 或 Trojan 密码"></div>'
        + '<div class="row"><span class="lbl">SNI<s>TLS 域名</s></span><input class="wide" id="s-servername" value="' + esc(cfg.servername) + '" placeholder="edt2.icer.ccwu.cc"></div>'
        + '<div class="row"><span class="lbl">EdgeTunnel 域名</span><input class="wide" id="s-edgedomain" value="' + esc(cfg.edgeDomain) + '" placeholder="edt2.icer.ccwu.cc"></div>'
        + '<div class="row"><span class="lbl">订阅 KEY</span><input id="s-edgekey" value="' + esc(cfg.edgeKey) + '" placeholder="快速订阅密钥"></div>'
        + '<div class="row"><span class="lbl">WS 路径</span><input id="s-path" value="' + esc(cfg.path) + '"></div>'
        + '<div class="row"><span class="lbl">端口</span><input type="number" id="s-port" value="' + cfg.port + '" min="1" max="65535"></div>'
        + '<div class="row"><span class="lbl">节点数</span><input type="number" id="s-nodecount" value="' + cfg.nodeCount + '" min="1" max="10"></div>'
        + '</div>'
        + '<button type="button" class="btn btn-sub" onclick="doSubSave()">保存订阅参数</button>'
        + '<button type="button" class="btn btn-subgen" onclick="doSubGen()">生成订阅</button>'
        + '<div id="sub-result" style="display:none;margin-top:8px"></div>';
}

// ── 渲染配置页面 ──
function renderPage() {
    var saved = loadConfig();
    var history = loadHistory();
    var summary = loadSummary();
    var subCfg = loadSubConfig();

    var cfg = {};
    var dk = Object.keys(DEFAULTS);
    for (var i = 0; i < dk.length; i++) {
        var k = dk[i];
        cfg[k] = (saved[k] !== undefined) ? saved[k] : DEFAULTS[k];
    }

    // Inject savedAt from prefs if not in merged cfg
    if (!cfg._savedAt && saved._savedAt) cfg._savedAt = saved._savedAt;

    return '<!DOCTYPE html>' +
'<html lang="zh-CN">' +
'<head>' +
'<meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">' +
'<title>CF优选 配置</title>' +
'<style>' +
'*{margin:0;padding:0;box-sizing:border-box}' +
'body{font:-apple-system-body,BlinkMacSystemFont,sans-serif;background:#f2f2f7;color:#1c1c1e;padding:16px;max-width:520px;margin:0 auto;padding-bottom:40px}' +
'h2{font-size:20px;font-weight:600;text-align:center;margin:8px 0 16px}' +
'.card{background:#fff;border-radius:13px;padding:16px;margin-bottom:12px}' +
'.card-title{font-size:12px;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:.3px;margin-bottom:10px}' +
'.row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;gap:8px}' +
'.row+.row{border-top:1px solid #f0f0f0}' +
'.lbl{font-size:14px;color:#1c1c1e;min-width:0;flex:1}' +
'.lbl s{display:block;font-size:11px;color:#8e8e93;font-weight:400}' +
'input,select{width:130px;padding:7px 8px;border:1px solid #c6c6c8;border-radius:8px;font-size:14px;text-align:right;background:#fff;flex-shrink:0}' +
'input.wide{width:180px}' +
'input:focus,select:focus{outline:none;border-color:#007aff}' +
'.tgl{width:47px;height:28px;background:#e9e9ea;border-radius:14px;position:relative;transition:background .2s;flex-shrink:0}' +
'.tgl.on{background:#34c759}' +
'.tgl::after{content:\'\';width:24px;height:24px;border-radius:12px;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 2px 4px rgba(0,0,0,.2)}' +
'.tgl.on::after{transform:translateX(19px)}' +
'.btn{display:block;width:100%;padding:14px;font-size:17px;font-weight:600;border:none;border-radius:12px;text-align:center;margin:6px 0}' +
'.btn-save{background:#007aff;color:#fff}' +
'.btn-save:active{opacity:.7}' +
'.btn-run{background:#34c759;color:#fff}' +
'.btn-run:active{opacity:.7}' +
'.btn-sub{background:#5856d6;color:#fff}' +
'.btn-sub:active{opacity:.7}' +
'.btn-subgen{background:#ff9500;color:#fff}' +
'.btn-subgen:active{opacity:.7}' +
'.btn-row{display:flex;gap:8px}' +
'.btn-row .btn{flex:1}' +
'.url-box{background:#1c1c1e;color:#32d74b;padding:12px;border-radius:8px;font-size:11px;word-break:break-all;font-family:Menlo,monospace;line-height:1.4;position:relative}' +
'.url-box:active{opacity:.8}' +
'.hint{font-size:12px;color:#8e8e93;text-align:center;margin:10px 0}' +
'.status-ok{background:#e8f8ed;color:#1c7a3d;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:12px;display:flex;align-items:center;gap:6px}' +
'.status-dot{width:8px;height:8px;border-radius:50%;background:#34c759;flex-shrink:0}' +
'.status-new{background:#fff3cd;color:#856404;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:12px}' +
'.summary-card .summary-text{font-size:11px;color:#8e8e93;margin-bottom:4px}' +
'.summary-card .summary-best{font-size:16px;font-weight:600;color:#1c1c1e}' +
'.summary-card .summary-total{font-size:11px;color:#8e8e93;margin-top:4px}' +
'.hist-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;cursor:pointer}' +
'.hist-item:last-child{border-bottom:none}' +
'.hist-item:active{opacity:.6}' +
'.hist-label{font-size:13px;color:#1c1c1e}' +
'.hist-arrow{font-size:18px;color:#c6c6c8}' +
'#toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.82);color:#fff;padding:12px 28px;border-radius:10px;font-size:16px;z-index:99;display:none;pointer-events:none}' +
'#sub-result{margin-top:12px}' +
'.sub-url-box{background:#1c1c1e;color:#32d74b;padding:10px;border-radius:8px;font-size:11px;word-break:break-all;font-family:Menlo,monospace;line-height:1.4;margin:6px 0}' +
'.copy-btn{display:inline-block;padding:6px 12px;background:#007aff;color:#fff;border:none;border-radius:6px;font-size:13px;margin-top:4px;cursor:pointer}' +
'</style>' +
'</head>' +
'<body>' +
'<h2>CF IP 优选配置</h2>' +

renderStatusBadge(cfg) +

'<div class="card">' +
'  <div class="card-title">Worker</div>' +
'  <div class="row"><span class="lbl">域名<s>下载测速 Worker</s></span><input class="wide" id="workerHost" value="' + esc(cfg.workerHost) + '" placeholder="st.icer.ccwu.cc"></div>' +
'  <div class="row"><span class="lbl">路径</span><input id="speedtestPath" value="' + esc(cfg.speedtestPath) + '"></div>' +
'  <div class="row"><span class="lbl">端口</span><input type="number" id="dlPort" value="' + cfg.dlPort + '" min="1" max="65535"></div>' +
'</div>' +

'<div class="card">' +
'  <div class="card-title">Phase 1 — 延迟</div>' +
'  <div class="row"><span class="lbl">候选数<s>IP 池大小</s></span><input type="number" id="testCount" value="' + cfg.testCount + '" min="10" max="1000"></div>' +
'  <div class="row"><span class="lbl">并发<s>每批请求数</s></span><input type="number" id="batchSize" value="' + cfg.batchSize + '" min="1" max="50"></div>' +
'  <div class="row"><span class="lbl">延迟上限<s>丢弃阈值 ms</s></span><input type="number" id="maxLatency" value="' + cfg.maxLatency + '" min="50" max="2000"></div>' +
'  <div class="row"><span class="lbl">超时<s>单IP ms</s></span><input type="number" id="latencyTimeout" value="' + cfg.latencyTimeout + '" min="500" max="10000"></div>' +
'</div>' +

'<div class="card">' +
'  <div class="card-title">Phase 2 — 下载</div>' +
'  <div class="row"><span class="lbl">测速数<s>Top N IP</s></span><input type="number" id="dlCount" value="' + cfg.dlCount + '" min="0" max="50"></div>' +
'  <div class="row"><span class="lbl">下载大小<s>字节</s></span><input type="number" id="dlBytes" value="' + cfg.dlBytes + '" min="1024" max="5242880"></div>' +
'  <div class="row"><span class="lbl">超时<s>ms</s></span><input type="number" id="dlTimeout" value="' + cfg.dlTimeout + '" min="1000" max="30000"></div>' +
'  <div class="row"><span class="lbl">并发<s>同时测速</s></span><input type="number" id="dlConcurrency" value="' + cfg.dlConcurrency + '" min="1" max="5"></div>' +
'</div>' +

'<div class="card">' +
'  <div class="card-title">筛选 & IP池</div>' +
'  <div class="row"><span class="lbl">优先地区<s>如 HKG,NRT</s></span><input id="preferColo" value="' + esc(cfg.preferColo) + '" placeholder="HKG,NRT"></div>' +
'  <div class="row"><span class="lbl">自定义IP<s>单IP或CIDR</s></span><input class="wide" id="customIps" value="' + esc(cfg.customIps) + '" placeholder="104.18.30.168,104.16.0.0/15"></div>' +
'  <div class="row"><span class="lbl">IPv6<s>额外测 IPv6</s></span><div class="tgl' + (cfg.useIpv6 ? " on" : "") + '" id="t-ipv6" onclick="this.classList.toggle(\'on\')"></div></div>' +
'</div>' +

'<div class="card">' +
'  <div class="card-title">其他</div>' +
'  <div class="row"><span class="lbl">热身<s>先探测预热</s></span><div class="tgl' + (cfg.warmup !== false ? " on" : "") + '" id="t-warmup" onclick="this.classList.toggle(\'on\')"></div></div>' +
'  <div class="row"><span class="lbl">详情通知<s>显示Top5</s></span><div class="tgl' + (cfg.notifyDetail !== false ? " on" : "") + '" id="t-detail" onclick="this.classList.toggle(\'on\')"></div></div>' +
'</div>' +

// ── 按钮行 ──
'<div class="btn-row">' +
'<button type="button" class="btn btn-save" onclick="doSave()">保存配置</button>' +
'<button type="button" class="btn btn-run" onclick="doRun()">运行优选</button>' +
'</div>' +

// ── 上次结果 ──
renderSummaryCard(summary) +

// ── 订阅生成 ──
renderSubCard(subCfg) +

// ── 历史记录 ──
renderHistoryCard(history) +

// ── Cron 命令 ──
'<div class="card">' +
'  <div class="card-title">Cron 命令 (点按复制)</div>' +
'  <div class="url-box" id="cron-box" onclick="copyCron()">13 */4 * * * YOUR_OPTIMIZER_URL#auto, tag=CF优选, enabled=true</div>' +
'  <p class="hint">复制到 QX [task_local]，URL 替换为 cf-ip-optimizer.js 地址</p>' +
'</div>' +

'<div id="toast"></div>' +

'<script>' +
'function $(id){return document.getElementById(id)}' +
'function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";setTimeout(function(){t.style.display="none"},1500)}' +
'function collect(){' +
'  function b(id){return $(id).classList.contains("on")}' +
'  return {' +
'    workerHost:$("workerHost").value.trim(),' +
'    testCount:$("testCount").value,' +
'    batchSize:$("batchSize").value,' +
'    maxLatency:$("maxLatency").value,' +
'    latencyTimeout:$("latencyTimeout").value,' +
'    dlCount:$("dlCount").value,' +
'    dlBytes:$("dlBytes").value,' +
'    dlTimeout:$("dlTimeout").value,' +
'    dlConcurrency:$("dlConcurrency").value,' +
'    dlPort:$("dlPort").value,' +
'    preferColo:$("preferColo").value.trim(),' +
'    speedtestPath:$("speedtestPath").value.trim()||"/speedtest",' +
'    customIps:$("customIps").value.trim(),' +
'    useIpv6:b("t-ipv6"),' +
'    warmup:b("t-warmup"),' +
'    notifyDetail:b("t-detail")' +
'  };' +
'}' +
'function doSave(){' +
'  var data=collect();' +
'  if(!data.workerHost){toast("请填写 Worker 域名");return}' +
'  var json=encodeURIComponent(JSON.stringify(data));' +
'  window.location.href="/save?data="+json;' +
'}' +
'function doRun(){' +
'  var data=collect();' +
'  if(!data.workerHost){toast("请填写 Worker 域名");return}' +
'  data._run=true;' +
'  var json=encodeURIComponent(JSON.stringify(data));' +
'  window.location.href="/save?data="+json;' +
'}' +
'function restoreConfig(jsonStr){' +
'  try{' +
'    var d=JSON.parse(jsonStr);' +
'    if(d.workerHost)$("workerHost").value=d.workerHost;' +
'    if(d.testCount)$("testCount").value=d.testCount;' +
'    if(d.batchSize)$("batchSize").value=d.batchSize;' +
'    if(d.maxLatency)$("maxLatency").value=d.maxLatency;' +
'    if(d.latencyTimeout)$("latencyTimeout").value=d.latencyTimeout;' +
'    if(d.dlCount!==undefined)$("dlCount").value=d.dlCount;' +
'    if(d.dlBytes)$("dlBytes").value=d.dlBytes;' +
'    if(d.dlTimeout)$("dlTimeout").value=d.dlTimeout;' +
'    if(d.dlConcurrency)$("dlConcurrency").value=d.dlConcurrency;' +
'    if(d.dlPort)$("dlPort").value=d.dlPort;' +
'    if(d.preferColo)$("preferColo").value=d.preferColo;' +
'    if(d.speedtestPath)$("speedtestPath").value=d.speedtestPath;' +
'    if(d.customIps)$("customIps").value=d.customIps;' +
'    if(d.useIpv6===true||d.useIpv6==="true"){$("t-ipv6").classList.add("on")}else{$("t-ipv6").classList.remove("on")}' +
'    if(d.warmup===false||d.warmup==="false"){$("t-warmup").classList.remove("on")}else{$("t-warmup").classList.add("on")}' +
'    if(d.notifyDetail===false||d.notifyDetail==="false"){$("t-detail").classList.remove("on")}else{$("t-detail").classList.add("on")}' +
'    toast("配置已恢复");' +
'  }catch(e){toast("恢复失败")}' +
'}' +
'function copyCron(){' +
'  var box=$("cron-box");' +
'  var txt=box.textContent;' +
'  if(navigator.clipboard){' +
'    navigator.clipboard.writeText(txt).then(function(){toast("已复制 cron 命令")});' +
'  }else{' +
'    toast("已复制 cron 命令");' +
'  }' +
'}' +
// ── 订阅部分 JS ──
'function collectSub(){' +
'  return {' +
'    subType:$("s-type").value,' +
'    uuid:$("s-uuid").value.trim(),' +
'    servername:$("s-servername").value.trim(),' +
'    path:$("s-path").value.trim()||"/",' +
'    port:$("s-port").value,' +
'    network:"ws",' +
'    nodeCount:$("s-nodecount").value,' +
'    edgeDomain:$("s-edgedomain").value.trim(),' +
'    edgeKey:$("s-edgekey").value.trim(),' +
'    fingerprint:"chrome",' +
'    ech:"true",' +
'    echServer:"cloudflare-ech.com",' +
'    skipCert:"false",' +
'    namePrefix:"CF优选"' +
'  };' +
'}' +
'function doSubSave(){' +
'  var data=collectSub();' +
'  if(!data.uuid){toast("请填写 UUID/密码");return}' +
'  var json=encodeURIComponent(JSON.stringify(data));' +
'  window.location.href="/sub-save?data="+json;' +
'}' +
'function doSubGen(){' +
'  var data=collectSub();' +
'  if(!data.edgeDomain){toast("请填写 EdgeTunnel 域名");return}' +
'  if(!data.uuid){toast("请填写 UUID/密码");return}' +
'  // 先保存订阅参数，再生成订阅链接' +
'  // 订阅链接在服务端通过读取 cf_opt_result 生成' +
'  var json=encodeURIComponent(JSON.stringify(data));' +
'  window.location.href="/sub-gen?data="+json;' +
'}' +
'</script>' +
'</body></html>';
}

// ── 渲染保存成功页面 ──
function renderSaved(isRun) {
    var extra = isRun
        ? '<p style="margin-top:12px;color:#007aff;font-weight:500">优选任务已标记</p>'
            + '<p style="color:#8e8e93;font-size:13px">请在 QX 中手动执行"CF优选"任务<br>或等待 cron 自动运行</p>'
        : '<p style="margin-top:16px">cron #auto 将自动读取最新配置</p>';
    return '<!DOCTYPE html>' +
'<html><head>' +
'<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">' +
'<style>' +
'body{font:-apple-system-body,sans-serif;background:#f2f2f7;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}' +
'.box{background:#fff;border-radius:16px;padding:32px 24px;margin:16px;max-width:320px}' +
'h2{color:#34c759;font-size:24px;margin-bottom:8px}' +
'p{color:#8e8e93;font-size:14px}' +
'a{color:#007aff;text-decoration:none;font-size:15px}' +
'</style>' +
'</head><body><div class="box">' +
'<h2>已保存</h2>' +
'<p>配置已持久化</p>' +
extra +
'<p style="margin-top:20px"><a href="/">返回配置</a></p>' +
'</div></body></html>';
}

// ── 渲染订阅生成页面 ──
function renderSubGenPage(subCfg, results) {
    if (!results || results.length === 0) {
        return '<!DOCTYPE html>' +
'<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">' +
'<style>body{font:-apple-system-body,sans-serif;background:#f2f2f7;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}' +
'.box{background:#fff;border-radius:16px;padding:32px 24px;margin:16px;max-width:340px}' +
'h2{color:#ff3b30;font-size:20px;margin-bottom:8px}p{color:#8e8e93;font-size:14px}a{color:#007aff}' +
'</style></head><body><div class="box">' +
'<h2>无优选结果</h2><p>请先运行优选任务获取最优 IP</p>' +
'<p style="margin-top:16px"><a href="/">返回配置</a></p>' +
'</div></body></html>';
    }

    var topN = Math.min(subCfg.nodeCount || 3, results.length);
    var urls = "";
    for (var i = 0; i < topN; i++) {
        var ip = results[i].ip;
        var subUrl = "https://" + esc(subCfg.edgeDomain) + "/" + esc(subCfg.edgeKey)
            + "?proxyip=" + esc(ip);
        var label = "IP " + (i + 1) + ": " + esc(ip)
            + " | " + (results[i].latency || "?") + "ms"
            + (results[i].speed ? " " + results[i].speed.toFixed(1) + "MB/s" : "");
        urls += '<div style="margin-bottom:8px">'
            + '<div style="font-size:12px;color:#8e8e93;margin-bottom:2px">' + esc(label) + '</div>'
            + '<div class="sub-url-box" onclick="copySubUrl(this)">' + esc(subUrl) + '</div>'
            + '</div>';
    }

    return '<!DOCTYPE html>' +
'<html><head>' +
'<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">' +
'<title>订阅链接</title>' +
'<style>' +
'body{font:-apple-system-body,sans-serif;background:#f2f2f7;padding:16px;max-width:520px;margin:0 auto}' +
'h2{font-size:20px;text-align:center;margin:12px 0}' +
'.sub-url-box{background:#1c1c1e;color:#32d74b;padding:10px;border-radius:8px;font-size:11px;word-break:break-all;font-family:Menlo,monospace;line-height:1.4;cursor:pointer}' +
'.sub-url-box:active{opacity:.7}' +
'a{color:#007aff;text-decoration:none}' +
'.hint{font-size:11px;color:#8e8e93;text-align:center;margin:8px 0}' +
'.back{text-align:center;margin-top:16px}' +
'#toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.82);color:#fff;padding:12px 28px;border-radius:10px;font-size:16px;z-index:99;display:none;pointer-events:none}' +
'</style></head><body>' +
'<h2>订阅链接 (点按复制)</h2>' +
'<p class="hint">在代理客户端中添加订阅 URL</p>' +
urls +
'<div class="back"><a href="/">返回配置</a></div>' +
'<div id="toast"></div>' +
'<script>' +
'function $(id){return document.getElementById(id)}' +
'function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";setTimeout(function(){t.style.display="none"},1500)}' +
'function copySubUrl(el){' +
'  var txt=el.textContent;' +
'  if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){toast("已复制")})}' +
'  else{toast("已复制")}' +
'}' +
'</script>' +
'</body></html>';
}

// ═══════════════════════════════════════
// 主入口 — script-analyze-echo-response API
// ═══════════════════════════════════════

var url = reqURL();

// 检测不同模式 — 用路径匹配, 兼容完整 URL 和纯路径
function urlHasPath(url, path) {
    return url.indexOf("cfui.com" + path) >= 0 || url.indexOf(path) >= 0;
}

var hasData = url.indexOf("?data=") >= 0;
var isSave = urlHasPath(url, "/save") && hasData;
var isSubSave = urlHasPath(url, "/sub-save") && hasData;
var isSubGen = urlHasPath(url, "/sub-gen") && hasData;

if (isSave) {
    var result = handleSave();
    $done({
        statusCode: result.ok ? 200 : 400,
        headers: NO_CACHE,
        body: result.ok ? renderSaved(result.isRun) : ("<h2>Error</h2><p>" + esc(result.error) + "</p>")
    });
} else if (isSubSave) {
    var subResult = handleSubSave();
    $done({
        statusCode: subResult.ok ? 200 : 400,
        headers: NO_CACHE,
        body: subResult.ok ? renderSaved(false) : ("<h2>Error</h2><p>" + esc(subResult.error) + "</p>")
    });
} else if (isSubGen) {
    // 解析订阅参数 + 读取优选结果
    var subCfg = {};
    try {
        var sqIdx = url.indexOf("?data=");
        if (sqIdx >= 0) {
            var raw = decodeURIComponent(url.substring(sqIdx + 6));
            subCfg = JSON.parse(raw);
        }
    } catch (e) {}
    // 也加载已保存的订阅参数作为 fallback
    var savedSub = loadSubConfig();
    var subKeys = Object.keys(SUB_DEFAULTS);
    for (var si = 0; si < subKeys.length; si++) {
        var sk = subKeys[si];
        if (subCfg[sk] === undefined) subCfg[sk] = savedSub[sk] || SUB_DEFAULTS[sk];
    }
    var results = loadResults();
    $done({
        statusCode: 200,
        headers: NO_CACHE,
        body: renderSubGenPage(subCfg, results)
    });
} else {
    $done({
        statusCode: 200,
        headers: NO_CACHE,
        body: renderPage()
    });
}
