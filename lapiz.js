var Lapiz = (function($L) {
  return $L || Object.create(null);
}(Lapiz));

// > Lapiz.Module(moduleName, moduleFunction(Lapiz))
// > Lapiz.Module(moduleName, [dependencies...], moduleFunction(Lapiz))
// The module loader is useful when building Lapiz modules. It will invoke the
// moduleFunction and pass in Lapiz when all dependencies have been loaded. The
// moduleName is only used for dependency management.
/* >
Lapiz.Module("Foo", ["Events"], function($L){
  $L.set($L, "foo", "bar");
});
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

  // > Lapiz.set(obj, name, value)
  // Defines a fixed propery on an object. Properties defined this way cannot be
  // overridden.
  /* >
  var x = {};
  x.foo = function(){...};
  //somewhere else
  x.foo = 12; //the method is now gone

  var y = {};
  Lapiz.set(y, "foo", function{...});
  y.foo = 12; // this will not override the method
  */
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

  // > Lapiz.Module.Loaded()
  // Returns all the modules that have been loaded
  $L.Module.Loaded = function(){
    return Object.keys(_loaded);
  };
  Object.freeze(self.Module);

  // > Lapiz.typeCheck(obj, type)
  // > Lapiz.typeCheck(obj, type, err)
  // Checks if the type of obj matches type. If type is a string, typeof will be
  // used, if type is a class, instanceof will be used. To throw an error when
  // the types do not match, specify err as a string. Other wise, typeCheck will
  // return a boolean indicating if the types matched.
  /* >
  Lapiz.typeCheck([], Array); // true
  Lapiz.typeCheck("test", "string"); // true
  Lapiz.typeCheck("test", Array); // false
  Lapiz.typeCheck([], "string", "Expected string"); // throws an error
  */
  $L.set($L, "typeCheck", function(obj, type, err){
    var typeCheck = (typeof type === "string") ? (typeof obj === type) : (obj instanceof type);
    if (err !== undefined && !typeCheck){
      throw new Error(err);
    }
    return typeCheck;
  });

  // > Lapiz.typeCheck.func(obj)
  // > Lapiz.typeCheck.func(obj, err)
  // Checks if the object is a function. If a string is supplied for err, it
  // will throw err if obj is not a function.
  $L.set($L.typeCheck, "func", function(obj, err){return $L.typeCheck(obj, Function, err)});

  // > Lapiz.typeCheck.array(obj)
  // > Lapiz.typeCheck.array(obj, err)
  // Checks if the object is a array. If a string is supplied for err, it
  // will throw err if obj is not an array.
  $L.set($L.typeCheck, "array", function(obj, err){return $L.typeCheck(obj, Array, err)});

  // > Lapiz.typeCheck.string(obj)
  // > Lapiz.typeCheck.string(obj, err)
  // Checks if the object is a string. If a string is supplied for err, it
  // will throw err if obj is not an string.
  $L.set($L.typeCheck, "string", function(obj, err){return $L.typeCheck(obj, "string", err)});

  // > Lapiz.typeCheck.number(obj)
  // > Lapiz.typeCheck.number(obj, err)
  // Checks if the object is a number. If a string is supplied for err, it
  // will throw err if obj is not an number.
  $L.set($L.typeCheck, "number", function(obj, err){return $L.typeCheck(obj, "number", err)});

  // > Lapiz.assert(bool, err)
  // If bool evaluates to false, an error is thrown with err.
  $L.set($L, "assert", function(bool, err){
    if (!bool){
      throw new Error(err);
    }
  });

  return $L;
})(Lapiz);
Lapiz.Module("Collections", function($L){
  // > Lapiz.Map()
  // Returns a key value store that inherits no properties or methods. Useful to
  // bypass calling "hasOwnProperty". This is just a wrapper around
  // Object.create(null);
  //
  // Lapiz.Map also serves as a namespace for the following helper methods.
  // They can be called on any object. They all use Object.defineProperty to
  // create a proptery that cannot be overridden.
  function Map(){
    return Object.create(null);
  };
  $L.set($L, "Map", Map);

  // > Lapiz.Map.meth(obj, namedFunc)
  // Attaches a method to an object. The method must be a named function.
  /* >
  var x = Lapiz.Map();
  Lapiz.Map.meth(x, function foo(){...});
  x.foo(); //calls foo
  */
  $L.set(Map, "meth", function(obj, fn){
    $L.typeCheck.func(fn, "Expected function");
    $L.assert(fn.name !== "", "Require named function for method");
    $L.set(obj, fn.name, fn);
  });

  // > Lapiz.Map.setterMethod(obj, namedSetterFunc)
  // Attaches a setter method to an object. The method must be a named function.
  /* >
  var x = Lapiz.Map();
  Lapiz.Map.meth(x, function foo(val){...});

  //these two calls are equivalent
  x.foo("bar");
  x.foo = "bar";
  */
  Map.meth(Map, function setterMethod(obj, fn){
    $L.typeCheck.func(fn, "Expected function for setterMethod");
    $L.assert(fn.name !== "", "Require named function for setterMethod");
    Object.defineProperty(obj, fn.name, {
      "get": function(){ return fn; },
      "set": fn,
    });
  });

  // > Lapiz.Map.prop(obj, name, desc)
  // Just a wrapper around Object.defineProperty
  Map.meth(Map, function prop(obj, name, desc){
    Object.defineProperty(obj, name, desc);
  });

  // > Lapiz.Map.getter(object, namedGetterFunc)
  // Attaches a getter method to an object. The method must be a named function.
  /* >
  var x = Lapiz.Map();
  var ctr = 0;
  Lapiz.Map.getter(x, function foo(){
    var c = ctr;
    ctr +=1;
    return c;
  });
  console.log(x.foo); //0
  console.log(x.foo); //1
  */
  Map.meth(Map, function getter(obj, fn){
    $L.typeCheck.func(fn, "Expected function for getter");
    $L.assert(fn.name !== "", "Require named function for getter");
    Object.defineProperty(obj, fn.name, {"get": fn,} );
  });

  // > Lapiz.Map.setterGetter(obj, name, setterFunc, getterFunc)
  // > Lapiz.Map.setterGetter(obj, name, setterFunc)
  // Creates a setter/getter property via a closure. A setter function is
  // required, if no getter is provided, the value will be returned. This is the
  // reason the method is named setterGetter rather than the more traditional
  // arrangement of "getterSetter" because the arguments are arranged so that
  // the first 3 are required and the last is optional.
  /* >
  var x = Lapiz.Map();
  Lapiz.Map.setterGetter(x, "foo", function(i){return parseInt(i);});

  x.foo = "12";
  console.log(x.foo); // will log 12 as an int
  */
  // The value 'this' is always set to a special setterInterface for the setter
  // method. This can be used to cancel the set operation;
  /* >
  var x = Lapiz.Map();
  Lapiz.Map.setterGetter(x, "foo", function(i){
    i = parseInt(i);
    this.set = !isNaN(i);
    return i;
  });

  x.foo = "12";
  console.log(x.foo); // will log 12 as an int
  x.foo = "hello";
  console.log(x.foo); // value will still be 12

  */
  Map.meth(Map, function setterGetter(obj, name, setter, getter){
    $L.typeCheck.func(setter, "Expected function for setterGetter");
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

  // > Lapiz.Map.copyProps(copyTo, copyFrom, props...)
  // Copies the properties from the copyFrom object to the copyTo obj. The
  // properties should be strings. By default, the property will be copied with
  // basic assignment. If the property is preceeded by &, it will be copied by
  // reference.
  /* >
  var A = {"x": 12, "y": "foo", z:[]};
  var B = {};
  Lapiz.Map.copyProps(B, A, "x", "&y");
  A.x = 314;
  console.log(B.x); // 12
  B.y = "Test";
  console.log(A.y); // Test
  */
  Map.meth(Map, function copyProps(copyTo, copyFrom){
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

  // > Lapiz.Namespace()
  // > Lapiz.Namespace(constructor)
  // Namespace is a closure around all of the Map methods (plus Lapiz.set). It
  // provides syntactic sugar so that the obj argument doesn't need to be
  // supplied each time.
  //
  // The constructor is optional. If not given the outer layer of the namespace
  // is returned.
  /* >
  var x = Lapiz.Namespace();
  x.set("foo", "bar");
  x.meth(function sayHello(name){
    console.log("Hello, "+name);
  });
  console.log(x.namespace.foo); // bar
  x.namespace.sayHello("World"); // Hello, World
  */
  // If a constructor is provided, it will be invoked with "this" as the outer
  // layer of the namespace and will return in the inner namespace.
  /* >
  var x = Lapiz.Namespace(function(){
    this.set("foo", "bar");
    this.meth(function sayHello(name){
      console.log("Hello, "+name);
    });
  });

  console.log(x.foo); // bar
  x.sayHello("World"); // Hello, World
  */
  // * namespace.set(name, value)
  // * namespace.prop(name, desc)
  // * namespace.meth(namedFunc)
  // * namespace.setterMethod(namedSetterFunc)
  // * namespace.getter(namedGetterFunc)
  // * namespace.setterGetter(name, setter, getter)
  // * namespace.setterGetter(name, setter)
  Map.meth($L, function Namespace(fn){
    var self = $L.Map();
    self.namespace = $L.Map();

    Map.meth(self, function set(name, value){Object.defineProperty(self.namespace, name, { value: value });});
    Map.meth(self, function prop(name, desc){Object.defineProperty(self.namespace, name, desc);});
    Map.meth(self, function meth(fn){Map.meth(self.namespace, fn);});
    Map.meth(self, function setterMethod(fn){Map.setterMethod(self.namespace, fn);});
    Map.meth(self, function getter(fn){Map.getter(self.namespace, fn);});
    Map.meth(self, function setterGetter(name, setter, getter){Map.setterGetter(self.namespace, name, setter, getter);});

    if ($L.typeCheck.func(fn)){
      fn.apply(self);
      return self.namespace;
    }
    return self;
  });

  // > Lapiz.remove(arr, el, start)
  // > Lapiz.remove(arr, el)
  // Removes the one instance of the given element from the array. If start is
  // not specified, it will be the first instance, otherwise it will be the
  // first instance at or after start.
  /* >
  var arr = [3,1,4,1,5,9];
  Lapiz.remove(arr,1);
  console.log(arr); //[3,4,1,5,9]
  */
  Map.meth($L, function remove(arr, el, start){
    var i = arr.indexOf(el, start);
    if (i > -1) { arr.splice(i, 1); }
  });

  // > Lapiz.each(collection, fn(key, val))
  // Iterates over the collection, calling func(key, val) for each item in the
  // collection. If the collection is an array, key will be the index. If func
  // returns true (or an equivalent value) the Lapiz.each will return the
  // current key allowing each to act as a search.
  /* >
  var arr = [3,1,4,1,5,9];
  Lapiz.each(arr, function(key,val){
    console.log(key, val);
  });
  var gt4 = Lapiz.each(arr, function(key,val){return val > 4;});

  var kv = {
    "A":"apple",
    "B":"banana",
    "C":"cantaloupe"
  };
  Lapiz.each(kv, function(key,val){
    console.log(key, val);
  });
  */
  Map.meth($L, function each(obj, fn){
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

  // > Lapiz.ArrayConverter(accessor)
  // Takes an accessor and provides an array. The events on the accessor will be
  // used to keep the array up to date. However, if the array is modified, the
  // results can be unpredictable. This primarily provided as a tool for
  // interfacing with other libraries and frameworks. Use the accessor interface
  // whenever possible.
  Map.meth($L, function ArrayConverter(accessor){
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

  // > Lapiz.Dependency(name)
  // Returns the dependency associated with name
  $L.Dependency = function(name){
    var d = _dependencies[name];
    if (d === undefined) { throw new Error("Cannot find Dependency " + name); }
    return d();
  };

  // > Lapiz.Dependency.Service(name, constructor)
  // Service will register the constructor in manor so that calling
  // > Lapiz.Dependency(name)(args...)
  // on a service is the same as calling
  // > new constructor(args...)
  $L.Dependency.Service = function(name, fn){
    function F(args) {
      return fn.apply(this, args);
    }
    F.prototype = fn.prototype;

    _dependencies[name] = function() {
      return new F(arguments);
    };
  };

  // > Lapiz.Dependency.Factory(name, fn)
  // Factory is the most direct of the dependency registrations, it registers
  // the function directly
  $L.Dependency.Factory = function(name, fn){
    _dependencies[name] = fn;
  };

  // > Lapiz.Dependency.Reference(name, resource)
  // Wraps the resource in a closure function so that calling
  // > Lapiz.Dependency(name)
  // will return the resource.
  $L.Dependency.Reference = function(name, res){
    _dependencies[name] = function(){
      return res;
    };
  };

  // > Lapiz.Dependency.remove(name)
  // Removes a dependency
  $L.Dependency.remove = function(name){
    delete _dependencies[name];
  };

  // > Lapiz.Dependency.has(name)
  // Returns a boolean indicating if there is a resource registered corresonding
  // to name.
  $L.Dependency.has = function(name){
    return _dependencies.hasOwnProperty(name);
  };
});
Lapiz.Module("Dictionary", function($L){

  // > Lapiz.Dictioanry()
  // > Lapiz.Dictioanry(seed)
  // Dictionaries allow for the storage of key/value pairs in a container that
  // will emit events as the contents change.
  //
  // If seed values are specified, they will start as the contents of the
  // dictionary, otherwise the dictionary will start off empty.
  /* >
  var emptyDict = Lapiz.Dictionary();
  var fruitDict = Lapiz.Dictionary({
    "A": "apple",
    "B": "banana",
    "C": "cantaloupe"
  });
  console.log(fruitDict("A")); // apple
  fruitDict("A", "apricot");
  console.log(fruitDict("A")); // apricot
  emptyDict(12, "zebra");
  console.log(emptyDict(12)); // apricot
  */
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

    // > dict(key)
    // > dict(key, val)
    // If only key is given, the value currently associated with that key will
    // be returned. If key and val are both given, val is associated with key
    // and the proper event (change or insert) will fire.
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

    // > dict.length
    // A read-only property that returns the length of a dictionary
    /* >
    var fruitDict = Lapiz.Dictionary({
      "A": "apple",
      "B": "banana",
      "C": "cantaloupe"
    });
    console.log(fruitDict.length); // 3
    */
    $L.Map.getter(self, function length(){
      return _length;
    });

    // > dict.remove(key)
    // The remove method will remove a key from the dictionary and the remove
    // event will fire.
    /* >
    var fruitDict = Lapiz.Dictionary({
      "A": "apple",
      "B": "banana",
      "C": "cantaloupe"
    });
    fruitDict.remove("B");
    console.log(fruitDict.length); // 2
    console.log(fruitDict("B")); // undefined
    */
    self.remove = function(key){
      if (_dict[key] !== undefined){
        _length -= 1;
        var obj = _dict[key];
        delete _dict[key];
        _removeEvent.fire(key, obj, self.Accessor);
      }
    };

    // > dict.on
    // Namespace for dictionary events
    self.on = $L.Map();

    // > dict.on.insert(fn(key, accessor))
    // Event will fire when a new key is added to the dictionary
    $L.Event.linkProperty(self.on, "insert", _insertEvent);
    // > dict.on.change(fn(key, accessor))
    // Event will fire when a new key has a new value associated with it
    $L.Event.linkProperty(self.on, "change", _changeEvent);
    // > dict.on.remove(fn(key, val, accessor))
    // Event will fire when a key is removed.
    $L.Event.linkProperty(self.on, "remove", _removeEvent);
    Object.freeze(self.on);

    // > dict.has(key)
    // The has method returns a boolean stating if the dictionary has the given
    // key.
    /* >
    var fruitDict = Lapiz.Dictionary({
      "A": "apple",
      "B": "banana",
      "C": "cantaloupe"
    });
    console.log(fruitDict.has("B")); // true
    console.log(fruitDict.has(12)); // false
    */
    self.has = function(key){ return _dict[key] !== undefined; };

    // > dict.each(fn(key, val))
    // The each method takes a function and calls it for each key/value in the
    // collection. The function will be called with two arguments, the key and
    // the corresponding value. If any invocation of the function returns True,
    // that will signal the each loop to break. The order is not guarenteed.
    /* >
    var fruitDict = Lapiz.Dictionary({
      "A": "apple",
      "B": "banana",
      "C": "cantaloupe"
    });
    fruitDict(function(key, val){
      console.log(key, val);
      return key === "A";
    });
    */
    self.each = function(fn){
      var keys = Object.keys(_dict);
      var key, i;
      for(i=keys.length-1; i>=0; i-=1){
        key = keys[i];
        if (fn(key, _dict[key])) { break; }
      }
    };

    // > dict.keys
    // A read-only property that will return the keys as an array.
    /* >
    var fruitDict = Lapiz.Dictionary({
      "A": "apple",
      "B": "banana",
      "C": "cantaloupe"
    });
    console.log(fruitDict.keys); // ["C", "A", "B"] in some order
    */
    $L.Map.getter(self, function keys(){
      return Object.keys(_dict);
    });

    // > dict.Sort(sorterFunction)
    // > dict.Sort(attribute)
    // Returns a Sorter with the dictionary as the accessor
    self.Sort = function(funcOrField){ return $L.Sort(self, funcOrField); };

    // > dict.Filter(filterFunction)
    // > dict.Filter(attribute, val)
    // Returns a Filter with the dictionary as the accessor
    self.Filter = function(filterOrAttr, val){ return $L.Filter(self, filterOrAttr, val); };

    // > dict.Accessor
    // > dict.Accessor(key)
    // The accessor is a read-only iterface to the dictionary
    // * accessor.length
    // * accessor.keys
    // * accessor.has(key)
    // * accessor.each(fn(key, val))
    // * accessor.on.insert
    // * accessor.on.change
    // * accessor.on.remove
    // * accessor.Sort
    // * accessor.Filter
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

  // > Lapiz.Event()
  /* >
  var event = Lapiz.Event();
  e.register(function(val){
    console.log(val);
  });
  var fn2 = function(val){
    alert(val);
  };
  e.register = fn2;
  e.fire("Test 1"); //will log "Test 1" to the console and pop up an alert
  e.register.deregister(fn2);
  e.fire("Test 2"); //will log "Test 2" to the console
  */
  $L.set($L, "Event", function(){
    var _listeners = [];
    var event = Lapiz.Map();

    // > event.register(fn)
    // > event.register = fn
    // The event.register method takes a function. All registered functions will
    // be called when the event fires.
    $L.Map.setterMethod(event, function register(fn){
      _listeners.push(fn);
      return fn;
    });

    // > event.register.deregister(fn)
    // > event.register.deregister = fn
    // The event.register.deregister method takes a function. If that function
    // has been registered with the event, it will be removed.
    $L.Map.setterMethod(event.register, function deregister(fn){
      $L.remove(_listeners, fn);
      return fn;
    });

    // > event.fire(args...)
    // The event.fire method will call all functions that have been registered
    // with the event. The arguments that are passed into fire will be passed
    // into the registered functions.
    $L.Map.meth(event, function fire(){
      if (!event.fire.enabled) { return event; }
      var i;
      var l = _listeners.length;
      for(i=0; i<l; i+=1){
        _listeners[i].apply(this, arguments);
      }
      return event;
    });

    // > event.fire.enabled
    // > event.fire.enabled = x
    // The event.enabled is a boolean that can be set to enable or disable the
    // fire method. If event.fire.enable is false, even if event.fire is called,
    // it will not call the registered functions.
    $L.Map.setterGetter(event.fire, "enabled", function(enable){ return !!enable; });
    event.fire.enabled = true;

    // > event.fire.length
    // The event.length is a read-only property that returns the number of
    // functions registered with the event.
    $L.Map.getter(event.fire, function length(){ return _listeners.length; });

    $L.set(event, "_cls", $L.Event);

    return event;
  });

  // > Lapiz.SingleEvent()
  // A single event is an instance that will only fire once. Registering a
  // function after the event has fired will result in the function being
  // immedatly invoked with the arguments that were used when the event fired.
  $L.set($L, "SingleEvent", function(){
    var _event = $L.Event();
    var _hasFired = false;
    var _args;
    var facade = $L.Map();

    // > singleEvent.register
    $L.Map.meth(facade, function register(fn){
      if (_hasFired){
        fn.apply(this, _args);
      } else {
        _event.register(fn);
      }
    });

    // > singleEvent.register.deregister
    $L.Map.meth(facade.register, function deregister(fn){
      if (_hasFired) { return; }
      _event.register.deregister(fn);
    });

    // > singleEvent.fire
    $L.Map.meth(facade, function fire(){
      if (_hasFired) { return; }
      _hasFired = true;
      _args = arguments;
      _event.fire.apply(this, _args);
      delete _event;
    });
    $L.set(facade, "_cls", $L.SingleEvent);

    // > singleEvent.fire.enabled
    Object.defineProperty(facade.fire, "enabled", {
      get: function(){ return _event.fire.enabled; },
      set: function(val) { _event.fire.enabled = val; }
    });

    return facade;
  });

  // > Lapiz.Event.linkProperty(obj, name, evt)
  // This is a helper function for linking an event to an object. It will be
  // linked like a setter method:
  /* >
  var e = Lapiz.Event();
  var map = Lapiz.Map();
  Lapiz.Event.linkProperty(map, "foo", e);
  // These two are the same
  map.foo(function(){...});
  map.foo = function(){...};

  // To deregister
  map.foo.deregister(fn);
  */
  $L.set($L.Event, "linkProperty", function(obj, name, evt){
    Object.defineProperty(obj, name, {
      get: function(){ return evt.register; },
      set: function(fn){ evt.register(fn); }
    });
  });

  $L.on = $L.Map();
});
Lapiz.Module("Filter", function($L){

  // > Lapiz.Filter(accessor, filterFunc)
  // > Lapiz.Filter(accessor, attribute, val)
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
  // > Lapiz.Index(lapizClass)
  // > Lapiz.Index(lapizClass, primaryFunc)
  // > Lapiz.Index(lapizClass, primaryField)
  // > Lapiz.Index(lapizClass, primary, domain)
  // Adds an index to a class. If class.on.change and class.on.delete exist,
  // the index will use these to keep itself up to date.
  //
  // Index needs a primary key. Any to entries with the same primary key are
  // considered equivalent and one will overwrite the other. By default, Index
  // assumes a primary property of "id". To use another field, pass in a string
  // as primaryField. To generate a primary key from the data in the object,
  // pass in a function as primaryFunc.
  //
  // By default, the Index methods will be attached directly to the class. If
  // this would cause a namespace collision, a string can be provided as a
  // domain and all methods will be attached in that namespace.
  $L.set($L, "Index", function(cls, primaryFunc, domain){
    if (primaryFunc === undefined){
      primaryFunc = function(obj){return obj.id;};
    } else if (typeof primaryFunc === "string"){
      primaryFunc = function(field){
        return function(obj){
          return obj[field];
        };
      }(primaryFunc);
    } else if ( !(primaryFunc instanceof  Function) ){
      throw new Error("Expected a function or string");
    }

    if (domain === undefined) {
      domain = cls;
    } else {
      cls[domain] = {};
      domain = cls[domain];
    }

    var _primary = $L.Dictionary();

    // > indexedClass.each( function(key, val))
    domain.each = _primary.each;

    // > indexedClass.has(key)
    domain.has = _primary.has;

    // > indexedClass.Filter(filterFunc)
    // > indexedClass.Filter(filterField, val)
    domain.Filter = _primary.Filter;

    // > indexedClass.Sort(sortFunc)
    // > indexedClass.Sort(sortField)
    domain.Sort = _primary.Sort;

    // > indexedClass.remove(key)
    domain.remove = _primary.remove;

    // > indexedClass.keys
    Object.defineProperty(domain, "keys",{
      get: function(){ return _primary.keys; }
    });

    // > indexedClass.all
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

    // > indexedClass.get(primaryKey)
    // > indexedClass.get(field, val)
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
  });
});
Lapiz.Module("Objects", ["Events"], function($L){
  function _getter(self, funcOrProp){
    if ($L.typeCheck.func(funcOrProp)) { return funcOrProp; }
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

  // > lapizObject = Lapiz.Object();
  // > lapizObject = Lapiz.Object(constructor);
  // Creates a Lapiz Object, a structure per-wired for adding events, properties
  // and methods. If a constructor is supplied, it will be invoked with 'this'
  // set to the object.
  /* >
  var obj = Lapiz.Object();
  obj.properties({
    "name": "string"
  });
  obj = obj.pub;
  obj.name = "test";

  var obj2 = Lapiz.Object(function(){
    this.properties({
      "name": "string"
    });
  }).pub;
  obj2.name = "test 2";
  */
  $L.Object = function(constructor){
    var self = $L.Map();
    var pub = $L.Map();

    // > lapizObject.pub
    // The public namespace on the object
    self.pub = pub;

    // > lapizObject.pub.on
    // Namespace for event registrations
    self.pub.on = $L.Map();

    // > lapizObject.fire
    // Namespace for event fire methods
    self.fire = $L.Map();

    // > lapizObject.attr
    // Namespace for attribute values
    /* >
    var obj = Lapiz.Object(function(){
      this.properties({
        "name": "string"
      });
    });
    obj.pub.name = "test";
    console.log(obj.attr.name); // test
    obj.attr.name = "bar";
    console.log(obj.pub.name); // test
    */
    self.attr = $L.Map();
    self._cls = $L.Object;

    // > lapizObject.event(name)
    // Creates an event and places the registration method in object.pub.on and
    // the fire method in object.fire
    /* >
    var obj = Lapiz.Object();
    obj.event("foo");
    obj.pub.on.foo = function(val){ console.log(val);};
    obj.fire.foo("bar"); // this will fire foo logging "bar" to the console
    */
    self.event = function(name){
      var e = $L.Event();
      $L.Event.linkProperty(self.pub.on, name, e);
      self.fire[name] = e.fire;
    };

    // > lapizObject.pub.on.change
    // > lapizObject.fire.change
    // The change event will fire when ever a property is set.
    self.event("change");

    // > lapizObject.pub.on.delete
    // > lapizObject.fire.delete
    // The delete event should be fired if the object is going to be deleted.
    self.event("delete");

    // > lapizObject.setMany(collection)
    // Takes a key/value collection (generally a JavaScript object) and sets
    // any properties that match the keys.
    /* >
    var obj = Lapiz.Object(function(){
      this.properties({
        "id": "int",
        "name": "string",
        "role": "string"
      });
    });
    obj.setMany({
      "id":12,
      "role": "admin"
    });
    */
    // Another technique is to attach setMany to the public interface
    /* >
    var obj = Lapiz.Object(function(){
      this.properties({
        "id": "int",
        "name": "string",
        "role": "string"
      });
      this.meth(this.setMany);
    }).pub;
    obj.setMany({
      "id":12,
      "role": "admin"
    });
    */
    self.setMany = function setMany(json){
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

    // > lapizObject.properties(properties)
    // > lapizObject.properties(properties, values)
    // The properties method is used to attach getter/setter properties to the
    // public namespace. The attribute that underlies the getter/setter will be
    // attached to object.attr.
    //
    // If a setter is defined and no getter is defined, a getter will be
    // generated that returns the attribute value. If a function is given, that
    // will be used as the setter, if a string is provided, that will be used to
    // get a setter from Lapiz.parse.
    /* >
    var obj = Lapiz.Object(function(){
      var self = this;
      this.properties({
        "name": "string", // this will use Lapiz.parse.string
        "foo": function(val){
          // this will be the setter for foo
          return parseInt("1"+val);
        },
        "bar": {
          "set": "int",
          "get": function(){
            return "== "+self.attr.bar+" ==";
          }
        },
        "glorp":{
          "set": "bool",
          "get": null, //makes this a set only property
        }
      });
    });
    */
    self.properties = function(properties, values){
      var property, val, i, desc;
      var keys = Object.keys(properties);
      for(i=keys.length-1; i>=0; i-=1){
        property = keys[i];
        val = properties[property];
        desc = {};

        if (val === undefined || val === null){
          throw new Error("Invalid value for '" + property + "'");
        } else if ($L.typeCheck.func(val)|| $L.typeCheck.string(val)){
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
      }
    };

    // > lapizObject.getter(getterFn)
    // Creates a getter property in the public namespace.
    self.getter = function(getterFn){
      $L.Map.getter(self.pub, getterFn);
    };

    // > lapizObject.meth(fn)
    // Creates a method in the public namespace.
    self.meth = function(fn){
      $L.Map.meth(self.pub, fn);
    };

    if ($L.typeCheck.func(constructor)){
      constructor.apply(self);
    }

    return self;
  };

  // > Lapiz.argDict()
  // This is one of the few "magic methods" in Lapiz. When called from within a
  // function, it returns the arguments names and values as a key/value object.
  // The name is a little misleading, the result is a JavaScript object, not a
  // Lapiz.Dictionary.
  /* >
  function foo(x,y,z){
    var args = Lapiz.argDict();
    console.log(args);
  }
  foo('do','re','mi'); // logs {'x':'do', 'y':'re', 'z':'mi'}
  */
  $L.Map.meth($L, function argDict(){
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
  // > Lapiz.on.class(fn)
  // > Lapiz.on.class = fn
  // Event registration, event will fire whenever a new Lapiz class is defined.
  $L.Event.linkProperty($L.on, "class", _newClassEvent);

  // > lapizClass = Lapiz.Class(constructor)
  // > lapizClass = Lapiz.Class(constructor, useCustom)
  // Used to define a class. Lapiz.on.class will fire everytime a new class
  // is created. The returned constructor will also have an on.create method
  // that will fire everytime a new instance is created.
  /* >
  var Person = Lapiz.Class(function(id, name, role, active){
    this.properties({
      "id": "int",
      "name": "string",
      "role": "string",
      "active": "bool"
    }, Lapiz.argDict());
    return this.pub;
  });
  Person.on.create(function(person){
    console.log(person.name);
  });
  var adam = Person(12, "Adam", "admin", true); //will fire create event and log "Adam"
  */
  // If the constructor doesn't return anything, the Lapiz object that was
  // passed in as 'this' will be will be returned as the contructed object.
  // If the constructor does return a value, that will be used. As in the
  // example above, returning the public namespace is a common technique.
  //
  // If the second argument is 'true', a Lapiz object will not be set to 'this',
  // instead it will be set to what whatever the calling scope is.
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
        self = fn.apply(self, arguments) || self;
        newInstanceEvent.fire(self);
        return self;
      };
    }

    // > lapizClass.on
    // Namespace for class level events
    ret.on = $L.Map();

    // > lapizClass.on.create
    // Registration for event that will fire everytime a new instance is created
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

  // > Lapiz.parse
  // Namespace for parser methods. This namespace is left open
  // so that it can be extended, particularly for use with defining
  // object properties.
  $L.set($L, "parse", $L.Map());

  // > Lapiz.parse.int(val)
  // > Lapiz.parse.int(val, rad)
  // If rad is not defined it will default to 10. This is mostly a wrapper
  // around parseInt, however if val is a boolean it will reurn eitehr 1
  // or 0.
  $L.set($L.parse, "int", function(val,rad){
    //can't use $L.Map.meth because "int" is reserve word
    if (val === true){
      return 1;
    } else if (val === false){
      return 0;
    }
    rad = rad || 10;
    return parseInt(val, rad);
  });

  // > Lapiz.parse.string
  // If val is null or undefined, returns an empty stirng. If val
  // is a string, it is returned, if it's a number it's converted
  // to a string. If val is an object that has a .str() method,
  // that will be used, if it doesn't have .str but it does have
  // .toString, that will be used. As a last resort it will be
  // concatted with an empty string.
  $L.Map.meth($L.parse, function string(val){
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

  // > Lapiz.parse.bool(val)
  // Converts val to a bool
  $L.Map.meth($L.parse, function bool(val){ return !!val; });

  // > Lapiz.parse.number(val)
  // Converts val to a number. This is a wrapper around parseFloat.
  $L.Map.meth($L.parse, function number(val){ return parseFloat(val); });

  // Lapiz.parse.object(val)
  // This is just a pass through function, not a true parser. It can
  // be useful for object properties.
  $L.Map.meth($L.parse, function object(obj){ return obj; });

  // > Lapiz.parse.array(parser)
  // This takes a parser or a string (which will be resolved agains Lapiz.parse)
  // and returns an array parser.
  /* >
  var arrIntParser = Lapiz.parse.array("int");
  console.log(arrIntParser([3.14, "12.34", true]); // [3, 12, 1]
  console.log(arrIntParser("22.22"); // [22]
  */
  $L.Map.meth($L.parse, function array(parser){
    parser = resolveParser(parser);
    return function(arr){
      if (Array.isArray(arr)){
        for(var i = 0; i<arr.length; i++){
          arr[i] = parser(arr[i]);
        }
        return arr;
      }
      return [parser(arr)];
    };
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