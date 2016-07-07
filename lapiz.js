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
  // > Lapiz.set(obj, namedFunction)
  // Defines a fixed propery on an object. Properties defined this way cannot be
  // overridden. Attempting to set them will throw an error.
  /* >
  var x = {};
  x.foo = function(){...};
  //somewhere else
  x.foo = 12; //the method is now gone

  var y = {};
  Lapiz.set(y, "foo", function{...});
  y.foo = 12; // this will not override the method
  */

  // *, str, *                     => named prop
  // *, namedFn, undefined         => namedFn
  // str, str, undefined           => probably forgot obj, intended named prop
  // namedFn, undefined, undefined => probably forgot obj, intended namedFn
  function set(obj, name, value){
    var getFn;
    if (value === undefined && typeof name === "function" && name.name !== ""){
      // name is a named function
      value = name;
      name = value.name;
    }

    if (typeof name !== "string"){
      if ($L.Err){
        $L.Err.throw("Attempting to call Lapiz.set without name");
      } else {
        throw new Error("Attempting to call Lapiz.set without name");
      }
    }
    if (value === undefined){
      if ($L.Err){
        $L.Err.throw("Attempting to call Lapiz.set without value");
      } else {
        throw new Error("Attempting to call Lapiz.set without value");
      }
    }
    var setErr = "Attempting to set read-only property "+name;
    Object.defineProperty(obj, name, {
      "get": function(){ return value; },
      "set": function(){ throw new Error(setErr); },
    });
  }
  set($L, set);
  set($L, "_cls", $L);

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

  // > Lapiz.Module.Loaded
  // Returns all the modules that have been loaded
  Object.defineProperty($L.Module, "Loaded",{
    "get": function(){
      return Object.keys(_loaded);
    }
  });
  Object.freeze(self.Module);

  // > Lapiz.typeCheck(obj, type)
  // > Lapiz.typeCheck(obj, type, errStr)
  // Checks if the type of obj matches type. If type is a string, typeof will be
  // used, if type is a class, instanceof will be used. To throw an error when
  // the types do not match, specify errStr as a string. Other wise, typeCheck
  // will return a boolean indicating if the types matched.
  /* >
  Lapiz.typeCheck([], Array); // true
  Lapiz.typeCheck("test", "string"); // true
  Lapiz.typeCheck("test", Array); // false
  Lapiz.typeCheck([], "string", "Expected string"); // throws an error
  */
  $L.set($L, "typeCheck", function(obj, type, err){
    var typeCheck = false;
    try{
      typeCheck = (typeof type === "string") ? (typeof obj === type) : (obj instanceof type);
    } catch(e) {
      throw new Error("typeCheck error, type arg is probably not instance class");
    }
    if (err !== undefined && !typeCheck){
      err = new Error(err);
      if ($L.Err && $L.Err.throw){
        $L.Err.throw(err)
      } else {
        throw err;
      }
    }
    return typeCheck;
  });

  // > Lapiz.typeCheck.func(obj)
  // > Lapiz.typeCheck.func(obj, errStr)
  // Checks if the object is a function. If a string is supplied for errStr, it
  // will throw errStr if obj is not a function.
  $L.set($L.typeCheck, "func", function(obj, err){
    return $L.typeCheck(obj, "function", err);
  });

  // > Lapiz.typeCheck.array(obj)
  // > Lapiz.typeCheck.array(obj, errStr)
  // Checks if the object is a array. If a string is supplied for errStr, it
  // will throw errStr if obj is not an array.
  $L.set($L.typeCheck, "array", function(obj, err){
    return $L.typeCheck(obj, Array, err);
  });

  // > Lapiz.typeCheck.string(obj)
  // > Lapiz.typeCheck.string(obj, errStr)
  // Checks if the object is a string. If a string is supplied for errStr, it
  // will throw errStr if obj is not an string.
  $L.set($L.typeCheck, "string", function(obj, err){
    return $L.typeCheck(obj, "string", err);
  });

  // > Lapiz.typeCheck.number(obj)
  // > Lapiz.typeCheck.number(obj, errStr)
  // Checks if the object is a number. If a string is supplied for errStr, it
  // will throw errStr if obj is not an number.
  $L.set($L.typeCheck, "number", function(obj, err){
    return $L.typeCheck(obj, "number", err);
  });

  // > Lapiz.typeCheck.obj(obj)
  // > Lapiz.typeCheck.obj(obj, errStr)
  // Checks if the object is an object. If a string is supplied for errStr, it
  // will throw errStr if obj is not an number. Note that many things like Arrays and
  // Dates are objects, but numbers strings and functions are not.
  $L.set($L.typeCheck, "obj", function(obj, err){
    return $L.typeCheck(obj, "object", err);
  });

  // > Lapiz.typeCheck.nested(obj, nestedFields..., typeCheckFunction)
  // > Lapiz.typeCheck.nested(obj, nestedFields..., typeCheckFunctionName)
  // Checks that each nested field exists and that the last field matches the function type.
  // So this:
  // > if (collection.key !== undefined && collection.key.on !== undefined && Lapiz.typeCheck.func(collection.key.on.change)){
  // becomes:
  // > if (Lapiz.typeCheck.nested(collection, "key", "on", "change", "func")){
  $L.set($L.typeCheck, "nested", function(){
    var args = Array.prototype.slice.call(arguments);
    $L.assert(args.length >= 2, "Lapiz.typeCheck.nested requres at least 2 arguments");
    var typeCheckFn = args.pop();
    typeCheckFn = $L.typeCheck.string(typeCheckFn) ? $L.typeCheck[typeCheckFn] : typeCheckFn;
    $L.typeCheck.func(typeCheckFn, "Last argument to Lapiz.typeCheck.nested must be a function or name of a typeCheck helper method");
    var obj;
    for(obj = args.shift(); obj !== undefined && args.length > 0 ; obj = obj[args.shift()]);
    return typeCheckFn(obj);
  });

  // > Lapiz.assert(bool, err)
  // If bool evaluates to false, an error is thrown with err.
  $L.set($L, "assert", function(bool, err){
    if (!bool){
      err = new Error(err);
      // peel one layer off the stack because it iwll always be
      // this line
      err.stack = err.stack.split("\n");
      err.stack.shift();
      err.stack = err.stack.join("\n");
      if ($L.Err && $L.Err.throw){
        $L.Err.throw(err);
      } else {
        throw err;
      }
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
  }
  $L.set($L, "Map", Map);

  // > Lapiz.Map.meth(obj, namedFunc)
  // > Lapiz.Map.meth(obj, name, function)
  // > Lapiz.Map.meth(obj, namedFunc, bind)
  // > Lapiz.Map.meth(obj, name, function, bind)
  // Attaches a method to an object. The method must be a named function.
  /* >
  var x = Lapiz.Map();
  Lapiz.Map.meth(x, function foo(){...});
  x.foo(); //calls foo
  Lapiz.Map.meth(x, "bar", function(){...});
  */
  // Providing a bind value will perminantly set the "this" value inside the
  // method.
  /* >
  var x = Lapiz.Map();
  x.name = "Test";
  Lapiz.Map.meth(x, function foo(){
    console.log(this.name);
  }, x);
  var y = Lapiz.Map();
  y.bar = x.foo;
  y.bar(); // calls x.foo with this set to x
  */
  $L.set(Map, function meth(obj, name, fn, bind){
    if (name === undefined && $L.typeCheck.func(obj)){
      // common special case: user forgot obj, attached named function
      // we can provide a very specific and helpful error
      $L.Err['throw']("Meth called without object: "+obj.name);
    }
    if ($L.typeCheck.func(fn) && $L.typeCheck.string(name)){
      $L.assert(name !== "", "Meth name cannot be empty string");
    } else if ($L.typeCheck.func(name) && name.name !== ""){
      bind = fn;
      fn = name;
      name = fn.name;
    } else {
      Lapiz.Err['throw']("Meth requires either name and func or named function");
    }
    if (bind !== undefined){
      fn = fn.bind(bind);
    }
    $L.set(obj, name, fn);
  });

  // > Lapiz.Map.prop(obj, name, desc)
  // Just a wrapper around Object.defineProperty
  Map.meth(Map, function prop(obj, name, desc){
    Object.defineProperty(obj, name, desc);
  });

  // > Lapiz.Map.setterMethod(obj, namedSetterFunc)
  // > Lapiz.Map.setterMethod(obj, name, setterFunc)
  // > Lapiz.Map.setterMethod(obj, namedSetterFunc, bind)
  // > Lapiz.Map.setterMethod(obj, name, setterFunc, bind)
  // Attaches a setter method to an object. The method must be a named function.
  /* >
  var x = Lapiz.Map();
  Lapiz.Map.meth(x, function foo(val){...});

  //these two calls are equivalent
  x.foo("bar");
  x.foo = "bar";
  */
  // If an object is supplied for bind, the "this" value will always be the bind
  // object, this can be useful if the method will be passed as a value.
  Map.meth(Map, function setterMethod(obj, name, fn, bind){
    if (name === undefined && $L.typeCheck.func(obj)){
      Lapiz.Err['throw']("SetterMethod called without object: "+obj.name);
    }
    if ($L.typeCheck.func(fn) && $L.typeCheck.string(name)){
      $L.assert(name !=="", "SetterMethod name cannot be empty string");
    } else if ($L.typeCheck.func(name) && name.name !== ""){
      bind = fn;
      fn = name;
      name = fn.name;
    } else {
      Lapiz.Err['throw']("SetterMethod requires either name and func or named function");
    }
    if (bind !== undefined){
      fn = fn.bind(bind);
    }
    Map.prop(obj, name, {
      "get": function(){ return fn; },
      "set": fn
    });
  });

  // > Lapiz.Map.has(obj, field)
  // Wrapper around Object.hasOwnProperty, useful for maps.
  Map.meth(Map, function has(obj, field){
    return Object.hasOwnProperty.call(obj, field);
  });

  // > Lapiz.Map.getter(object, namedGetterFunc() )
  // > Lapiz.Map.getter(object, name, getterFunc() )
  // > Lapiz.Map.getter(object, [namedGetterFuncs...] )
  // > Lapiz.Map.getter(object, {name: getterFunc...} )
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
  Map.meth(Map, function getter(obj, name, fn){
    if (name === undefined && $L.typeCheck.func(obj)){
      Lapiz.Err['throw']("Getter called without object: "+obj.name);
    }
    if ($L.typeCheck.func(fn) && $L.typeCheck.string(name)){
      $L.assert(name !=="", "Getter name cannot be empty string");
    } else if ($L.typeCheck.func(name) && name.name !== ""){
      fn = name;
      name = fn.name;
    } else if ($L.typeCheck.array(name)){
      $L.each(name, function(getterFn){
        Map.getter(obj, getterFn);
      });
      return;
    } else if ($L.typeCheck.obj(name)){
      $L.each(name, function(getterFn, name){
        Map.getter(obj, name, getterFn);
      });
      return;
    } else {
      Lapiz.Err['throw']("Getter requires either name and func or named function");
    }
    Map.prop(obj, name, {"get": fn} );
  });

  // > Lapiz.Map.setterGetter(obj, name, val, setterFunc, getterFunc)
  // > Lapiz.Map.setterGetter(obj, name, val, setterFunc)
  // Creates a setter/getter property via a closure. A setter function is
  // required, if no getter is provided, the value will be returned. This is the
  // reason the method is named setterGetter rather than the more traditional
  // arrangement of "getterSetter" because the arguments are arranged so that
  // the first 4 are required and the last is optional.
  /* >
  var x = Lapiz.Map();
  Lapiz.Map.setterGetter(x, "foo", 12, function(i){return parseInt(i);});
  console.log(x.foo); // will log 12 as an int
  */
  // The value 'this' is always set to a special setterInterface for the setter
  // method. This can be used to cancel the set operation;
  /* >
  var x = Lapiz.Map();
  Lapiz.Map.setterGetter(x, "foo", 0, function(i){
    i = parseInt(i);
    this.set = !isNaN(i);
    return i;
  });

  x.foo = "12";
  console.log(x.foo); // will log 12 as an int
  x.foo = "hello";
  console.log(x.foo); // value will still be 12

  */
  Map.meth(Map, function setterGetter(obj, name, val, setter, getter){
    if ($L.typeCheck.string(setter)){
      setter = $L.parse(setter);
    }
    $L.typeCheck.func(setter, "Expected function or string reference to parser for setterGetter (argument 4)");
    var desc = {};
    if (getter === undefined){
      desc.get = function(){ return val; };
    } else {
      $L.typeCheck.func(getter, "Getter must be undefined or a function");
      desc.get = function() {
        return getter(val, obj);
      };
    }
    desc.set = function(newVal){
      var setterInterface = {"set": true};
      newVal = setter.apply(setterInterface, [newVal, val, obj]);
      if (setterInterface.set){
        val = newVal;
      }
    };
    Map.prop(obj, name, desc);
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
            };
          })(prop),
          "set": (function(prop){
            return function(val){
              copyFrom[prop] = val;
            };
          })(prop)
        });
      } else {
        copyTo[prop] = copyFrom[prop];
      }
    }
  });

  // > Lapiz.Map.getterFactory(attr, property)
  // > Lapiz.Map.getterFactory(attr, func)
  // Used in generating properties on an object or namespace.
  Map.meth(Map, function getterFactory(attr, funcOrProp){
    if ($L.typeCheck.func(funcOrProp)) { return funcOrProp; }
    if ($L.typeCheck.string(funcOrProp)) { return function(){ return attr[funcOrProp]; }; }
    Lapiz.Err.throw("Getter value for property must be either a function or string");
  });

  // > Lapiz.Map.setterFactory(self, attr, field, func)
  // > Lapiz.Map.setterFactory(self, attr, field, func, callback)
  // Used in generating setters for objects or namespaces. It will create the
  // setterInterface which provides special controls to setters and call the
  // setter with the interface as "this". If setterInterface.set is true,
  // the returned value will be set in attr[field]. If callback is defined,
  // self will be passed into callback
  Map.meth(Map, function setterFactory(self, attr, field, func, callback){
    if ($L.typeCheck.string(func)){
      func = $L.parse(func);
    }
    return function(){
      //todo: add test for fireChange and event
      // > lapizObject.properties:setterInterface
      // The 'this' property of a setter will be the setter interface
      var setterInterface = {
        // > lapizObject.properties:setterInterface.set
        // Setting this to false will prevent the set and event fire
        set: true,
        // > lapizObject.properties:fire
        // setting this to false will prevent the fire event, but the value
        // will still be set to the return value
        fire: true,
        // > lapizObject.properties:setterInterface.event(obj.pub, val, oldVal)
        // Attaching an event here will cause this event to be fired after the
        // set operation
        callback: undefined,
      };
      var val = func.apply(setterInterface, arguments);
      if (setterInterface.set) {
        var oldVal = attr[field];
        attr[field] = val;
        if (setterInterface.fire && $L.typeCheck.func(callback)) {callback(self, field);}
        if ($L.typeCheck.func(setterInterface.callback)) {setterInterface.callback(self, field, val, oldVal);}
      }
    };
  });

  var _setReadOnly = function(){ $L.Err.throw("Cannot set readonly property"); };

  // > Lapiz.Map.setProperties(obj, attr, properties, values)
  // > Lapiz.Map.setProperties(obj, attr, properties)
  // Defines properties on an object and puts the underlying value in the
  // attributes collection.
  Map.meth(Map, function setProperties(obj, attr, properties, values){
    if (obj === undefined){
      $L.Err.throw("Got undefined for obj in setProperties");
    }
    var property, val, i, desc, getterProp, setterFn;
    var keys = Object.keys(properties);
    for(i=keys.length-1; i>=0; i-=1){
      property = keys[i];
      val = properties[property];
      desc = {};

      // If the property name begins with *, it is a getter, the setter will not
      // be defined on obj.
      getterProp = false;
      if (property[0] === "*"){
        property = property.slice(1);
        getterProp = true;
      }

      if (val === undefined || val === null){
        $L.Err.throw("Invalid value for '" + property + "'");
      } else if ($L.typeCheck.func(val) || $L.typeCheck.string(val)){
        desc.set = Map.setterFactory(obj, attr, property, val);
        desc.get = Map.getterFactory(attr, property);
      } else if (val.set !== undefined || val.get !== undefined) {
        if (val.set !== undefined){
          desc.set = Map.setterFactory(obj, attr, property, val.set);
        }
        desc.get = (val.get !== undefined) ? Map.getterFactory(obj, val.get) : Map.getterFactory(obj, property);
      } else {
        $L.Err.throw("Could not construct getter/setter for " + property);
      }

      // If this is a getter, we grab the setter before removing it. This allows
      // the setProperties method to be used in a set-once manor.
      setterFn = desc.set;
      if (getterProp) {
        desc.set = _setReadOnly;
      }

      Object.defineProperty(obj, property, desc);
      if (Object.hasOwnProperty.call(values, property) ){
        setterFn(values[property]);
      }
    }
  });

  // > Lapiz.Map.binder(proto, fn)
  // Handles late binding for prototype methods
  /* >
  var fooProto = {};
  binder(fooProto, function sayHi(){
    console.log("Hi, "+name);
  });
  var x = {};
  x.__proto__ = fooProto;
  var sh = x.sayHi;
  x.name = "Adam";
  sh(); // Hi, Adam
  */
  // This approach balances two concerns. Without binding, we need to eliminate
  // the use of 'this' with closures, which can add boilerplate code. But
  // without leveraging prototypes, we can create a lot of uncessary functions.
  // With late binding, 'this' will always refer to the original 'this' context,
  // but bound functions will only be generated when they are called or assigned
  Map.meth(Map, function binder(proto, fn){
    Object.defineProperty(proto, fn.name, {
      get: function(){
        var bfn = fn.bind(this)
        $L.Map.meth(this, bfn)
        return bfn;
      },
      set: function(){ $L.Err.throw("Cannot reassign method "+fn.name); },
    });
  });

  // This section builds up the namespace prototype
  var _nsProto = Map();

  // > namespace.properties(props, vals)
  Map.binder(_nsProto, function properties(props, vals){
    Map.setProperties(this.namespace, this.attr, props, vals);
  });

  // > namespace.meth(namedFn)
  // > namespace.meth(name, fn)
  Map.binder(_nsProto, function meth(name, fn){
    if (fn === undefined){
      $L.Map.meth(this.namespace, name, this);
    } else {  
      $L.Map.meth(this.namespace, name, fn, this);
    }
  });

  // > namespace.set(name, val)
  Map.binder(_nsProto, function set(name, val){
    Object.defineProperty(this.namespace, name, {'value': val});
  });

  // > namespace.setterMethod(namedFn)
  // > namespace.setterMethod(name, fn)
  Map.binder(_nsProto, function setterMethod(name, fn){
    if (fn === undefined){
      $L.Map.setterMethod(this.namespace, name, this);
    } else {  
      $L.Map.setterMethod(this.namespace, name, fn, this);
    }
  });

  // > Lapiz.Namespace()
  // > Lapiz.Namespace(constructor)
  // Returns a namespace. If a constructor is given, the inner namespace is
  // returned, otherwise the namespace wrapper is returned.
  $L.set($L, function Namespace(fn){
    var self = Object.create(_nsProto);
    self.__proto__ = _nsProto;

    // > namespace.namespace
    // The inner namespace is where all methods and properties are attached, the
    // outer wrapper holds the tools for attaching these.
    $L.set(self, 'namespace', $L.Map());

    // > namespace.attr
    // This is where the attributes for properties are stored.
    $L.set(self, 'attr', $L.Map());

    if ($L.typeCheck.func(fn)){
      fn.call(self);
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

  // > Lapiz.each(collection, fn(val, key, collection))
  // Iterates over the collection, calling func(key, val) for each item in the
  // collection. If the collection is an array, key will be the index. If func
  // returns true (or an equivalent value) the Lapiz.each will return the
  // current key allowing each to act as a search.
  /* >
  var arr = [3,1,4,1,5,9];
  Lapiz.each(arr, function(val, key){
    console.log(key, val);
  });
  var gt4 = Lapiz.each(arr, function(val, key){return val > 4;});

  var kv = {
    "A":"apple",
    "B":"banana",
    "C":"cantaloupe"
  };
  Lapiz.each(kv, function(val, key){
    console.log(key, val);
  });
  */
  Map.meth($L, function each(obj, fn){
    var i;
    if ($L.typeCheck.array(obj)){
      var l = obj.length;
      for(i=0; i<l; i+=1){
        if (fn(obj[i], i)) {return i;}
      }
      return -1;
    } else {
      var keys = Object.keys(obj);
      for(i=keys.length-1; i>=0; i-=1){
        if (fn(obj[keys[i]], keys[i], obj)) {return keys[i];}
      }
    }
    return undefined; //makes linter happy
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
    accessor.each(function(obj, key){
      arr.push(obj);
      index.push(key);
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
    if (d === undefined) { Lapiz.Err.throw("Cannot find Dependency " + name); }
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

    if (val !== undefined) {
      if ($L.typeCheck.func(val.each)){
        val.each(function(val, key){
          _dict[key] = val;
          _length += 1;
        });
      } else {
        $L.each(val, function(val, key){
          _dict[key] = val;
          _length += 1;
        });
      }
    }

    // > dict(key)
    // > dict(key, val)
    // If only key is given, the value currently associated with that key will
    // be returned. If key and val are both given, val is associated with key
    // and the proper event (change or insert) will fire. For chaining, the
    // val is returned when dict is called as a setter.
    var self = function(key, val){
      if (val === undefined){
        try {
          return _dict[key];
        } catch (err){
          Lapiz.Err.throw(err);
        }
      }

      var oldVal = _dict[key];
      _dict[key] = val;
      if ( oldVal === undefined){
        _length += 1;
        _insertEvent.fire(key, self.Accessor);
      } else {
        _changeEvent.fire(key, self.Accessor, oldVal);
      }

      return val;
    };

    // > dict._cls
    $L.set(self, "_cls", $L.Dictionary);

    // > dict.on
    // Namespace for dictionary events
    self.on = $L.Map();

    // > dict.on.insert(fn(key, accessor))
    // Event will fire when a new key is added to the dictionary
    var _insertEvent = $L.Event.linkProperty(self.on, "insert");

    // > dict.on.remove(fn(key, accessor, oldVal))
    // Event will fire when a key is removed.
    var _removeEvent = $L.Event.linkProperty(self.on, "remove");

    // > dict.on.change(fn(key, accessor, oldVal))
    // Event will fire when a new key has a new value associated with it.
    //
    // One poentential "gotcha":
    /* >
      var d = Dict();
      d.on.change = function(key, acc){
        console.log(key, acc(key));
      };
      //assume person is a Lapiz Class
      d(5, Person(5, "Adam", "admin")); // does not fire change, as it's an insert
      d(5).role = "editor"; // this will fire person.on.change, but not dict.on.change
      d(5, Person(5, "Bob", "editor")); // this will fire dict.on.change
    */
    // To create a change listener for a class on a dict (or other accessor)
    /*
      function chgFn(key, acc){...}
      d.on.insert(function(key, acc){
        acc(key).on.change(chgFn);
      });
      d.on.remove(function(key, acc){
        acc(key).on.change(chgFn);
      });
      d.on.change(function(key, acc, old){
        old.on.change.deregister(chgFn);
        var val = acc(key);
        val.on.change(chgFn);
        chgFn(key, acc);
      });
    */
    var _changeEvent = $L.Event.linkProperty(self.on, "change", _changeEvent);

    Object.freeze(self.on);

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
        _removeEvent.fire(key, self.Accessor, obj);
      }
    };

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
        if (fn(_dict[key], key)) { return key; }
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
    // * accessor.each(fn(val, key))
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
Lapiz.Module("Errors", ["Events", "Collections"], function($L){

  // > Lapiz.Err
  // Namespace for error handling.
  $L.set($L, "Err", $L.Map());

  // > Lapiz.on.error( errHandler(err) )
  // > Lapiz.on.error = errHandler(err)
  // Register an error handler to listen for errors thrown with Lapiz.Err.throw
  var _errEvent = $L.Event.linkProperty($L.on, "error");

  // > Lapiz.Err.throw(Error)
  // > Lapiz.Err.throw(errString)
  // Sends the event to any errHandlers, then throws the event. Note that the
  // error handlers cannot catch the error.
  $L.set($L.Err, "throw", function(err){
    if ($L.typeCheck.string(err)){
      err = new Error(err);
    }
    _errEvent.fire(err);
    throw err;
  });

  function logError(err){
    $L.Err.logTo.log(err.message);
    $L.Err.logTo.log(err.stack);
  }

  var _loggingEnabled = false;
  var _nullLogger = $L.Map();
  $L.Map.meth(_nullLogger, function log(){});
  Object.freeze(_nullLogger);

  // > Lapiz.Err.logTo = logger
  // The logger passed in must have logger.log method. It is meant to work with
  // the console object:
  // > Lapiz.Err.logTo = console
  // But a custom logger can also be used.
  $L.Map.setterGetter($L.Err, "logTo", _nullLogger, function(newVal, oldVal){
    if (newVal === null || newVal === undefined){
      newVal = _nullLogger;
      if (_loggingEnabled) {
        _loggingEnabled = false;
        $L.on.error.deregister(logError);
      }
    } else {
      $L.typeCheck.func(newVal.log, "Object passed to Lapiz.Err.logTo must have .log method");
      if (!_loggingEnabled) {
        _loggingEnabled = true;
        $L.on.error(logError);
      }
    }
    return newVal;
  });
});Lapiz.Module("Events", ["Collections"], function($L){

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
      $L.typeCheck.func(fn, "Event registration requires a function");
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
      // make a copy in case _listeners changes during fire event
      var listeners = _listeners.slice(0);
      var l = listeners.length;
      for(i=0; i<l; i+=1){
        listeners[i].apply(this, arguments);
      }
      return event;
    });

    // > event.fire.enabled
    // > event.fire.enabled = x
    // The event.enabled is a boolean that can be set to enable or disable the
    // fire method. If event.fire.enable is false, even if event.fire is called,
    // it will not call the registered functions.
    $L.Map.setterGetter(event.fire, "enabled", true, function(enable){ return !!enable; });

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
      if (_hasFired || !_event.fire.enabled) { return; }
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
    if (evt === undefined){
      evt = $L.Event();
    }
    Object.defineProperty(obj, name, {
      get: function(){ return evt.register; },
      set: function(fn){ evt.register(fn); }
    });
    return evt;
  });

  $L.set($L, "on", $L.Map());
});
Lapiz.Module("Filter", function($L){

  // > Lapiz.Filter(accessor, filterFunc(key, accessor) )
  // > Lapiz.Filter(accessor, field, val)
  // Filters an accessor based on a function of field.
  //
  // One edge case is that an accessor cannot filter by field
  // for undefined. To do that, you have to create a function
  // to check the field.
  $L.set($L, "Filter", function(accessor, filterOrField, val){
    var _index = [];

    // > filter(key)
    // Returns the value associated with key, if it exists in the filter
    var self = function(key){
      if (_index.indexOf(key) > -1) { return accessor(key); }
    };

    // > filter._cls
    // Return Lapiz.Filter
    $L.set(self, "_cls", $L.Filter);

    // if filterOrField is a string, and val is set, create a function
    // to check that field against the val
    var filterFn = filterOrField;
    if ($L.typeCheck.string(filterOrField) && val !== undefined){
      filterFn = function(key, accessor){
        return accessor(key)[filterOrField] === val;
      };
    }

    $L.typeCheck.func(filterFn, "Filter must be invoked with function or attriubte and value");

    accessor.each(function(val, key){
      if (filterFn(key, accessor)) { _index.push(key); }
    });

    // > filter.Accessor
    // Returns a reference to self
    $L.set(self, "Accessor", self);

    // > filter.Sort(sorterFunction)
    // > filter.Sort(fieldName)
    // Returns a Sorter
    $L.Map.meth(self, function Sort(funcOrField){ return $L.Sort(self, funcOrField); });

    // > filter.Filter(filterFunction)
    // > filter.Filter(field, val)
    // Returns a filter.
    $L.Map.meth(self, function Filter(filterOrField, val){ return $L.Filter(self, filterOrField, val); });

    // > filter.has(key)
    // Returns a bool indicating if the filter contains the key
    $L.Map.meth(self, function has(key){
      return _index.indexOf(key.toString()) > -1;
    });

    // > filter.keys
    // Returns an array of keys
    $L.Map.getter(self, function keys(){
      return _index.slice(0);
    });

    // > filter.length
    // Read-only property that returns the length
    $L.Map.getter(self, function length(){
      return _index.length;
    });

    $L.Map.meth(self, function each(fn){
      var i;
      var l = _index.length;
      for(i=0; i<l; i+=1){
        key = _index[i];
        if (fn(accessor(key), key)) { return key; }
      }
    });

    // > filter.on
    // Namespace for filter events
    $L.set(self, "on", $L.Map());

    // > filter.on.insert( function(key, accessor) )
    // > filter.on.insert = function(key, accessor)
    // Registration for insert event which fires when a new value is added to
    // the filter
    var _insertEvent = $L.Event.linkProperty(self.on, "insert");

    // > filter.on.change( function(key, accessor) )
    // > filter.on.change = function(key, accessor)
    // Registration of change event which fires when a new value is assigned to
    // an existing key
    var _changeEvent = $L.Event.linkProperty(self.on, "change");

    // > filter.on.remove( function(key, val, accessor) )
    // > filter.on.remove = function(key, val, accessor)
    // Registration for remove event which fires when a value is removed
    var _removeEvent = $L.Event.linkProperty(self.on, "remove");
    Object.freeze(self.on);

    function inFn(key, accessor){
      key = key.toString();
      if (filterFn(key, accessor)){
        _index.push(key);
        _insertEvent.fire(key, self);
      }
    }
    function remFn(key, accessor, oldVal){
      key = key.toString();
      var i = _index.indexOf(key);
      if (i > -1){
        _index.splice(i, 1);
        _removeEvent.fire(key, self, oldVal);
      }
    }
    function changeFn(key, accessor, oldVal){
      key = key.toString();
      var i = _index.indexOf(key);
      var f = filterFn(key, accessor);
      if (i > -1){
        if (f) {
          // was in the list, still in the list, but changed
          _changeEvent.fire(key, self, oldVal);
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
    }

    accessor.on.insert(inFn);
    accessor.on.remove(remFn);
    accessor.on.change(changeFn);

    // > filter.ForceRescan()
    // Rescans all values from parent access and fires insert and remove events
    $L.Map.meth(self, function ForceRescan(){
      accessor.each(function(val, key){
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
    });

    // > filter.func(filterFunc(key, accessor))
    // > filter.func = filterFunc(key, accessor)
    // Changes the function used for the filter. The insert and remove events
    // will fire as the members are scanned to check if they comply with the
    // new members
    $L.Map.setterMethod(self, function func(fn){
      if ($L.typeCheck.nested(filterFn, "on", "change", "deregister", "func")){
        filterFn.on.change.deregister(self.ForceRescan);
      }
      filterFn = fn;
      if ($L.typeCheck.nested(filterFn, "on", "change", "func")){
        filterFn.on.change(self.ForceRescan);
      }
      self.ForceRescan();
    });

    // > filter.func.on.change
    // If the function supplied for filter function has a change event,
    // then when that event fires, it will force a rescan.
    if ($L.typeCheck.nested(filterFn, "on", "change", "func")){
      filterFn.on.change(self.ForceRescan);
    }

    // > filter.kill()
    // After calling kill, a Filter is no longer live. It will not receive
    // updates and can more easily be garbage collected (because it's
    // parent accessor no longer has any references to it).
    $L.Map.meth(self, function kill(){
      accessor.on.insert.deregister(inFn);
      accessor.on.remove.deregister(remFn);
      accessor.on.change.deregister(changeFn);
      if ($L.typeCheck.nested(filterFn, "on", "change", "deregister", "func")){
        filterFn.on.change.deregister(self.ForceRescan);
      }
    });

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
    } else if ($L.typeCheck.string(primaryFunc)){
      primaryFunc = function(field){
        return function(obj){
          return obj[field];
        };
      }(primaryFunc);
    } else if ( !(primaryFunc instanceof  Function) ){
      Lapiz.Err.throw("Expected a function or string");
    }

    if (domain === undefined) {
      domain = cls;
    } else {
      cls[domain] = {};
      domain = cls[domain];
    }

    var _primary = $L.Dictionary();

    // > indexedClass.each( function(val, key))
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
        if ($L.typeCheck.nested(obj, "on", "change", "deregister", "func")){
          obj.on.change.deregister(_upsert);
        }
        _primary.remove(primaryFunc(obj));
      });
      _upsert(obj);
    });

    // > indexedClass.get(primaryKey)
    // > indexedClass.get(field, val)
    domain.get = function(idFuncOrAttr, val){
      var matches = {};
      if (val !== undefined){
        _primary.each(function(obj, key){
          if (obj[idFuncOrAttr] === val) { matches[key] = obj; }
        });
        return matches;
      } else if (idFuncOrAttr instanceof Function){
        _primary.each(function(obj, key){
          if (idFuncOrAttr(obj)) { matches[key] = obj; }
        });
        return matches;
      }
      return _primary(idFuncOrAttr);
    };

    return cls;
  });

  // > Lapiz.Index.Class(constructor, primaryFunc, domain)
  // Shorthand helper, constructor for an indexed class.
  $L.Map.meth($L.Index, function Class(constructor, primaryFunc, domain){
    return Lapiz.Index(Lapiz.Class(constructor), primaryFunc, domain);
  });
});
// The private fields on Lapiz Objects are intentionally attributes not
// properties so that they can be rearranged if necessary.
Lapiz.Module("Objects", ["Events"], function($L){

  // > $L.tis(obj, fn)
  // Same thing as bind, should be refactored out. Also, moving towards adding
  // bind options to the Map methods.
  $L.Map.meth($L, function tis(self, fn){
    $L.typeCheck.func(fn, "Lapiz.tis requires function as second argument");
    var wrapped = function(){
      return fn.apply(self, arguments);
    };
    $L.set(wrapped, "name", fn.name);
    return wrapped;
  });

  function _getter(self, funcOrProp){
    if ($L.typeCheck.func(funcOrProp)) { return funcOrProp; }
    if ($L.typeCheck.string(funcOrProp)) { return function(){ return self.attr[funcOrProp]; }; }
  }

  function _setter(self, field, func){
    if ($L.typeCheck.string(func)){
      func = $L.parse(func);
    }
    return function(){
      //todo: add test for fireChange and event
      // > lapizObject.properties:setterInterface
      // The 'this' property of a setter will be the setter interface
      var setterInterface = {
        // > lapizObject.properties:setterInterface.set
        // Setting this to false will prevent the set and event fire
        set: true,
        // > lapizObject.properties:fireChange
        // setting this to false will prevent the fire event, but the value
        // will still be set to the return value
        fireChange: true,
        // > lapizObject.properties:setterInterface.event(obj.pub, val, oldVal)
        // Attaching an event here will cause this event to be fired after the
        // set operation
        event: undefined,
      };
      var val = func.apply(setterInterface, arguments);
      if (setterInterface.set) {
        var oldVal = self.attr[field];
        self.attr[field] = val;
        if (setterInterface.fireChange) {self.fire.change(self.pub);}
        if ($L.typeCheck.func(setterInterface.event)) {setterInterface.event(self.pub, val, oldVal);}
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
    console.log(obj.pub.name); // bar
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
          Lapiz.Err.throw("Invalid value for '" + property + "'");
        } else if ($L.typeCheck.func(val)|| $L.typeCheck.string(val)){
          desc.set = _setter(self, property, val);
          desc.get = _getter(self, property);
        } else if (val.set !== undefined || val.get !== undefined) {
          if (val.set !== undefined){
            desc.set = _setter(self, property, val.set);
          }
          desc.get = (val.get !== undefined) ? _getter(self, val.get) : _getter(self, property);
        } else {
          Lapiz.Err.throw("Could not construct getter/setter for " + val);
        }

        Object.defineProperty(self.pub, property, desc);
      }
      if (values !== undefined){
        self.setMany(values);
      }
    };

    // > lapizObject.getter(getterFn)
    // > lapizObject.getter(name, getterFn)
    // > lapizObject.getter([getterFn, ..., getterFn])
    // > lapizObject.getter([{name: getterFn}, ..., {name: getterFn}])
    // Creates a getter property in the public namespace.
    self.getter = function(name, getterFn){
      if ($L.typeCheck.func(name)){
        getterFn = name;
        name = name.name;
      } else if (getterFn === undefined){
        if ($L.typeCheck.string(name)){
          getterFn = function(){ return self.attr[name]; };
        } else if ($L.typeCheck.array(name)){
          return $L.each(name, function(getter){
            self.getter(getter);
          });
        } else if ($L.typeCheck.obj(name)) {
          return $L.each(name, function(getter, name){
            self.getter(name, getter);
          });
        } 
      }
      $L.typeCheck.string(name, "Bad call to Lapiz.Object.getter: could not resolve string for name");
      $L.typeCheck.func(getterFn, "Bad call to Lapiz.Object.getter: could not resolve function for getter");
      $L.Map.getter(self.pub, name, getterFn);
    };

    // > lapizObject.getterAttr(name, parserFn, val)
    // > lapizObject.getterAttr(name, parserStr, val)
    // Creates a read only attribute and sets it value to val after using the 
    // parser
    self.getterAttr = function(name, parser, val){
      $L.typeCheck.string(name, "getterAttr requires name arg as a string");
      self.attr[name] = $L.parse(parser, val);
      $L.Map.getter(self.pub, name, function(){
        return self.attr[name];
      });
    }

    // > lapizObject.meth(fn)
    // Creates a method in the public namespace.
    self.meth = function(name, fn){
      $L.Map.meth(self.pub, name, fn);
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
        if (obj === undefined) {Lapiz.Err.throw("Constructor did not return an object");}
        newInstanceEvent.fire(obj);
        return obj;
      };
    } else {
      ret = function(){
        var self = Lapiz.Object();
        self = fn.apply(self, arguments) || self.pub;
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

    // > lapizClass.StaticSet(name, value)
    $L.Map.meth(ret, function StaticSet(name, value){$L.Map.prop(ret, name, { value: value });});
    // > lapizClass.StaticProp(name, desc)
    $L.Map.meth(ret, function StaticProp(name, desc){$L.Map.prop(ret, name, desc);});
    // > lapizClass.StaticMethod(name, fn)
    // > lapizClass.StaticMethod(namedFunc)
    $L.Map.meth(ret, function StaticMethod(name, fn){$L.Map.meth(ret, name, fn);});
    // > lapizClass.StaticSetterMethod(name, fn)
    // > lapizClass.StaticSetterMethod(namedFunc)
    $L.Map.meth(ret, function StaticSetterMethod(name, fn){$L.Map.setterMethod(ret, name, fn);});
    // > lapizClass.StaticGetter(name, fn)
    // > lapizClass.StaticGetter(nameeFunc)
    $L.Map.meth(ret, function StaticGetter(name, fn){$L.Map.getter(ret, name, fn);});
    // > lapizClass.StaticSetterGetter(name, val, setter)
    // > lapizClass.StaticSetterGetter(name, val, setter, getter)
    $L.Map.meth(ret, function StaticSetterGetter(name, val, setter, getter){$L.Map.setterGetter(ret, name, val, setter, getter);});

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

  // > Lapiz.parse()
  // Namespace for parser methods and a function to concisely invoke them
  // > Lapiz.parse("int") === Lapiz.parse.int
  // Which can be useful to take 
  // > Lapiz.parse("array|int")
  // or
  // > Lapiz.parse("array|int")
  $L.Map.meth($L, function parse(){
    var parser;
    var args = Array.prototype.slice.call(arguments, 0);
    $L.assert(args.length > 0, "Lapiz.parse requires at least one arg");
    var parseStrs = args.shift();
    if (Lapiz.typeCheck.func(parseStrs)){
      parser = parseStrs;
    } else if ($L.typeCheck.string(parseStrs)){
      // something like "int" or "array|int"
      // so we work backwards
      parseStrs = parseStrs.split("|");
      var parserName = parseStrs.pop();
      $L.typeCheck.func(Lapiz.parse[parserName], "Lapiz.parse."+parserName+" is not a parser");
      parser = Lapiz.parse[parserName];
      while(parseStrs.length > 0){
        parserName = parseStrs.pop();
        $L.typeCheck.func(Lapiz.parse[parserName], "Lapiz.parse."+parserName+" is not a parser");
        parser = Lapiz.parse[parserName].call(this, parser);
      }
    } else {
      Lapiz.Err.throw("Lapiz.parse requires first arg as either string or function");
    }

    if (args.length>0){
      return parser.apply(this, args);
    }
    return parser;
  });

  // > Lapiz.parse.int(val)
  // Always parses in base 10. This is mostly a wrapper
  // around parseInt, however if val is a boolean it will reurn eitehr 1
  // or 0.
  $L.set($L.parse, "int", function(val){
    //can't use $L.Map.meth because "int" is reserve word
    if (val === true){
      return 1;
    } else if (val === false){
      return 0;
    }
    return parseInt(val, 10);
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
    if (type === "number") {
      if (isNaN(val)){
        return "";
      }
      return ""+val;
    }
    var strFromMethod;
    if ($L.typeCheck.nested(val, "str", "func")) {
      strFromMethod = val.str();
    } else if ($L.typeCheck.nested(val, "toString", "func")) {
      strFromMethod = val.toString();
    }
    if (typeof strFromMethod === "string"){
      return strFromMethod;
    }
    return "" + val;
  });

  // > Lapiz.parse.bool(val)
  // Converts val to a bool. Takes into account a few special edge cases, "O"
  // and "false" (any case) are cast to false.
  $L.Map.meth($L.parse, function bool(val){
    if ($L.typeCheck.string(val) && (val === "0" || val.toLowerCase() === "false")){
      return false;
    }
    return !!val;
  });

  // > Lapiz.parse.strictBool(val)
  // Converts val to a bool
  $L.Map.meth($L.parse, function strictBool(val){
    return !!val;
  });

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

  // > Lapiz.Sort(accessor, sorterFunc(keyA, keyB, accessor))
  // > Lapiz.Sort(accessor, fieldName)
  // > Lapiz.Sort(accessor)
  // Lapiz.Sort is an accessor that when sort.each or sort.keys is called, they
  // will be in the sorted order. If a sorterFunction is provided, that will be
  // used to sort the accessor, if a fieldName is provided, the values on that
  // field will be used. If nothing is given, the accessor will be sorted by
  // key.
  $L.set($L, "Sort", function(accessor, funcOrField){
    // sort(key)
    // Returns the value associated with the key 
    var self = function(key){ return accessor(key); };

    // sort._cls
    $L.set(self, "_cls", $L.Sort);

    var _index = accessor.keys;
    var _sortFn;

    function setSortFn(funcOrField){
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
      } else if ($L.typeCheck.func(funcOrField)){
        // > sortFunction(keyA, keyB, accessor)
        // When the sort function is called it will be given two keys and an
        // accessor. If the value associated with keyA should come after the value
        // associated with keyB, return a value greater than 0. If the values are
        // equal return 0 and if keyB should come after keyA, return a value less
        // than 0.
        _sortFn = function(a, b){
          return funcOrField(a, b, accessor);
        };
        // > sortFunction.range(keyA, valB, accessor)
        // In order to be able to select a range, there must be a way to compare
        // an object in the accessor to a value. To provide this to the sorter,
        // it must be attached to the sortfunction as .range. If this is provided
        // to the sorter, the .range method will be available on the sorter.
        if ($L.typeCheck.func(funcOrField.range)){
          _sortFn.range = function(a,b){
            return funcOrField.range(a, b, accessor);
          };
        }
      } else if($L.typeCheck.string(funcOrField)){
        _sortFn = function(a, b){
          a = accessor(a)[funcOrField];
          b = accessor(b)[funcOrField];
          return (a > b ? 1 : (b > a ? -1 : 0));
        };
        _sortFn.range = function(a,b){
          a = accessor(a)[funcOrField];
          return (a > b ? 1 : (b > a ? -1 : 0));
        };
      } else {
        Lapiz.Err.throw("Sorter function must be omitted, function or field name");
      }
    }
    setSortFn(funcOrField);
    _index.sort(_sortFn);

    // > sort.has(key)

    // > sort.Accessor

    // > sort.Sort(accessor, sorterFunc(keyA, keyB, accessor))
    // > sort.Sort(accessor, fieldName)
    // > sort.Sort(accessor)
    // It is possible to create a sorter on a sorter, but it is not recommended.
    // The sorting operations do not stack so this just passes the events
    // through unnecessary layers of events

    // > sort.Filter(accessor, filterFunc(key, accessor) )
    // > sort.Filter(accessor, field, val)
    // It is possible to create a filter on a sorter, but it is not recommended.
    // The sorting operations do not stack so this just passes the events
    // through unnecessary layers of events. Better to create a filter on the
    // sorters accessor.

    // > sort.length
    $L.Map.copyProps(self, accessor, "has", "Accessor", "Sort", "Filter", "&length");

    // > sort.keys
    // Read-only property. The keys will be in the order that the sorter has
    // arranged them.
    $L.Map.getter(self, function keys(){
      return _index.slice(0);
    });

    // > sort.each( function(val, key, sorter) )
    // Iterates over the collection in order
    self.each = function(fn){
      var i;
      var l = _index.length;
      for(i=0; i<l; i+=1){
        key = _index[i];
        if (fn(accessor(key), key, self)) { return key; }
      }
    };

    // > sort.on
    // Namespace for event registration
    $L.set(self, "on", $L.Map());

    // > sort.on.insert(fn)
    // > sort.on.insert = fn
    var _insertEvent = $L.Event.linkProperty(self.on, "insert");

    // > sort.on.change(fn)
    // > sort.on.change = fn
    var _changeEvent = $L.Event.linkProperty(self.on, "change");

    // > sort.on.remove(fn)
    // > sort.on.remove = fn
    var _removeEvent = $L.Event.linkProperty(self.on, "remove");
    Object.freeze(self.on);

    // > sort.func(sorterFunction)
    // > sort.func = sorterFunction
    // > sort.func(field)
    // > sort.func = field
    // Assign a new function or field to sort by;
    $L.Map.setterMethod(self, function func(funcOrField){
      setSortFn(funcOrField)
      var oldIndex = _index.slice(0);
      _index.sort(_sortFn);
      $L.each(oldIndex, function(key, oldIndex){
        if (_index[oldIndex] !== key){
          _changeEvent.fire(key, self, self(key));
        }
      });
    });

    var inFn = function(key, accessor){
      key = key.toString();
      _index.splice($L.Sort.locationOf(key, _index, _sortFn, accessor), 0, key);
      _insertEvent.fire(key, self);
    };
    var remFn = function(key, accessor, oldVal){
      $L.remove(_index, key.toString());
      _removeEvent.fire(key, self, oldVal);
    };
    var changeFn = function(key, accessor, oldVal){
      key = key.toString();
      _index.splice(_index.indexOf(key),1);
      _index.splice($L.Sort.locationOf(key, _index, _sortFn, accessor), 0, key);
      _changeEvent.fire(key, self, oldVal);
    };

    accessor.on.insert(inFn);
    accessor.on.remove(remFn);
    accessor.on.change(changeFn);

    // > sort.kill()
    // After calling kill, a Sorter is no longer live. It will not receive
    // updates and can more easily be garbage collected (because it's
    // parent accessor no longer has any references to it).
    self["kill"] = function(){
      accessor.on.insert.deregister(inFn);
      accessor.on.remove.deregister(remFn);
      accessor.on.change.deregister(changeFn);
    };

    if (_sortFn.range !== undefined){
      // > sort.Range(val)
      // > sort.Range(start, stop)
      // Returns all values either equal to val (by the sorter compare function)
      // or between start and stop (start inclusive, stop exclusive). The result
      // is returned as a Dictionary, but it is not wired in to update.
      self.Range = function(a, b){
        b = b || a;
        var start = $L.Sort.locationOf(a, _index, _sortFn.range, accessor);
        var end = $L.Sort.gt(b, _index, _sortFn.range, accessor, start);
        var dict = $L.Dictionary();
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

  // > Lapiz.Sort.locationOf(val, index, fn, accessor)
  // > Lapiz.Sort.locationOf(val, index, fn, accessor, start, end)
  // This is used by the sorter to sort it's contents. It is left exposed
  // because a generic bisecting search is useful in many context. It assumes
  // that the accessor is sorted. It returns the position in index of the first
  // key that is greater than or equal to val in the accessor.
  $L.Map.meth($L.Sort, function locationOf(val, index, fn, accessor, start, end) {
    //todo: add test
    start = start || 0;
    end = end || index.length;
    var pivot = Math.floor(start + (end - start) / 2);
    if (end-start === 0){
      return start;
    }
    if (end-start === 1) {
      // 1 := a>b      0 := a<=b
      return (fn(index[pivot], val, accessor) >= 0 ) ? start : end; 
    }
    return (fn(index[pivot], val, accessor) <= 0) ?
      $L.Sort.locationOf(val, index, fn, accessor, pivot, end) :
      $L.Sort.locationOf(val, index, fn, accessor, start, pivot);
  });

  // > Lapiz.Sort.gt(key, index, fn, accessor)
  // > Lapiz.Sort.gt(key, index, fn, accessor, start, end)
  // This is used by the sorter to sort it's contents. It is left exposed
  // because a generic bisecting search is useful in many context. It assumes
  // that the accessor is sorted. It returns the position in index of the first
  // key that is greater than the val in the accessor.
  $L.Map.meth($L.Sort, function gt(key, index, fn, accessor, start, end){
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
  });
});