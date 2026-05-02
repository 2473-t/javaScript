/*******************************
 * CF CDN IP Optimizer for Quantumult X
 * 对标 cfst.exe 的 iOS 端 IP 优选方案
 *
 * Version: 1.0.0
 *
 * ========== 部署方式 ==========
 * [task_local]
 * cron 13 *\/4 * * * script-path=https://YOUR_HOST/cf-ip-optimizer.js#worker_host=edt2.icer.ccwu.cc&max_latency=300&dl_count=15, tag=CF优选, enabled=true
 *
 * ========== 参数说明 (URL hash) ==========
 * worker_host     - 必填, CF Worker 域名 (用于下载测速)
 * test_count      - Phase1 测试 IP 数量, 默认 200
 * batch_size      - 每批并发数, 默认 20
 * max_latency     - 延迟上限(ms), 默认 300
 * latency_timeout - 单IP延迟超时(ms), 默认 3000
 * dl_count        - 进入下载测速的 IP 数量, 默认 15
 * dl_bytes        - 下载测试字节数, 默认 524288 (512KB)
 * dl_timeout      - 下载超时(ms), 默认 10000
 * dl_concurrency  - 下载并发数, 默认 2
 * dl_port         - 下载测速端口, 默认 80 (如遇到 HTTPS 错误, 检查 Worker 域名是否关闭 Always Use HTTPS)
 * use_ipv6        - 是否测试 IPv6, 默认 false
 * prefer_colo     - 优先地区码 (逗号分隔), 如 HKG,NRT
 * speedtest_path  - Worker 测速路径, 默认 /speedtest
 * warmup          - 是否热身, 默认 true
 *******************************/

/*******************************
 * 1. 配置解析
 *******************************/

function parseConfig() {
    const defaults = {
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
        preferColo: [],
        speedtestPath: "/speedtest",
        warmup: true,
        notifyDetail: true
    };

    try {
        const srcPath = $environment.sourcePath || "";
        const hashIdx = srcPath.indexOf("#");
        if (hashIdx === -1) {
            return { ...defaults, _error: "No config: missing URL hash params. worker_host is required." };
        }
        const hash = srcPath.substring(hashIdx + 1);
        const params = {};
        hash.split("&").forEach(pair => {
            const eq = pair.indexOf("=");
            if (eq > 0) {
                params[decodeURIComponent(pair.substring(0, eq))] = decodeURIComponent(pair.substring(eq + 1));
            }
        });

        const config = {
            workerHost: params.worker_host || defaults.workerHost,
            testCount: parseInt(params.test_count) || defaults.testCount,
            batchSize: Math.min(parseInt(params.batch_size) || defaults.batchSize, 50),
            maxLatency: parseInt(params.max_latency) || defaults.maxLatency,
            latencyTimeout: parseInt(params.latency_timeout) || defaults.latencyTimeout,
            dlCount: parseInt(params.dl_count) || defaults.dlCount,
            dlBytes: Math.min(parseInt(params.dl_bytes) || defaults.dlBytes, 5 * 1024 * 1024),
            dlTimeout: parseInt(params.dl_timeout) || defaults.dlTimeout,
            dlConcurrency: Math.min(parseInt(params.dl_concurrency) || defaults.dlConcurrency, 5),
            dlPort: parseInt(params.dl_port) || defaults.dlPort,
            useIpv6: params.use_ipv6 === "true",
            preferColo: (params.prefer_colo || "").toUpperCase().split(",").filter(Boolean),
            speedtestPath: params.speedtest_path || defaults.speedtestPath,
            warmup: params.warmup !== "false",
            notifyDetail: params.notify_detail !== "false"
        };

        if (!config.workerHost) {
            return { ...config, _error: "worker_host is required. Add #worker_host=YOUR_HOST to script URL." };
        }
        if (config.dlCount <= 0 && config.testCount <= 0) {
            return { ...config, _error: "Both test_count and dl_count are 0. Nothing to test." };
        }

        return config;
    } catch (e) {
        return { ...defaults, _error: "Config parse error: " + e.message };
    }
}

/*******************************
 * 2. CIDR IP 段常量 (来自 ip.txt)
 *******************************/

const IPV4_RANGES = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/12",
    "172.64.0.0/17",
    "172.64.128.0/18",
    "172.64.192.0/19",
    "172.64.224.0/22",
    "172.64.229.0/24",
    "172.64.230.0/23",
    "172.64.232.0/21",
    "172.64.240.0/21",
    "172.64.248.0/21",
    "172.65.0.0/16",
    "172.66.0.0/16",
    "172.67.0.0/16",
    "131.0.72.0/22"
];

const IPV6_RANGES = [
    "2400:cb00:2049::/48","2400:cb00:f00e::/48",
    "2606:4700::/32","2606:4700:10::/48","2606:4700:130::/48",
    "2606:4700:3000::/48","2606:4700:3001::/48","2606:4700:3002::/48",
    "2606:4700:3003::/48","2606:4700:3004::/48","2606:4700:3005::/48",
    "2606:4700:3006::/48","2606:4700:3007::/48","2606:4700:3008::/48",
    "2606:4700:3009::/48","2606:4700:3010::/48","2606:4700:3011::/48",
    "2606:4700:3012::/48","2606:4700:3013::/48","2606:4700:3014::/48",
    "2606:4700:3015::/48","2606:4700:3016::/48","2606:4700:3017::/48",
    "2606:4700:3018::/48","2606:4700:3019::/48","2606:4700:3020::/48",
    "2606:4700:3021::/48","2606:4700:3022::/48","2606:4700:3023::/48",
    "2606:4700:3024::/48","2606:4700:3025::/48","2606:4700:3026::/48",
    "2606:4700:3027::/48","2606:4700:3028::/48","2606:4700:3029::/48",
    "2606:4700:3030::/48","2606:4700:3031::/48","2606:4700:3032::/48",
    "2606:4700:3033::/48","2606:4700:3034::/48","2606:4700:3035::/48",
    "2606:4700:3036::/48","2606:4700:3037::/48","2606:4700:3038::/48",
    "2606:4700:3039::/48","2606:4700:a0::/48","2606:4700:a1::/48",
    "2606:4700:a8::/48","2606:4700:a9::/48","2606:4700:a::/48",
    "2606:4700:b::/48","2606:4700:c::/48","2606:4700:d0::/48",
    "2606:4700:d1::/48","2606:4700:d::/48","2606:4700:e0::/48",
    "2606:4700:e1::/48","2606:4700:e2::/48","2606:4700:e3::/48",
    "2606:4700:e4::/48","2606:4700:e5::/48","2606:4700:e6::/48",
    "2606:4700:e7::/48","2606:4700:e::/48","2606:4700:f1::/48",
    "2606:4700:f2::/48","2606:4700:f3::/48","2606:4700:f4::/48",
    "2606:4700:f5::/48","2606:4700:f::/48",
    "2803:f800:50::/48","2803:f800:51::/48",
    "2a06:98c1:3100::/48","2a06:98c1:3101::/48","2a06:98c1:3102::/48",
    "2a06:98c1:3103::/48","2a06:98c1:3104::/48","2a06:98c1:3105::/48",
    "2a06:98c1:3106::/48","2a06:98c1:3107::/48","2a06:98c1:3108::/48",
    "2a06:98c1:3109::/48","2a06:98c1:310a::/48","2a06:98c1:310b::/48",
    "2a06:98c1:310c::/48","2a06:98c1:310d::/48","2a06:98c1:310e::/48",
    "2a06:98c1:310f::/48","2a06:98c1:3120::/48","2a06:98c1:3121::/48",
    "2a06:98c1:3122::/48","2a06:98c1:3123::/48","2a06:98c1:3200::/48",
    "2a06:98c1:50::/48","2a06:98c1:51::/48","2a06:98c1:54::/48",
    "2a06:98c1:58::/48"
];

/*******************************
 * 3. IP 工具函数
 *******************************/

function ipToInt(ip) {
    const parts = ip.split(".");
    return ((parseInt(parts[0]) << 24) >>> 0) +
           (parseInt(parts[1]) << 16) +
           (parseInt(parts[2]) << 8) +
           parseInt(parts[3]);
}

function intToIp(num) {
    num = num >>> 0;
    return ((num >>> 24) & 0xFF) + "." +
           ((num >>> 16) & 0xFF) + "." +
           ((num >>> 8) & 0xFF) + "." +
           (num & 0xFF);
}

function hashStr(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) ^ (str.charCodeAt(i) & 0xFF);
        hash = (hash >>> 0);
    }
    return hash;
}

function isValidIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    for (const p of parts) {
        const n = parseInt(p);
        if (isNaN(n) || n < 0 || n > 255 || String(n) !== p) return false;
    }
    return true;
}

// ── IPv6 工具 ──

function expandIPv6(ip) {
    // Remove :: shorthand before processing
    if (ip.indexOf("::") >= 0) {
        const parts = ip.split("::");
        const left = parts[0] ? parts[0].split(":").filter(Boolean) : [];
        const right = parts[1] ? parts[1].split(":").filter(Boolean) : [];
        const missing = 8 - left.length - right.length;
        const middle = [];
        for (let i = 0; i < missing; i++) middle.push("0000");
        const full = left.concat(middle).concat(right);
        return full.map(g => g.padStart(4, "0")).join(":");
    }
    return ip.split(":").map(g => g.padStart(4, "0")).join(":");
}

function ipv6ToGroups(expanded) {
    return expanded.split(":").map(g => parseInt(g, 16));
}

function groupsToIPv6(groups) {
    const hex = groups.map(g => g.toString(16).padStart(4, "0")).join(":");
    // Compress with :: (simplified: find longest zero run)
    return compressIPv6(hex);
}

function compressIPv6(full) {
    const groups = full.split(":");
    let bestStart = -1, bestLen = 0;
    let curStart = -1, curLen = 0;
    for (let i = 0; i < groups.length; i++) {
        if (groups[i] === "0000") {
            if (curStart === -1) curStart = i;
            curLen++;
        } else {
            if (curLen > bestLen) {
                bestLen = curLen;
                bestStart = curStart;
            }
            curStart = -1;
            curLen = 0;
        }
    }
    if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
    }
    if (bestLen < 2) {
        // Don't compress single zero groups, just strip leading zeros
        return groups.map(g => g.replace(/^0+/, "") || "0").join(":");
    }
    const left = groups.slice(0, bestStart).map(g => g.replace(/^0+/, "") || "0").join(":");
    const right = groups.slice(bestStart + bestLen).map(g => g.replace(/^0+/, "") || "0").join(":");
    return left + "::" + right;
}

function ipv6URL(ip) {
    return "[" + ip + "]";
}

function isValidIPv6(ip) {
    // Simple check: contains at least 2 colons
    const colons = (ip.match(/:/g) || []).length;
    return colons >= 2 && colons <= 7;
}

// Generate random IPv6 from a CIDR range
function sampleIPv6FromRange(cidr, count, seed) {
    const [baseIP, prefixStr] = cidr.split("/");
    const prefix = parseInt(prefixStr);
    const expanded = expandIPv6(baseIP);
    const groups = ipv6ToGroups(expanded);

    // Calculate how many bits we can randomize
    const randomBits = 128 - prefix;
    // Each group is 16 bits
    const randomGroups = Math.floor(randomBits / 16);
    const extraBits = randomBits % 16;

    const ips = [];
    const maxSamples = Math.min(count, 50); // cap IPv6 samples per range

    for (let s = 0; s < maxSamples; s++) {
        const newGroups = groups.slice();
        const groupOffset = 8 - randomGroups - (extraBits > 0 ? 1 : 0);

        for (let g = groupOffset; g < 8; g++) {
            if (g > groupOffset || extraBits === 0) {
                // Full 16 bits random
                newGroups[g] = hashStr(seed + ":" + cidr + ":" + s + ":g" + g) & 0xFFFF;
            }
        }

        // Handle partial group (extra bits)
        if (extraBits > 0) {
            const mask = (1 << extraBits) - 1;
            const rand = hashStr(seed + ":" + cidr + ":" + s + ":partial") & mask;
            const partialGroup = groups[groupOffset] & (0xFFFF ^ mask);
            newGroups[groupOffset] = (partialGroup | rand) & 0xFFFF;
        }

        // Apply prefix mask to ensure the generated IP stays within range
        for (let g = 0; g < 8; g++) {
            const groupStart = g * 16;
            const groupEnd = groupStart + 16;
            if (groupEnd <= prefix) {
                // Fully within prefix: keep original
                newGroups[g] = groups[g];
            } else if (groupStart < prefix && groupEnd > prefix) {
                // Partially within prefix
                const bitsInGroup = prefix - groupStart;
                const mask = (0xFFFF << (16 - bitsInGroup)) & 0xFFFF;
                newGroups[g] = (groups[g] & mask) | (newGroups[g] & ~mask);
            }
            // else: fully outside prefix, keep randomized
        }

        ips.push(compressIPv6(groupsToIPv6(newGroups)));
    }

    return ips;
}

/*******************************
 * 4. IP 池生成
 *******************************/

function parseCIDR(cidr) {
    const [ip, prefix] = cidr.split("/");
    return { base: ipToInt(ip), prefix: parseInt(prefix) };
}

function sampleFromRange(cidr, count, seed) {
    const { base, prefix } = parseCIDR(cidr);
    const totalSize = Math.pow(2, 32 - prefix);
    const usableSize = totalSize - 2; // exclude network + broadcast
    const sampleCount = Math.min(count, usableSize);

    const ips = new Set();
    let attempt = 0;
    const maxAttempts = sampleCount * 10; // prevent infinite loop for tiny ranges

    while (ips.size < sampleCount && attempt < maxAttempts) {
        attempt++;
        const idx = hashStr(seed + ":" + cidr + ":" + attempt) % usableSize;
        const offset = idx + 1; // skip network address
        const ip = intToIp(base + offset);
        if (isValidIPv4(ip)) {
            ips.add(ip);
        }
    }

    return Array.from(ips);
}

function generateIPPool(config, historyIPs) {
    const seed = new Date().toISOString().split("T")[0]; // daily deterministic seed
    const candidates = [];

    // 1. Add history IPs (warm start)
    for (const ip of historyIPs.slice(0, 30)) {
        if (isValidIPv4(ip)) {
            candidates.push(ip);
        }
    }
    const historyCount = candidates.length;

    // 2. Proportional allocation from IPv4 ranges
    const v4Count = config.useIpv6 ? Math.floor(config.testCount * 0.7) : config.testCount;
    const v6Count = config.useIpv6 ? config.testCount - v4Count : 0;

    // IPv4 sampling
    const v4RangeInfos = IPV4_RANGES.map(cidr => {
        const [ip, prefix] = cidr.split("/");
        return {
            cidr: cidr,
            base: ipToInt(ip),
            prefixLen: parseInt(prefix),
            size: Math.pow(2, 32 - parseInt(prefix))
        };
    });

    const v4TotalSize = v4RangeInfos.reduce((s, r) => s + r.size, 0);
    const v4Remaining = v4Count - historyCount;
    const v4Set = new Set(candidates);

    for (const range of v4RangeInfos) {
        const proportional = Math.max(1, Math.floor(v4Remaining * range.size / v4TotalSize));
        const capped = Math.min(proportional, 30);
        const sampleIPs = sampleFromRange(range.cidr, capped, seed + ":v4");
        for (const ip of sampleIPs) {
            if (v4Set.size >= v4Count) break;
            v4Set.add(ip);
        }
    }

    // Fill IPv4 if needed
    if (v4Set.size < v4Count) {
        const sorted = v4RangeInfos.sort((a, b) => b.size - a.size);
        for (let i = 0; i < sorted.length && v4Set.size < v4Count; i++) {
            const extra = Math.ceil((v4Count - v4Set.size) / sorted.length) + 2;
            const sampleIPs = sampleFromRange(sorted[i].cidr, extra, seed + ":v4fill");
            for (const ip of sampleIPs) {
                if (v4Set.size >= v4Count) break;
                v4Set.add(ip);
            }
        }
    }

    const ipv4Pool = Array.from(v4Set);

    // IPv6 sampling
    let ipv6Pool = [];
    if (config.useIpv6 && v6Count > 0) {
        const v6Set = new Set();
        const v6PerRange = Math.max(1, Math.ceil(v6Count / IPV6_RANGES.length));
        for (const cidr of IPV6_RANGES) {
            if (v6Set.size >= v6Count) break;
            const sampleIPs = sampleIPv6FromRange(cidr, v6PerRange, seed + ":v6");
            for (const ip of sampleIPs) {
                if (v6Set.size >= v6Count) break;
                v6Set.add(ip);
            }
        }
        ipv6Pool = Array.from(v6Set);
    }

    const pool = ipv4Pool.concat(ipv6Pool);
    console.log("[CFOpt] IP pool: " + pool.length + " candidates ("
        + ipv4Pool.length + " v4 + " + ipv6Pool.length + " v6"
        + ", " + historyCount + " from history)");

    return pool.slice(0, config.testCount);
}

/*******************************
 * 5. 热身探针
 *******************************/

function warmupProbes(config) {
    const warmupIPs = ["1.1.1.1", "8.8.8.8", "104.16.0.1", "172.64.0.1", config.workerHost];
    console.log("[CFOpt] Warmup: probing " + warmupIPs.length + " endpoints...");

    const probes = warmupIPs.map(target => {
        const url = isValidIPv4(target)
            ? "http://" + target + "/cdn-cgi/trace"
            : "http://" + target + "/cdn-cgi/trace";
        return $task.fetch({
            url: url,
            method: "GET",
            timeout: 3000,
            policy: "DIRECT",
            opts: { redirection: false },
            headers: {
                "User-Agent": "QX-CFOptimizer/1.0",
                "Accept": "*/*",
                "Connection": "close"
            }
        }).then(r => {
            console.log("[CFOpt] Warmup " + target + ": " + r.statusCode);
            return r.statusCode;
        }).catch(e => {
            console.log("[CFOpt] Warmup " + target + ": err - " + (e.error || e.message));
            return 0;
        });
    });

    return Promise.all(probes).then(() => {
        console.log("[CFOpt] Warmup complete");
    });
}

/*******************************
 * 6. Phase 1: 并发延迟测试
 *******************************/

function parseTrace(body) {
    try {
        const coloMatch = body.match(/^colo=(\w+)$/m);
        const locMatch = body.match(/^loc=(\w+)$/m);
        return {
            colo: coloMatch ? coloMatch[1] : null,
            loc: locMatch ? locMatch[1] : null
        };
    } catch (e) {
        return { colo: null, loc: null };
    }
}

function toURL(ip, path) {
    if (ip.indexOf(":") >= 0) {
        return "http://[" + ip + "]" + path;
    }
    return "http://" + ip + path;
}

function measureLatency(ip, config) {
    const startTime = Date.now();
    const url = toURL(ip, "/cdn-cgi/trace");

    return $task.fetch({
        url: url,
        method: "GET",
        timeout: config.latencyTimeout,
        policy: "DIRECT",
        opts: { redirection: false },
        headers: {
            "User-Agent": "QX-CFOptimizer/1.0",
            "Accept": "*/*",
            "Connection": "close"
        }
    }).then(response => {
        const elapsed = Date.now() - startTime;
        const info = parseTrace(response.body || "");
        return {
            ip: ip,
            latency: elapsed,
            colo: info.colo,
            loc: info.loc,
            status: "ok"
        };
    }).catch(reason => {
        return {
            ip: ip,
            latency: Infinity,
            colo: null,
            loc: null,
            status: "error",
            error: (reason && reason.error) || "timeout"
        };
    });
}

async function phase1LatencyTest(candidates, config, deadline) {
    console.log("[CFOpt] Phase 1: testing " + candidates.length + " IPs (deadline " + deadline + "ms)");
    const results = [];
    const totalBatches = Math.ceil(candidates.length / config.batchSize);

    for (let bi = 0; bi < totalBatches; bi++) {
        if (Date.now() > deadline) {
            console.log("[CFOpt] Phase 1 deadline reached after " + bi + "/" + totalBatches + " batches");
            break;
        }

        const start = bi * config.batchSize;
        const batch = candidates.slice(start, start + config.batchSize);
        const batchResults = await Promise.all(
            batch.map(ip => measureLatency(ip, config))
        );

        for (const r of batchResults) {
            results.push(r);
        }

        // Progress logging
        if ((bi + 1) % 5 === 0 || bi === totalBatches - 1) {
            const ok = batchResults.filter(r => r.status === "ok").length;
            console.log("[CFOpt] Batch " + (bi + 1) + "/" + totalBatches
                + " (" + ok + "/" + batch.length + " ok, total results: " + results.length + ")");
        }

        // Inter-batch delay (skip last batch)
        if (bi < totalBatches - 1) {
            await sleep(150);
        }
    }

    return results;
}

function filterAndRankPhase1(results, config) {
    // Filter: remove errors and high latency
    let valid = results.filter(r =>
        r.status === "ok" &&
        r.latency !== Infinity &&
        r.latency <= config.maxLatency
    );

    console.log("[CFOpt] Phase 1 valid results after filter: " + valid.length
        + " / " + results.length + " (max_latency=" + config.maxLatency + "ms)");

    // If prefer_colo specified, sort matching IPs with a boost
    if (config.preferColo.length > 0) {
        valid.forEach(r => {
            if (r.colo && config.preferColo.includes(r.colo)) {
                r._coloBoost = 40; // effective 40ms boost
            } else {
                r._coloBoost = 0;
            }
        });
        valid.sort((a, b) => (a.latency - a._coloBoost) - (b.latency - b._coloBoost));
    } else {
        valid.sort((a, b) => a.latency - b.latency);
    }

    // Deduplicate by /24 subnet (keep best latency per /24)
    const seenSubnets = new Set();
    const deduped = [];
    for (const r of valid) {
        const subnet = r.ip.split(".").slice(0, 3).join(".");
        if (!seenSubnets.has(subnet)) {
            seenSubnets.add(subnet);
            deduped.push(r);
        }
    }
    console.log("[CFOpt] After subnet dedup: " + deduped.length + " IPs");

    if (deduped.length < 3) {
        console.log("[CFOpt] WARNING: Very few results (" + deduped.length + "). Network may be poor.");
    }

    return deduped;
}

/*******************************
 * 7. Phase 2: 下载测速
 *******************************/

function measureDownloadSpeed(ip, config) {
    const startTime = Date.now();
    const url = toURL(ip, ":" + config.dlPort + config.speedtestPath + "?bytes=" + config.dlBytes);

    return $task.fetch({
        url: url,
        method: "GET",
        timeout: config.dlTimeout,
        policy: "DIRECT",
        opts: { redirection: false },
        headers: {
            "Host": config.workerHost,
            "User-Agent": "QX-CFOptimizer/1.0",
            "Accept": "*/*",
            "Connection": "close",
            "Cache-Control": "no-cache"
        }
    }).then(response => {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const bodyLen = response.body ? response.body.length : 0;

        // Check response body for CF error pages
        const body = response.body || "";

        if (response.statusCode === 400 && body.indexOf("plain HTTP request was sent to HTTPS port") >= 0) {
            return {
                ip: ip,
                speed: 0,
                bytes: 0,
                elapsed: elapsed,
                status: "https_required",
                error: "CF requires HTTPS: disable 'Always Use HTTPS' on Worker domain or add transform rule for /speedtest"
            };
        }

        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
            const loc = response.headers ? (response.headers.Location || response.headers.location || "") : "";
            return {
                ip: ip,
                speed: 0,
                bytes: bodyLen,
                elapsed: elapsed,
                status: "redirect",
                code: response.statusCode,
                redirect: loc
            };
        }

        if (response.statusCode !== 200) {
            return {
                ip: ip,
                speed: 0,
                bytes: bodyLen,
                elapsed: elapsed,
                status: "bad_status",
                code: response.statusCode
            };
        }

        if (elapsed < 0.1 || bodyLen < 1024) {
            return {
                ip: ip,
                speed: 0,
                bytes: bodyLen,
                elapsed: elapsed,
                status: "too_small"
            };
        }

        const speedMBps = (bodyLen / elapsed) / (1024 * 1024);
        return {
            ip: ip,
            speed: speedMBps,
            bytes: bodyLen,
            elapsed: elapsed,
            status: "ok"
        };
    }).catch(reason => {
        return {
            ip: ip,
            speed: 0,
            bytes: 0,
            elapsed: 0,
            status: "error",
            error: (reason && reason.error) || "timeout"
        };
    });
}

async function phase2DownloadTest(candidates, config, deadline) {
    if (config.dlCount <= 0 || candidates.length === 0) {
        console.log("[CFOpt] Phase 2 skipped (dl_count=" + config.dlCount + ")");
        return [];
    }

    const toTest = candidates.slice(0, config.dlCount);
    console.log("[CFOpt] Phase 2: download testing " + toTest.length + " IPs (deadline " + deadline + "ms)");

    const results = [];

    for (let i = 0; i < toTest.length && Date.now() < deadline; i += config.dlConcurrency) {
        const batch = toTest.slice(i, i + config.dlConcurrency);
        const batchResults = await Promise.all(
            batch.map(ip => measureDownloadSpeed(ip, config))
        );

        for (const r of batchResults) {
            results.push(r);
        }

        if (batchResults.some(r => r.status === "ok")) {
            const ok = batchResults.filter(r => r.status === "ok");
            console.log("[CFOpt] DL batch " + (i / config.dlConcurrency + 1) + ": "
                + ok.map(r => r.ip + "=" + r.speed.toFixed(1) + "MB/s").join(", "));
        } else if (batchResults.some(r => r.status === "https_required")) {
            console.log("[CFOpt] DL batch " + (i / config.dlConcurrency + 1)
                + ": ALL require HTTPS - disable 'Always Use HTTPS' on Worker domain");
        } else if (batchResults.some(r => r.status === "redirect")) {
            console.log("[CFOpt] DL batch " + (i / config.dlConcurrency + 1)
                + ": ALL redirected (HTTP→HTTPS) - check CF Dashboard settings");
        }

        // Small delay between pairs
        if (i + config.dlConcurrency < toTest.length) {
            await sleep(300);
        }
    }

    // Diagnose common failure patterns
    const statuses = {};
    for (const r of results) {
        statuses[r.status] = (statuses[r.status] || 0) + 1;
    }
    console.log("[CFOpt] Phase 2 status summary: " + JSON.stringify(statuses));

    return results;
}

/*******************************
 * 8. 综合评分与排序
 *******************************/

function computeFinalRanking(phase1Results, phase2Results, config) {
    // Build latency lookup from Phase 1
    const latencyMap = {};
    for (const r of phase1Results) {
        latencyMap[r.ip] = {
            latency: r.latency,
            colo: r.colo,
            loc: r.loc
        };
    }

    const hasSpeedData = phase2Results.some(r => r.status === "ok" && r.speed > 0);

    if (!hasSpeedData || phase2Results.length === 0) {
        // Fallback: latency-only ranking
        console.log("[CFOpt] No valid speed data, using latency-only ranking");
        return phase1Results.slice(0, 10).map((r, i) => ({
            rank: i + 1,
            ip: r.ip,
            latency: r.latency,
            speed: null,
            colo: r.colo,
            loc: r.loc,
            score: r.latency,
            source: "latency_only"
        }));
    }

    // Compute combined score
    const validDL = phase2Results.filter(r => r.status === "ok" && r.speed > 0);
    const maxSpeed = Math.max(...validDL.map(r => r.speed), 0.1);

    const scored = [];
    for (const dl of phase2Results) {
        const p1 = latencyMap[dl.ip];
        if (!p1) continue;

        let speed = dl.status === "ok" ? dl.speed : 0;
        let latency = p1.latency;

        // Normalize: lower score is better
        // latency normalized to [0, 1] where 0 = max_latency, 1 = 0ms
        const normLatency = 1 - (latency / config.maxLatency);
        // speed normalized to [0, 1] where 1 = maxSpeed
        const normSpeed = maxSpeed > 0 ? speed / maxSpeed : 0;

        // Weight: 30% latency, 70% speed (mirrors cfst's priority)
        let score = (0.3 * (1 - normLatency)) - (0.7 * normSpeed);

        // Colo boost
        if (config.preferColo.length > 0 && p1.colo) {
            if (config.preferColo.includes(p1.colo)) {
                score -= 0.05;
            }
        }

        scored.push({
            ip: dl.ip,
            latency: latency,
            speed: speed,
            colo: p1.colo,
            loc: p1.loc,
            score: score,
            source: "combined"
        });
    }

    // Sort by score ascending (lower is better)
    scored.sort((a, b) => a.score - b.score);

    // Add rank
    const ranked = scored.slice(0, 10).map((r, i) => {
        r.rank = i + 1;
        return r;
    });

    return ranked;
}

/*******************************
 * 9. 持久化与通知
 *******************************/

function persistResults(ranked, config, stats) {
    const summary = {
        timestamp: Date.now(),
        testCount: stats.totalTested,
        dlCount: stats.dlTested,
        bestIP: ranked.length > 0 ? ranked[0].ip : null,
        bestLatency: ranked.length > 0 ? ranked[0].latency : null,
        bestSpeed: ranked.length > 0 ? ranked[0].speed : null,
        bestColo: ranked.length > 0 ? ranked[0].colo : null,
        top5: ranked.slice(0, 5).map(r => r.ip),
        hasSpeed: stats.hasSpeed
    };

    try {
        $prefs.setValueForKey(JSON.stringify(ranked), "cf_opt_result");
        $prefs.setValueForKey(ranked.length > 0 ? ranked[0].ip : "", "cf_opt_best_ip");
        $prefs.setValueForKey(String(Date.now()), "cf_opt_last_run");
        $prefs.setValueForKey(JSON.stringify(summary), "cf_opt_summary");

        // Update history (keep top 50 unique IPs for seeding future runs)
        let history = [];
        try {
            history = JSON.parse($prefs.valueForKey("cf_opt_history") || "[]");
        } catch (e) { /* ignore */ }

        const newHistory = [summary.bestIP, ...ranked.map(r => r.ip), ...history]
            .filter((ip, i, arr) => ip && arr.indexOf(ip) === i)
            .slice(0, 50);
        $prefs.setValueForKey(JSON.stringify(newHistory), "cf_opt_history");

        console.log("[CFOpt] Results persisted to $prefs");
    } catch (e) {
        console.log("[CFOpt] Failed to persist: " + e.message);
    }
}

function notifyUser(ranked, config, stats) {
    if (ranked.length === 0) {
        $notify("CF优选失败", "无可用IP", "请检查网络连接或放宽延迟限制");
        return;
    }

    const best = ranked[0];
    let tag = stats.hasSpeed ? "" : "[仅延迟] ";
    if (stats.httpsBlocked > 0 && stats.httpsBlocked >= stats.dlTested * 0.8) {
        tag = "[需关闭HTTPS] ";
    }
    const title = "CF优选" + tag + "完成";

    const coloTag = best.colo ? best.colo + " " : "";
    let subtitle = coloTag + best.latency + "ms";
    if (best.speed != null) {
        subtitle += " " + best.speed.toFixed(1) + "MB/s";
    }

    let body = "";
    if (config.notifyDetail) {
        const top5 = ranked.slice(0, 5);
        body = top5.map(r => {
            let line = r.ip + " " + r.latency + "ms";
            if (r.speed != null) line += " " + r.speed.toFixed(1) + "MB/s";
            if (r.colo) line += " " + r.colo;
            return line;
        }).join("\n");
    } else {
        body = "最优: " + best.ip;
    }

    // Append diagnostic advice when HTTPS is blocking
    if (stats.httpsBlocked > 0 && stats.httpsBlocked >= stats.dlTested * 0.8) {
        body += "\n\n⚠ 测速Worker需关闭Always Use HTTPS";
        body += "\nCF Dashboard → SSL/TLS → Edge Certificates → Always Use HTTPS → OFF";
    }

    $notify(title, subtitle, body);
}

/*******************************
 * 10. 工具函数
 *******************************/

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms) {
    const s = (ms / 1000).toFixed(1);
    return s + "s";
}

/*******************************
 * 11. 主流程
 *******************************/

async function main() {
    const startTime = Date.now();
    const GLOBAL_DEADLINE = startTime + 55000; // 55s total

    console.log("[CFOpt] ========================================");
    console.log("[CFOpt] CF IP Optimizer v1.0.0 starting...");
    console.log("[CFOpt] Deadline: " + formatDuration(GLOBAL_DEADLINE - startTime) + " remaining");

    // Parse config
    const config = parseConfig();
    if (config._error) {
        console.log("[CFOpt] CONFIG ERROR: " + config._error);
        $notify("CF优选配置错误", config._error, "请检查 script URL 中的 hash 参数");
        $done();
        return;
    }
    console.log("[CFOpt] Config: worker_host=" + config.workerHost
        + " test_count=" + config.testCount
        + " batch=" + config.batchSize
        + " max_lat=" + config.maxLatency + "ms"
        + " dl_count=" + config.dlCount
        + " dl_bytes=" + (config.dlBytes / 1024) + "KB"
        + " ipv6=" + config.useIpv6);

    // Warmup
    if (config.warmup) {
        try {
            await warmupProbes(config);
        } catch (e) {
            console.log("[CFOpt] Warmup failed, continuing...");
        }
    }

    // Load history
    let historyIPs = [];
    try {
        historyIPs = JSON.parse($prefs.valueForKey("cf_opt_history") || "[]");
    } catch (e) { /* ignore */ }
    console.log("[CFOpt] History: " + historyIPs.length + " cached IPs");

    // Generate IP pool
    const candidates = generateIPPool(config, historyIPs);
    if (candidates.length === 0) {
        $notify("CF优选失败", "IP池为空", "请检查 CIDR 配置");
        $done();
        return;
    }

    // Phase 1: Latency testing (40s budget)
    const phase1Deadline = Date.now() + 40000;
    const phase1Results = await phase1LatencyTest(candidates, config, phase1Deadline);
    console.log("[CFOpt] Phase 1 results: " + phase1Results.length + " (took " + formatDuration(Date.now() - startTime) + ")");

    // Filter and rank Phase 1
    const phase1Ranked = filterAndRankPhase1(phase1Results, config);

    if (phase1Ranked.length === 0) {
        $notify("CF优选失败", "延迟测试无可用IP",
            "测试了 " + phase1Results.length + " 个IP，全部超时或延迟 >" + config.maxLatency + "ms\n请检查网络或放宽 max_latency");
        $done();
        return;
    }

    // Phase 2: Download testing (remaining time - 3s buffer)
    const phase2Deadline = Math.min(Date.now() + 20000, GLOBAL_DEADLINE - 3000);
    const phase2Results = await phase2DownloadTest(phase1Ranked, config, phase2Deadline);
    console.log("[CFOpt] Phase 2 results: " + phase2Results.length + " (took " + formatDuration(Date.now() - startTime) + ")");

    // Final ranking
    const hasSpeed = phase2Results.some(r => r.status === "ok" && r.speed > 0);
    const ranked = computeFinalRanking(phase1Ranked, phase2Results, config);

    // Phase 2 diagnostics
    const dlErrors = {};
    for (const r of phase2Results) {
        if (r.status !== "ok") {
            dlErrors[r.status] = (dlErrors[r.status] || 0) + 1;
        }
    }
    const httpsBlocked = dlErrors["https_required"] || 0;
    const redirected = dlErrors["redirect"] || 0;

    // Stats
    const stats = {
        totalTested: phase1Results.length,
        dlTested: phase2Results.length,
        hasSpeed: hasSpeed,
        httpsBlocked: httpsBlocked,
        redirected: redirected
    };

    // Persist and notify
    persistResults(ranked, config, stats);
    notifyUser(ranked, config, stats);

    // Log summary
    const elapsed = Date.now() - startTime;
    console.log("[CFOpt] ========================================");
    console.log("[CFOpt] Complete in " + formatDuration(elapsed));
    if (ranked.length > 0) {
        console.log("[CFOpt] Best: " + ranked[0].ip
            + " " + ranked[0].latency + "ms"
            + (ranked[0].speed != null ? " " + ranked[0].speed.toFixed(1) + "MB/s" : "")
            + " colo=" + (ranked[0].colo || "?"));
    }
    console.log("[CFOpt] ========================================");

    $done();
}

// Entry point
main().catch(e => {
    console.log("[CFOpt] FATAL: " + (e.message || e));
    try {
        $notify("CF优选崩溃", e.message || String(e), "请检查脚本日志");
    } catch (_) { /* ignore */ }
    $done();
});
