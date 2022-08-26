/*
本脚本用于生成微信支付流水
仅用作学习与研究JavaScript的编辑运行机制。
*/

const jsname = '微信流水'
const $ = Env(jsname)

$.isRewrite = 'undefined' !== typeof $request
$.isTask = 'undefined' === typeof $request




// 声明
var data_json1
const average_fee = 2525
const fee_std_diff = 525
const mid_time = "12:10:25"
const night_time = "16:58:35"
const start_time = "2022-08-01 12:25:19"
const end_time = "2022-08-31 11:15:43"
const time_minutes_stddiff = 30
const start_day = 1
const end_day = 26
const year = 2022
var month = 8
var day
var counter = 0
var time_t
var fee_total_fake = 0
data_json1 = JSON.parse(JSON.stringify(data))
month = month - 1
  
// var demo_time = new Date(year, month, day, hours, minutes, seconds, milliseconds)


// 流水加工,持久化储存。
function TaskCenter() {
    if ($.isRewrite) return
    for (let day = start_day; day < end_day; day++) {
        for (let hours_base = 12; hours_base <= 17; hours_base = hours_base + 5) {
            data_json1.record[counter] = JSON.parse(JSON.stringify(data.record[0]))
            time_t = new Date(2022, month, day, hours_base, 13, 23, 40).getTime() + parseInt(time_minutes_stddiff * 60 * 1000 * Math.random())
            time_t = parseInt(time_t / 1000)
            fee_t = average_fee + parseInt(fee_std_diff * Math.random())
            data_json1.record[counter].timestamp = time_t
            data_json1.record[counter].fee = fee_t
            fee_total_fake = fee_total_fake + fee_t
            console.log(fee_t)
            counter = counter + 1
        }
    }
    data_json1.total = counter
    data_json1.statistic[0].userroll_count = counter
    data_json1.statistic[0].pay_fee = fee_total_fake
    data_json1.last_create_time = time_t
    data_output = JSON.stringify(data_json1)
    $.setdata(wxc_bd_json, data_output)
}


// 主函数调用
TaskCenter()
.catch((e) => $.logErr(e))
.finally(() => $.done())



// 环境函数定义
function Env(t, e) {
  class s {
      constructor(t) {
          this.env = t
      }
      send(t, e = "GET") {
          t = "string" == typeof t ? {
              url: t
          } : t;
          let s = this.get;
          return "POST" === e && (s = this.post), new Promise((e, i) => {
              s.call(this, t, (t, s, r) => {
                  t ? i(t) : e(s)
              })
          })
      }
      get(t) {
          return this.send.call(this.env, t)
      }
      post(t) {
          return this.send.call(this.env, t, "POST")
      }
  }
  return new class {
      constructor(t, e) {
          this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`)
      }
      isNode() {
          return "undefined" != typeof module && !!module.exports
      }
      isQuanX() {
          return "undefined" != typeof $task
      }
      isSurge() {
          return "undefined" != typeof $httpClient && "undefined" == typeof $loon
      }
      isLoon() {
          return "undefined" != typeof $loon
      }
      toObj(t, e = null) {
          try {
              return JSON.parse(t)
          } catch {
              return e
          }
      }
      toStr(t, e = null) {
          try {
              return JSON.stringify(t)
          } catch {
              return e
          }
      }
      getjson(t, e) {
          let s = e;
          const i = this.getdata(t);
          if (i) try {
              s = JSON.parse(this.getdata(t))
          } catch {}
          return s
      }
      setjson(t, e) {
          try {
              return this.setdata(JSON.stringify(t), e)
          } catch {
              return !1
          }
      }
      getScript(t) {
          return new Promise(e => {
              this.get({
                  url: t
              }, (t, s, i) => e(i))
          })
      }
      runScript(t, e) {
          return new Promise(s => {
              let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
              i = i ? i.replace(/\n/g, "").trim() : i;
              let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
              r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r;
              const [o, h] = i.split("@"), a = {
                  url: `http://${h}/v1/scripting/evaluate`,
                  body: {
                      script_text: t,
                      mock_type: "cron",
                      timeout: r
                  },
                  headers: {
                      "X-Key": o,
                      Accept: "*/*"
                  }
              };
              this.post(a, (t, e, i) => s(i))
          }).catch(t => this.logErr(t))
      }
      loaddata() {
          if (!this.isNode()) return {}; {
              this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
              const t = this.path.resolve(this.dataFile),
                  e = this.path.resolve(process.cwd(), this.dataFile),
                  s = this.fs.existsSync(t),
                  i = !s && this.fs.existsSync(e);
              if (!s && !i) return {}; {
                  const i = s ? t : e;
                  try {
                      return JSON.parse(this.fs.readFileSync(i))
                  } catch (t) {
                      return {}
                  }
              }
          }
      }
      writedata() {
          if (this.isNode()) {
              this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
              const t = this.path.resolve(this.dataFile),
                  e = this.path.resolve(process.cwd(), this.dataFile),
                  s = this.fs.existsSync(t),
                  i = !s && this.fs.existsSync(e),
                  r = JSON.stringify(this.data);
              s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r)
          }
      }
      lodash_get(t, e, s) {
          const i = e.replace(/\[(\d+)\]/g, ".$1").split(".");
          let r = t;
          for (const t of i)
              if (r = Object(r)[t], void 0 === r) return s;
          return r
      }
      lodash_set(t, e, s) {
          return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t)
      }
      getdata(t) {
          let e = this.getval(t);
          if (/^@/.test(t)) {
              const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : "";
              if (r) try {
                  const t = JSON.parse(r);
                  e = t ? this.lodash_get(t, i, "") : e
              } catch (t) {
                  e = ""
              }
          }
          return e
      }
      setdata(t, e) {
          let s = !1;
          if (/^@/.test(e)) {
              const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}";
              try {
                  const e = JSON.parse(h);
                  this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i)
              } catch (e) {
                  const o = {};
                  this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i)
              }
          } else s = this.setval(t, e);
          return s
      }
      getval(t) {
          return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null
      }
      setval(t, e) {
          return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null
      }
      initGotEnv(t) {
          this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))
      }
      get(t, e = (() => {})) {
          t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
              "X-Surge-Skip-Scripting": !1
          })), $httpClient.get(t, (t, s, i) => {
              !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
          })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
              hints: !1
          })), $task.fetch(t).then(t => {
              const {
                  statusCode: s,
                  statusCode: i,
                  headers: r,
                  body: o
              } = t;
              e(null, {
                  status: s,
                  statusCode: i,
                  headers: r,
                  body: o
              }, o)
          }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => {
              try {
                  if (t.headers["set-cookie"]) {
                      const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
                      s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar
                  }
              } catch (t) {
                  this.logErr(t)
              }
          }).then(t => {
              const {
                  statusCode: s,
                  statusCode: i,
                  headers: r,
                  body: o
              } = t;
              e(null, {
                  status: s,
                  statusCode: i,
                  headers: r,
                  body: o
              }, o)
          }, t => {
              const {
                  message: s,
                  response: i
              } = t;
              e(s, i, i && i.body)
          }))
      }
      post(t, e = (() => {})) {
          if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
              "X-Surge-Skip-Scripting": !1
          })), $httpClient.post(t, (t, s, i) => {
              !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
          });
          else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
              hints: !1
          })), $task.fetch(t).then(t => {
              const {
                  statusCode: s,
                  statusCode: i,
                  headers: r,
                  body: o
              } = t;
              e(null, {
                  status: s,
                  statusCode: i,
                  headers: r,
                  body: o
              }, o)
          }, t => e(t));
          else if (this.isNode()) {
              this.initGotEnv(t);
              const {
                  url: s,
                  ...i
              } = t;
              this.got.post(s, i).then(t => {
                  const {
                      statusCode: s,
                      statusCode: i,
                      headers: r,
                      body: o
                  } = t;
                  e(null, {
                      status: s,
                      statusCode: i,
                      headers: r,
                      body: o
                  }, o)
              }, t => {
                  const {
                      message: s,
                      response: i
                  } = t;
                  e(s, i, i && i.body)
              })
          }
      }
      time(t, e = null) {
          const s = e ? new Date(e) : new Date;
          let i = {
              "M+": s.getMonth() + 1,
              "d+": s.getDate(),
              "H+": s.getHours(),
              "m+": s.getMinutes(),
              "s+": s.getSeconds(),
              "q+": Math.floor((s.getMonth() + 3) / 3),
              S: s.getMilliseconds()
          };
          /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length)));
          for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length)));
          return t
      }
      msg(e = t, s = "", i = "", r) {
          const o = t => {
              if (!t) return t;
              if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? {
                  "open-url": t
              } : this.isSurge() ? {
                  url: t
              } : void 0;
              if ("object" == typeof t) {
                  if (this.isLoon()) {
                      let e = t.openUrl || t.url || t["open-url"],
                          s = t.mediaUrl || t["media-url"];
                      return {
                          openUrl: e,
                          mediaUrl: s
                      }
                  }
                  if (this.isQuanX()) {
                      let e = t["open-url"] || t.url || t.openUrl,
                          s = t["media-url"] || t.mediaUrl;
                      return {
                          "open-url": e,
                          "media-url": s
                      }
                  }
                  if (this.isSurge()) {
                      let e = t.url || t.openUrl || t["open-url"];
                      return {
                          url: e
                      }
                  }
              }
          };
          if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) {
              let t = ["", "==============📣系统通知📣=============="];
              t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t)
          }
      }
      log(...t) {
          t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator))
      }
      logErr(t, e) {
          const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
          s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t)
      }
      wait(t) {
          return new Promise(e => setTimeout(e, t))
      }
      done(t = {}) {
          const e = (new Date).getTime(),
              s = (e - this.startTime) / 1e3;
          this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t)
      }
  }(t, e)
}


// 数据源声明
const data = {
    "record" : [
      {
        "timestamp" : 1660880750,
        "bill_id" : "6e07ff6220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059219202208194747242198",
        "fee" : 1748,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451069686473145725747205",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1660708052,
        "bill_id" : "d464fc6220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059225202208174888034711",
        "fee" : 2152,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451069541603130438451237",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1660536181,
        "bill_id" : "75c5f96220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200057819202208151493011480",
        "fee" : 1432,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451069397427583673958471",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1660189795,
        "bill_id" : "637cf46220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200001611202208119694521910",
        "fee" : 2411,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451069106857821605068872",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1660102856,
        "bill_id" : "c828f36220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059223202208101964619795",
        "fee" : 2123,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "411069033927910470451232",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1660018482,
        "bill_id" : "32dff16220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200057814202208094703322802",
        "fee" : 2440,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451068963150091583488121",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1659952255,
        "bill_id" : "7fdcf06220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059224202208085141638370",
        "fee" : 2425,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "421068907594381747814430",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1659671734,
        "bill_id" : "b694ec6220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059219202208058336015645",
        "fee" : 1763,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451068672276553698508811",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1659585028,
        "bill_id" : "0442eb6220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200057812202208046790134449",
        "fee" : 2036,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451068599542190178304077",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1659519621,
        "bill_id" : "8542ea6220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200057816202208037450349249",
        "fee" : 1691,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451068544675063434444873",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1659498646,
        "bill_id" : "96f0e96220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059224202208039548269681",
        "fee" : 1820,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451068527079645246259207",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1659411957,
        "bill_id" : "f59de86220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200057818202208022692714538",
        "fee" : 2108,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451068454359726931968025",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1659066567,
        "bill_id" : "c758e36220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059222202207290071855261",
        "fee" : 2094,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "411068164625722779238425",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1659003690,
        "bill_id" : "2a63e26220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059222202207280568620110",
        "fee" : 1734,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "451068111880556429312002",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1658980182,
        "bill_id" : "5607e26220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200001444202207283654313738",
        "fee" : 1720,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "411068092160881872076859",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1658916496,
        "bill_id" : "900ee16220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059218202207276884139737",
        "fee" : 2065,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "411068038736945509171246",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1658894959,
        "bill_id" : "6fbae06220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059218202207279803655895",
        "fee" : 2238,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "411068020670892045107263",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1658828160,
        "bill_id" : "80b5df6220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059221202207269734972745",
        "fee" : 1763,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "411067964635035877376034",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1658807435,
        "bill_id" : "8b64df6220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059221202207269758371623",
        "fee" : 2382,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "411067947249728857702472",
        "fee_attr" : "negtive"
      },
      {
        "timestamp" : 1658744643,
        "bill_id" : "436fde6220a10700BgAAC8TS0ORpBYVIYQ==",
        "fee_type" : "CNY",
        "trans_id" : "4200059219202207253603537767",
        "fee" : 1648,
        "current_state_type" : "neutral",
        "title" : "杭州冠领餐饮管理有限公司",
        "current_state" : "",
        "bill_type" : 10,
        "icon_url" : "https://mmbiz.qpic.cn/mmbiz_png/mOrK95e2Bsrz2dnRHDye74LYOXkGwkWIFibGcWbBgSoliabbjNMHJMpoafsESwDy51gY6DQbLN744ZIMCMEL4fBQ/0?wx_fmt=png",
        "out_trade_no" : "411067894576535977984001",
        "fee_attr" : "negtive"
      }
    ],
    "last_bill_id" : "436fde6220a10700BgAAC8TS0ORpBYVIYQ==",
    "statistic" : [
      {
        "userroll_count" : 12,
        "pay_fee" : 24149,
        "fee_unit" : "￥",
        "year" : 2022,
        "month" : 8
      },
      {
        "userroll_count" : 13,
        "pay_fee" : 26742,
        "fee_unit" : "￥",
        "year" : 2022,
        "month" : 7
      }
    ],
    "last_bill_type" : 12,
    "last_trans_id" : "4200059219202207253603537767",
    "last_create_time" : 1658744643,
    "cold_data_limit" : 1,
    "total" : 20,
    "ret_code" : 0,
    "is_over" : false
  }
