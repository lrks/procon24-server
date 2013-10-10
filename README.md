Procon24 Server
===============
「第24回 高専プロコン」の競技部門の練習に使えるサーバです。自由部門の人が作りました。

* 問題文、トークン、競技時間の設定
* 回答の送信
* 試合状況の確認
* 試合状況の実況

が可能です。


使い方
------
## 準備
1. node.js と socket.io をインストールしておく
2. `node server.js`

## 練習
1. `http://(IPアドレス):3000/`にアクセス

2. 右上のフォームにそれぞれ

* `Flag`  問題文("Flag"なのは趣味です)
* `Time(s)`  競技時間(秒数)
* `Token`  識別用トークン

を入力します。

3. `http://(IPアドレス):3000/SubmitForm`や、スクリプトなどから、`http://(IPアドレス):3000/SubmitAnswer`にPOSTで回答を送信します

4. `http://(IPアドレス):3000/` に試合状況が表示されます


画像配信機能
------------
`http://(IPアドレス):3000/capture.html`です。  
この機能に関するソースコードがとても汚いのは、デスマのせいです。

なお、getUserMediaについては、

* <http://blog.o24.me/?p=253>
* <http://www.atmarkit.co.jp/fwcr/design/tool/ajimi01/01.html>
* <http://mogg.hatenablog.com/entry/2013/06/04/004055>

を参考にしています。


「実況」機能について
--------------------
喋ります。音を出してください。

* <http://blog.livedoor.jp/k_yon/archives/52494323.html>
* <http://komeisugiura.jp/software/say.html>

からパクって使っています。

お知らせ
--------
もし、これを使って優勝したら、私に何かください。
北海道な私は、ドクターペッパーの入手が難しいです。
私に、FPGAについて教えるとかでも良いです。
よろしくお願いします。

宛先(所属)は、server.js内にあります。

