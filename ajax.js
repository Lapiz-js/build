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
    $L.each(data, function(v, k){
      dataStr.push(encodeURI(k) + "=" + encodeURI(v));
    });
    return dataStr.join("&");
  }

  // Todo, see if there's an event passed in by onreadystatechange
  function _rsChng(x, callback){
    return function(){
      if (x.readyState==4 && x.status==200){
        callback(x);
      }
    }
  }

  function request(type, url, urlData, rawData, callback, headers){
    var x = _getXmlHttp();
    if (urlData !== undefined){
      url += (url.indexOf("?") === -1) ? "?" : "&"
      url += _encodeData(data);
    }
    if ($L.typeCheck.func(callback)){
      x.onreadystatechange = _rsChng(x, callback);
    }
    if (headers !== undefined){
      $L.each(headers, function(val, key){
        x.setRequestHeader(key, val);
      });
    }
    x.open(type, url, true);
    x.send(rawData);
  }

  $L.Ajax = {
    Request: request,
    get: function(url, data, callback){
      request("GET", url, data, undefined, callback);
    },
    post: function(url, data, callback, headers){
      request("POST", url, data, undefined, callback);
    },
    json: function(url, data, callback, headers){
      request("POST", url, data, undefined, function(x){
        callback(JSON.parse(x.responseText));
      });
    }
  };
});