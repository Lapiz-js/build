/**
 * @namespace Lapiz
 */
var Lapiz = Object.create(null);

/**
 * @namespace ModuleLoaderModule
 * @memberof Lapiz
 *
 * Loads modules into Lapiz, allowing them to declare dependencies
 */
var Lapiz = (function ModuleLoaderModule($L){
  var _loaded = Object.create(null);
  var _pending = [];

  function _checkReqs(reqs){
    var notLoaded = [];
    var i;
    for(i=0; i<reqs.length; i++){
      if (_loaded[reqs[i]] === undefined){
        notLoaded.push(reqs[i]);
      }
    }
    return notLoaded;
  };

  function set(name, value){
    Object.defineProperty($L, name, { value: value });
  }
  set("set", set);

  function _updatePending(name){
    var i, pending, idx;
    var stillPending = [];
    var ready = [];
    for(i=0; i<_pending.length; i++){
      pending = _pending[i];
      idx = pending.reqs.indexOf(name);
      if (idx !== -1){
        pending.reqs.splice(idx,1);
      }
      if (pending.reqs.length === 0){
        ready.push(pending);
      } else {
        stillPending.push(pending);
      }
    }
    _pending = stillPending;
    for(i=0; i<ready.length; i++){
      ready[i].module($L);
      _loaded[ready[i].name] = true;
      _updatePending(ready[i].name);
    }
  }

  $L.set("Module", function(name, reqs, module){
    //Not doing detailed checks here. If you're writing a module, you should be able to load it correctly.
    if (module === undefined){
      module = reqs;
      reqs = [];
    }

    reqs = _checkReqs(reqs);
    if (reqs.length === 0){
      module($L);
      _loaded[name] = true;
      _updatePending(name);
    } else {
      _pending.push({
        module: module,
        name: name,
        reqs: reqs
      });
    }
  });

  $L.Module.Loaded = function(){
    return Object.keys(_loaded);
  };
  Object.freeze(self.Module);
  
  return $L;
})(Lapiz);Lapiz.Module("Collections", function($L){
  $L.each = function(obj, fn){
    var i;
    if (obj instanceof Array){
      var l = obj.length;
      for(i=0; i<l; i+=1){
        if (fn(i, obj[i])) {return i;}
      }
    } else {
      var keys = Object.keys(obj);
      for(i=keys.length-1; i>=0; i-=1){
        if (fn(keys[i], obj[keys[i]])) {return keys[i];}
      }
    }
    return null;
  };

  $L.remove = function(arr, el){
    var i = arr.indexOf(el);
    if (i > -1) { arr.splice(i, 1); }
  }

  $L.ArrayConverter = function(accessor){
    var arr = [];
    var index = [];
    accessor.each(function(i, obj){
      arr.push(obj);
      index.push(i);
    });

    accessor.on.insert(function(key, accessor){
      arr.push(accessor(key));
      index.push(key);
    });

    accessor.on.remove(function(key, obj, accessor){
      var i = index.indexOf(key);
      index.splice(i,1);
      arr.splice(i,1);
    });

    accessor.on.change(function(key, accessor){
      var i = index.indexOf(key);
      arr[i] = accessor(key);
    });

    return arr;
  };

  $L.Map = function(){
    return Object.create(null);
  }

  $L.Namespace = function(){
    var self = $L.Map();
    self.namespace = $L.Map();
    function set(name, value){
      Object.defineProperty(self.namespace, name, { value: value });
    }
    function method(fn){
      if (typeof fn !== "function") {
        throw new Error("Expected function");
      }
      if (fn.name === ""){
        throw new Error("Methods require named functions");
      }
      self.set(fn.name, fn);
    }
    Object.defineProperty(self, "set", { value: set });
    Object.defineProperty(self, "method", { value: method });
    return self;
  }
});
Lapiz.Module("Dependency", function($L){
  var _dependencies = {};

  $L.Dependency = function(name){
    var d = _dependencies[name];
    if (d === undefined) { throw "Cannot find Dependency " + name; }
    return d();
  };

  $L.Dependency.Service = function(name, fn){
    function F(args) {
      return fn.apply(this, args);
    }
    F.prototype = fn.prototype;

    _dependencies[name] = function() {
      return new F(arguments);
    };
  };

  $L.Dependency.Factory = function(name, fn){
    _dependencies[name] = fn;
  };

  $L.Dependency.Reference = function(name, res){
    _dependencies[name] = function(){
      return res;
    };
  };

  $L.Dependency.remove = function(name){
    delete _dependencies[name];
  };

  $L.Dependency.has = function(name){
    return _dependencies.hasOwnProperty(name);
  };
});
Lapiz.Module("Dictionary", function($L){
  $L.set("Dictionary", function(val){
    var _dict = {};
    var _length = 0;
    var _insertEvent = Lapiz.Event();
    var _removeEvent = Lapiz.Event();
    var _changeEvent = Lapiz.Event();

    if (val !== undefined) {
      if (val.hasOwnProperty("each")){
        val.each(function(i, val){
          _dict[i] = val;
          _length += 1;
        });
      } else {
        $L.each(val, function(i, val){
          _dict[i] = val;
          _length += 1;
        });
      }
    }

    var self = function(field, val){
      if (val === undefined){
        return _dict[field];
      }

      var event;
      if (!_dict.hasOwnProperty(field)){
        _length += 1;
        event = _insertEvent;
      } else {
        event = _changeEvent;
      }

      _dict[field] = val;
      event.fire(field, self.Accessor);
      return val;
    };

    self._cls = $L.Dictionary;

    Object.defineProperty(self, "len", {
      get: function(){return _length;}
    });

    self.remove = function(field){
      if (_dict.hasOwnProperty(field)){
        _length -= 1;
        var obj = _dict[field];
        delete _dict[field];
        _removeEvent.fire(field, obj, self.Accessor);
      }
    };

    self.on = $L.Map();
    $L.Event.LinkProperty(self.on, "insert", _insertEvent);
    $L.Event.LinkProperty(self.on, "change", _changeEvent);
    $L.Event.LinkProperty(self.on, "remove", _removeEvent);
    Object.freeze(self.on);

    self.has = function(field){ return _dict.hasOwnProperty(field); };

    self.each = function(fn){
      var keys = Object.keys(_dict);
      var key, i;
      for(i=keys.length-1; i>=0; i-=1){
        key = keys[i];
        if (fn(key, _dict[key])) { break; }
      }
    };

    Object.defineProperty(self, "keys", {
      get: function(){ return Object.keys(_dict); }
    });

    self.Sort = function(funcOrField){ return $L.Sort(self, funcOrField); };
    self.Filter = function(filterOrAttr, val){ return $L.Filter(self, filterOrAttr, val); };

    self.Accessor = function(key){
      return _dict[key];
    };
    self.Accessor.Accessor = self.Accessor; //meta, but necessary
    self.Accessor.len = self.len;
    self.Accessor.has = self.has;
    self.Accessor.each = self.each;
    self.Accessor.on = self.on;
    self.Accessor.Sort = self.Sort;
    self.Accessor.Filter = self.Filter;
    self.Accessor._cls = $L.Accessor;
    Object.defineProperty(self.Accessor, "keys", {
      get: function(){ return Object.keys(_dict); }
    });
    Object.defineProperty(self.Accessor, "len", {
      get: function(){ return _length; }
    });
    
    Object.freeze(self.Accessor);
    Object.freeze(self);

    return self;
  });

  $L.set("Accessor", function(accessor){
    return accessor.Accessor;
  });
});
Lapiz.Module("Events", function($L){
  $L.Event = function(){
    var _listeners = [];
    var event = {
      register: function(fn){
        _listeners.push(fn);
        return fn;
      },
      deregister: function(fn){
        $L.remove(_listeners, fn);
        return fn;
      },
      enabled: true,
      fire: function(){
        if (!event.enabled) { return self; }
        var i;
        var l = _listeners.length;
        for(i=0; i<l; i+=1){
          _listeners[i].apply(this, arguments);
        }
        return self;
      },
      _cls: $L.Event
    };
    event.register.deregister = event.deregister;
    Object.defineProperty(event, "length", {
      get: function(){ return _listeners.length; }
    });
    return event;
  };

  $L.SingleEvent = function(){
    var _event = $L.Event();
    var _hasFired = false;
    var _args;
    var facade = {
      register: function(fn){
        if (_hasFired){
          fn.apply(this, _args);
        } else {
          _event.register(fn);
        }
      },
      deregister: function(fn){
        if (_hasFired) { return; }
        _event.deregister(fn);
      },
      fire: function(){
        if (_hasFired) { return; }
        _hasFired = true;
        _args = arguments;
        _event.fire.apply(this, _args);
        delete _event;
      },
      _cls: $L.SingleEvent
    };
    Object.defineProperty(facade, "enabled", {
      get: function(){ return _event.enabled; },
      set: function(val) { _event.enabled = !!val; }
    });
    return facade;
  };

  $L.Event.LinkProperty = function(obj, name, evt){
    Object.defineProperty(obj, name,{
      get: function(){ return evt.register; },
      set: function(fn){ evt.register(fn); }
    });
  };

  $L.on = {};
});
Lapiz.Module("Filter", function($L){
  $L.Filter = function(accessor, filterOrAttr, val){
    var _index = [];
    var self = function(key){
      if (_index.indexOf(key) > -1) { return accessor(key); }
    };
    self._cls = $L.Filter;

    var filterFn = filterOrAttr;
    if (typeof(filterOrAttr) === "string" && val !== undefined){
      filterFn = function(key, accessor){
        return accessor(key)[filterOrAttr] === val;
      };
    }

    var _insertEvent = Lapiz.Event();
    var _removeEvent = Lapiz.Event();
    var _changeEvent = Lapiz.Event();

    accessor.each(function(key, val){
      if (filterFn(key, accessor)) { _index.push(key); }
    });

    self.Accessor = self;
    self.Sort = function(funcOrField){ return $L.Sort(self, funcOrField); };
    self.Filter = function(filterOrAttr, val){ return $L.Filter(self, filterOrAttr, val); };

    self.has = function(key){
      return _index.indexOf(key.toString()) > -1;
    };
    Object.defineProperty(self, "keys",{
      get: function(){ return _index.slice(0); }
    });
    Object.defineProperty(self, "len",{
      get: function(){ return _index.length; }
    });

    self.each = function(fn){
      var i;
      var l = _index.length;
      for(i=0; i<l; i+=1){
        key = _index[i];
        if (fn(key, accessor(key))) { break; }
      }
    };

    self.on = $L.Map();
    $L.Event.LinkProperty(self.on, "insert", _insertEvent);
    $L.Event.LinkProperty(self.on, "change", _changeEvent);
    $L.Event.LinkProperty(self.on, "remove", _removeEvent);
    Object.freeze(self.on);

    var inFn = function(key, accessor){
      key = key.toString();
      if (filterFn(key, accessor)){
        _index.push(key);
        _insertEvent.fire(key, self);
      }
    };
    var remFn = function(key, obj, accessor){
      key = key.toString();
      var i = _index.indexOf(key);
      if (i > -1){
        _index.splice(i, 1);
        _removeEvent.fire(key, obj, self);
      }
    };
    var changeFn = function(key, accessor){
      key = key.toString();
      var i = _index.indexOf(key);
      var f = filterFn(key, accessor);
      if (i > -1){
        if (f) {
          // was in the list, still in the list, but changed
          _changeEvent.fire(key, self);
        } else {
          // was in the list, is not now
          _index.splice(i, 1);
          _removeEvent.fire(key, accessor(key), self);
        }
      } else {
        if (f){
          // was not in the list, is now
          _index.push(key);
          _insertEvent.fire(key, self);
        }
      }
    };

    accessor.on.insert(inFn);
    accessor.on.remove(remFn);
    accessor.on.change(changeFn);

    Object.defineProperty(self, "func", {
      set: function(fn){
        if (filterFn.on !== undefined && filterFn.on.change !== undefined && filterFn.on.change.deregister !== undefined){
          filterFn.on.change(self.ForceRescan);
        }
        filterFn = fn;
        self.ForceRescan();
      }
    })

    self.ForceRescan = function(){
      accessor.each(function(key, val){
        key = key.toString();
        var willBeInSet = filterFn(key, accessor);
        var idx = _index.indexOf(key)
        var isInSet = (idx !== -1);
        if (willBeInSet && !isInSet){
          _index.push(key);
          _insertEvent.fire(key, self);
        } else if (!willBeInSet && isInSet){
          _index.splice(idx, 1);
          _removeEvent.fire(key, accessor(key), self);
        }
      });
    };

    if (filterFn.on !== undefined && filterFn.on.change !== undefined){
      filterFn.on.change(self.ForceRescan);
    }

    self["delete"] = function(){
      accessor.on.insert.deregister(inFn);
      accessor.on.remove.deregister(remFn);
      accessor.on.change.deregister(changeFn);
      if (filterFn.on !== undefined && filterFn.on.change !== undefined && filterFn.on.change.deregister !== undefined){
        filterFn.on.change(self.ForceRescan);
      }
    };

    Object.freeze(self);
    return self;
  };
});
Lapiz.Module("Index", function($L){
  $L.Index = function(cls, primaryFunc, domain){
    if (primaryFunc === undefined){
      primaryFunc = function(obj){return obj.id;};
    } else if (typeof primaryFunc === "string"){
      primaryFunc = function(field){
        return function(obj){
          return obj[field];
        };
      }(primaryFunc);
    } else if ( !(primaryFunc instanceof  Function) ){
      throw("Expected a function or string");
    }
    
    if (domain === undefined) {
      domain = cls;
    } else {
      cls[domain] = {};
      domain = cls[domain];
    }

    var _primary = $L.Dictionary();

    domain.each = _primary.each;
    domain.has = _primary.has;
    domain.Filter = _primary.Filter;
    domain.Sort = _primary.Sort;
    domain.remove = _primary.remove;

    Object.defineProperty(domain, "keys",{
      get: function(){ return _primary.keys; }
    });
    Object.defineProperty(domain, "all",{
      get: function(){ return _primary.Accessor; }
    });

    function _upsert(obj){
      _primary(primaryFunc(obj), obj);
    }

    cls.on.create(function(obj){
      obj.on.change(_upsert);
      obj.on["delete"](function(obj){
        obj.on.change.deregister(_upsert);
        _primary.remove(primaryFunc(obj));
      });
      _upsert(obj);
    });

    domain.get = function(idFuncOrAttr, val){
      var matches = {};
      if (val !== undefined){
        _primary.each(function(key, obj){
          if (obj[idFuncOrAttr] === val) { matches[key] = obj; }
        });
        return matches;
      } else if (idFuncOrAttr instanceof Function){
        _primary.each(function(key, obj){
          if (idFuncOrAttr(obj)) { matches[key] = obj; }
        });
        return matches;
      }
      return _primary(idFuncOrAttr);
    };
  };
});
Lapiz.Module("Objects", ["Events"], function($L){
  $L.Object = function(){
    var self = {};
    var priv = {};

    self.priv =  priv;
    self.on = {};
    priv.fire = {};
    priv.attr = {};
    self._cls = $L.Object;

    priv.event = function(name){
      var e = $L.Event();
      self.on[name] = e.register;
      e.register.deregister = e.deregister;
      Object.defineProperty(self.on, name, {
        get: function(){ return e.register; },
        set: function(fn){ e.register(fn); }
      });
      priv.fire[name] = e.fire;
      priv.fire[name].disable = function(){ e.enabled = false; };
      priv.fire[name].enable = function(){ e.enabled = true; };
      priv.fire[name].enabled = function(){ return e.enabled; };
      priv.fire[name].length = function(){ return e.length; };
      Object.defineProperty(priv.fire[name], "length", {
        get: function(){ return e.length; }
      });
    };

    priv.event("change");
    priv.event("delete");

    priv.setAll = function(json){
      var property, i;
      var keys = Object.keys(json);
      priv.fire.change.disable();
      for(i=keys.length-1; i>=0; i-=1){
        property = keys[i];
        if (self.hasOwnProperty(property)) {
          self[property] = json[property];
        }
      }
      priv.fire.change.enable();
      priv.fire.change(self);
    };

    priv.lock = function(){
      delete self.priv;
      delete self.lock;
    };

    var _getter = function (funcOrProp){
        if (funcOrProp instanceof Function) { return funcOrProp; }
        if (typeof(funcOrProp) === "string") { return function(){ return priv.attr[funcOrProp]; }; }
      };
    var _setter = function (field, func){
      if (typeof func === "string"){
        if ($L.parse[func] === undefined){
          throw new Error("Lapiz.parse does not have field "+func);
        } else {
          func = $L.parse[func];
        }
      }
      return function(){
        var setterInterface = {
          set: true
        };
        var val = func.apply(setterInterface, arguments);
        if (setterInterface.set) { priv.attr[field] = val; }
        priv.fire.change(self);
      };
    };

    priv.properties = function(properties, values){
      var property, val, i, desc;
      var keys = Object.keys(properties);
      for(i=keys.length-1; i>=0; i-=1){
        property = keys[i];
        val = properties[property];
        desc = {};

        if (val === undefined || val === null){
          throw "Invalid value for '" + property + "'";
        } else if (typeof val === "function" || typeof val === "string"){
          desc.set = _setter(property, val);
          desc.get = _getter(property);
        } else if (val.set !== undefined || val.get !== undefined) {
            if (val.set !== undefined){
              desc.set = _setter(property, val.set);
            }
            if (val.get !== undefined){
              desc.get = _getter(val.get);
            } else {
              desc.get = _getter(property);
            }
        } else if (val instanceof Array){
          desc.set = _setter(property, val[0]);
          if (val[1] !== undefined) {
            desc.get = _getter(val[1]);
          } else {
            desc.get = _getter(property);
          }
        } else {
          throw "Could not construct getter/setter for " + val;
        }

        Object.defineProperty(self, property, desc);
      }
      if (values!== undefined){
        priv.setAll(values);
      };
    };

    priv.argDict = function(){
      var args = arguments.callee.caller.arguments;
      var argNames = (arguments.callee.caller + "").match(/\([^)]*\)/g);
      var dict = {};
      var i,l;
      argNames = argNames[0].match(/[\w$]+/g);
      l = argNames.length;
      for(i=0; i<l; i+=1){
        dict[argNames[i]] = args[i];
      }
      return dict;
    };
    return self;
  };

  var _newClassEvent = $L.Event();
  Object.defineProperty($L.on, "class", {
    get: function(){ return _newClassEvent.register; },
    set: function(fn){ _newClassEvent.register(fn); }
  });
  $L.Class = function(fn){
    var e = Lapiz.Event();
    var ret = function(){
      var obj = fn.apply(this, arguments);
      if (obj === undefined) {throw new Error("Constructor did not return an object");}
      e.fire(obj);
      return obj;
    };
    ret.on = {
      "create": e.register
    };
    _newClassEvent.fire(ret);
    return ret;
  };
  $L.Constructor = function(fn, properties){
    return $L.Class( function(){
      var self = Lapiz.Object();
      if (properties !== undefined){
        self.priv.properties(properties);
      }
      fn.apply(self, arguments);
      return self;
    });
  };
});
Lapiz.Module("Parser", function($L){
  $L.parse = {
    "int": function(val,rad){
      rad = rad || 10;
      return parseInt(val, rad);
    },
    "string": function (val){
      if (val === undefined || val === null) { return ""; }
      var type = typeof(val);
      if (type === "string") { return val; }
      if (type === "number") { return ""+val; }
      var strFromMethod;
      if ("str" in val && val.str instanceof Function) {
        strFromMethod = val.str();
      } else if ("toString" in val && val.toString instanceof Function) {
        strFromMethod = val.toString();
      }
      if (typeof strFromMethod === "string"){
        return strFromMethod;
      }
      return "" + val;
    },
    "bool": function(val){ return !!val; },
    "number": function(val){ return parseFloat(val); },
    "object": function(obj){ return obj; },
    "relational": function(parser, obj, relationalField, getter){
      var attrs = obj.priv.attr;
      Object.defineProperty(obj, relationalField, {get:function(){
        return attrs[relationalField];
      }});
      return function(val){
        val = parser(val);
        attrs[relationalField] = getter(val);
        return val;
      };
    }
  };
});
Lapiz.Module("Sorter", function($L){
  $L.Sort = function(accessor, funcOrField){
    var self = function(key){ return accessor(key); };
    self._cls = $L.Sort;

    var _index = accessor.keys;
    var _sortFn;
    var _insertEvent = Lapiz.Event();
    var _removeEvent = Lapiz.Event();
    var _changeEvent = Lapiz.Event();

    if (funcOrField === undefined){
      _sortFn = function(a, b){
        a = accessor(a);
        b = accessor(b);
        return (a > b ? 1 : (b > a ? -1 : 0));
      };
      _sortFn.range = function(a, b){
        a = accessor(a);
        return (a > b ? 1 : (b > a ? -1 : 0));
      };
    } else if (typeof(funcOrField) === "function"){
      _sortFn = function(a, b){
        return funcOrField(a, b, accessor);
      };
      if (funcOrField.range !== undefined){
        _sortFn.range = function(a,b){
          return funcOrField.range(a, b, accessor);
        };
      }
    } else if(typeof(funcOrField) === "string"){
      _sortFn = function(a, b){
        a = accessor(a)[funcOrField];
        b = accessor(b)[funcOrField];
        return (a > b ? 1 : (b > a ? -1 : 0));
      };
      _sortFn.range = function(a,b){
        a = accessor(a)[funcOrField];
        return (a > b ? 1 : (b > a ? -1 : 0));
      };
    }
    _index.sort(_sortFn);

    self.has = accessor.has;
    self.Accessor = accessor;
    self.Sort = accessor.Sort;
    self.Filter = accessor.Filter;
    Object.defineProperty(self, "keys",{
      get: function(){ return _index.slice(0); }
    });
    Object.defineProperty(self, "len",{
      get: function(){ return accessor.len; }
    });

    self.each = function(fn){
      var i;
      var l = _index.length;
      for(i=0; i<l; i+=1){
        key = _index[i];
        if (fn(key, accessor(key))) { break; }
      }
    };

    self.on = $L.Map();
    $L.Event.LinkProperty(self.on, "insert", _insertEvent);
    $L.Event.LinkProperty(self.on, "change", _changeEvent);
    $L.Event.LinkProperty(self.on, "remove", _removeEvent);
    Object.freeze(self.on);

    Object.defineProperty(self, "func", {
      set: function(fn){
        _sortFn = fn;
        _index.sort(_sortFn);
        accessor.each( function(key, _){
          _changeEvent.fire(key, self);
        });
      }
    });

    var inFn = function(key, accessor){
      key = key.toString();
      _index.splice($L.Sort.locationOf(key, _index, _sortFn, accessor), 0, key);
      _insertEvent.fire(key, self);
    };
    var remFn = function(key, obj, accessor){
      $L.remove(_index, key.toString());
      _removeEvent.fire(key, obj, self);
    };
    var changeFn = function(key, accessor){
      key = key.toString();
      _index.splice(_index.indexOf(key),1);
      _index.splice($L.Sort.locationOf(key, _index, _sortFn, accessor), 0, key);
      _changeEvent.fire(key, self);
    };

    accessor.on.insert(inFn);
    accessor.on.remove(remFn);
    accessor.on.change(changeFn);

    self["delete"] = function(){
      accessor.on.insert.deregister(inFn);
      accessor.on.remove.deregister(remFn);
      accessor.on.change.deregister(changeFn);
    };

    if (_sortFn.range !== undefined){
      self.Range = function(a, b){
        b = b || a;
        var start = $L.Sort.locationOf(a, _index, _sortFn.range, accessor);
        var end = $L.Sort.gt(b, _index, _sortFn.range, accessor, start);
        var dict = Lapiz.Dictionary();
        var i, key;
        for(i=start; i<end; i+=1){
          key = _index[i];
          dict(key, accessor(key));
        }
        return dict;
      }
    }

    Object.freeze(self);
    return self;
  };

  //returns the index of the first value greater than or equal to the key
  $L.Sort.locationOf = function(key, index, fn, accessor, start, end) {
    start = start || 0;
    end = end || index.length;
    var pivot = Math.floor(start + (end - start) / 2);
    if (end-start === 0){
      return start;
    }
    if (end-start === 1) {
      // 1 := a>b      0 := a<=b
      if (fn(index[pivot],  key, accessor) >= 0 ) { return start; }
      return end;
    }
    if (fn(index[pivot], key, accessor) <= 0) {
      return $L.Sort.locationOf(key, index, fn, accessor, pivot, end);
    } else {
      return $L.Sort.locationOf(key, index, fn, accessor, start, pivot);
    }
  };

  //returns the index of the first value greater than key
  $L.Sort.gt = function (key, index, fn, accessor, start, end) {
    start = start || 0;
    end = end || index.length;
    var pivot = Math.floor(start + (end - start) / 2);
    if (end-start === 0){
      return start;
    }
    if (end-start === 1) {
      // 1 := a>b      0 := a<=b
      if (fn(index[pivot], key, accessor) < 0 ) { return start; }
      return end;
    }
    if (fn(index[pivot], key, accessor) < 0) {
      return $L.Sort.locationOf(key, index, fn, accessor, pivot, end);
    } else {
      return $L.Sort.locationOf(key, index, fn, accessor, start, pivot);
    }
  }
});
