<template>
  <div>
    <ul id="msg_list"></ul>
    <form action="" method="post" onsubmit="return false;">
      <input type="text" class="text" id="message" />
      <input type="submit" class="button" id="send" value="送信" />
    </form>
  </div>
</template>

<script>

//接続先の指定  
var url = "http://localhost:8080";
//接続
var socket = io.connect(url);   
//サーバから受け取るイベントを作成
socket.on("sendMessageToClient", function (data) {
    $("#msg_list").prepend("<li>" + data.value + "</li>");
});
//ボタンクリック時に、メッセージ送信
$("input#send").click(function(){
    var msg = $("#message").val(); 
    $("#message").val(""); 
    //サーバへ送信
    socket.emit("sendMessageToServer", {value:msg}); 
});
</script>