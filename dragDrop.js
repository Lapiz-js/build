// Based on https://jsfiddle.net/tovic/Xcb8d/
Lapiz.Module("DragDrop", ["UI"], function($L){
  var _dragProps = new WeakMap();
  var _droppables = [];
  var _dropProps = new WeakMap();
  var _selected = null;
  var x_elem, y_elem;
  var x_pos = 0;
  var y_pos = 0;
  var _noSelectS = ["WebkitUserSelect", "MozUserSelect", "MsUserSelect", "userSelect"];
  var _saveSelect = $L.Map();
  var _timer;
  var body;

  function _drag_pre_init(e){
    x_elem = e.offsetX;
    y_elem = e.offsetY;
    _selected = this;
    document.addEventListener("mouseup", _cancel_drag);
    _timer = setTimeout(_drag_init, 150);
    _disable_highlight()
  }

  function _cancel_drag(){
    clearTimeout(_timer);
    document.removeEventListener("mouseup", _cancel_drag);
    _enable_highlight();
  }

  function _disable_highlight(){
    $L.each(_noSelectS, function(key){
      _saveSelect[key] = body.style[key];
      body.style[key] = "none";
    });
  }

  function _enable_highlight(){
    $L.each(_noSelectS, function(key){
      body.style[key] = _saveSelect[key];
    });
  }

  function _drag_init(){
    var self = _selected;
    document.removeEventListener("mouseup", _cancel_drag);
    var props = _dragProps.get(self);
    if (props.clone === true){
      _selected = self.cloneNode(true);
      self.parentNode.insertBefore(_selected, self.nextSibling);
      _selected.style.opacity = "0.7";
      _dragProps.set(_selected, props);
      props['z'] = undefined;
    } else {
      props['z'] = $L.UI.getStyle(self, "z-index");
    }
    _selected.style.zIndex = _highestZIndex+2;
    _selected.style.position = "absolute";
    document.addEventListener("mousemove", _move_elem);
    document.addEventListener("mouseup", _drag_stop);
  };

  function _move_elem(e){
    x_pos = document.all ? window.event.clientX : e.pageX;
    y_pos = document.all ? window.event.clientY : e.pageY;
    if (_selected !== null) {
      _selected.style.left = (x_pos - x_elem) + 'px';
      _selected.style.top = (y_pos - y_elem) + 'px';
    }
  }

  function _drag_stop(e){
    var props = _dragProps.get(_selected);
    var droppedIdx = $L.each(_droppables, function(node){
      var bcr = node.getBoundingClientRect();
      if (
        e.clientX >= bcr.left &&
        e.clientX <= bcr.left+bcr.width &&
        e.clientY >= bcr.top &&
        e.clientY <= bcr.top+bcr.height
      ){
        return node;
      }
    });
    if (droppedIdx > -1){
      var dropped =_droppables[droppedIdx];
      var dropProp = _dropProps.get(dropped)
      dropProp.func(_selected, dropped, props.ctx, dropProp.ctx);
    }
    document.removeEventListener("mousemove", _move_elem);
    document.removeEventListener("mouseup", _drag_stop);
    var body = document.querySelector("body");
    _enable_highlight();
    _selected.style.zIndex = _highestZIndex+1;
    if (props.clone === true){
      _selected.remove();
    }
    _selected = null;
    return true;
  };

  function _getAttr(attrVal){
    if (attrVal === undefined || attrVal === ""){
      attrVal = {};
    } else if ($L.typeCheck.str(attrVal)){
      attrVal = JSON.parse(attrVal);
    }
    return attrVal;
  }

  Lapiz.UI.attribute("draggable", function(node, ctx, attrVal){
    body = body || document.querySelector("body");
    _highestZIndex = _highestZIndex || _findHighestZIndex(document);
    attrVal = _getAttr(attrVal);
    var props = $L.Map();
    props.clone = !!attrVal.clone;
    props.ctx = ctx;
    _dragProps.set(node, props);
    node.style.position = "relative";
    node.addEventListener("mousedown", _drag_pre_init);
  });

  Lapiz.UI.attribute("droppable", function(node, ctx, dropFunc){
    $L.typeCheck.func(dropFunc, "Droppable attribute requires a drop function");
    _droppables.push(node);
    var props = $L.Map();
    props['func'] = dropFunc;
    props['ctx'] = ctx;
    _dropProps.set(node, props);
    $L.UI.on.remove(node, function(){
      $L.remove(_droppables, node);
    })
  });

  var _highestZIndex;
  function _findHighestZIndex(node, highest){
    var z = $L.UI.getStyle(node, "z-index");
    if (z === undefined || z === "auto"){
      z = 0;
    } else {
      z = $L.parse.int(z);
    }
    if ( !(z < highest)){ // !< works with NaN
      highest = z;
    }
    $L.each(node.children, function(child){
      highest = _findHighestZIndex(child, highest);
    });
    return highest;
  }
});