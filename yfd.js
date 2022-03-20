/**
 * @fileoverview Example to compose HTTP request
 * and handle the response.
 *
 */
const token = "tW4ATw/+dOkklJmvJIipkGbuaPXriXTX/KWfwoEylhfiHIw7irVbVemJuyfpfYcAbwvTgt1QnNCQA+39xizdsrXkuM58H4c0MqIpddJQJdMM0Q/u2/15Lxd5O9U158Z62kjxfYjqsaw/M9AiZ2Glqg=="



var body = {
  "questionnairePublishEntityId": "1001647684001734001860000000001",
  "answerInfoList": [
    {
      "subjectId": "1001640672356529001000000000001",
      "subjectType": "multiSelect",
      "multiSelect": {
        "optionAnswerList": [
          {
            "beSelectValue": "NotThing",
            "fillContent": ""
          }
        ]
      }
    },
    {
      "subjectId": "1001640672356535001000000000001",
      "subjectType": "location",
      "location": {
        "deviationDistance": 957371,
        "locationRangeId": "1001640577219175000890000000001",
        "address": "湖南省长沙市雨花区劳动东路",
        "city": "长沙市",
        "province": "湖南省",
        "area": "雨花区",
        "latitude": 28.156969129774307,
        "longitude": 113.03138237847222
      }
    },
    {
      "subjectId": "1001647490263982000200000000001",
      "subjectType": "multiSelect",
      "multiSelect": {
        "optionAnswerList": [
          {
            "beSelectValue": "1",
            "fillContent": ""
          }
        ]
      }
    },
    {
      "subjectId": "1001647684101571001820000000001",
      "subjectType": "multiSelect",
      "multiSelect": {
        "optionAnswerList": [
          {
            "beSelectValue": "1",
            "fillContent": ""
          }
        ]
      }
    }
  ]
}


var quest
const url = "https://yfd.ly-sky.com/ly-pd-mb/form/api/healthCheckIn/client/stu/index";
const url_2 = "https://yfd.ly-sky.com/ly-pd-mb/form/api/answerSheet/saveNormal"
const headers = {
            'Host': 'yfd.ly-sky.com',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.16(0x1800103e) NetType/4G Language/zh_CN',
            'Content-Type': 'application/json',
            'Referer': 'https://servicewechat.com/wx217628c7eb8ec43c/19/page-frame.html',
            'userAuthType': 'MS',
            'Accept-Encoding': 'gzip,compress,br,deflate',
            'accessToken': token,
        };
const data = {"info": "abc"};



const myRequest = {
    url: url,
    method: "GET", // Optional, default GET.
    headers: headers, // Optional.
    //body: JSON.stringify(data) // Optional.
};


const myRequest_2 = {
    url: url_2,
    method: "POST", // Optional, default GET.
    headers: headers, // Optional.
    body: JSON.stringify(body) // Optional.
};




$task.fetch(myRequest).then(response => {
    // response.statusCode, response.headers, response.body
    quest = response.body.questionnairePublishEntityId
    console.log(response.body);
    $notify("Title", "Subtitle", response.body); // Success!
    $done();
}, reason => {
    // reason.error
    $notify("Title", "Subtitle", reason.error); // Error!
    $done();
});


$task.fetch(myRequest).then(response => {
    console.log(response.body)
    $notify("Title", "Subtitle", response.body);
    $done();
}, reason => {
    // reason.error
    $notify("Title", "Subtitle", reason.error); // Error!
    $done();
});
