/**
 * @namespace Lapiz
 */
var Lapiz = (function($L) {
  return $L || Object.create(null);
}(Lapiz));

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

  function set(obj, name, value){
    Object.defineProperty(obj, name, { value: value });
  }
  set($L, "set", set);

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

  $L.set($L, "Module", function(name, reqs, module){
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

  $L.set($L, "typeCheck", function(obj, type, err){
    var typeCheck = (typeof type === "string") ? (typeof obj === type) : (obj instanceof type);
    if (err !== undefined && !typeCheck){
      throw new Error(err);
    }
    return typeCheck;
  });
  $L.set($L.typeCheck, "function", function(obj, err){return $L.typeCheck(obj, Function, err)});
  $L.set($L.typeCheck, "array", function(obj, err){return $L.typeCheck(obj, Array, err)});
  $L.set($L.typeCheck, "string", function(obj, err){return $L.typeCheck(obj, "string", err)});
  $L.set($L.typeCheck, "number", function(obj, err){return $L.typeCheck(obj, "number", err)});

  $L.set($L, "assert", function(bool, err){
    if (!bool){
      throw new Error(err);
    }
  });

  return $L;
})(Lapiz);
Lapiz.Module("Collections", function($L){
  function Map(){
    return Object.create(null);
  };
  $L.set($L, "Map", Map);

  $L.set(Map, "method", function(obj, fn){
    $L.typeCheck.function(fn, "Expected function");
    $L.assert(fn.name !== "", "Require named function for method");
    $L.set(obj, fn.name, fn);
  });

  Map.method(Map, function setterMethod(obj, fn){
    $L.typeCheck.function(fn, "Expected function for setterMethod");
    $L.assert(fn.name !== "", "Require named function for setterMethod");
    Object.defineProperty(obj, fn.name, {
      "get": function(){ return fn; },
      "set": fn,
    });
  });

  Map.method(Map, function prop(obj, name, desc){
    Object.defineProperty(obj, name, desc);
  });

  Map.method(Map, function getter(obj, fn){
    $L.typeCheck.function(fn, "Expected function for getter");
    $L.assert(fn.name !== "", "Require named function for getter");
    Object.defineProperty(obj, fn.name, {"get": fn,} );
  });

  Map.method(Map, function setterGetter(obj, name, setter, getter){
    $L.typeCheck.function(setter, "Expected function for setterGetter");
    var val;
    var desc = {};
    if (getter === undefined){
      desc.get = function(){ return val; };
    } else {
      desc.get = function() {
        return getter(val, obj);
      };
    }
    if ($L.typeCheck.string(setter)){
      setter = $L.parse[setter];
    }
    desc.set = function(newVal){
      var setterInterface = {
        "set": true,
      };
      newVal = setter.apply(setterInterface, [newVal, val, obj]);
      if (setterInterface.set){
        val = newVal;
      }
    };
    Object.defineProperty(obj, name, desc);
  });

  Map.method(Map, function copyProps(copyTo, copyFrom){
    //todo: write tests for this
    var i = 2;
    var l = arguments.length;
    var prop;
    for(; i<l; i+=1){
      prop = arguments[i];
      if (prop[0] === "&"){
        prop = prop.substr(1);
        Object.defineProperty(copyTo, prop, {
          "get": (function(prop){
            return function(){
              return copyFrom[prop];
            }
          })(prop),
          "set": (function(prop){return function(val){copyFrom[prop] = val}})(prop),
        });
      } else {
        copyTo[prop] = copyFrom[prop];
      }
    }
  });

  Map.method($L, function Namespace(fn){
    var self = $L.Map();
    self.namespace = $L.Map();

    Map.method(self, function set(name, value){Object.defineProperty(self.namespace, name, { value: value });});
    Map.method(self, function prop(name, desc){Object.defineProperty(self.namespace, name, desc);});
    Map.method(self, function method(fn){Map.method(self.namespace, fn);});
    Map.method(self, function setterMethod(fn){Map.setterMethod(self.namespace, fn);});
    Map.method(self, function getter(fn){Map.getter(self.namespace, fn);});
    Map.method(self, function setterGetter(name, setter, getter){Map.setterGetter(self.namespace, name, setter, getter);});

    if ($L.typeCheck.function(fn)){
      fn.apply(self);
      return self.namespace;
    }
    return self;
  });

  Map.method($L, function remove(arr, el, start){
    var i = arr.indexOf(el, start);
    if (i > -1) { arr.splice(i, 1); }
  });

  Map.method($L, function each(obj, fn){
    var i;
    if (obj instanceof Array){
      var l = obj.length;
      for(i=0; i<l; i+=1){
        if (fn(i, obj[i])) {return i;}
      }
      return -1;
    } else {
      var keys = Object.keys(obj);
      for(i=keys.length-1; i>=0; i-=1){
        if (fn(keys[i], obj[keys[i]])) {return keys[i];}
      }
    }
  });

  Map.method($L, function ArrayConverter(accessor){
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
  });

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
  $L.set($L, "Dictionary", function(val){
    var _dict = $L.Map();
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

    var self = function(key, val){
      if (val === undefined){
        return _dict[key];
      }

      var event;
      if (_dict[key] === undefined){
        _length += 1;
        event = _insertEvent;
      } else {
        event = _changeEvent;
      }

      _dict[key] = val;
      event.fire(key, self.Accessor);
      return val;
    };

    self._cls = $L.Dictionary;

    $L.Map.getter(self, function length(){
      return _length;
    });

    self.remove = function(key){
      if (_dict[key] !== undefined){
        _length -= 1;
        var obj = _dict[key];
        delete _dict[key];
        _removeEvent.fire(key, obj, self.Accessor);
      }
    };

    self.on = $L.Map();
    $L.Event.linkProperty(self.on, "insert", _insertEvent);
    $L.Event.linkProperty(self.on, "change", _changeEvent);
    $L.Event.linkProperty(self.on, "remove", _removeEvent);
    Object.freeze(self.on);

    self.has = function(key){ return _dict[key] !== undefined; };

    self.each = function(fn){
      var keys = Object.keys(_dict);
      var key, i;
      for(i=keys.length-1; i>=0; i-=1){
        key = keys[i];
        if (fn(key, _dict[key])) { break; }
      }
    };

    $L.Map.getter(self, function keys(){
      return Object.keys(_dict);
    });

    self.Sort = function(funcOrField){ return $L.Sort(self, funcOrField); };
    self.Filter = function(filterOrAttr, val){ return $L.Filter(self, filterOrAttr, val); };

    self.Accessor = function(key){
      return _dict[key];
    };
    $L.Map.copyProps(self.Accessor, self, "Accessor", "&length", "has", "each", "on", "Sort", "Filter", "&keys");
    self.Accessor._cls = $L.Accessor;

    Object.freeze(self.Accessor);
    Object.freeze(self);

    return self;
  });

  $L.set($L, "Accessor", function(accessor){
    return accessor.Accessor;
  });
});
Lapiz.Module("Events", ["Collections"], function($L){
  $L.set($L, "Event", function(){
    var _listeners = [];
    var event = Lapiz.Map();

    $L.Map.setterMethod(event, function register(fn){
      _listeners.push(fn);
      return fn;
    });

    $L.Map.setterMethod(event.register, function deregister(fn){
      $L.remove(_listeners, fn);
      return fn;
    });

    $L.Map.method(event, function fire(){
      if (!event.fire.enabled) { return event; }
      var i;
      var l = _listeners.length;
      for(i=0; i<l; i+=1){
        _listeners[i].apply(this, arguments);
      }
      return event;
    });
    $L.Map.setterGetter(event.fire, "enabled", function(enable){ return !!enable; });
    event.fire.enabled = true;

    $L.Map.getter(event.fire, function length(){ return _listeners.length; });

    $L.set(event, "_cls", $L.Event);

    return event;
  });

  $L.set($L, "SingleEvent", function(){
    var _event = $L.Event();
    var _hasFired = false;
    var _args;
    var facade = $L.Map();
    $L.Map.method(facade, function register(fn){
      if (_hasFired){
        fn.apply(this, _args);
      } else {
        _event.register(fn);
      }
    });
    $L.Map.method(facade.register, function deregister(fn){
      if (_hasFired) { return; }
      _event.register.deregister(fn);
    });
    $L.Map.method(facade, function fire(){
      if (_hasFired) { return; }
      _hasFired = true;
      _args = arguments;
      _event.fire.apply(this, _args);
      delete _event;
    });
    $L.set(facade, "_cls", $L.SingleEvent);

    Object.defineProperty(facade.fire, "enabled", {
      get: function(){ return _event.fire.enabled; },
      set: function(val) { _event.fire.enabled = val; }
    });

    return facade;
  });

  $L.set($L.Event, "linkProperty", function(obj, name, evt){
    Object.defineProperty(obj, name, {
      get: function(){ return evt.register; },
      set: function(fn){ evt.register(fn); }
    });
  });

  $L.on = $L.Map();
});
Lapiz.Module("Filter", function($L){
  $L.set($L, "Filter", function(accessor, filterOrAttr, val){
    var _index = [];
    var self = function(key){
      if (_index.indexOf(key) > -1) { return accessor(key); }
    };
    self._cls = $L.Filter;

    var filterFn = filterOrAttr;
    if ($L.typeCheck.string(filterOrAttr) && val !== undefined){
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

    $L.Map.getter(self, function keys(){
      return _index.slice(0);
    });
    $L.Map.getter(self, function length(){
      return _index.length;
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
    $L.Event.linkProperty(self.on, "insert", _insertEvent);
    $L.Event.linkProperty(self.on, "change", _changeEvent);
    $L.Event.linkProperty(self.on, "remove", _removeEvent);
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

    //todo: potential conflict if filter function is set using filter.func = function(){...}
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
  });
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
  function _getter(self, funcOrProp){
    if ($L.typeCheck.function(funcOrProp)) { return funcOrProp; }
    if ($L.typeCheck.string(funcOrProp)) { return function(){ return self.attr[funcOrProp]; }; }
  }

  function _setter(self, field, func){
    if ($L.typeCheck.string(func)){
      $L.assert($L.parse[func] !== undefined, "Lapiz.parse does not have field "+func);
      func = $L.parse[func];
    }
    return function(){
      //todo: add test for fireChange and event
      var setterInterface = {
        set: true,
        fireChange: true,
        event: undefined,
      };
      var val = func.apply(setterInterface, arguments);
      if (setterInterface.set) {
        var oldVal = self.attr[field];
        self.attr[field] = val;
        if (setterInterface.fireChange) {self.fire.change(self.pub);}
        if (typeof setterInterface.event === "function") {event(self, val, oldVal);}
      }
    };
  }

  $L.Object = function(constructor){
    var self = $L.Map();
    var pub = $L.Map();

    self.pub = pub;
    self.pub.on = $L.Map();
    self.fire = $L.Map();
    self.attr = $L.Map();
    self._cls = $L.Object;

    self.event = function(name){
      var e = $L.Event();
      $L.Event.linkProperty(self.pub.on, name, e);
      self.fire[name] = e.fire;
    };

    self.event("change");
    self.event("delete");

    self.setMany = function(json){
      var property, i;
      var keys = Object.keys(json);
      var fireEnabled = self.fire.change.enabled;
      self.fire.change.enabled = false;
      for(i=keys.length-1; i>=0; i-=1){
        property = keys[i];
        if (Object.hasOwnProperty.call(self.pub, property)) {
          self.pub[property] = json[property];
        }
      }
      //todo: add test for fire.enabled = false before and after setAll
      self.fire.change.enabled = fireEnabled;
      self.fire.change(self.pub);
    };

    self.properties = function(properties, values){
      var property, val, i, desc;
      var keys = Object.keys(properties);
      for(i=keys.length-1; i>=0; i-=1){
        property = keys[i];
        val = properties[property];
        desc = {};

        if (val === undefined || val === null){
          throw new Error("Invalid value for '" + property + "'");
        } else if ($L.typeCheck.function(val)|| $L.typeCheck.string(val)){
          desc.set = _setter(self, property, val);
          desc.get = _getter(self, property);
        } else if (val.set !== undefined || val.get !== undefined) {
          if (val.set !== undefined){
            desc.set = _setter(self, property, val.set);
          }
          desc.get = (val.get !== undefined) ? _getter(self, val.get) : _getter(self, property);
        } else {
          throw new Error("Could not construct getter/setter for " + val);
        }

        Object.defineProperty(self.pub, property, desc);
      }
      if (values!== undefined){
        self.setMany(values);
      };
    };

    self.getter = function(getterFn){
      $L.Map.getter(self.pub, getterFn);
    };

    self.method = function(fn){
      $L.Map.method(self.pub, fn);
    };

    if ($L.typeCheck.function(constructor)){
      constructor.apply(self);
    }

    return self;
  };

  $L.Map.method($L, function argDict(){
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
  });

  var _newClassEvent = $L.Event();
  $L.Event.linkProperty($L.on, "class", _newClassEvent);
  $L.Class = function(fn, customObj){
    customObj = !!customObj;
    var newInstanceEvent = Lapiz.Event();
    var ret;

    if (customObj){
      ret = function(){
        var obj = fn.apply(this, arguments);
        if (obj === undefined) {throw new Error("Constructor did not return an object");}
        newInstanceEvent.fire(obj);
        return obj;
      };
    } else {
      ret = function(){
        var self = Lapiz.Object();
        var out = fn.apply(self, arguments);
        self = (out === undefined) ? self : out;
        newInstanceEvent.fire(self);
        return self;
      };
    }

    ret.on = $L.Map();
    $L.Event.linkProperty(ret.on, "create", newInstanceEvent);

    _newClassEvent.fire(ret);
    return ret;
  };
});
Lapiz.Module("Parser", function($L){
  function resolveParser(parser){
    if ($L.typeCheck.string(parser) && $L.parse[parser] !== undefined){
      return $L.parse[parser];
    }
    return parser;
  }

  $L.set($L, "parse", $L.Map());

  $L.Map.method($L.parse, function int(val,rad){
    if (val === true){
      return 1;
    } else if (val === false){
      return 0;
    }
    rad = rad || 10;
    return parseInt(val, rad);
  });

  $L.Map.method($L.parse, function string(val){
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
  });
  $L.Map.method($L.parse, function bool(val){ return !!val; });
  $L.Map.method($L.parse, function number(val){ return parseFloat(val); });
  $L.Map.method($L.parse, function object(obj){ return obj; });
  $L.Map.method($L.parse, function array(parser){
    parser = resolveParser(parser);
    return function(arr){
      if (Array.isArray(arr)){
        for(var i = 0; i<arr.length; i++){
          arr[i] = parser(arr[i]);
        }
        return arr;
      }
      return [parser(arr)];
    }
  });
});
Lapiz.Module("Sorter", function($L){
  $L.set($L, "Sort", function(accessor, funcOrField){
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

    $L.Map.copyProps(self, accessor, "has", "Accessor", "Sort", "Filter", "&length");
    $L.Map.getter(self, function keys(){
      return _index.slice(0);
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
    $L.Event.linkProperty(self.on, "insert", _insertEvent);
    $L.Event.linkProperty(self.on, "change", _changeEvent);
    $L.Event.linkProperty(self.on, "remove", _removeEvent);
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
  });

  //returns the index of the first value greater than or equal to the key
  $L.Sort.locationOf = function(key, index, fn, accessor, start, end) {
    //todo: add test
    start = start || 0;
    end = end || index.length;
    var pivot = Math.floor(start + (end - start) / 2);
    if (end-start === 0){
      return start;
    }
    if (end-start === 1) {
      // 1 := a>b      0 := a<=b
      return (fn(index[pivot],  key, accessor) >= 0 ) ? start : end; 
    }
    return (fn(index[pivot], key, accessor) <= 0) ?
      $L.Sort.locationOf(key, index, fn, accessor, pivot, end) :
      $L.Sort.locationOf(key, index, fn, accessor, start, pivot);
  };

  //returns the index of the first value greater than key
  $L.Sort.gt = function (key, index, fn, accessor, start, end) {
    //todo: add test
    start = start || 0;
    end = end || index.length;
    var pivot = Math.floor(start + (end - start) / 2);
    if (end-start === 0){
      return start;
    }
    if (end-start === 1) {
      // 1 := a>b      0 := a<=b
      return (fn(index[pivot], key, accessor) < 0 ) ? start : end; 
    }
    return (fn(index[pivot], key, accessor) < 0) ?
      $L.Sort.locationOf(key, index, fn, accessor, pivot, end) :
      $L.Sort.locationOf(key, index, fn, accessor, start, pivot);
  }
});