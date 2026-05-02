/*******************************
 * CF IP Optimizer — Web 配置面板
 *
 * ========== 部署 ==========
 * [rewrite_local]
 * ^http:\/\/cfui\.com\/?(\/.*)?$ url script-response-body https://YOUR_HOST/cf-optimizer-ui.js
 *
 * ========== 使用 ==========
 * Safari 打开: http://cfui.com → 显示配置页面
 * (原理同 BoxJS: QX rewrite 本地拦截)
 *******************************/

const CONFIG_KEY = "cf_opt_config";

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

function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function loadConfig() {
    try {
        const raw = $prefs.valueForKey(CONFIG_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function getScriptBaseURL() {
    const src = $environment.sourcePath || "";
    const h = src.indexOf("#");
    return h >= 0 ? src.substring(0, h) : src;
}

function getOptimizerURL() {
    return getScriptBaseURL().replace(/cf-optimizer-ui\.js$/, "cf-ip-optimizer.js");
}

// ── 处理保存请求 ──
function handleSave() {
    try {
        let data;
        const url = $environment.sourcePath || "";
        const hashIdx = url.indexOf("#");
        if (hashIdx >= 0) {
            const hash = url.substring(hashIdx + 1);
            data = JSON.parse(decodeURIComponent(hash));
        } else {
            return { ok: false, error: "No data in hash" };
        }

        if (!data || typeof data !== "object") {
            return { ok: false, error: "Invalid data" };
        }

        // Merge with defaults to fill missing fields
        const config = { ...DEFAULTS, ...data };
        // Convert string numbers
        const numFields = ["testCount","batchSize","maxLatency","latencyTimeout",
            "dlCount","dlBytes","dlTimeout","dlConcurrency","dlPort"];
        for (const f of numFields) {
            config[f] = parseInt(config[f]) || DEFAULTS[f];
        }
        // Convert booleans
        config.useIpv6 = config.useIpv6 === true || config.useIpv6 === "true";
        config.warmup = config.warmup !== false && config.warmup !== "false";
        config.notifyDetail = config.notifyDetail !== false && config.notifyDetail !== "false";

        $prefs.setValueForKey(JSON.stringify(config), CONFIG_KEY);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ── 渲染配置页面 ──
function renderPage() {
    const saved = loadConfig();
    const cfg = { ...DEFAULTS, ...saved };

    const optUrl = getOptimizerURL();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>CF优选 配置</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font:-apple-system-body,BlinkMacSystemFont,sans-serif;background:#f2f2f7;color:#1c1c1e;padding:16px;max-width:520px;margin:0 auto}
h2{font-size:20px;font-weight:600;text-align:center;margin:8px 0 16px}
.card{background:#fff;border-radius:13px;padding:16px;margin-bottom:12px}
.card-title{font-size:12px;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:.3px;margin-bottom:10px}
.row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;gap:8px}
.row+.row{border-top:1px solid #f0f0f0}
.lbl{font-size:14px;color:#1c1c1e;min-width:0;flex-shrink:1}
.lbl s{display:block;font-size:11px;color:#8e8e93;font-weight:400}
input,select{width:130px;padding:7px 8px;border:1px solid #c6c6c8;border-radius:8px;font-size:14px;text-align:right;background:#fff;flex-shrink:0}
input.wide{width:180px}
input:focus,select:focus{outline:none;border-color:#007aff}
.tgl{width:47px;height:28px;background:#e9e9ea;border-radius:14px;position:relative;transition:background .2s;flex-shrink:0}
.tgl.on{background:#34c759}
.tgl::after{content:'';width:24px;height:24px;border-radius:12px;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 2px 4px rgba(0,0,0,.2)}
.tgl.on::after{transform:translateX(19px)}
.btn{display:block;width:100%;padding:14px;font-size:17px;font-weight:600;border:none;border-radius:12px;text-align:center;margin:6px 0}
.btn-save{background:#007aff;color:#fff}
.btn-save:active{opacity:.7}
.url-box{background:#1c1c1e;color:#32d74b;padding:12px;border-radius:8px;font-size:11px;word-break:break-all;font-family:Menlo,monospace;line-height:1.4}
.hint{font-size:12px;color:#8e8e93;text-align:center;margin:10px 0}
#toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.82);color:#fff;padding:12px 28px;border-radius:10px;font-size:16px;z-index:99;display:none;pointer-events:none}
</style>
</head>
<body>
<h2>CF IP 优选配置</h2>

<div class="card">
  <div class="card-title">Worker</div>
  <div class="row"><span class="lbl">域名<s>下载测速 Worker</s></span><input class="wide" id="workerHost" value="${esc(cfg.workerHost)}" placeholder="st.icer.ccwu.cc"></div>
  <div class="row"><span class="lbl">路径</span><input id="speedtestPath" value="${esc(cfg.speedtestPath)}"></div>
  <div class="row"><span class="lbl">端口</span><input type="number" id="dlPort" value="${cfg.dlPort}" min="1" max="65535"></div>
</div>

<div class="card">
  <div class="card-title">Phase 1 — 延迟</div>
  <div class="row"><span class="lbl">候选数<s>IP 池大小</s></span><input type="number" id="testCount" value="${cfg.testCount}" min="10" max="1000"></div>
  <div class="row"><span class="lbl">并发<s>每批请求数</s></span><input type="number" id="batchSize" value="${cfg.batchSize}" min="1" max="50"></div>
  <div class="row"><span class="lbl">延迟上限<s>丢弃阈值 ms</s></span><input type="number" id="maxLatency" value="${cfg.maxLatency}" min="50" max="2000"></div>
  <div class="row"><span class="lbl">超时<s>单IP ms</s></span><input type="number" id="latencyTimeout" value="${cfg.latencyTimeout}" min="500" max="10000"></div>
</div>

<div class="card">
  <div class="card-title">Phase 2 — 下载</div>
  <div class="row"><span class="lbl">测速数<s>Top N IP</s></span><input type="number" id="dlCount" value="${cfg.dlCount}" min="0" max="50"></div>
  <div class="row"><span class="lbl">下载大小<s>字节</s></span><input type="number" id="dlBytes" value="${cfg.dlBytes}" min="1024" max="5242880"></div>
  <div class="row"><span class="lbl">超时<s>ms</s></span><input type="number" id="dlTimeout" value="${cfg.dlTimeout}" min="1000" max="30000"></div>
  <div class="row"><span class="lbl">并发<s>同时测速</s></span><input type="number" id="dlConcurrency" value="${cfg.dlConcurrency}" min="1" max="5"></div>
</div>

<div class="card">
  <div class="card-title">筛选 & IP池</div>
  <div class="row"><span class="lbl">优先地区<s>如 HKG,NRT</s></span><input id="preferColo" value="${esc(cfg.preferColo)}" placeholder="HKG,NRT"></div>
  <div class="row"><span class="lbl">自定义IP<s>单IP或CIDR,逗号分隔</s></span><input class="wide" id="customIps" value="${esc(cfg.customIps)}" placeholder="104.18.30.168,104.16.0.0/15"></div>
  <div class="row"><span class="lbl">IPv6<s>额外测 IPv6</s></span><div class="tgl${cfg.useIpv6 ? " on" : ""}" id="t-ipv6" onclick="this.classList.toggle('on')"></div></div>
</div>

<div class="card">
  <div class="card-title">其他</div>
  <div class="row"><span class="lbl">热身<s>先探测预热</s></span><div class="tgl${cfg.warmup !== false ? " on" : ""}" id="t-warmup" onclick="this.classList.toggle('on')"></div></div>
  <div class="row"><span class="lbl">详情通知<s>显示Top5</s></span><div class="tgl${cfg.notifyDetail !== false ? " on" : ""}" id="t-detail" onclick="this.classList.toggle('on')"></div></div>
</div>

<button class="btn btn-save" onclick="doSave()">保存配置</button>

<p class="hint" style="margin-top:12px">保存后，cron 任务自动读取配置</p>

<div class="card">
  <div class="card-title">📋 Cron 命令</div>
  <div class="url-box">13 */4 * * * ${optUrl}#auto, tag=CF优选, enabled=true</div>
  <p class="hint">复制上面这行到 QX [task_local]</p>
</div>

<div id="toast"></div>

<script>
function $(id){return document.getElementById(id)}
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";setTimeout(function(){t.style.display="none"},1500)}

function collect(){
    function b(id){return $(id).classList.contains("on")}
    return {
        workerHost:    $("workerHost").value.trim(),
        testCount:     $("testCount").value,
        batchSize:     $("batchSize").value,
        maxLatency:    $("maxLatency").value,
        latencyTimeout:$("latencyTimeout").value,
        dlCount:       $("dlCount").value,
        dlBytes:       $("dlBytes").value,
        dlTimeout:     $("dlTimeout").value,
        dlConcurrency: $("dlConcurrency").value,
        dlPort:        $("dlPort").value,
        preferColo:    $("preferColo").value.trim(),
        speedtestPath: $("speedtestPath").value.trim()||"/speedtest",
        customIps:     $("customIps").value.trim(),
        useIpv6:       b("t-ipv6"),
        warmup:        b("t-warmup"),
        notifyDetail:  b("t-detail")
    };
}

function doSave(){
    var data = collect();
    if (!data.workerHost){ toast("请填写 Worker 域名"); return; }
    var json = encodeURIComponent(JSON.stringify(data));
    // Navigate to internal save URL, QX rewrite catches it
    window.location.href = "/save#" + json;
}

// Auto-save hint: tapping outside fields on iOS
</script>
</body>
</html>`;
}

// ── 渲染保存成功页面 ──
function renderSaved() {
    return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
body{font:-apple-system-body,sans-serif;background:#f2f2f7;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}
h2{color:#34c759;font-size:24px;margin-bottom:8px}
p{color:#8e8e93;font-size:14px}
</style>
</head><body><div>
<h2>已保存</h2><p>配置已持久化到 $prefs</p>
<p style="margin-top:16px">cron 任务将自动读取最新配置</p>
</div></body></html>`;
}

// ── 主入口 ──

const url = $environment.sourcePath || "";
// /save → 保存配置; 其他路径 → 显示页面
const isSave = url.indexOf("cfui.com/save") >= 0;

if (isSave) {
    const result = handleSave();
    $done({
        response: {
            status: result.ok ? 200 : 400,
            headers: { "Content-Type": "text/html; charset=utf-8" },
            body: result.ok ? renderSaved() : ("<h2>Error</h2><p>" + esc(result.error) + "</p>")
        }
    });
} else {
    $done({
        response: {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
            body: renderPage()
        }
    });
}
