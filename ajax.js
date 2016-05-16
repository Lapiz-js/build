Lapiz.Module("Ajax", ["Collections", "Events"], function($L){
  var _getXmlHttp;
  if (window.XMLHttpRequest){
    _getXmlHttp = function(){
      return new XMLHttpRequest();
    };
  } else {
    _getXmlHttp = function(){
      return new ActiveXObject("Microsoft.XMLHTTP");
    };
  }

  function _encodeData(data){
    var dataStr = [];
    $L.each(data, function(k,v){
      dataStr.push(encodeURI(k) + "=" + encodeURI(v));
    });
    return dataStr.join("&");
  }

  // Todo, see if there's an event passed in by onreadystatechange
  function _rsChng(x, callback, json){
    return function(){
      if (x.readyState==4 && x.status==200){
        if (json){
          callback(JSON.parse(x.responseText));
        } else {
          callback(x);
        }
      }
    }
  }

  function request(type, json){
    json = !!json;
    return function(url, data, callback){
      var x = _getXmlHttp();
      var typeOfData = typeof data;
      if ( typeOfData === 'function' && callback === undefined){
        callback = data;
      } else if (typeOfData === 'object'){
        url += "?" + _encodeData(data);
      }
      if (typeof callback === 'function'){
        x.onreadystatechange = _rsChng(x, callback, json);
      }
      x.open(type, url, true);
      x.send();
    };
  }

  $L.Ajax = {
    get: request("GET"),
    post: request("POST"),
    json: request("GET", true)
  };
});