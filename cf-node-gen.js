/*******************************
 * CF Node Config Generator for Quantumult X
 *
 * 读取 cf-ip-optimizer.js 产出的优选结果,
 * 生成可直接粘贴到 QX 配置文件的代理节点 YAML
 *
 * ========== 部署方式 ==========
 * [task_local]
 * # 手动模式 — hash 传参:
 * event-interaction https://YOUR_HOST/cf-node-gen.js#type=vless&servername=edt2.icer.ccwu.cc&uuid=YOUR_UUID&count=3, tag=生成节点, enabled=true
 *
 * # 自动模式 — 从 WebUI 订阅参数读取:
 * event-interaction https://YOUR_HOST/cf-node-gen.js#auto, tag=生成节点, enabled=true
 *
 * ========== 参数说明 (URL hash) ==========
 * type            - 节点类型: vless / vmess / trojan, 默认 vless
 * servername      - TLS SNI / servername, 必填
 * uuid            - 用户 UUID, 必填
 * path            - WS 路径, 默认 /
 * port            - 端口, 默认 443
 * network         - 传输协议, 默认 ws
 * count           - 生成节点数 (取 Top N IP), 默认 3
 * name_prefix     - 节点名前缀, 默认 "CF优选"
 * skip_cert       - 是否跳过证书验证, 默认 false
 * fingerprint     - TLS 指纹, 默认 chrome
 * ech             - 是否启用 ECH, 默认 true
 * ech_server      - ECH 服务器名, 默认 cloudflare-ech.com
 * edge_domain     - EdgeTunnel Worker 域名 (用于生成订阅链接)
 * edge_key        - EdgeTunnel 快速订阅 KEY
 * auto            - 自动模式, 从 WebUI 保存的订阅参数读取
 *******************************/

function parseConfig() {
    const defaults = {
        type: "vless",
        servername: "",
        uuid: "",
        path: "/",
        port: "443",
        network: "ws",
        count: 3,
        namePrefix: "CF优选",
        skipCert: "false",
        fingerprint: "chrome",
        ech: "true",
        echServer: "cloudflare-ech.com",
        edgeDomain: "",
        edgeKey: ""
    };

    try {
        const srcPath = $environment.sourcePath || "";
        const hashIdx = srcPath.indexOf("#");
        let params = {};
        var isAuto = false;
        if (hashIdx >= 0) {
            const hash = srcPath.substring(hashIdx + 1);
            hash.split("&").forEach(pair => {
                const eq = pair.indexOf("=");
                if (eq > 0) {
                    params[decodeURIComponent(pair.substring(0, eq))] = decodeURIComponent(pair.substring(eq + 1));
                } else if (pair === "auto") {
                    isAuto = true;
                }
            });
        }

        // #auto 模式: 从 WebUI 订阅参数读取
        var saved = {};
        if (isAuto) {
            try {
                var raw = $prefs.valueForKey("cf_sub_config");
                if (raw) saved = JSON.parse(raw);
            } catch (e) {}
        }

        return {
            type: params.type || saved.subType || defaults.type,
            servername: params.servername || saved.servername || defaults.servername,
            uuid: params.uuid || saved.uuid || defaults.uuid,
            path: params.path || saved.path || defaults.path,
            port: params.port || saved.port || defaults.port,
            network: params.network || saved.network || defaults.network,
            count: parseInt(params.count) || parseInt(saved.nodeCount) || defaults.count,
            namePrefix: params.name_prefix || saved.namePrefix || defaults.namePrefix,
            skipCert: params.skip_cert || saved.skipCert || defaults.skipCert,
            fingerprint: params.fingerprint || saved.fingerprint || defaults.fingerprint,
            ech: params.ech !== "false" ? "true" : "false",
            echServer: params.ech_server || saved.echServer || defaults.echServer,
            edgeDomain: params.edge_domain || saved.edgeDomain || defaults.edgeDomain,
            edgeKey: params.edge_key || saved.edgeKey || defaults.edgeKey,
            _source: isAuto ? "auto" : "hash"
        };
    } catch (e) {
        return defaults;
    }
}

function loadResults() {
    try {
        const raw = $prefs.valueForKey("cf_opt_result");
        if (!raw) return [];
        const results = JSON.parse(raw);
        if (!Array.isArray(results)) return [];
        return results;
    } catch (e) {
        return [];
    }
}

function loadSummary() {
    try {
        const raw = $prefs.valueForKey("cf_opt_summary");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function generateNode(ip, config, index) {
    const latency = ip.latency || 0;
    const speed = ip.speed || 0;
    const colo = ip.colo || "";
    const speedStr = speed ? speed.toFixed(1) + "MB/s" : "";
    const coloStr = colo ? " " + colo : "";
    const name = config.namePrefix + " " + (index + 1) + "|" + latency + "ms" + coloStr;

    const lines = [];
    lines.push(`  - name: ${name}`);
    lines.push(`    server: ${ip.ip}`);
    lines.push(`    port: ${config.port}`);
    lines.push(`    type: ${config.type}`);
    lines.push(`    uuid: ${config.uuid}`);
    lines.push(`    tls: true`);
    lines.push(`    skip-cert-verify: ${config.skipCert}`);
    lines.push(`    servername: ${config.servername}`);
    lines.push(`    client-fingerprint: ${config.fingerprint}`);
    lines.push(`    network: ${config.network}`);

    if (config.network === "ws") {
        lines.push(`    ws-opts:`);
        lines.push(`      path: ${config.path}`);
        lines.push(`      headers:`);
        lines.push(`        Host: ${config.servername}`);
    }

    if (config.ech === "true") {
        lines.push(`    ech-opts:`);
        lines.push(`      enable: true`);
        lines.push(`      query-server-name: ${config.echServer}`);
    }

    lines.push("");
    return lines.join("\n");
}

function main() {
    const config = parseConfig();

    if (!config.servername || !config.uuid) {
        $notify(
            "节点生成失败",
            "缺少必要参数",
            "请设置 servername 和 uuid\n通过 hash 参数: #servername=YOUR_SNI&uuid=YOUR_UUID"
        );
        $done();
        return;
    }

    const results = loadResults();
    if (results.length === 0) {
        $notify(
            "节点生成失败",
            "无优选结果",
            "请先运行 cf-ip-optimizer.js 进行测速"
        );
        $done();
        return;
    }

    const summary = loadSummary();
    const topIPs = results.slice(0, Math.min(config.count, results.length));

    // Generate YAML snippet
    let yaml = "# CF优选节点 - " + new Date().toLocaleString() + "\n";
    if (summary) {
        yaml += "# 上次测速: " + new Date(summary.timestamp).toLocaleString()
            + " | 最佳: " + summary.bestIP
            + " " + summary.bestLatency + "ms";
        if (summary.bestSpeed) {
            yaml += " " + summary.bestSpeed.toFixed(1) + "MB/s";
        }
        yaml += "\n";
    }
    yaml += "# 直接复制以下节点到 QX 配置文件的 [proxy] 段\n\n";

    for (let i = 0; i < topIPs.length; i++) {
        yaml += generateNode(topIPs[i], config, i);
    }

    // Generate EdgeTunnel subscription links if configured
    if (config.edgeDomain && config.edgeKey) {
        yaml += "# ═══════════════════════════════════════\n";
        yaml += "# EdgeTunnel 订阅链接 (复制到代理客户端)\n";
        yaml += "# ═══════════════════════════════════════\n";
        for (let i = 0; i < topIPs.length; i++) {
            var subUrl = "https://" + config.edgeDomain + "/" + config.edgeKey
                + "?proxyip=" + topIPs[i].ip;
            yaml += "# IP" + (i + 1) + " " + topIPs[i].ip
                + " " + topIPs[i].latency + "ms";
            if (topIPs[i].speed) yaml += " " + topIPs[i].speed.toFixed(1) + "MB/s";
            yaml += "\n" + subUrl + "\n\n";
        }
    }

    // Store generated config so user can find it
    $prefs.setValueForKey(yaml, "cf_opt_nodes");

    // Build notification
    const best = topIPs[0];
    const sub = "最优节点: " + best.ip + " " + best.latency + "ms"
        + (best.speed ? " " + best.speed.toFixed(1) + "MB/s" : "");
    const msg = "生成了 " + topIPs.length + " 个节点配置\n"
        + "配置已保存到 cf_opt_nodes\n"
        + "请打开日志复制 YAML 片段";

    console.log("[CFNodeGen] ========================================");
    console.log(yaml);
    console.log("[CFNodeGen] ========================================");
    console.log("[CFNodeGen] 复制上面的 YAML 到 QX 配置文件的 [proxy] 段");
    console.log("[CFNodeGen] 配置已同时保存到 $prefs:cf_opt_nodes");

    $notify("节点配置已生成", sub, msg);
    $done();
}

main();
