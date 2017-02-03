Lapiz.Module("UI", ["Collections", "Events", "Template", "Errors"], function($L){
  
  var ui = $L.Namespace();
  // > Lapiz.UI
  // Namespace for the UI methods.
  $L.set($L, "UI", ui.namespace);

  // _getProperties uses a weakMap to track node properties. This make clean up
  // easier and helps prevent memory leaks, when a node is garbage collected,
  // the properties will be cleaned up too.
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
  
  // > attribute
  // An HTML attribute

  // > tag
  // An html tag


  // _viewAttribute is the attribute that will be used to identify views
  // it is treated as a constant and is only here for DRY
  var _viewAttribute = 'l-view';
  // > attribute:l-view
  // > <htmlNode l-view="viewName">...</htmlNode>
  // Used to create a lapiz view:
  // All nodes in the document with this attribute will be cloned and saved and
  // the original will be removed from the document.
  
  // > tag:l-view
  // > <l-view name="viewName">...</l-view>
  // Any node with the l-view tag will also be cloned as a view, but only the
  // children will be cloned, the node itself will be ommited. The node must
  // have a name attribute

  // _loadViews is automatically invoked. It removes any node with the l-view
  // attribute and saves it as a view
  function _loadViews(){
    // clone nodes with l-view attribute
    $L.each(document.querySelectorAll('['+_viewAttribute+']'), function(node){
      _views[node.attributes[_viewAttribute].value] = node;
      node.removeAttribute(_viewAttribute);
      node.remove();
    });
    // clone nodes with l-view tag
    $L.each(document.querySelectorAll(_viewAttribute), function(node){
      var df = document.createDocumentFragment();
      var name = node.attributes["name"].value;
      $L.assert(name !== "", "Got l-view tag without name");
      _views[name] = df;
      $L.each($L.UI.Children(node), function(child){
        df.appendChild(child);
      });
      node.remove();
    });
  }
  ui.meth(function test(){
    return _views["baz"];
  });

  // > Lapiz.UI.CloneView(name)
  // Returns an html Node that is a clone of the View.
  ui.meth(function CloneView(name){
    if (_views[name] === undefined){
      $L.Err.toss("View "+name+" is not defined");
    }
    return _views[name].cloneNode(true);
  });

  // > Lapiz.UI.View(name, viewStr)
  // Adds a view that can be rendered or cloned.
  ui.meth(function View(name, viewStr){
    //TODO: this could use some work
    var div = document.createElement("div");
    div.innerHTML = viewStr;
    //TODO: this should use $L.UI.Children
    var node = div.childNodes[0];
    _views[name] = node;
    node.remove();
  });

  var _attributes = $L.Map();
  var _attributeOrder = [];
  // > Lapiz.UI.attribute(name, fn(node, ctx, attrVal) )
  // > Lapiz.UI.attribute(name, fn(node, ctx, attrVal), before)
  // > Lapiz.UI.attribute(attributes)
  ui.meth(function attribute(name, fn, before){
    if (fn === undefined || $L.typeCheck.str(fn)){
      if ($L.typeCheck.func(name)){
        $L.assert(name.name !== "", "Using a function as the first arg to Lapiz.UI.attribute requires a named function");
        before = fn;
        fn = name;
        name = fn.name;
      } else {
        //define plural
        $L.each(name, function(fn, name){
          Lapiz.UI.attribute(name, fn);
        });
        return;
      }
    }
    $L.typeCheck.str(name, "Attribute name must be a string");
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
  // > Lapiz.UI.mediator(namedMediatorFn)
  // Mediators are a pattern to provide reusable code. Mediators can only be
  // used as an attribute value and always follow the pattern of two words
  // seperated by a period, or more exactly:
  // > /^(\w+)\.(\w+)$/
  // Abstractly, if we have
  // > <N A="M.F">...</N>
  // and
  // > Lapiz.UI.attribute(A, fn_A);
  // > Lapiz.UI.mediator(M, fn_M);
  // > Lapiz.UI.mediator.M(F, val_F);
  // > Lapiz.UI.render("view > target", C); //view includes the segmetn above
  // Then we will invoke the follwing logic:
  // > fn_A(N, C, fn_M(N, C, val_F));
  //
  // A good example of the usefulness of this pattern is the form mediator.
  // > Lapiz.UI.mediator.form(formHandlerName, formHandlerFunction(formData));
  // The form mediator abstracts away the logic of pulling the values from named
  // elements within the form into a key/value Map so that the
  // formHandlreFunction can focus on what should be done with the data. It
  // produces clean html:
  // > <form submit="form.newPerson">...</form>
  //
  // > Lapiz.UI.mediator.form("newPerson", function(newPersonData){...});
  ui.meth(function mediator(mediatorName, fn){
    if ($L.typeCheck.func(mediatorName)){
      $L.assert(mediatorName.name !== "", "If first argument to Lapiz.UI.mediator is a funciton, it must be named");
      fn = mediatorName;
      mediatorName = fn.name;
    }
    $L.typeCheck.str(mediatorName, "Mediator name must be a string");
    $L.assert(_mediators[mediatorName] === undefined, "Attempting to redefine "+mediatorName+" mediator");
    var properties = $L.Map();
    _mediators[mediatorName] = {
      handler: fn,
      properties: properties
    };
    // > Lapiz.UI.mediator.mediatorName(propertyName, property)
    // > Lapiz.UI.mediator.mediatorName(properties)
    // Defines a mediator property. If 
    var registerFn = function(propName, prop){
      if (prop === undefined){
        if ($L.typeCheck.func(propName) && propName.name !== ""){
          // named function
          prop = propName;
          propName = prop.name;
        } else if ($L.typeCheck.arr(propName)){
          //defining many with an array of named funcs
          Lapiz.each(propName, function(fn){
            $L.typeCheck.func(fn, "On "+mediatorName+" found value in array that is not a function");
            $L.assert(fn.name !== '', "On "+mediatorName+" found unnamed function in array");
            properties[fn.name] = fn;
          });
          return;
        } else {
          //defining many with an object
          Lapiz.each(propName, function(val, key){
            properties[key] = val;
          });
          return;
        }
      }
      if (typeof propName !== "string"){
        $L.Err.toss("Mediator property name on "+mediatorName+" must be a string, got: "+(typeof propName));
      }
      properties[propName] = prop;
    };
    $L.set($L.UI.mediator, mediatorName, registerFn);
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

  // searches up the node tree for a property
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
  // Binds a context and node together using the templator. If no templator is
  // given, it will inheir a templator from it's parent, if no parent is present
  // it will use the standard templator Generally, it is better to call
  // Lapiz.UI.render than Lapiz.UI.bind.
  ui.meth(function bind(node, ctx, templator){
    var cur, i, attrName, attrVal, _props;
    if (node.nodeName.toLowerCase() === "script") { return; }
    var _after = [];

    // > Lapiz.UI.bindState
    // The bind state helps coordinate binding a template and a context. It is
    // available to the attributes during the binding process so they can direct
    // aspects of the bind process.
    if ($L.UI.bindState === undefined){
      $L.UI.bindState = $L.Map();
    } else {
      i = $L.Map();
      // > Lapiz.UI.bindState.parent
      // The bindstate of the parent node.
      i.parent = $L.UI.bindState;
      $L.UI.bindState = i;
    }
    // > Lapiz.UI.bindState.proceed
    // If an attribute set this to false, no further attributes will be bound
    // and the child nodes will not be processed. This is useful if an attribute
    // is removing a node.
    $L.set.setterGetter($L.UI.bindState, "proceed", true, "bool");

    // > Lapiz.UI.bindState.after(fn);
    // Adds a function that will be called after all attributes and child nodes
    // have been handled.
    $L.set.setterMethod($L.UI.bindState, function after(fn){
      _after.push(fn);
    });

    _props = _getProperties(node);

    // > Lapiz.UI.bindState.firstPass
    // The bind operation may run several times during the life span of a node
    // for various update operations. This property will indicate if this is the
    // first pass binding.
    if (_props['firstPass'] === undefined){
      _props['firstPass'] = false;
      $L.set($L.UI.bindState, 'firstPass', true);
    } else {
      $L.set($L.UI.bindState, 'firstPass', false);
    }

    // > Lapiz.UI.bindState.ctx
    // Initially, this is set to the ctx that is resolved for the binding
    // operationg. If it is changed by attribute, that will become the context
    $L.UI.bindState.ctx = (ctx === undefined) ? _inherit(node, 'ctx') : ctx;

    if (templator === undefined){
      templator = _inherit(node, 'templator');
      if (templator === undefined){
        templator = $L.Template.Std.templator;
      }
    }

    // > Lapiz.UI.bindState.templator
    // The templator that will be used
    $L.UI.bindState.templator = templator;


    if (node.nodeType === 3){ // TextNode
      if (_props["template"] === undefined){
        _props["template"] = node.textContent;
      }
      i = $L.UI.bindState.templator(_props["template"], $L.UI.bindState.ctx);
      if ($L.typeCheck(i, Node)){
        $L.UI.insertAfter(i, node);
        node.remove();
      } else {
        node.textContent = i;
      }
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
        attrVal = _getAttributeValue(attrTemplates[attrName], $L.UI.bindState.ctx, node, $L.UI.bindState.templator);
        if (_attributes[attrName] !== undefined){
          _attributes[attrName](node, $L.UI.bindState.ctx, attrVal);
        } else {
          node.attributes[attrName].value = attrVal;
        }
        if ($L.UI.bindState.proceed === false) { break; }
      }
    }

    if ($L.UI.bindState.proceed){
      if (node.tagName && node.tagName.toUpperCase() === "RENDER"){
        // > tag:render
        // > <render name="viewName"></render>
        // Inserts a sub view. Contents of render will be wiped.
        attrName = node.attributes.getNamedItem('name').value;
        i = $L.UI.CloneView(attrName);
        if (node.parentNode !== null){
          node.parentNode.insertBefore(i, node.nextSibling);
          $L.UI.bindState.parent.next = node.nextSibling;
        }
        node.remove();
      } else if (node.nodeType === 1 || node.nodeType === 11){
        for(cur = node.firstChild; cur !== null; cur = $L.UI.bindState.next){
          $L.UI.bindState.next = cur.nextSibling
          $L.UI.bind(cur, $L.UI.bindState.ctx, $L.UI.bindState.templator);
        }
      }
    }

    $L.each(_after, function(fn){fn();});

    _props['ctx'] = $L.UI.bindState.ctx;
    _props['templator'] = $L.UI.bindState.templator;
    $L.UI.bindState = $L.UI.bindState.parent;
  });

  var _mediatorRe = /^(\w+)\.(\w+)$/;
  function _getAttributeValue(str, ctx, node, templator){
    var mediatorPattern = _mediatorRe.exec(str);
    var mediator, mediatorFn;
    if (mediatorPattern) {
      mediator = _mediators[mediatorPattern[1]];
      if (mediator) {
        //TODO catch if mediatorPattern[2] is not in properties
        
        if ($L.Map.has(mediator.properties, mediatorPattern[2])) {
          return mediator.handler(node, ctx, mediator.properties[mediatorPattern[2]]);
        }
      }
    }
    return templator(str, ctx);
  }

  var _eventNamespace = $L.Namespace(); //Lapiz.UI.on
  ui.set("on", _eventNamespace.namespace);

  var _init = false;
  var _initEvent = $L.SingleEvent();
  // > Lapiz.UI.on.loaded(fn())
  // > Lapiz.UI.on.loaded = fn()
  $L.Event.linkProperty(_eventNamespace.namespace, "loaded", _initEvent);

  document.addEventListener("DOMContentLoaded", function(){
    // The MutationObserver watches for changes to the document. When a mutation
    // happens we track which were 
    new MutationObserver(function(mutations) {
      var added = [];
      var removed = [];
      var moved = [];
      mutations.forEach(function(mutation) {
        var l = mutation.removedNodes.length;
        var i, node, idx;
        for(i=0; i<l; i+=1){
          node = mutation.removedNodes[i];
          idx = added.indexOf(node);
          if (idx === -1){
            removed.push(node);
          } else {
            added.splice(idx, 1);
            moved.push(node);
          }
        }
        l = mutation.addedNodes.length; 
        for(i=0; i<l; i+=1){
          node = mutation.addedNodes[i];
          idx = removed.indexOf(node);
          if (idx === -1){
            added.push(node);
          } else {
            removed.splice(idx, 1);
            moved.push(node);
          }
        }
      });
      $L.each(removed, function(node){
        _handleDeleteNode(node);
      });
      $L.each(added, function(node){
        _handleAddNode(node);
      });
      
    }).observe(document.body, { childList: true, subtree:true });

    _loadViews();
    _init = true;
    _initEvent.fire();
  });

  // > Lapiz.UI.on.remove(node, fn)
  // When the node is removed from the document, fn will be called.
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
  function _handleDeleteNode(node){
    var _props = _nodeProp.get(node);
    if (_props !== undefined && _props['onRemove'] !== undefined) {
      $L.each(_props['onRemove'], function(fn){ fn(node); });
    }
    var l = node.childNodes.length;
    var i;
    for(i=0; i<l; i+=1){
      _handleDeleteNode(node.childNodes[i]);
    }
  }

  // > Lapiz.UI.on.add(node, fn)
  // When the node is added to the document, fn will be called.
  function add(node, fn){
    var _props = _getProperties(node);
    if (_props['onAdd'] === undefined) {
      _props['onAdd'] = [];
    }
    _props['onAdd'].push(fn);
  }
  Object.defineProperty(add, "deregister", { value: function(node, fn){
    var _props = _getProperties(node);
    if (_props['onAdd'] === undefined) {
      return;
    }
    $L.remove(_props['onAdd'], fn);
  }});
  function _handleAddNode(node){
    var _props = _nodeProp.get(node);
    if (_props !== undefined && _props['onAdd'] !== undefined) {
      $L.each(_props['onAdd'], function(fn){
        fn(node);
      });
    }
    var l = node.childNodes.length;
    var i;
    for(i=0; i<l; i+=1){
      _handleAddNode(node.childNodes[i]);
    }
  }

  // > Lapiz.UI.on.move(node, fn)
  // When the node is moved with in the document, fn will be called.
  function move(node, fn){
    var _props = _getProperties(node);
    if (_props['onMove'] === undefined) {
      _props['onMove'] = [];
    }
    _props['onMove'].push(fn);
  }
  Object.defineProperty(move, "deregister", { value: function(node, fn){
    var _props = _getProperties(node);
    if (_props['onMove'] === undefined) {
      return;
    }
    $L.remove(_props['onMove'], fn);
  }});
  function _handleMoveNode(node){
    var _props = _nodeProp.get(node);
    if (_props !== undefined && _props['onMove'] !== undefined) {
      $L.each(_props['onMove'], function(fn){
        fn(node);
      });
    }
    var l = node.childNodes.length;
    var i;
    for(i=0; i<l; i+=1){
      _handleMoveNode(node.childNodes[i]);
    }
  }

  _eventNamespace.meth(remove);
  _eventNamespace.meth(add);
  _eventNamespace.meth(move);

  function _splitRenderString(str){
    var idx = str.indexOf(">");
    $L.assert(idx > -1, "Render string must contain >");
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
        if (target === null){
          $L.Err.toss("Got null when selecting: "+rend.selector)
        }
        append = rend.append;
        view = document.createDocumentFragment();
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
          $L.Err.toss("Query selector could not match "+rend.selector);
        }
        rend.view = $L.UI.CloneView(rend.view);
        $L.UI.bind(rend.view, ctx, Lapiz.Template.Std.templator);
        if (!append){ rend.target.innerHTML = "";}
        rend.target.appendChild(rend.view);
      }
    }
    if (!append){
      $L.UI.empty(target);
    }
    target.appendChild(view);
  });

  // > Lapiz.UI.id(elId)
  // > Lapiz.UI.id(elId, doc)
  ui.meth(function id(elId, doc){
    return (doc || document).getElementById(elId);
  });

  // > Lapiz.UI.insertAfter(newNode, afterElement)
  ui.meth(function insertAfter(newNode, afterElement){
    $L.typeCheck(afterElement, Node, "insertAfter: afterElement must be a Node");
    $L.assert(afterElement.parentNode !== null, "insertAfter: afterElement parent cannot be null");
    $L.typeCheck(newNode, Node, "insertAfter: newNode must be a Node");
    afterElement.parentNode.insertBefore(newNode, afterElement.nextSibling);
  });

  // > Lapiz.UI.appendChild(child)
  // > Lapiz.UI.appendChild(child, parent)
  // > Lapiz.UI.appendChild(childStr)
  // > Lapiz.UI.appendChild(childStr, parent)
  ui.meth(function appendChild(child, parent){
    parent = parent || document;
    if ($L.typeCheck.str(child)){
      child = child.toLowerCase();
      if (child === "textnode"){
        child = document.createTextNode("");
      } else {
        child = document.createElement(child);
      }
    }
    parent.appendChild(child);
    return child;
  });

  // > Lapiz.UI.empty(node)
  // > Lapiz.UI.empty(nodeId)
  ui.meth(function empty(node){
    if ($L.typeCheck.str(node)){
      node = document.getElementById(node);
    }
    $L.typeCheck(node, Node, "Lapiz.UI.empty requires either node or node ID");
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
    return node;
  });

  // > Lapiz.UI.getStyle(node, property)
  // > Lapiz.UI.getStyle(selectorString, property)
  // > Lapiz.UI.getStyle(nodeOrStr, property, doc)
  // > Lapiz.UI.getStyle(nodeOrStr, property, doc, docView)
  // > Lapiz.UI.getStyle(nodeOrStr, property, doc, docView, pseudoElt)
  // Returns the computed style for the node. If a string is passed in for node
  // the node will be found with doc.querySelector. For defaults, doc will
  // document, docView will be 'defaultView' and pseudoElt will be null.
  ui.meth(function getStyle(node, property, doc, docView, pseudoElt){
    doc = doc || document;
    docView = docView || 'defaultView';
    pseudoElt = pseudoElt || null;
    if ($L.typeCheck.str(node)){
      node = doc.querySelector(node);
    }
    $L.typeCheck(node, Node, "First argument to Lapiz.UI.getStyle must be node or valid selector string");
    var style;
    try {
      style = doc[docView].getComputedStyle(node, pseudoElt).getPropertyValue(property);
    } catch(err){}
    return style;
  })

  // > Lapiz.UI.Children(node)
  // > Lapiz.UI.Children(selectorStr)
  // Gets all the children of the node as an array, including textnodes, which
  // the built-in node.children will leave out. Node can also be a document
  // fragment. If a selectorStr is used, it will be run against document.
  ui.meth(function Children(node){
    if ($L.typeCheck.str(node)){
      node = document.querySelector(node);
    }
    $L.typeCheck(node, Node, "Children requires node or node id");
    var children = [];
    var child;
    for(child = node.firstChild; child !== null; child = child.nextSibling){
      children.push(child);
    }
    return children;
  });
});
Lapiz.Module("DefaultUIHelpers", ["UI"], function($L){
  var UI = $L.UI;

  // > attribute:resolver
  // > <tag resolver="$resolver">...</tag>
  // Takes the current tokenizer and the tokenizer assigned and creates a new
  // templator that will be used on all attributes processed after this and all
  // child nodes. By default, resolver is the first attribute evaluated.
  UI.attribute("resolver", function(node, ctx, resolver){
    var templator = $L.Template.Templator(UI.bindState.templator.tokenizer, resolver);
    UI.bindState.templator = templator;
  });

  // > attribute:templator
  // > <tag templator="$templator">...</tag>
  // Takes the current tokenizer and the tokenizer assigned and creates a new
  // templator that will be used on all attributes processed after this and all
  // child nodes. By default, templator is the second attribute evaluated only
  // after resolver.
  UI.attribute("templator", function(node, ctx, templator){
    UI.bindState.templator = templator;
  });

  UI.attribute("with", function(node, oldCtx, newCtx){
    UI.bindState.ctx = newCtx;
  });

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

  // > attribute:ifNot
  // > <htmlNode ifNot="$ctxVal">...</htmlNode>
  // If the attrVal ($ctxVal above) evaluates to true, the node and it's
  // children are removed. If the attribute is a function it will be invoked
  // with no arguments and the return value will be evaluated as a boolean
  UI.attribute("ifNot", function(node, _, attrVal){
    if (typeof(attrVal) === "function") {attrVal = attrVal();}
    node.removeAttribute("ifNot");
    if (attrVal){
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
  UI.attribute("repeat", function(templateNode, _, collection){
    //TODO: Lapiz.UI.bindState.firstPass
    var templator = UI.bindState.templator;
    $L.assert(collection !== undefined, "Expected collection, got: " + collection)
    var insFn, delFn;
    var index = $L.Map();
    var parent = templateNode.parentNode;

    var end = templateNode.ownerDocument.createComment("end of repeat");
    parent.insertBefore(end, templateNode);
    templateNode.removeAttribute("repeat");

    var fn = function(val, key){
      var clone = templateNode.cloneNode(true);
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
          var clone = templateNode.cloneNode(true);
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
        delFn = function(key, accessor, oldObj){
          var n = index[key];
          delete index[key];
          n.parentNode.removeChild(n);
        };
        collection.on.remove(delFn);
        Lapiz.UI.on.remove(parent, function(){
          collection.on.remove.deregister(delFn);
        });
      }

      if ($L.typeCheck.func(collection.on.change) && delFn && insFn){
        chgFn = function(key, accessor, oldVal){
          // I'm not sure this is a good check, it may be indicitive of a
          // deeper problem.
          if (index[key] !== undefined) {delFn(key, accessor, oldVal);}
          insFn(key, accessor);
        }
        collection.on.change(chgFn);
        UI.on.remove(parent, function(){
          collection.on.change.deregister(chgFn);
        });
      }
    }

    //node.parentNode.removeChild(node);
    templateNode.remove();
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
      if (typeof(fn) !== "function") { $L.Err.toss("Expected function"); }
      UI.bindState.firstPass && node.addEventListener("click", fn);
    },
    // > attribute:display
    // > <htmlNode display="$ctxFn">...</htmlNode>
    // The given function will be called with the node is first displayed.
    "display": function(node, ctx, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Expected function"); }
      UI.bindState.firstPass && fn(node,ctx);
    },
    // > attribute:blur
    // > <htmlNode blur="$ctxFn">...</htmlNode>
    // The given function will be called with the node loses focus.
    "blur": function(node, _, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Expected function"); }
      UI.bindState.firstPass && node.addEventListener("blur", fn);
    },
    // > attribute:submit
    // > <htmlNode submit="$ctxFn">...</htmlNode>
    // The given function will be called when the submit event fires.
    "submit": function(node, _, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Expected function"); }
      UI.bindState.firstPass && node.addEventListener("submit", fn);
    },
    // > attribute:change
    // > <htmlNode submit="$ctxFn">...</htmlNode>
    // The given function will be called when the change event fires.
    "change": function(node, _, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Expected function"); }
      UI.bindState.firstPass && node.addEventListener("change", fn);
    },
    // > attribute:isChecked
    // > <htmlNode isChecked="$boolVal">...</htmlNode>
    // Will set the checked attribute. If combined with live, will keep the
    // checked status up to date.
    "isChecked": function(node, ctx, bool){
      node.checked = !!bool;
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
    var i, n, nodeType;
    var data = $L.Map();
    for(i=nameQuery.length-1; i>=0; i-=1){
      n = nameQuery[i];
      nodeType = n.type;
      if ( nodeType === "checkbox" || nodeType === "radio"){
        data[ n.name ] = n.checked;
      } else {
        data[ n.name ] = n.value;
      }
    }
    return data;
  }

  // > Lapiz.UI.mediator
  // Mediators are a way to attach generic logic to a view.

  // > Lapiz.UI.mediator.form
  /* >
    <form>
      ...
      <button click="form.formHandler">Go!</button>
    </form>
  */
  // > Lapiz.UI.mediator.form("formHandler", fn(formData, formNode, ctx));
  // The form mediator will search up the node tree until it finds
  // a form node. All elements with a name will be added to the
  // formData.
  UI.mediator("form", function(node, ctx, fn){
    var form;
    return function(evt){
      if (form === undefined){
        form = _getForm(node);
      }
      var preventDefault = true;
      var err = false;
      try {
        preventDefault = !fn(_getFormValues(form), form, ctx);
      } catch(e){
        err = e;
      }
      if ( preventDefault && evt && evt.preventDefault){
        evt.preventDefault();
      }
      if (err){
        $L.Err.toss(err);
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
      $L.Err.toss("Hash requires at least one arg");
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

  // > Lapiz.UI.mediator.viewMethod(viewMethodName, func(node, ctx, args...))
  // Useful mediator for attaching generic methods available to views.
  UI.mediator("viewMethod", function viewMethod(node, ctx, methd){
    $L.typeCheck.func(methd, "Mediator viewMethod expects a function");
    //Todo:
    // - accept multiple view methods
    // - get name from function
    return function innerViewMethod(){
      var args = Array.prototype.slice.call(arguments); // get args
      args.splice(0,0, node, ctx); // prepend original node and ctx
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
  // Renders a view. By default uses the current ctx.
  // > <tag click="view.foo">Foo</tag>
  //
  // > Lapiz.UI.mediator.view("foo", "foo > #main");
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
        $L.Err.toss("An invalid view was given or generated");
      }
      UI.render(view, viewCtx);
    };
  });

  // > mediator:resolver
  Lapiz.UI.mediator("resolver", function(node, ctx, resolverFn){
    return resolverFn(node, ctx);
  });

  // > mediator:templator
  Lapiz.UI.mediator("templator", function(node, ctx, templatorFn){
    return templatorFn(node, ctx);
  });

  // > attribute:selectVal
  // For a select box, it checks all the child select options and if it finds
  // one who's value property matches val, it sets it to selected.
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

  // > attribute:focus
  // Causes this element to recieve focus when a view is rendered
  UI.attribute("focus", function(node, ctx, val){
    UI.on.add(node, function(){
      node.focus();
    });
  });
});
