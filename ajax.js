Lapiz.Module("Ajax", ["Collections", "Events"], function($L){
  var self = $L.Namespace();
  $L.set($L, "Ajax", self.namespace);
  $L.set(self.namespace, "on", $L.Map());

  var _readystatechange = $L.Event.linkProperty(self.namespace.on, "readystatechange");
  var _status = [
    $L.Event.linkProperty(self.namespace.on, "status0"),
    $L.Event.linkProperty(self.namespace.on, "status100"),
    $L.Event.linkProperty(self.namespace.on, "status200"),
    $L.Event.linkProperty(self.namespace.on, "status300"),
    $L.Event.linkProperty(self.namespace.on, "status400"),
    $L.Event.linkProperty(self.namespace.on, "status500"),
  ];

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
      _readystatechange.fire(x);
      if (x.readyState === 4){
        _status[Math.floor(x.status/100)].fire(x);
        if (x.status === 200 && $L.typeCheck.func(callback)){
          callback(x);
        }
      }
    }
  }

  var _headers = $L.Map();

  function request(type, url, urlData, rawData, callback, headers){
    var x = _getXmlHttp();
    if (urlData !== undefined){
      url += (url.indexOf("?") === -1) ? "?" : "&"
      if ($L.typeCheck.string(urlData)){
        url += urlData;  
      } else {
        url += _encodeData(urlData);
      }
    }
    x.onreadystatechange = _rsChng(x, callback);
    x.open(type, url, true);
    $L.each(_headers, function(val, key){
      x.setRequestHeader(key, val);
    });
    if (headers !== undefined){
      $L.each(headers, function(val, key){
        x.setRequestHeader(key, val);
      });
    }
    x.send(rawData);
    return x;
  }
  self.meth(request);

  self.meth(function get(url, data, callback, headers){
    if ($L.typeCheck.func(data)){
      callback = data;
      data = undefined;
    }
    return request("GET", url, data, undefined, callback, headers);
  });

  self.meth(function post(url, data, callback, headers){
    if ($L.typeCheck.func(data)){
      callback = data;
      data = undefined;
    }

    if (data === undefined){
      data = "";
    } else if (!$L.typeCheck.string(data)){
      data = _encodeData(data);
    }

    if (headers === undefined){
      headers = $L.Map();
    }
    headers["Content-type"] = "application/x-www-form-urlencoded";
    headers["Content-length"] = data.length;
    headers["Connection"] = "close";

    return request("POST", url, undefined, data, callback, headers);
  });

  self.meth(function json(url, data, callback, headers){
    return request("POST", url, data, undefined, function(x){
      callback(JSON.parse(x.responseText));
    }, headers);
  });

  self.meth(function header(key, val){
    if (val === undefined){
      return _headers[key];
    } else if (val === null){
      delete _headers[key];
    } else {
      _headers[key] = val;
    }
  });
});