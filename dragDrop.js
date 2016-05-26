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

  function _drag_init(e){
    var props = _dragProps.get(this);
    if (props.clone === true){
      _selected = this.cloneNode(true);
      this.parentNode.insertBefore(_selected, this.nextSibling);
      _selected.style.opacity = "0.7";
      _dragProps.set(_selected, props);
      props['z'] = undefined;
    } else {
      _selected = this;
      props['z'] = $L.UI.getStyle(this, "z-index");
    }
    _selected.style.zIndex = _highestZIndex+2;
    _selected.style.position = "absolute";
    x_elem = e.offsetX;
    y_elem = e.offsetY;
    document.addEventListener("mousemove", _move_elem);
    document.addEventListener("mouseup", _drag_stop);
    var body = document.querySelector("body");
    $L.each(_noSelectS, function(key){
      _saveSelect[key] = body.style[key];
      body.style[key] = "none";
    });
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
        e.clientX >= bcr.x &&
        e.clientX <= bcr.x+bcr.width &&
        e.clientY >= bcr.y &&
        e.clientY <= bcr.y+bcr.height
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
    $L.each(_noSelectS, function(key){
      body.style[key] = _saveSelect[key];
    });
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
    } else if ($L.typeCheck.string(attrVal)){
      attrVal = JSON.parse(attrVal);
    }
    return attrVal;
  }

  Lapiz.UI.attribute("draggable", function(node, ctx, attrVal){
    _highestZIndex = _highestZIndex || _findHighestZIndex(document);
    attrVal = _getAttr(attrVal);
    var props = $L.Map();
    props.clone = !!attrVal.clone;
    props.ctx = ctx;
    _dragProps.set(node, props);
    node.style.position = "relative";
    node.addEventListener("mousedown", _drag_init);
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