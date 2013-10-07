/******************************************************************************/
/*                                                                            */
/*                                                                            */
/*                        Node.jsで作る模擬競技サーバ                         */
/*                                                                            */
/*                        -- やっぱりJSは最高だぜ! --                         */
/*                                                                            */
/*                                                                            */
/******************************************************************************/

/******************************************************************************/
/*                                    設定                                    */
/******************************************************************************/
var LOG_LEVEL = 2;
var PORT = 3000;
var DIR_NAME = "files";
var FILES = [
	"/index.html", 
	"/client.js", 
	"/style.less", 
	"/less.js", 
	"/form.html", 
	"/result.html",
	"/skroll.js"
];


var fs = require('fs');
var http = require('http');
var server = http.createServer(handler);
var io = require('socket.io').listen(server, {'log level':LOG_LEVEL});
server.listen(PORT);


/******************************************************************************/
/*                              Socketの時間だ!                               */
/******************************************************************************/
console.log("   -------");
console.log("   Access! => http://(IPAddress):"+PORT+"/");
console.log("   -------");

const PREPARE = 0;
const NO_GAME = 1;
const ON_GAME = 2;

var end_unixtime;
var DATA = new Object();
DATA.state = PREPARE;
DATA.mes = "準備中...";

io.sockets.on('connection', function(socket) {
	/*------------------------------------*/
	/*              新規接続              */
	/*------------------------------------*/
	if (DATA.state == ON_GAME) DATA.time = end_unixtime - ~~(new Date/1000);
	socket.emit('newConnect', DATA);

	/*------------------------------------*/
	/*            試合開始要求            */
	/*------------------------------------*/
	socket.on('startGameRequest', function(obj) {
			// Error処理
			var msg =
				(DATA.state == ON_GAME) ? '今は試合中だよー' :
				!(obj.flag && obj.token && obj.time) ? 'ちゃんと設定してねー' :
				(obj.flag.length > 4000) ? '回答長すぎィ!' :	// 0文字は obj.flag -> false
				!isCodeRange(obj.flag) ? '回答に範囲外の文字があります' :
				!(180 <= obj.time && obj.time <= 600) ? '競技時間は180秒から300秒です' :
				null;

			if (msg) {
				socket.emit('Error', msg);
				return;
			}

			// 試合開始通知
			DATA.state = ON_GAME;
			DATA.flag = obj.flag;
			DATA.token = obj.token;
			DATA.time = ~~(obj.time);
			end_unixtime = ~~(new Date/1000) + DATA.time;
			io.sockets.emit('startGameResponse', DATA);
	});

	/*------------------------------------*/
	/*            試合終了要求            */
	/*------------------------------------*/
	socket.on('endGameRequest', function(auto_flg) {
			// Error処理
			if (!auto_flg && DATA.state == NO_GAME) {
				socket.emit('Error', 'いつから試合が始まっていると錯覚していた?');
				return;
			}

			// 終了
			endGame();
	});

	/*------------------------------------*/
	/*              回答来た              */
	/*------------------------------------*/
	socket.on('answerFlagRequest', function(obj) {
		// まぁWebSocektから来ることは無いと思うんですけどね
		parseAnswer(obj);
	});

	/*------------------------------------*/
	/*               接続断               */
	/*------------------------------------*/
	socket.on('disconnect', function() {
		console.log("   DisConnect");
	});
});



/******************************************************************************/
/*                               Webサーバ機能                                */
/******************************************************************************/
var url = require('url');
var qs = require('querystring');

function handler(req, res) {
	// 解析
	var parse = url.parse(req.url, true);

	// 回答処理
	if (parse.pathname === '/SubmitAnswer' && req.method === 'POST') {
		var body = '';
	
		req.on('data', function(chunk) {
			body += chunk;
		});
	
		req.on('end', function() {
			var query = qs.parse(body);
			parseAnswer({flag:query.answer, token:query.playerid});
		});
	}

	// 静的ファイル配信
	var code = 404;
	var filename = '/404.html';

	if (parse.pathname === '/SubmitAnswer') parse.pathname = '/result.html';
	if (parse.pathname === '/SubmitForm') parse.pathname = '/form.html';
	if (parse.pathname === '/') parse.pathname = '/index.html';
	if (FILES.indexOf(parse.pathname) !== -1) {
		code = 200;
		filename = parse.pathname;
	}

	fs.readFile(__dirname + '/' + DIR_NAME + filename, function(err, content) {
		if (err) {
			res.writeHead(500);
			return res.end('Error!');
		}

		res.writeHead(code, {});
		res.end(content);
	});
}


/******************************************************************************/
/*                                  関数たち                                  */
/******************************************************************************/
/*------------------------------------*/
/*          指定文字範囲内か          */
/*------------------------------------*/
function isCodeRange(str) {
	for(var i=0; i<str.length; i++) {
		var code = str.charCodeAt(i);
		if (!(33 <= code && code <= 122)) return false;
		if (91 <= code && code <= 94) return false;
	}

	return true;
}

/*------------------------------------*/
/*        ここで試合終了ですよ        */
/*------------------------------------*/
function endGame(voice_flag) {
	if (typeof voice_flag === 'undefined') voice_flag = true

	DATA.state = NO_GAME;
	io.sockets.emit('endGameResponse', voice_flag);
}

/*------------------------------------*/
/*            あんさぁ...             */
/*------------------------------------*/
function parseAnswer(obj) {
	var res = new Object();
	var end_flg = false;

	// Error対応
	res.msg = '回答されても、'
	if (DATA.state != ON_GAME) {
		res.error = 1;
		res.msg += 'もう終わっているんですよねー';
	} else if (!(obj.flag && obj.token)) {
		res.error = 1;
		res.msg += '読めないです';
	} else if (!isCodeRange(obj.flag)) {
		res.error = 1;
		res.msg += '範囲外の文字があるんですよねー';
		res.flag = obj.flag;
	} else if (DATA.token != obj.token) {
		res.error = 1;
		res.msg += 'Tokenが違うんですよねー';
		res.flag = obj.flg;
	} else {
		res.error = 0;
		res.flag = obj.flag;
		res.count = 
			(function countMatch(correct, answer) {
				var i, len = Math.min(correct.length, answer.length);
					for (i=0; i<len; i++) {
						if (correct[i] !== answer[i]) break;
					}
				return i;
			})(DATA.flag, obj.flag);
		res.msg = res.count + '文字正解!';

		if (res.count == DATA.flag.length) {
			res.msg = '釧路高専は優勝しました!いぇーい!';
			endGame(false);
		}
	}

	io.sockets.emit('answerFlagResponse', res);
}

