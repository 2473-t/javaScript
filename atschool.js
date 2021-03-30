/*
本脚本用于微信小程序我在校园健康打卡
仅用作学习与研究
*/


const jsname = '我在校园健康打卡'
const $ = Env(jsname)
var body
// 下面的是测试用的body
// body = 'answers=%5B%220%22%5D&latitude=30.04395&longitude=115.297696&country=%E4%B8%AD%E5%9B%BD&city=%E9%BB%84%E7%9F%B3%E5%B8%82&district=%E9%98%B3%E6%96%B0%E5%8E%BF&province=%E6%B9%96%E5%8C%97%E7%9C%81&township=%E9%BB%84%E9%A2%A1%E5%8F%A3%E9%95%87&street=&areacode=420222'
var ck
var token
var body_arry = []
var body_str

//重写数据获取
if ($response && $request.method != `OPTIONS` && (($request.url.match(/\/getMessage\.json/)) || ($request.url.match(/\/my\/getStudentSecretInfo\.json/)) || ($request.url.match(/\/home\.json/)) || ($request.url.match(/\/student\/job\/getJobViewList\.json/)) || ($request.url.match(/\/my\/getUserInfo\.json/))) {
    ck = $request.headers
    if (ck) {token = ck.token ;
             $.log(`获取ck请求: 成功,token:` + token) ;
    }
    $.setdata(token,'token_ats')
    $.done()
}

if ($response){
    $.log('\n get a response')
    if ($response.body){$.log(JSON.stringify($response.body) + '\n')}
    if ($response.headers){$.log(JSON.stringify($response.headers) + '\n')
    $.done()
}
    

/*
if ($request && $request.method != `OPTIONS` && $request.url.match(/\/my\/getStudentSecretInfo\.json/)) {
    ck = $request.headers
    if (ck) {token = ck.token ;
             $.log(`获取ck请求: 成功,token:` + token) ;
    }
    $.setdata(token,'token_ats')
    $.done()
}

if ($request && $request.method != `OPTIONS` && $request.url.match(/\/home\.json/)) {
    ck = $request.headers
    if (ck) {token = ck.token ;
             $.log(`获取ck请求: 成功,token:` + token) ;
    }
    $.setdata(token,'token_ats')
    $.done()
}

if ($request && $request.method != `OPTIONS` && $request.url.match(/\/student\/job\/getJobViewList\.json/)) {
    ck = $request.headers
    if (ck) {token = ck.token ;
             $.log(`获取ck请求: 成功,token:` + token) ;
    }
    $.setdata(token,'token_ats')
    $.done()
}
*/

if ($response && $request.method != `OPTIONS` && $request.url.match(/\/health\/save\.json/)) {
    $.log(`-------我在校园健康数据开始更新-------`)
    health_bd = $request.body
    if (health_bd) {
        $.log(`\n获取健康打卡信息成功,原始数据:` + health_bd)
        var health_bd_str = decodeURI(health_bd) // 此处传入获取的body
        $.log(`\n数据解码完毕:` + health_bd_str)
        var health_bd_newstr = health_bd_str.replace(/\=/g, '&')
        var health_bd_arry = health_bd_newstr.split('&') // 获取到数组格式的数据
        $.log(`\n数据解析完毕。` )
        $.setdata(health_bd_arry[1], 'answers_ats')
        $.setdata(health_bd_arry[3], 'latitude_ats')
        $.setdata(health_bd_arry[5], 'longitude_ats')
        $.setdata(health_bd_arry[7], 'country_ats')
        $.setdata(health_bd_arry[9], 'city_ats')
        $.setdata(health_bd_arry[11], 'district_ats')
        $.setdata(health_bd_arry[13], 'province_ats')
        $.setdata(health_bd_arry[15], 'township_ats')
        $.setdata(health_bd_arry[17], 'street_ats')
        $.setdata(health_bd_arry[19], 'areacode_ats')
    $.done()
}


//数据处理及主要流程
token = $.getdata('token_ats')
$.log('\ntoken:' + token)
//var token = '17e47a40-26fa-4d3f-917f-0127ce0d257f'
body_arry.push($.getdata('answers_ats'))
body_arry.push($.getdata('latitude_ats'))
body_arry.push($.getdata('longitude_ats'))
body_arry.push($.getdata('country_ats'))
body_arry.push($.getdata('city_ats'))
body_arry.push($.getdata('district_ats'))
body_arry.push($.getdata('province_ats'))
body_arry.push($.getdata('township_ats'))
body_arry.push($.getdata('street_ats'))
body_arry.push($.getdata('areacode_ats'))
body_str = 'answers' + '=' + body_arry[0] + '&' + 'latitude' + '=' + body_arry[1] + '&' + 'longitude' + '=' + body_arry[2] + '&' + 'country' + '=' + body_arry[3] + '&' + 'city' + '=' + body_arry[4] + '&' + 'district' + '=' + body_arry[5] + '&' + 'province' + '=' + body_arry[6] + '&' + 'township' + '=' + body_arry[7] + '&' + 'street' + '=' + body_arry[8] + '&' + 'areacode' + '=' + body_arry[9]

TaskCenter()

.catch((e) => $.logErr(e))
.finally(() => $.done())


//函数定义
function atSchoolHost(tokenInfo, bodyInfo) {
    return {
        url: 'https://student.wozaixiaoyuan.com/health/save.json',
        headers: {
            'Host': 'student.wozaixiaoyuan.com',
            'Connection': 'keep-alive',
            'Content-Length': '264',
            'Cookie': '',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.21(0x17001522) NetType/WIFI Language/zh_CN',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Token': tokenInfo,
            'Referer': 'https://servicewechat.com/wxce6d08f781975d91/154/page-frame.html',
            'Accept': '*/*',
            'Accept-Language': 'zh-cn',
            'Accept-Encoding': 'gzip, deflate, br'
        },
        body: bodyInfo,
        //timeout: 1000,
    }
}

function TaskCenter() {
    return new Promise((resolve, reject) => {
        $.post(atSchoolHost(token,body), async (error, resp, data) => {
            try {
                taskres = JSON.parse(data);
                if (taskres.code == 0) {
                    console.log(`\n打卡成功✅`);
                }
                else if (taskres.code == 1) {
                    console.log(`\n打卡失败⚠️\n` + taskres.message);
                }
                else {
                    console.log(`\n打卡失败❌\n` + taskres.message);
                }
            } catch (e) {
                $.log("请求失败！" + e)
            } finally {
                resolve()
            }
        })
    })
}





function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch{ return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch{ return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch{ } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch{ return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), a = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(a, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }

