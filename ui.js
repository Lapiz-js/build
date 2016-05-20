Lapiz.Module("UI", ["Collections", "Events", "Template"], function($L){
  
  var ui = $L.Namespace();
  // > Lapiz.UI
  // Namespace for the UI methods.
  $L.set($L, "UI", ui.namespace);

  var _nodeProp = new WeakMap();
  function _getProperties(node){
    var _props = _nodeProp.get(node);
    if (_props === undefined){
      _props = Lapiz.Map();
      _nodeProp.set(node, _props);
    }
    return _props;
  }

  var _views = $L.Map();

  // _viewAttribute is the attribute that will be used to identify views
  // it is treated as a constant and is only here for DRY
  var _viewAttribute = 'l-view';
  // > l-view
  // Used to create a lapiz view:
  // > <htmlNode l-view="viewName">...</htmlNode>
  // All nodes in the document with this attribute will be cloned and saved and
  // the original will be removed from the document.

  // _loadViews is automatically invoked. It removes any node with the l-view
  // attribute and saves it as a view
  function _loadViews(){
    $L.each(document.querySelectorAll('['+_viewAttribute+']'), function(node){
      _views[node.attributes[_viewAttribute].value] = node;
      node.removeAttribute(_viewAttribute);
      node.remove();
    });
  }

  // > Lapiz.UI.CloneView(name)
  // Returns an html Node that is a clone of the View.
  ui.meth(function CloneView(name){
    if (_views[name] === undefined){
      throw new Error("View "+name+" is not defined");
    }
    return _views[name].cloneNode(true);
  });

  // > Lapiz.UI.View(name, viewStr)
  // Adds a view that can be rendered or cloned.
  ui.meth(function View(name, viewStr){
    //TODO: this could use some work
    var div = document.createElement("div");
    div.innerHTML = viewStr;
    var node = div.childNodes[0];
    _views[name] = node;
    node.remove();
  });

  var _attributes = $L.Map();
  var _attributeOrder = [];
  // > Lapiz.UI.attribute(name, fn)
  // > Lapiz.UI.attribute(name, fn, before)
  // > Lapiz.UI.attribute(attributes)
  ui.meth(function attribute(name, fn, before){
    if (fn === undefined){
      //define plural
      $L.each(name, function(fn, name){
        Lapiz.UI.attribute(name, fn);
      });
      return;
    }
    $L.typeCheck.string(name, "Attribute name must be a string");
    $L.typeCheck.func(fn, "Second arg to attribute must be a function");
    name = name.toLocaleLowerCase();
    _attributes[name.toLowerCase()] = fn;
    if (before === undefined){
      _attributeOrder.push(name);
    } else {
      var idx = _attributeOrder.indexOf(before);
      if (idx === -1){
        _attributeOrder.push(name);
      } else {
        _attributeOrder.splice(idx, 0, name)
      }
    }
  });

  var _mediators = $L.Map();
  // > Lapiz.UI.mediator(mediatorName,fn)
  // > Lapiz.UI.mediator(mediators)
  ui.meth(function mediator(mediatorName, fn){
    if (typeof mediatorName !== "string"){
      throw new Error("Mediator name must be a string");
    }
    if (_mediators[mediatorName] !== undefined){
      throw new Error("Attempting to redefine "+mediatorName+" mediator");
    }
    var properties = $L.Map();
    _mediators[mediatorName] = {
      handler: fn,
      properties: properties
    };
    // > Lapiz.UI.mediator.mediatorName(propertyName, property)
    // > Lapiz.UI.mediator.mediatorName(properties)
    var registerFn = function(propName, prop){
      if (prop === undefined){
        //defining many with an array
        Lapiz.each(propName, function(val, key){
          properties[key] = val;
        });
        return;
      }
      if (typeof propName !== "string"){
        throw new Error("Mediator property name on "+mediatorName+" must be a string, got: "+(typeof propName));
      }
      properties[propName] = prop;
    };
    Object.defineProperty(Lapiz.UI.mediator, mediatorName, {value: registerFn});
  });

  // _attributeSorter is used to sort the order that attributes are processed
  function _attributeSorter(a,b){
    var ai = _attributeOrder.indexOf(a);
    var bi = _attributeOrder.indexOf(b);
    ai = ai < 0 ? _attributeOrder.length : ai;
    bi = bi < 0 ? _attributeOrder.length : bi;
    return ai-bi;
  }

  // _getAttributeKeys pulls the attribute names from a node and sorts them
  // by _attributeOrder for processing
  function _getAttributeKeys(node){
    var keys = [];
    var i;
    for(i=0; i<node.attributes.length; i++){
      keys.push(node.attributes[i].name);
    }
    keys.sort(_attributeSorter);
    return keys;
  }

  function _inherit(node, property){
    var _props;
    for(;node !== null; node=node.parentNode){
      _props = _nodeProp.get(node);
      if (_props !== undefined && _props[property] !== undefined){
        return _props[property];
      }
    }
  }

  // > Lapiz.UI.bind(node, ctx, templator)
  ui.meth(function bind(node, ctx, templator){
    var cur, i, attrName, attrVal, _props;
    if (node.nodeName.toLowerCase() === "script") { return; }
    var _after = [];

    if ($L.UI.bindState === undefined){
      $L.UI.bindState = $L.Map();
    } else {
      i = $L.Map();
      i.parent = $L.UI.bindState;
      $L.UI.bindState = i;
    }
    $L.UI.bindState.proceed = true;
    $L.UI.bindState.after = function(fn){
      _after.push(fn);
    };

    _props = _getProperties(node);
    if (ctx === undefined){
      ctx = _inherit(node, 'ctx');
    } else {
      _props['ctx'] = ctx;
    }
    if (templator === undefined){
      templator = _inherit(node, 'templator');
      if (templator === undefined){
        templator = $L.Template.Std.templator;
      }
    } else {
      _props['templator'] = templator;
    }
    $L.UI.bindState.templator = templator;


    if (node.nodeType === 3){ //TextNode
      if (_props["template"] === undefined){
        _props["template"] = node.textContent;
      }
      node.textContent = templator(_props["template"], ctx);
    }
    if (node.nodeType === 1){ //Element node
      var attrTemplates = _props['attrTemplates'];
      if (attrTemplates === undefined){
        attrTemplates = $L.Map();
        _props['attrTemplates'] = attrTemplates;
      }
      var attrKeys = _getAttributeKeys(node);
      for(i=0; i<attrKeys.length; i++){
        attrName = attrKeys[i];
        if (attrTemplates[attrName] === undefined){
          attrTemplates[attrName] = node.attributes[attrName].value;
        }
        attrVal = _getAttributeValue(attrTemplates[attrName], ctx, node, $L.UI.bindState.templator);
        if (_attributes[attrName] !== undefined){
          _attributes[attrName](node, ctx, attrVal);
        } else {
          node.attributes[attrName].value = attrVal;
        }
        if ($L.UI.bindState.proceed === false) { break; }
      }
    }

    if (node.nodeType === 1 || node.nodeType === 11){
      for(cur = node.firstChild; cur !== null; cur = $L.UI.bindState.next){
        $L.UI.bindState.next = cur.nextSibling
        $L.UI.bind(cur, ctx, $L.UI.bindState.templator);
      }
    }

    $L.each(_after, function(fn){fn();});

    $L.UI.bindState = $L.UI.bindState.parent;
  });

  var _mediatorRe = /^(\w+)\.(\w+)$/;
  function _getAttributeValue(str, ctx, node, templator){
    var mediatorPattern = _mediatorRe.exec(str);
    var mediator;
    if (mediatorPattern) {
      mediator = _mediators[mediatorPattern[1]];
      if (mediator) {
        //TODO catch if mediatorPattern[2] is not in properties
        return mediator.handler(node, ctx, mediator.properties[mediatorPattern[2]]);
      }
    }
    return templator(str, ctx);
  }

  var _eventNamespace = $L.Namespace(); //Lapiz.UI.on
  ui.set("on", _eventNamespace.namespace);

  var _init = false;
  var _initEvent = $L.SingleEvent();
  $L.Event.linkProperty(_eventNamespace.namespace, "loaded", _initEvent);

  document.addEventListener("DOMContentLoaded", function(){
    _loadViews();
    _init = true;
    _initEvent.fire();

    new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        var l = mutation.removedNodes.length;
        var i;
        for(i=0; i<l; i+=1){
          _handleDeleteNode(mutation.removedNodes[i]);
        }
      });
    }).observe(document.body, { childList: true, subtree:true });
  });

  function _handleDeleteNode(node){
    var _props = _nodeProp.get(node);
    if (_props !== undefined && _props['onRemove'] !== undefined) {
      $L.each(_props['onRemove'], function(fn){ fn(); });
    }
    var l = node.childNodes.length;
    var i;
    for(i=0; i<l; i+=1){
      _handleDeleteNode(node.childNodes[i]);
    }
  }

  function remove(node, fn){
    var _props = _getProperties(node);
    if (_props['onRemove'] === undefined) {
      _props['onRemove'] = [];
    }
    _props['onRemove'].push(fn);
  }
  Object.defineProperty(remove, "deregister", { value: function(node, fn){
    var _props = _getProperties(node);
    if (_props['onRemove'] === undefined) {
      return;
    }
    $L.remove(_props['onRemove'], fn);
  }});

  _eventNamespace.meth(remove);

  function _splitRenderString(str){
    var idx = str.indexOf(">");
    var data = $L.Map();
    data.view = str.substr(0,idx).trim();
    data.append = false;
    if (str[idx+1] === ">"){
      idx+=1;
      data.append = true;
    }
    data.selector = str.substr(idx+1).trim();
    return data;
  }

  // > Lapiz.UI.render(renderString..., ctx);
  ui.meth(function render(){
    if (!_init){
      var argsClsr = arguments;
      _initEvent.register(function(){
        $L.UI.render.apply(this, argsClsr);
      });
      return;
    }
    var argsLen = arguments.length;
    var ctx = arguments[argsLen-1];
    var i, target, rend, append, view;
    if (typeof ctx === "string"){
      ctx = {};
    } else {
      argsLen -= 1;
    }
    for(i=0; i<argsLen; i++){
      rend = _splitRenderString(arguments[i]);
      if (i===0){
        target = document.querySelector(rend.selector);
        append = rend.append;
        view = document.createDocumentFragment()
        view.appendChild(Lapiz.UI.CloneView(rend.view));
        Lapiz.UI.bind(view, ctx, Lapiz.Template.Std.templator);
      } else {
        if (rend.selector === ""){
          rend.target = view;
        } else {
          rend.target = view.querySelector(rend.selector);
        }
        if (rend.target === null){
          test = view;
          throw new Error("Query selector could not match "+rend.selector);
        }
        rend.view = $L.UI.CloneView(rend.view);
        $L.UI.bind(rend.view, ctx, Lapiz.Template.Std.templator);
        if (!append){ rend.target.innerHTML = "";}
        rend.target.appendChild(rend.view);
      }
    }
    if (!append){ target.innerHTML = "";}
    target.appendChild(view);
  });

  // > Lapiz.UI.id(elId)
  // > Lapiz.UI.id(elId, doc)
  ui.meth(function id(elId, doc){
    return (doc || document).getElementById(elId);
  });

  // > attribute:resolver
  $L.UI.attribute("resolver", function(node, ctx, resolver){
    var _props = _getProperties(node);
    var templator = $L.Template.Templator($L.Template.Std.tokenizer, resolver);
    _props["templator"] = templator;
    $L.UI.bindState.templator = templator;
  });

});
Lapiz.Module("DefaultUIHelpers", ["UI"], function($L){
  var UI = $L.UI;

  // > attribute:if
  // > <htmlNode if="$ctxVal">...</htmlNode>
  // If the attrVal ($ctxVal above) evaluates to false, the node and it's
  // children are removed. If the attribute is a function it will be invoked
  // with no arguments and the return value will be evaluated as a boolean
  UI.attribute("if", function(node, _, attrVal){
    if (typeof(attrVal) === "function") {attrVal = attrVal();}
    node.removeAttribute("if");
    if (!attrVal){
      var parent = node.parentNode;
      parent.removeChild(node);
      UI.bindState.proceed = false;
    }
  });

  // > attribute:repeat
  // Takes a collection (array, map or accessor) and repeats the node for every
  // item in the collection.
  /* >
  <ul>
    <li repeat="$people>$name</li>
  </ul>
  */
  // If the collection has Lapiz event wiring (an accessor such as a Dictionary)
  // the collection will automatically stay up to date with additions and
  // removals. To keep thecontents up to date, also use live.
  UI.attribute("repeat", function(node, _, collection){
    var templator = UI.bindState.templator;
    if (collection === undefined){
      throw("Expected collection, got: " + collection);
    }
    var insFn, delFn;
    var index = $L.Map();
    var parent = node.parentNode;

    var end = node.ownerDocument.createComment("end of repeat");
    parent.insertBefore(end, node);
    node.removeAttribute("repeat");

    var nodeTemplate = node.cloneNode(true); // it may be possible to do this without making a copy.
    var fn = function(key, val){
      var clone = nodeTemplate.cloneNode(true);
      index[key] = clone;
      UI.bind(clone, val, templator);
      parent.insertBefore(clone, end);
    };
    if (collection.each instanceof Function){
      collection.each(fn);
    } else {
      $L.each(collection, fn);
    }

    if (collection.on !== undefined){
      if ($L.typeCheck.func(collection.on.insert)){
        insFn = function(key, accessor){
          var clone = nodeTemplate.cloneNode(true);
          var keys = accessor.keys;
          var i = keys.indexOf(key);

          if (i === keys.length-1){
              parent.insertBefore(clone, end);
          } else {
            //insert before something
            parent.insertBefore(clone, index[keys[i+1]]);
          }

          index[key] = clone;
          UI.bind(clone, accessor(key));
        };
        collection.on.insert(insFn);
        UI.on.remove(parent, function(){
          collection.on.insert.deregister(insFn);
        });
      }

      if ($L.typeCheck.func(collection.on.remove)){
        delFn = function(key, obj, accessor){
          var n = index[key];
          delete index[key];
          n.parentNode.removeChild(n);
        };
        collection.on.remove(delFn);
        Lapiz.UI.on.remove(parent, function(){
          collection.on.insert.deregister(delFn);
        });
      }

      if ($L.typeCheck.func(collection.on.change) && delFn && insFn){
        chgFn = function(key, obj, accessor){
          delFn(key, obj, accessor);
          insFn(key, accessor);
        }
        collection.on.change(chgFn);
        UI.on.remove(parent, function(){
          collection.on.change.deregister(chgFn);
        });
      }
    }

    node.parentNode.removeChild(node);
    UI.bindState.proceed = false;
  }); //End Repeat attribute

  // > attribute:live
  // > <htmlNode live>...</htmlNode>
  // > <htmlNode live="$val">...</htmlNode>
  // If no attribute is used, it will default to the context.
  // When the .on.change event fires the template will be updated.
  var _liveNodes = new WeakMap();
  UI.attribute("live", function(node, context, altCtx){
    var ctx = altCtx || context;
    var fn;
    if ( $L.typeCheck.nested(ctx, "on", "change", "func") && !_liveNodes.get(node)){
      _liveNodes.set(node, true);
      fn = function(){
        UI.bind(node);
      };
      ctx.on.change(fn);
      Lapiz.UI.on.remove(node, function(){
        ctx.on.change.deregister(fn);
      });
    }
  });

  UI.attribute({
    // > attribute:click
    // > <htmlNode click="$ctxFn">...</htmlNode>
    // The given function will be called with the node is clicked.
    "click": function(node, _, fn){
      if (typeof(fn) !== "function") { throw new Error("Expected function"); }
      node.addEventListener("click", fn);
    },
    // > attribute:display
    // > <htmlNode display="$ctxFn">...</htmlNode>
    // The given function will be called with the node is first displayed.
    "display": function(node, ctx, fn){
      if (typeof(fn) !== "function") { throw "Expected function"; }
      fn(node,ctx);
    },
    // > attribute:blur
    // > <htmlNode blur="$ctxFn">...</htmlNode>
    // The given function will be called with the node loses focus.
    "blur": function(node, _, fn){
      if (typeof(fn) !== "function") { throw "Expected function"; }
      node.addEventListener("blur", fn);
    },
    // > attribute:submit
    // > <htmlNode submit="$ctxFn">...</htmlNode>
    // The given function will be called when the submit event fires.
    "submit": function(node, _, fn){
      if (typeof(fn) !== "function") { throw "Expected function"; }
      node.addEventListener("submit", fn);
    },
    // > attribute:change
    // > <htmlNode submit="$ctxFn">...</htmlNode>
    // The given function will be called when the change event fires.
    "change": function(node, _, fn){
      if (typeof(fn) !== "function") { throw "Expected function"; }
      node.addEventListener("change", fn);
    }
  });

  function _getForm(node){
    while(node.tagName !== "FORM"){
      node = node.parentNode;
      if (!("tagName" in node)) { new Error("Node not in a form"); }
    }
    return node;
  }

  function _getFormValues (form) {
    var nameQuery = form.querySelectorAll("[name]");
    var i, n;
    var data = {};
    for(i=nameQuery.length-1; i>=0; i-=1){
      n = nameQuery[i];
      data[ n.name ] = n.value;
    }
    return data;
  }

  // > mediator:form
  /* >
    <form>
      ...
      <button click="form.formHandler">Go!</button>
    </form>
  */
  // > Lapiz.UI.mediator.form("formHandler", fn(formData));
  // The form mediator will search up the node tree until it finds
  // a form node. All elements with a name will be added to the
  // formData.
  UI.mediator("form", function(node, _, fn){
    var form;
    return function(evt){
      if (form === undefined){
        form = _getForm(node);
      }
      if (!fn(_getFormValues(form)) && evt && evt.preventDefault){
        evt.preventDefault();
      }
    };
  });

  var _hash = $L.Map();
  UI.attribute("hash", function(node){
    var hash = node.getAttribute("hash");
    node.removeAttribute("hash");
    node.setAttribute("href", "#" + hash);
  });

  // > Lapiz.UI.hash(hash, fn, ctx)
  // > Lapiz.UI.hash(hash, renderString)
  UI.hash = function(hash, fn, ctx){
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 0){
      throw new Error("Hash requires at least one arg");
    }
    var hash = args.splice(0,1)[0];
    var fn = args[0];
    var ctx = args[1];
    if (args.length === 0){
      Lapiz.each(hash, function(val, key){
        if (Array.isArray(val) && val.length == 2){
          UI.hash(key, val[0], val[1]);
        } else {
          UI.hash(key, val);
        }
      });
    } else if (typeof(args[0]) === "string"){
      _hash[hash] = function(){
        UI.render.apply(this, args);
      };
    } else if (typeof(args[0]) === "function"){
      _hash[hash] = fn;
    }
  };

  window.addEventListener("popstate", function(e){
    if (e.target !== undefined && e.target.location !== undefined && e.target.location.hash !== undefined){
      var args = e.target.location.hash.substr(1).split("/");
      var hash = args.shift();
      if (_hash[hash] !== undefined){ _hash[hash].apply(this, args); }
    }
  });

  UI.on.loaded(function(){
    var args = document.location.hash.substr(1).split("/");
    var hash = args.shift();
    if (_hash[hash] !== undefined){ _hash[hash].apply(this, args); }
  });

  // > Lapiz.UI.mediator.viewMethod
  // Useful mediator for attaching generic methods available to views.
  UI.mediator("viewMethod", function viewMethod(node, ctx, methd){
    //Todo:
    // - accept multiple view methods
    // - get name from function
    return function innerViewMethod(){
      var args = Array.prototype.slice.call(arguments); // get args
      args.splice(0,0, node, ctx); // prepend node and ctx
      return methd.apply(this, args);
    };
  });

  //q for query syntax or quick
  var qRe = {
    id: /\(?#(\w+)\)?/,
    cls: /\(?\.(\w+)\)?/g,
    attr: /\[(\w+)=([^\]]*)\]/g
  };

  // > attribute:q
  // Quick method for defining class, id and attributes
  UI.attribute("q", function(node, _, attrVal){
    var cls, attr, id;
    var clsVals = [node.className];
    if (clsVals[0] === ''){ clsVals = []; }

    id = qRe.id.exec(attrVal);
    if (id && node.id === ""){
      node.id = id[1];
    }

    while ( !!(cls = qRe.cls.exec(attrVal)) === true ){
      clsVals.push(cls[1]);
    }
    node.className = clsVals.join(' ');;

    while ( !!(attr = qRe.attr.exec(attrVal)) === true ){
      node.setAttribute(attr[1], attr[2]);
    }

    node.removeAttribute("q");
  });

  // > attribute:view
  UI.mediator("view", function(node, ctx, viewOrGenerator){
    return function(){
      var view;
      var viewCtx;
      if (typeof(viewOrGenerator) === "function" ){
        viewOrGenerator = viewOrGenerator(node, ctx);
      }
      if (typeof(viewOrGenerator) === "string"){
        view = viewOrGenerator;
        viewCtx = ctx;
      } else {
        if (viewOrGenerator.view !== undefined){
          view = viewOrGenerator.view;
          viewCtx = (viewOrGenerator.ctx === undefined) ? viewCtx : viewOrGenerator.ctx;
        }
        throw new Error("An invalid view was given or generated");
      }
      UI.render(view, viewCtx);
    };
  });

  // > attribute:resolver
  Lapiz.UI.mediator("resolver", function(node, ctx, resolverFn){
    return resolverFn(node, ctx);
  });

  // > attribute:selectVal
  UI.attribute("selectVal", function(node, ctx, val){
    node.removeAttribute("selectVal");
    val = $L.parse.string(val);
    UI.bindState.after(function(){
      var children = node.children;
      $L.each(children, function(child){
        if (child.tagName === "OPTION" && child.value === val){
          child.selected = true;
          return true;
        }
      });
    });
  });
});
