/******************************************************************************/
/*                                                                            */
/*                                 client.js                                  */
/*                                                                            */
/*                         -- デザイン周りもやるよ --                         */
/*                                                                            */
/******************************************************************************/
$(function() {
	/**************************************************************************/
	/*                               WebSocket                                */
	/**************************************************************************/
	const PREPARE = 0;
	const NO_GAME = 1;
	const ON_GAME = 2;

	var FORM = $("#set input[type='submit']").closest("form");
	var SOCKET = io.connect(null, {port:3000});
	var TIMER, DATA;

	/*------------------------------------*/
	/*             新規接続時             */
	/*------------------------------------*/
	SOCKET.on('newConnect', function(obj) {
		DATA = obj;

		printLog("Connect!");

		switch(DATA.state) {
		case NO_GAME:
			initEndGame(false);
			break;
		case ON_GAME:
			initStartGame(false);
			break;
			return;
		}

		printStatus();
	});

	/*------------------------------------*/
	/*              試合制御              */
	/*------------------------------------*/
	FORM.find("input[type='submit']").click(function() {
		// 終了要求
		if (DATA.state == ON_GAME) {
			SOCKET.emit('endGameRequest', false);
			return false;
		}

		// 開始要求
		var req = new Object();
		$.each(FORM.serializeArray(), function() {
			req[this.name] = this.value;
		});
		SOCKET.emit('startGameRequest', req);
		return false;
	});

	/*------------------------------------*/
	/*         試合状況をお知らせ         */
	/*------------------------------------*/
	// はっじまっるよー
	SOCKET.on('startGameResponse', function(obj) {
		DATA = obj;
		initStartGame(true);
	});

	// Socket先生の次回作にご期待ください
	SOCKET.on('endGameResponse', function(voice_flg) {
		if (DATA.state == NO_GAME) return;
		DATA.state = NO_GAME;
		initEndGame(voice_flg);
	});

	/*------------------------------------*/
	/*             回答したよ             */
	/*------------------------------------*/
	SOCKET.on('answerFlagResponse', function(res) {
		// 受信文字列
		if (res.flag) {
			printStatus("ただいまの回答: "+res.flag);
			printLog("{"+ res.flag +"}" + "を受信", false);
		}

		// メッセージ
		var voice_flg = (res.count == 0) ? false : true;
		printLog(res.msg, true);

		// 正解処理
		if (res.error == 1) return;
		$("#now").text(res.count);
	});

	/*------------------------------------*/
	/*             エラー処理             */
	/*------------------------------------*/
	SOCKET.on('Error', function(msg) {
		printLog(msg, true);
	});

	/**********************************************************/
	/*                        関数たち                        */
	/**********************************************************/
	/*------------------------------------*/
	/*              ログ表示              */
	/*------------------------------------*/
	function printLog(msg, voice_flg) {
		if (typeof voice_flg === 'undefined') voice_flg = false;

		var time = new Date();
		$("#log").append("<p>("+zf2(time.getHours())+":"+zf2(time.getMinutes())+":"+zf2(time.getSeconds())+"): "+msg+"</p>");
		if (voice_flg) playVoice(msg);
	}

	/*------------------------------------*/
	/*            ステータス版            */
	/*------------------------------------*/
	function printStatus(msg) {
		if (typeof msg === 'undefined') {
			switch(DATA.state) {
			case ON_GAME:
				msg = "ゲーム中...";
				break;
			case PREPARE:
			case NO_GAME:
				msg = "準備中...";
				break;
			}
		}
		$("#status").text(msg);
	}

	/*------------------------------------*/
	/*            試合中の処理            */
	/*------------------------------------*/
	function initStartGame(voice_flg) {
		// form設定
		$.each(DATA, function(key, val) {
			FORM.find("input[name='"+key+"']").val(val);
		});
		FORM.find("input[type='text']").prop("disabled", true);
		FORM.find("input[type='submit']").val("試合終了");

		// 点数確認
		$("#total").text(DATA.flag.length);
		$("#now").text("0");

		// 時間カウントダウン
		TIMER = setInterval(function() {
				if (DATA.time < 0) {
					SOCKET.emit('endGameRequest', true);
					return;
				}

				FORM.find("input[name='time']").val(DATA.time);
				DATA.time--;
		}, 1000);

		// 表示
		printLog("試合開始!", voice_flg);
		printStatus();
	}

	/*------------------------------------*/
	/*     試合やっていないときの処理     */
	/*------------------------------------*/
	function initEndGame(voice_flg) {
		// Form直し & Timer解除
		FORM.find("input[type='text']").prop("disabled", false);
		FORM.find("input[type='submit']").val("試合開始");

		// Timer停止
		clearInterval(TIMER);

		// 表示
		printLog("試合終了!", voice_flg);
		printStatus();
	}

	/*------------------------------------*/
	/*             ゼロフィル             */
	/*------------------------------------*/
	function zf2(str) {
		return ("0" + str).slice(-2);
	}


	/******************************************************************************/
	/*                                  喋らせる                                  */
	/******************************************************************************/
	// http://blog.livedoor.jp/k_yon/archives/52494323.html より
	function playVoice(msg) {
		$.ajax({
			url : "http://rospeex.ucri.jgn-x.jp/nauth_json/jsServices/VoiceTraSS",
			data : {
				method : "speak",
				params : ["ja", msg, "*", "audio/x-wav"]
			},
			dataType : 'jsonp',
			jsonp : 'callback',
			cache : true,
			success : function(data) {
				if(data['error'] != null) return;
				var audio = new Audio("data:audio/wav;base64," + data['result']['audio']);
				audio.play();
			},
			error : function(XMLHttpRequest, status, errorThrown) {
				console.log(errorThrown);
			},
			complete : function(XMLHttpRequest, status) {
				if (status == "success") return;
				console.log("Voicetra Server Error : ", status);
			}
		});
	}


	/**************************************************************************/
	/*                              スタイル周り                              */
	/**************************************************************************/
	(function() {
		// おっそーい! と言われないために
		var TABLE = $("#set");
		var BUTTON = $("#r");
		var LABEL = $("label");
		var TEXT = TABLE.find("input[type='text']");
		var TABLE_SECTION = TABLE.closest("section");
		var POINT_SECTION = $("section:has(#point)");
		var POINT_SECTION_H2 = POINT_SECTION.find("h2");
		var POINT = $("#point");

		// FormのLabel揃え隊
		var LABEL_WIDTH = 0;
		LABEL.each(function() {
			LABEL_WIDTH = Math.max($(this).width(), LABEL_WIDTH);
		});
		LABEL.width(LABEL_WIDTH).css({"float":"left", "clear":"both"});

		// もーっと関数に頼っていいのよ!
		function initStyle() {
			var width = TABLE.outerWidth() - BUTTON.outerWidth() - LABEL_WIDTH - 40;
			TEXT.width(width);
			
			POINT_SECTION.height(TABLE_SECTION.outerHeight());

			var height = POINT_SECTION.height();
			var size = ~~(height * 0.85) - POINT_SECTION_H2.height();
			POINT.css("font-size", size + "px");
			POINT.css("margin-top", "-" + ~~(height * -0.2) + "px");
		}
		initStyle();
		$(window).resize(initStyle);
	})();
});

