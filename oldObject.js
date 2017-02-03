// The private fields on Lapiz Objects are intentionally attributes not
// properties so that they can be rearranged if necessary.
Lapiz.Module("OldObjects", ["Events"], function($L){

  // > $L.tis(obj, fn)
  // Same thing as bind, should be refactored out. Also, moving towards adding
  // bind options to the.set.methods.
  $L.set.meth($L, function tis(self, fn){
    $L.typeCheck.func(fn, "Lapiz.tis requires function as second argument");
    var wrapped = function(){
      return fn.apply(self, arguments);
    };
    $L.set(wrapped, "name", fn.name);
    return wrapped;
  });

  function _getter(self, funcOrProp){
    if ($L.typeCheck.func(funcOrProp)) { return funcOrProp; }
    if ($L.typeCheck.str(funcOrProp)) { return function(){ return self.attr[funcOrProp]; }; }
  }

  function _setter(self, field, func){
    if ($L.typeCheck.str(func)){
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
  $L.OldObject = function(constructor){
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
          Lapiz.Err.toss("Invalid value for '" + property + "'");
        } else if ($L.typeCheck.func(val)|| $L.typeCheck.str(val)){
          desc.set = _setter(self, property, val);
          desc.get = _getter(self, property);
        } else if (val.set !== undefined || val.get !== undefined) {
          if (val.set !== undefined){
            desc.set = _setter(self, property, val.set);
          }
          desc.get = (val.get !== undefined) ? _getter(self, val.get) : _getter(self, property);
        } else {
          Lapiz.Err.toss("Could not construct getter/setter for " + val);
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
        if ($L.typeCheck.str(name)){
          getterFn = function(){ return self.attr[name]; };
        } else if ($L.typeCheck.arr(name)){
          return $L.each(name, function(getter){
            self.getter(getter);
          });
        } else if ($L.typeCheck.obj(name)) {
          return $L.each(name, function(getter, name){
            self.getter(name, getter);
          });
        } 
      }
      $L.typeCheck.str(name, "Bad call to Lapiz.Object.getter: could not resolve string for name");
      $L.typeCheck.func(getterFn, "Bad call to Lapiz.Object.getter: could not resolve function for getter");
      $L.set.getter(self.pub, name, getterFn);
    };

    // > lapizObject.getterAttr(name, parserFn, val)
    // > lapizObject.getterAttr(name, parserStr, val)
    // Creates a read only attribute and sets it value to val after using the 
    // parser
    self.getterAttr = function(name, parser, val){
      $L.typeCheck.str(name, "getterAttr requires name arg as a string");
      self.attr[name] = $L.parse(parser, val);
      $L.set.getter(self.pub, name, function(){
        return self.attr[name];
      });
    }

    // > lapizObject.meth(fn)
    // Creates a method in the public namespace.
    self.meth = function(name, fn){
      $L.set.meth(self.pub, name, fn);
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
  $L.set.meth($L, function argDict(){
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
  $L.OldClass = function(fn, customObj){
    customObj = !!customObj;
    var newInstanceEvent = Lapiz.Event();
    var ret;

    if (customObj){
      ret = function(){
        var obj = fn.apply(this, arguments);
        if (obj === undefined) {Lapiz.Err.toss("Constructor did not return an object");}
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
    $L.set.meth(ret, function StaticSet(name, value){$L.set.prop(ret, name, { value: value });});
    // > lapizClass.StaticProp(name, desc)
    $L.set.meth(ret, function StaticProp(name, desc){$L.set.prop(ret, name, desc);});
    // > lapizClass.StaticMethod(name, fn)
    // > lapizClass.StaticMethod(namedFunc)
    $L.set.meth(ret, function StaticMethod(name, fn){$L.set.meth(ret, name, fn);});
    // > lapizClass.StaticSetterMethod(name, fn)
    // > lapizClass.StaticSetterMethod(namedFunc)
    $L.set.meth(ret, function StaticSetterMethod(name, fn){$L.set.setterMethod(ret, name, fn);});
    // > lapizClass.StaticGetter(name, fn)
    // > lapizClass.StaticGetter(nameeFunc)
    $L.set.meth(ret, function StaticGetter(name, fn){$L.set.getter(ret, name, fn);});
    // > lapizClass.StaticSetterGetter(name, val, setter)
    // > lapizClass.StaticSetterGetter(name, val, setter, getter)
    $L.set.meth(ret, function StaticSetterGetter(name, val, setter, getter){$L.set.setterGetter(ret, name, val, setter, getter);});

    _newClassEvent.fire(ret);
    return ret;
  };
});
