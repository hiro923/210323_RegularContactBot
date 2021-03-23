const http = require('http');
const querystring = require('querystring');
const discord = require('discord.js');
const client = new discord.Client();

//初期設定？ここでGASからのレスポンスを受け取る
http.createServer(function(req, res){
  if (req.method == 'POST'){
    var data = "";
    req.on('data', function(chunk){
      data += chunk;
    });
    req.on('end', function(){
      if(!data){
        res.end("No post data");
        return;
      }

      //GASからのレスポンスを受け取る
      var dataObject = querystring.parse(data);
      console.log("post:" + dataObject.type);

      if(dataObject.type == "wake"){  //type == wakeの場合
        console.log("Woke up in post");
        res.end();
        return;
      }

      if(dataObject.type == "announce"){  //type == regularContactの場合
        console.log(dataObject.days);
        let msgChannelId = "818713407246303232";
        if(dataObject.debug !== undefined && dataObject.debug == "false"){
          msgChannelId = "551709887076499476"; //部員へのお知らせチャンネル
          // msgChannelId = "818713407246303232";    //bot-入力用チャンネル
        }
        sendMsg(msgChannelId, "今週の掃除・名簿当番は" + dataObject.teamName + "です！\n"); //GASから受け取ったデータをDiscordへsend
        if(dataObject.days != JSON.stringify("none")){  //daysに値があるか確認
          sendMsg(msgChannelId, "今月の鑑賞会まで残り" + dataObject.days + "日\n");
        }
        sendMsg(msgChannelId,"<@&682940691185139752>"); //部員ロール
        // sendMsg(msgChannelId,"<@&819094574772781076>"); //DEBUGロール
      }

      res.end();
    });
  }
  else if (req.method == 'GET'){
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Discord Bot is active now\n');
  }
}).listen(3000);

//Botの起動状態をDiscordで表示
client.on('ready', message =>{
  console.log('Bot準備完了～');
  client.user.setPresence({ game: { name: '起動中' } });
});

if(process.env.DISCORD_BOT_TOKEN == undefined){
 console.log('DISCORD_BOT_TOKENが設定されていません。');
 process.exit(0);
}

client.login( process.env.DISCORD_BOT_TOKEN );

// //ランダム返答のメッセージ追加
// client.on('message', message =>{
//   if (message.author.id == client.user.id || message.author.bot){
//     return;
//   }
//   if (message.content.match(/^！メッセージ追加/) ||
//       (message.isMemberMentioned(client.user) && message.content.match(/メッセージ追加/))){
//     let getMes = message.content;
//     console.log(getMes);
//     msg.push(getMes);
//     sendMsg(message.channel.id, + "を追加しました。");
//   }
// });
//
// function lottery(channelId, arr){
//   let random = Math.floor( Math.random() * arr.length);
//   sendMsg(channelId, arr[random]);
// }

//おみくじ ランダム返答
client.on('message', message =>{
  if (message.author.id == client.user.id || message.author.bot){
    return;
  }
  if (message.content.match(/^！おみくじ/) ||
      (message.isMemberMentioned(client.user) && message.content.match(/おみくじ/))){
    let arr = ["大吉", "吉", "凶", "中吉", "大凶"];  //おみくじの内容
    lottery(message.channel.id, arr);
  } else {
    let arr = ["呼びましたか？","ぴえん","ねこです","そんな事よりおうどん食べたい","部活に来なさい"];  //ランダム返答
    lottery(message.channel.id, arr);
  }
});

function lottery(channelId, arr){
  let random = Math.floor( Math.random() * arr.length);
  sendMsg(channelId, arr[random]);
}


//以下メソッド



//リプライ送信
function sendReply(message, text){
  message.reply(text)
    .then(console.log("リプライ送信: " + text))
    .catch(console.error);
}

//メッセージ送信
function sendMsg(channelId, text, option={}){
  client.channels.get(channelId).send(text, option)
    .then(console.log("メッセージ送信: " + text + JSON.stringify(option)))
    .catch(console.error);
}

// GASに送信
var sendGAS = function(msg){
  var params = msg.content.split(' ');
  var userId = params[0];
  var value = null;
  for (var n=1; n < params.length; n++){
    if (n == 1)
      value = params[n];
    else
      value = value + ' ' + params[n];
  }

  var jsonData = {
    'userId':msg.member.id,
    'value':value,
    'message':msg.content,
    'channelId':msg.channel.id,
  }

  post(process.env.GAS_URI, jsonData)
}

//post
var post = function(uri, jsonData){
  var request = require('request');
  var options = {
    uri: uri,
    headers: {"Content-type": "application/json"},
    json: jsonData,
    followAllRedirects: true,
  }

  request.post(options, function(error, response, body){
    // if (error != null){
    //   msg.reply('更新に失敗しました');
    //   return;
    // }

    var userid = response.body.userid;
    var channelid = response.body.channelid;
    var message = response.body.message;
    if(userid != undefined && channelid != undefined && message != undefined){
      var channel = client.channels.get(channelid);
      if (channel != null){
        channel.send(message);
      }
    }
  });
}
