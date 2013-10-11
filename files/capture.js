/******************************************************************************/
/*                                                                            */
/*                                 capture.js                                 */
/*                                                                            */
/*    -- 何でプレゼン作らなきゃならないのにこっちやるんですか(ブチギレ) --    */
/*                                                                            */
/******************************************************************************/
$(function() {
	/*------------------------------------------------------------------------*/
	/*                           カメラ設定大丈夫？                           */
	/*------------------------------------------------------------------------*/
	navigator.getUserMedia
					= navigator.getUserMedia ||
					  navigator.webkitGetUserMedia ||
					  navigator.mozGetUserMedia ||
					  navigator.msGetUserMedia;
	if (!navigator.getUserMedia) return;

	/*------------------------------------------------------------------------*/
	/*                          撮ってもいいけどサー                          */
	/*------------------------------------------------------------------------*/
	navigator.getUserMedia({video:true}, function(localMediaStream) {
		$("video")[0].src= window.URL.createObjectURL(localMediaStream);
	}, function(err) {
		console.log(err);
	});

	/*------------------------------------------------------------------------*/
	/*               発達途中のAPIが好きで、その匂いに興奮する                */
	/*------------------------------------------------------------------------*/
	var canvas = document.querySelector('canvas');
	var capter_timer = null;
	var count_timer = null;
	
	$("#capture").click(function() {
		var w = $("input#width").val();
		var h = $("input#height").val();

		// canvas設定
		canvas.style.width = $("video").height() + "px";
		canvas.style.height = $("video").width() + "px";
		canvas.width = w;
		canvas.height = h;

		// 秒数取得
		var sec = $("input#sec").val();
		if (sec || sec < 0) sec = 10;
		
		// 起動
		var count = 1;
		capture_timer = setInterval(function() {
			canvas.getContext('2d').drawImage($("video")[0], 0, 0, w, h);
			var base64 = canvas.toDataURL('image/jpeg');

			$.ajax({
				type:'post',
				url:'/upload',
				data: {
					image:base64,
					booth:$("input#booth").val(),
					count:count++
				},
				success:function(data) {
					playVoice((count - 1) + "回目の撮影は成功しました!");
					$("#log").append("<p>成功:" + (count - 1) + "回目</p>");
				},
				error:function(XMLHttpRequest, textStatus, errorThrown) {
					var msg = "失敗!" + (count - 1) + "回目!無視します!";
					playVoice(msg);
					$("#log").append("<p>" + msg +"</p>");
				}
			});
		}, sec * 1000);

		var interval = sec;
		$("#count").text(interval);
		count_timer = setInterval(function() {
			if (--interval <= 0) interval = sec;
			if (2 <= interval && interval <= 4) playVoice((interval - 1)+"秒前!"); // 遅延考慮
			$("#count").text(interval);
		}, 1000);
	});

	$("#stop").click(function() {
		if(capture_timer) clearInterval(capture_timer);
		if(count_timer) clearInterval(count_timer);
	});

	$("#clear").click(function() {
		$.ajax({
			type:'get',
			url:'/upload/clear',
			success:function(data) {
				var msg = "データ削除したよー";
				playVoice(msg);
				$("#log").append("<p>" + msg +"</p>");
			},
			error:function(XMLHttpRequest, textStatus, errorThrown) {
				var msg = "データ削除できなかったよー";
				playVoice(msg);
				$("#log").append("<p>" + msg +"</p>");
			}
		});
	});

	
	/* client.js にも同じの載っているんだけど... */
	function playVoice(msg) {
		$.ajax({
			url : "http://rospeex.ucri.jgn-x.jp/nauth_json/jsServices/VoiceTraSS",
			data : {
				method : "speak",
				params : ["ja", msg, "*", "audio/x-wav"]
			},
			dataType : 'jsonp',
			jsonp : 'callback',
			cache : false,
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
});

