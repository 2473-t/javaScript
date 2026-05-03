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
 * 纯 HTML 表单 + form submit, 零 JavaScript 依赖
 *******************************/

const CONFIG_KEY = "cf_opt_config";
const HISTORY_KEY = "cf_opt_config_history";
const SUB_CONFIG_KEY = "cf_sub_config";
const MAX_HISTORY = 5;

const DEFAULTS = {
    workerHost: "", testCount: 200, batchSize: 20, maxLatency: 300,
    latencyTimeout: 3000, dlCount: 15, dlBytes: 524288, dlTimeout: 10000,
    dlConcurrency: 2, dlPort: 80, useIpv6: false, preferColo: "",
    speedtestPath: "/speedtest", warmup: true, notifyDetail: true, customIps: ""
};

function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function loadConfig() {
    try { var r = $prefs.valueForKey(CONFIG_KEY); return r ? JSON.parse(r) : {}; }
    catch (e) { return {}; }
}

function loadSummary() {
    try { var r = $prefs.valueForKey("cf_opt_summary"); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
}

function loadHistory() {
    try {
        var r = $prefs.valueForKey(HISTORY_KEY);
        return r ? JSON.parse(r) : [];
    } catch (e) { return []; }
}

function loadSubConfig() {
    try { var r = $prefs.valueForKey(SUB_CONFIG_KEY); return r ? JSON.parse(r) : {}; }
    catch (e) { return {}; }
}

function loadResults() {
    try {
        var r = $prefs.valueForKey("cf_opt_result");
        if (!r) return [];
        var results = JSON.parse(r);
        return Array.isArray(results) ? results : [];
    } catch (e) { return []; }
}

function reqURL() {
    try { return $request ? ($request.url || "") : ""; } catch (e) { return ""; }
}

function formatTime(ts) {
    try {
        var d = new Date(ts);
        return ("0" + (d.getMonth() + 1)).slice(-2) + "/" + ("0" + d.getDate()).slice(-2)
            + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    } catch (e) { return ""; }
}

// ── 解析 URL-encoded 表单 body ──
function parseFormBody(body) {
    var result = {};
    if (!body) return result;
    body.split("&").forEach(function (pair) {
        var eq = pair.indexOf("=");
        if (eq > 0) {
            try {
                result[decodeURIComponent(pair.substring(0, eq))] = decodeURIComponent(pair.substring(eq + 1));
            } catch (e) { }
        }
    });
    return result;
}

// ── 处理保存 ──
function handleSave() {
    try {
        var body = "";
        try { body = $request.body || ""; } catch (e) { }
        if (!body) return { ok: false, error: "No form data" };

        var data = parseFormBody(body);
        if (!data.workerHost) return { ok: false, error: "Worker 域名必填" };

        var config = {};
        var keys = Object.keys(DEFAULTS);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            config[k] = (data[k] !== undefined) ? data[k] : DEFAULTS[k];
        }
        // 数值字段
        var nums = ["testCount", "batchSize", "maxLatency", "latencyTimeout",
            "dlCount", "dlBytes", "dlTimeout", "dlConcurrency", "dlPort"];
        for (var j = 0; j < nums.length; j++) {
            config[nums[j]] = parseInt(config[nums[j]]) || DEFAULTS[nums[j]];
        }
        // 布尔字段 (checkbox: 有值 = 勾选, 无值 = 未勾选)
        config.useIpv6 = data.useIpv6 === "true";
        config.warmup = data.warmup === "true";
        config.notifyDetail = data.notifyDetail === "true";

        config._savedAt = Date.now();
        $prefs.setValueForKey(JSON.stringify(config), CONFIG_KEY);

        // 保存历史
        try {
            var raw = $prefs.valueForKey(HISTORY_KEY);
            var history = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(history)) history = [];
            var entry = { _savedAt: config._savedAt };
            for (var i2 = 0; i2 < keys.length; i2++) entry[keys[i2]] = config[keys[i2]];
            history.unshift(entry);
            if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
            $prefs.setValueForKey(JSON.stringify(history), HISTORY_KEY);
        } catch (e) { }

        // 运行标记
        var isRun = data._run === "1";
        if (isRun) $prefs.setValueForKey("1", "cf_opt_run_pending");

        return { ok: true, isRun: isRun };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ── 处理订阅配置保存 ──
function handleSaveSub() {
    try {
        var body = "";
        try { body = $request.body || ""; } catch (e) { }
        if (!body) return { ok: false, error: "No form data" };

        var data = parseFormBody(body);
        var sub = {
            subType: data.subType || "vless",
            uuid: data.subUuid || data.uuid || "",
            servername: data.subServername || data.servername || "",
            path: data.subPath || "/",
            port: parseInt(data.subPort) || 443,
            network: data.subNetwork || "ws",
            nodeCount: parseInt(data.subNodeCount) || 3,
            edgeDomain: data.subEdgeDomain || data.edgeDomain || "",
            edgeKey: data.subEdgeKey || data.edgeKey || "",
            namePrefix: data.subNamePrefix || "CF优选",
            skipCert: data.subSkipCert || "false",
            fingerprint: data.subFingerprint || "chrome",
            ech: data.subEch === "true",
            echServer: data.subEchServer || "cloudflare-ech.com"
        };
        sub._savedAt = Date.now();
        $prefs.setValueForKey(JSON.stringify(sub), SUB_CONFIG_KEY);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ── 渲染成功页面 ──
function renderSaved(isRun) {
    var msg = isRun
        ? '<p style="color:#007aff;font-weight:500">优选任务已标记</p><p style="color:#8e8e93;font-size:13px">请在 QX 中手动执行 CF优选 任务</p>'
        : '<p style="color:#8e8e93">cron #auto 将自动读取最新配置</p>';
    return '<!DOCTYPE html><html><head>'
        + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
        + '<meta http-equiv="refresh" content="2;url=/">'
        + '<style>body{font:-apple-system-body,sans-serif;background:#f2f2f7;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}'
        + '.box{background:#fff;border-radius:16px;padding:32px 24px;margin:16px;max-width:300px}'
        + 'h2{color:#34c759;font-size:24px;margin-bottom:8px}p{color:#8e8e93;font-size:14px;margin:4px 0}'
        + '</style></head><body><div class="box">'
        + '<h2>已保存</h2><p>配置已持久化</p>' + msg
        + '<p style="margin-top:12px;font-size:12px;color:#c6c6c8">2秒后自动返回...</p>'
        + '</div></body></html>';
}

// ── 渲染错误页面 ──
function renderError(msg) {
    return '<!DOCTYPE html><html><head>'
        + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
        + '<meta http-equiv="refresh" content="3;url=/">'
        + '<style>body{font:-apple-system-body,sans-serif;background:#f2f2f7;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}'
        + '.box{background:#fff;border-radius:16px;padding:32px 24px;margin:16px;max-width:300px}'
        + 'h2{color:#ff3b30;font-size:20px;margin-bottom:8px}p{color:#8e8e93;font-size:14px}'
        + '</style></head><body><div class="box">'
        + '<h2>保存失败</h2><p>' + esc(msg) + '</p>'
        + '<p style="margin-top:12px"><a href="/" style="color:#007aff">返回重试</a></p>'
        + '</div></body></html>';
}

// ── 复选框 toggle ──
function chk(name, label, sub, checked) {
    var id = "c-" + name;
    return '<div class="row">'
        + '<span class="lbl">' + esc(label) + (sub ? '<s>' + esc(sub) + '</s>' : '') + '</span>'
        + '<input type="checkbox" id="' + id + '" name="' + esc(name) + '" value="true"'
        + (checked ? " checked" : "") + ' class="tgl-input">'
        + '<label for="' + id + '" class="tgl-label"></label>'
        + '</div>';
}

// ── 文本/数字输入行 ──
function row(label, sub, name, value, attrs) {
    return '<div class="row">'
        + '<span class="lbl">' + esc(label) + (sub ? '<s>' + esc(sub) + '</s>' : '') + '</span>'
        + '<input name="' + esc(name) + '" value="' + esc(String(value)) + '" ' + (attrs || "") + '>'
        + '</div>';
}

// ── 构建测速页面 (通过 /api-ping 代理测速) ──
function renderTestPage() {
    var seedIPs = [];
    try {
        var raw = $prefs.valueForKey("cf_opt_result");
        if (raw) {
            var results = JSON.parse(raw);
            if (Array.isArray(results)) {
                for (var j = 0; j < Math.min(20, results.length); j++) {
                    if (results[j].ip) seedIPs.push(results[j].ip);
                }
            }
        }
    } catch (e) {}
    var seedJSON = JSON.stringify(seedIPs);

    return '<!DOCTYPE html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>CF在线测速</title><style>' +
    '*{margin:0;padding:0;box-sizing:border-box}body{font:-apple-system-body,sans-serif;background:#f2f2f7;color:#1c1c1e;padding:16px;max-width:520px;margin:0 auto}' +
    'h2{font-size:18px;font-weight:600;text-align:center;margin:8px 0 12px}' +
    '.card{background:#fff;border-radius:13px;padding:14px;margin-bottom:10px}' +
    '.card-title{font-size:11px;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:.3px;margin-bottom:8px}' +
    'textarea{width:100%;padding:8px;border:1px solid #c6c6c8;border-radius:8px;font-size:12px;font-family:Menlo,monospace;height:80px}' +
    '.btn{display:block;width:100%;padding:14px;font-size:17px;font-weight:600;border:none;border-radius:12px;text-align:center;margin:6px 0}' +
    '.btn-start{background:#ff9500;color:#fff}' +
    '.btn.running{opacity:.6}' +
    'table{width:100%;border-collapse:collapse;font-size:11px}' +
    'th{text-align:left;color:#8e8e93;font-weight:600;font-size:10px;text-transform:uppercase;padding:5px 3px;border-bottom:1px solid #e9e9ea}' +
    'td{padding:5px 3px;border-bottom:1px solid #f5f5f5;font-variant-numeric:tabular-nums}' +
    '.rip{font-family:Menlo,monospace;font-size:11px;color:#1c1c1e}' +
    '.rlat{text-align:right;font-weight:500}' +
    '.rcol{text-align:center;color:#8e8e93;font-size:10px}' +
    'tr:nth-child(1) .rip{color:#007aff;font-weight:600}' +
    '.prog{text-align:center;padding:8px 0;color:#8e8e93;font-size:12px}' +
    '.raw{background:#1c1c1e;color:#32d74b;padding:10px;border-radius:8px;font-size:10px;font-family:Menlo,monospace;line-height:1.5;white-space:pre;overflow-x:auto;max-height:200px;overflow-y:auto}' +
    '#results{display:none}' +
    '</style></head><body><h2>CF IP 在线测速</h2>' +
    '<div class=card><div class=card-title>IP 列表</div>' +
    '<textarea id=ipList placeholder="104.18.30.168,104.16.0.0/15"></textarea>' +
    '<p style="font-size:10px;color:#8e8e93;margin-top:4px">每行一个IP或CIDR，逗号/空格分隔</p></div>' +
    '<button class="btn btn-start" id=btn onclick=start()>开始测速</button>' +
    '<div class=prog id=prog></div>' +
    '<div id=results><div class=card><div class=card-title>延迟排名</div>' +
    '<div style=overflow-x:auto><table><thead><tr><th>#</th><th>IP</th><th>延迟</th><th>机房</th></tr></thead><tbody id=tbl></tbody></table></div>' +
    '<p class=prog id=sum style=font-size:12px></p>' +
    '<div class=raw id=raw></div></div></div>' +

    '<script>' +
    'var seeds=' + seedJSON + ';' +
    'document.getElementById("ipList").value=seeds.join("\\n");' +

    'function expandCIDR(c,r){var p=c.split("/");var s=p[0].split(".");var b=0;' +
    'for(var i=0;i<4;i++)b=(b<<8)|(parseInt(s[i])||0);' +
    'var n=Math.pow(2,32-(parseInt(p[1])||24));' +
    'var l=Math.min(r||2,n),o=[],t=Math.max(1,Math.floor(n/l));' +
    'for(var j=0;j<l;j++){var v=b+j*t;o.push(((v>>>24)&255)+"."+((v>>>16)&255)+"."+((v>>>8)&255)+"."+(v&255));}' +
    'return o;}' +

    'function parseIPs(t){var s={},r=[];var p=t.split(/[,\\s\\n]+/);' +
    'for(var i=0;i<p.length;i++){var x=p[i].trim();if(!x||s[x])continue;' +
    'if(x.indexOf("/")>=0){var e=expandCIDR(x);for(var j=0;j<e.length;j++){if(!s[e[j]]){s[e[j]]=true;r.push(e[j]);}}}' +
    'else{s[x]=true;r.push(x);}}' +
    'return r;}' +

    'var running=false;' +
    'function start(){if(running)return;var ips=parseIPs(document.getElementById("ipList").value);' +
    'if(!ips.length){var p=document.getElementById("prog");p.textContent="请先输入IP地址";p.style.color="#ff3b30";return;}' +
    'running=true;var btn=document.getElementById("btn");btn.textContent="测速中...";btn.className="btn btn-start running";' +
    'var prog=document.getElementById("prog");prog.style.color="#8e8e93";prog.textContent="正在测试 "+ips.length+" 个IP (通过QX代理)...";' +
    'var res=document.getElementById("results");res.style.display="none";' +
    'var tStart=Date.now();' +
    'fetch("/api-ping?ips="+encodeURIComponent(ips.join(","))).then(function(r){return r.json();}).then(function(data){' +
    'running=false;var elapsed=Date.now()-tStart;' +
    'btn.textContent="开始测速";btn.className="btn btn-start";' +
    'if(!data||!data.length){prog.textContent="无结果返回";prog.style.color="#ff3b30";return;}' +
    'var ok=data.filter(function(r){return r.latency>=0;});' +
    'var to=data.filter(function(r){return r.latency<0;});' +
    'prog.textContent="完成: "+ok.length+"/"+data.length+" IP响应 | "+to.length+" 超时 | 耗时 "+elapsed+"ms";' +
    'prog.style.color=ok.length?"#34c759":"#ff3b30";' +
    'if(!ok.length){prog.textContent+=" — 所有IP无响应";return;}' +
    'ok.sort(function(a,b){return a.latency-b.latency;});' +
    'var show=ok.slice(0,Math.min(30,ok.length));' +
    'var tbl=document.getElementById("tbl");tbl.innerHTML="";' +
    'for(var i=0;i<show.length;i++){var r=show[i];' +
    'tbl.innerHTML+="<tr><td style=color:#8e8e93;text-align:right;font-size:10px;width:20px>"+(i+1)+"</td><td class=rip>"+r.ip+"</td><td class=rlat>"+r.latency+"ms</td><td class=rcol>"+(r.colo||"")+"</td></tr>";}' +
    'var rt="";for(var j=0;j<show.length;j++){rt+=(j+1)+". "+show[j].ip+" "+show[j].latency+"ms";if(show[j].colo)rt+=" "+show[j].colo;rt+="\\n";}' +
    'if(to.length)rt+="\\n超时: "+to.length+" IP\\n";' +
    'document.getElementById("raw").textContent=rt;' +
    'var top3=show.slice(0,Math.min(3,show.length));var avg=top3.length?Math.round(top3.reduce(function(s,r){return s+r.latency;},0)/top3.length):0;' +
    'document.getElementById("sum").textContent="完成 "+ok.length+"/"+data.length+" IP | 最快: "+show[0].ip+" "+show[0].latency+"ms"+(avg?" | Top3平均: "+avg+"ms":"");' +
    'res.style.display="block";' +
    '}).catch(function(e){running=false;btn.textContent="开始测速";btn.className="btn btn-start";prog.textContent="请求失败: "+e.message;prog.style.color="#ff3b30";});' +
    '}' +
    '</script>' +
    '</body></html>';
}

// ── 渲染主页面 ──
function renderPage() {
    var saved = loadConfig();
    var summary = loadSummary();
    var history = loadHistory();
    var subCfg = loadSubConfig();
    var results = loadResults();

    var cfg = {};
    var dk = Object.keys(DEFAULTS);
    for (var i = 0; i < dk.length; i++) {
        var k = dk[i];
        cfg[k] = (saved[k] !== undefined) ? saved[k] : DEFAULTS[k];
    }
    if (!cfg._savedAt && saved._savedAt) cfg._savedAt = saved._savedAt;

    // 状态 badge
    var badge = "";
    if (cfg._savedAt) {
        badge = '<div class="status-ok"><span class="status-dot"></span>'
            + '已加载 | Worker: ' + esc(cfg.workerHost || "(未设置)")
            + ' | 保存于 ' + esc(formatTime(cfg._savedAt)) + '</div>';
    } else {
        badge = '<div class="status-new">首次使用 — 请填写 Worker 域名并保存</div>';
    }

    // 上次结果卡片 — 完整排名列表
    var summaryHTML = "";
    var MAX_SHOW = 50;
    if (results && results.length > 0) {
        var topN = results.slice(0, Math.min(MAX_SHOW, results.length));
        summaryHTML = '<div class="card summary-card">'
            + '<div class="card-title">上次优选结果 (' + esc(String(topN.length)) + '/' + esc(String(results.length)) + ' IP)</div>';
        if (summary && summary.timestamp) {
            summaryHTML += '<div class="summary-text">' + esc(formatTime(summary.timestamp)) + '</div>';
        }
        // 最优高亮
        if (summary && summary.bestIP) {
            var spd = summary.bestSpeed ? summary.bestSpeed.toFixed(1) + "MB/s " : "";
            var clo = summary.bestColo ? summary.bestColo + " " : "";
            summaryHTML += '<div class="summary-best" style="margin-bottom:8px">最优: '
                + esc(summary.bestIP) + ' ' + esc(String(summary.bestLatency)) + 'ms '
                + esc(clo) + esc(spd) + '</div>';
        }
        // 排名表格
        summaryHTML += '<div style="overflow-x:auto"><table class="result-table">'
            + '<thead><tr><th>#</th><th>IP</th><th>延迟</th><th>速度</th><th>机房</th></tr></thead><tbody>';
        for (var ri = 0; ri < topN.length; ri++) {
            var r = topN[ri];
            var lat = (r.latency !== undefined && r.latency !== Infinity) ? r.latency + "ms" : "-";
            var spd2 = r.speed ? r.speed.toFixed(1) + "MB/s" : "-";
            var col = r.colo || "";
            summaryHTML += '<tr>'
                + '<td style="color:#8e8e93;text-align:right;font-size:10px">' + (ri + 1) + '</td>'
                + '<td class="r-ip">' + esc(r.ip || "") + '</td>'
                + '<td class="r-lat">' + esc(String(lat)) + '</td>'
                + '<td class="r-spd">' + esc(String(spd2)) + '</td>'
                + '<td class="r-colo">' + esc(col) + '</td>'
                + '</tr>';
        }
        summaryHTML += '</tbody></table></div>';

        // 原始文本 (便于复制)
        var rawText = "";
        for (var rj = 0; rj < topN.length; rj++) {
            var ri2 = topN[rj];
            rawText += (rj + 1) + ". " + ri2.ip + " " + (ri2.latency || "?") + "ms";
            if (ri2.speed) rawText += " " + ri2.speed.toFixed(1) + "MB/s";
            if (ri2.colo) rawText += " " + ri2.colo;
            rawText += "\n";
        }
        summaryHTML += '<div style="margin-top:8px;font-size:10px;color:#8e8e93">原始文本 (长按复制)</div>'
            + '<div class="raw-text">' + esc(rawText) + '</div>';
        summaryHTML += '</div>';
    }

    // 历史卡片
    var histHTML = "";
    if (history && history.length > 0) {
        histHTML = '<div class="card"><div class="card-title">配置历史</div>';
        for (var hi = 0; hi < history.length; hi++) {
            var h = history[hi];
            var label = esc(h.workerHost || "(无Worker)") + " | "
                + esc(String(h.testCount)) + "IP | "
                + (h._savedAt ? esc(formatTime(h._savedAt)) : "");
            // 每个历史条目是一个独立的小表单，POST JSON 数据来恢复
            var hjson = JSON.stringify(h).replace(/"/g, "&quot;");
            histHTML += '<form method="POST" action="/restore" style="margin:0;padding:0">'
                + '<input type="hidden" name="data" value="' + hjson + '">'
                + '<button type="submit" class="hist-item" style="width:100%;border:none;background:none;text-align:left;padding:10px 0">'
                + '<span class="hist-label">' + esc(label) + '</span>'
                + '<span class="hist-arrow" style="float:right;color:#c6c6c8">&rsaquo;</span>'
                + '</button>'
                + '</form>';
        }
        histHTML += '</div>';
    }

    return '<!DOCTYPE html>' +
'<html lang="zh-CN"><head>' +
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
'input[type="text"],input[type="number"]{width:130px;padding:7px 8px;border:1px solid #c6c6c8;border-radius:8px;font-size:14px;text-align:right;background:#fff;flex-shrink:0}' +
'input[type="text"].wide{width:180px}' +
'input:focus{outline:none;border-color:#007aff}' +
/* checkbox toggle — 纯 CSS, 零 JS */
'.tgl-input{display:none}' +
'.tgl-label{width:47px;height:28px;background:#e9e9ea;border-radius:14px;flex-shrink:0;position:relative;transition:background .2s;display:inline-block}' +
'.tgl-input:checked+.tgl-label{background:#34c759}' +
'.tgl-label::after{content:\'\';width:24px;height:24px;border-radius:12px;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 2px 4px rgba(0,0,0,.2)}' +
'.tgl-input:checked+.tgl-label::after{transform:translateX(19px)}' +
'.btn{display:block;width:100%;padding:14px;font-size:17px;font-weight:600;border:none;border-radius:12px;text-align:center;margin:6px 0;-webkit-appearance:none;cursor:pointer}' +
'.btn-save{background:#007aff;color:#fff}' +
'.btn-save:active{opacity:.7}' +
'.btn-run{background:#34c759;color:#fff}' +
'.btn-run:active{opacity:.7}' +
'.btn-row{display:flex;gap:8px}' +
'.btn-row .btn{flex:1}' +
'.url-box{background:#1c1c1e;color:#32d74b;padding:12px;border-radius:8px;font-size:11px;word-break:break-all;font-family:Menlo,monospace;line-height:1.4}' +
'.hint{font-size:12px;color:#8e8e93;text-align:center;margin:10px 0}' +
'.status-ok{background:#e8f8ed;color:#1c7a3d;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:12px;display:flex;align-items:center;gap:6px}' +
'.status-dot{width:8px;height:8px;border-radius:50%;background:#34c759;flex-shrink:0}' +
'.status-new{background:#fff3cd;color:#856404;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:12px}' +
'.summary-card .summary-text{font-size:11px;color:#8e8e93;margin-bottom:4px}' +
'.summary-card .summary-best{font-size:16px;font-weight:600;color:#1c1c1e}' +
'.result-table{width:100%;border-collapse:collapse;font-size:12px}' +
'.result-table th{text-align:left;color:#8e8e93;font-weight:600;font-size:10px;text-transform:uppercase;padding:6px 4px;border-bottom:1px solid #e9e9ea}' +
'.result-table td{padding:5px 4px;border-bottom:1px solid #f5f5f5;font-variant-numeric:tabular-nums}' +
'.result-table .r-ip{font-family:Menlo,Consolas,monospace;font-size:11px;color:#1c1c1e}' +
'.result-table .r-lat{text-align:right;font-weight:500}' +
'.result-table .r-spd{text-align:right;color:#34c759;font-weight:500}' +
'.result-table .r-colo{text-align:center;color:#8e8e93;font-size:10px}' +
'.result-table tr:first-child .r-ip{color:#007aff;font-weight:600}' +
'.raw-text{background:#1c1c1e;color:#32d74b;padding:10px;border-radius:8px;font-size:10px;font-family:Menlo,Consolas,monospace;line-height:1.5;word-break:break-all;overflow-x:auto;max-height:280px;overflow-y:auto;white-space:pre}' +
'.hist-item{cursor:pointer;display:block;width:100%}' +
'.hist-item:active{opacity:.6}' +
'.hist-label{font-size:13px;color:#1c1c1e}' +
'.hist-arrow{font-size:18px;color:#c6c6c8}' +
'</style></head><body>' +
'<h2>CF IP 优选配置</h2>' +

badge +

// ═══════ 主表单 — 所有配置字段 ═══════
'<form method="POST" action="/save" id="mainForm">' +

'<div class="card">' +
'  <div class="card-title">Worker</div>' +
row("域名", "下载测速 Worker", "workerHost", cfg.workerHost, 'class="wide" placeholder="st.icer.ccwu.cc"') +
row("路径", "", "speedtestPath", cfg.speedtestPath, "") +
row("端口", "", "dlPort", cfg.dlPort, 'type="number" min="1" max="65535"') +
'</div>' +

'<div class="card">' +
'  <div class="card-title">Phase 1 — 延迟</div>' +
row("候选数", "IP 池大小", "testCount", cfg.testCount, 'type="number" min="10" max="1000"') +
row("并发", "每批请求数", "batchSize", cfg.batchSize, 'type="number" min="1" max="50"') +
row("延迟上限", "丢弃阈值 ms", "maxLatency", cfg.maxLatency, 'type="number" min="50" max="2000"') +
row("超时", "单IP ms", "latencyTimeout", cfg.latencyTimeout, 'type="number" min="500" max="10000"') +
'</div>' +

'<div class="card">' +
'  <div class="card-title">Phase 2 — 下载</div>' +
row("测速数", "Top N IP", "dlCount", cfg.dlCount, 'type="number" min="0" max="50"') +
row("下载大小", "字节", "dlBytes", cfg.dlBytes, 'type="number" min="1024" max="5242880"') +
row("超时", "ms", "dlTimeout", cfg.dlTimeout, 'type="number" min="1000" max="30000"') +
row("并发", "同时测速", "dlConcurrency", cfg.dlConcurrency, 'type="number" min="1" max="5"') +
'</div>' +

'<div class="card">' +
'  <div class="card-title">筛选 & IP池</div>' +
row("优先地区", "如 HKG,NRT", "preferColo", cfg.preferColo, 'placeholder="HKG,NRT"') +
row("自定义IP", "单IP或CIDR", "customIps", cfg.customIps, 'class="wide" placeholder="104.18.30.168,104.16.0.0/15"') +
chk("useIpv6", "IPv6", "额外测 IPv6", cfg.useIpv6) +
'</div>' +

'<div class="card">' +
'  <div class="card-title">其他</div>' +
chk("warmup", "热身", "先探测预热", cfg.warmup) +
chk("notifyDetail", "详情通知", "显示Top5", cfg.notifyDetail) +
'</div>' +

// 按钮
'<div class="btn-row">' +
'<button type="submit" name="_save" value="1" class="btn btn-save">保存配置</button>' +
'<button type="submit" name="_run" value="1" class="btn btn-run">运行优选</button>' +
'</div>' +
'</form>' +

// ═══════ 订阅配置表单 ═══════
'<form method="POST" action="/save-sub" id="subForm">' +
'<div class="card">' +
'  <div class="card-title">订阅生成</div>' +
row("类型", "", "subType", subCfg.subType || "vless", 'placeholder="vless/vmess/trojan"') +
row("UUID", "必填", "subUuid", subCfg.uuid || "", 'class="wide" placeholder="xxxxxxxx-xxxx..."') +
row("SNI", "servername", "subServername", subCfg.servername || "", 'class="wide" placeholder="edt2.icer.ccwu.cc"') +
row("路径", "WS path", "subPath", subCfg.path || "/", "") +
row("端口", "", "subPort", subCfg.port || 443, 'type="number" min="1" max="65535"') +
row("节点数", "Top N IP", "subNodeCount", subCfg.nodeCount || 3, 'type="number" min="1" max="10"') +
row("Edge域名", "EdgeTunnel", "subEdgeDomain", subCfg.edgeDomain || "", 'class="wide" placeholder="edt2.icer.ccwu.cc"') +
row("Edge KEY", "订阅路径", "subEdgeKey", subCfg.edgeKey || "", 'placeholder="sub"') +
row("节点前缀", "名称", "subNamePrefix", subCfg.namePrefix || "CF优选", 'placeholder="CF优选"') +
'</div>' +
'<button type="submit" class="btn btn-save" style="margin-bottom:12px">保存订阅配置</button>' +
'</form>' +

// ═══════ 订阅链接输出 ═══════
(function() {
var edgeDomain = subCfg.edgeDomain || "";
var edgeKey = subCfg.edgeKey || "";
var count = subCfg.nodeCount || 3;
if (!edgeDomain || !edgeKey || !results || results.length === 0) return "";
var top = results.slice(0, Math.min(count, results.length));
var html = '<div class="card"><div class="card-title">订阅链接 (EdgeTunnel)</div>';
var dt = new Date();
var ts = (dt.getMonth()+1) + "/" + dt.getDate() + " " + dt.getHours() + ":" + ("0"+dt.getMinutes()).slice(-2);
html += '<div class="summary-text">生成于 ' + esc(ts) + ' | ' + esc(String(top.length)) + ' 个节点</div>';
for (var i = 0; i < top.length; i++) {
var ip = top[i];
var subUrl = "https://" + edgeDomain + "/" + edgeKey + "?proxyip=" + ip.ip;
var label = "IP" + (i+1) + " " + esc(ip.ip) + " " + (ip.latency || "?") + "ms";
if (ip.speed) label += " " + ip.speed.toFixed(1) + "MB/s";
html += '<div style="margin:8px 0;padding:8px;background:#f8f8f8;border-radius:8px">'
+ '<div style="font-size:12px;color:#1c1c1e;margin-bottom:4px;font-weight:500">' + label + '</div>'
+ '<div class="url-box" style="font-size:10px;padding:8px">' + esc(subUrl) + '</div>'
+ '</div>';
}
html += '<p class="hint">长按链接可复制，粘贴到代理客户端订阅</p></div>';
return html;
})() +

// ═══════ 上次结果 + 历史 + Cron ═══════
summaryHTML +
histHTML +

'<div class="card">' +
'  <div class="card-title">在线测速 (浏览器原生)</div>' +
'  <p style="font-size:11px;color:#8e8e93;margin-bottom:8px">点击打开新页面，使用浏览器原生 fetch 测速，延迟更准确。</p>' +
'  <a href="/test" target="_blank" rel="noopener" class="btn" style="display:block;text-decoration:none;background:#ff9500;color:#fff;margin:0;text-align:center">打开在线测速</a>' +
'</div>' +

'<div class="card">' +
'  <div class="card-title">Cron 命令</div>' +
'  <div class="url-box">13 */4 * * * YOUR_OPTIMIZER_URL#auto, tag=CF优选, enabled=true</div>' +
'  <p class="hint">复制到 QX [task_local]，URL 替换为 cf-ip-optimizer.js 地址</p>' +
'</div>' +

'</body></html>';
}

// ── 恢复配置 (POST /restore) ──
function handleRestore() {
    try {
        var body = "";
        try { body = $request.body || ""; } catch (e) { }
        var data = parseFormBody(body);
        if (!data.data) return { ok: false, error: "No data" };
        var config = JSON.parse(data.data.replace(/&quot;/g, '"'));
        if (!config || typeof config !== "object") return { ok: false, error: "Invalid data" };
        config._savedAt = Date.now();
        $prefs.setValueForKey(JSON.stringify(config), CONFIG_KEY);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ── API: 代理延迟测速 (/api-ping?ips=1.2.3.4,5.6.7.8) ──
function toURL(ip, path) {
    if (ip.indexOf(":") >= 0) {
        return "http://[" + ip + "]" + path;
    }
    return "http://" + ip + path;
}

function measureOnePing(ip, timeout) {
    var t0 = Date.now();
    return $task.fetch({
        url: toURL(ip, "/cdn-cgi/trace"),
        method: "HEAD",
        timeout: timeout || 3000,
        policy: "DIRECT",
        opts: { redirection: false },
        headers: {
            "User-Agent": "QX-CFOptimizer/1.0",
            "Accept": "*/*",
            "Connection": "close"
        }
    }).then(function(response) {
        var elapsed = Date.now() - t0;
        var colo = "";
        try {
            var cfRay = (response.headers || {})["CF-Ray"] || "";
            var dash = cfRay.lastIndexOf("-");
            if (dash >= 0) colo = cfRay.substring(dash + 1);
        } catch (e) {}
        return { ip: ip, latency: elapsed, colo: colo };
    }).catch(function(reason) {
        return { ip: ip, latency: -1, colo: "", error: (reason && reason.error) || "timeout" };
    });
}

function handleApiPing() {
    var url = reqURL();
    var qIdx = url.indexOf("?ips=");
    if (qIdx < 0) {
        $done({ statusCode: 400, headers: { "Content-Type": "application/json" }, body: "[]" });
        return;
    }
    var ipsRaw = "";
    try { ipsRaw = decodeURIComponent(url.substring(qIdx + 5)); } catch (e) { ipsRaw = url.substring(qIdx + 5); }
    // 也支持 ?ips= 后面直接跟 URL-encoded IP 列表
    var ips = ipsRaw.split(/[,;\s]+/).filter(function(x) { return x.trim(); });
    if (ips.length === 0) {
        $done({ statusCode: 200, headers: { "Content-Type": "application/json" }, body: "[]" });
        return;
    }

    var CONCURRENCY = 8;
    var TIMEOUT = 3000;
    var allResults = [];

    function runBatch(startIdx) {
        if (startIdx >= ips.length) {
            // All done
            $done({
                statusCode: 200,
                headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
                body: JSON.stringify(allResults)
            });
            return;
        }
        var batch = ips.slice(startIdx, startIdx + CONCURRENCY);
        var promises = [];
        for (var i = 0; i < batch.length; i++) {
            promises.push(measureOnePing(batch[i], TIMEOUT));
        }
        Promise.all(promises).then(function(batchResults) {
            for (var j = 0; j < batchResults.length; j++) {
                allResults.push(batchResults[j]);
            }
            runBatch(startIdx + CONCURRENCY);
        });
    }

    runBatch(0);
}

// ═══════════════════════════════════════
// 主入口
// ═══════════════════════════════════════

var url = reqURL();
var method = "";
try { method = ($request.method || "").toUpperCase(); } catch (e) { }

function urlHasPath(url, path) {
    return url.indexOf("cfui.com" + path) >= 0 || url.indexOf(path) >= 0;
}

var isApiPing = url.indexOf("cfui.com/api-ping") >= 0 || (url.indexOf("/api-ping") >= 0 && url.indexOf("cfui.com") < 0);
var isTest = urlHasPath(url, "/test") && !isApiPing;
var isSave = urlHasPath(url, "/save") && method === "POST";
var isSaveSub = urlHasPath(url, "/save-sub") && method === "POST";
var isRestore = urlHasPath(url, "/restore") && method === "POST";

if (isApiPing) {
    handleApiPing();  // calls $done asynchronously
} else if (isTest) {
    $done({
        statusCode: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'unsafe-inline' 'unsafe-eval' *"
        },
        body: renderTestPage()
    });
} else if (isSave) {
    var result = handleSave();
    $done({
        statusCode: result.ok ? 200 : 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: result.ok ? renderSaved(result.isRun) : renderError(result.error)
    });
} else if (isSaveSub) {
    var subResult = handleSaveSub();
    $done({
        statusCode: subResult.ok ? 200 : 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: subResult.ok ? renderSaved(false) : renderError(subResult.error)
    });
} else if (isRestore) {
    var restoreResult = handleRestore();
    $done({
        statusCode: restoreResult.ok ? 200 : 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: restoreResult.ok ? renderSaved(false) : renderError(restoreResult.error)
    });
} else {
    $done({
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        body: renderPage()
    });
}
