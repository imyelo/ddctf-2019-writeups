/**
 * Created by PhpStorm.
 * User: didi
 * Date: 2019/1/13
 * Time: 9:05 PM
 */

function auth() {
  $.ajax({
      type: "post",
      url:"http://117.51.158.44/app/Auth.php",
      contentType: "application/json;charset=utf-8",
      dataType: "json",
      beforeSend: function (XMLHttpRequest) {
          XMLHttpRequest.setRequestHeader("didictf_username", "");
      },
      success: function (getdata) {
         console.log(getdata);
         if(getdata.data !== '') {
             document.getElementById('auth').innerHTML = getdata.data;
         }
      },error:function(error){
          console.log(error);
      }
  });
}
