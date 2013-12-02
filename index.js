
var scrollbarSize = require('scrollbar-size')
  , debounce = require('debounce')
  , classes = require('classes')
  , events = require('event')
  , computedStyle = require('computed-style')
  , prevent = require('prevent')
  , Drag = require('drag')
  
  , directions = ['top', 'right', 'bottom', 'left']
;

module.exports = scrollbars;

function verticalDimensions(scroller) {
    var clientHeight = scroller.clientHeight
      , scrollHeight = scroller.scrollHeight
      , scrollHeightMax = Math.max(scrollHeight - clientHeight, 0)
    ;
    
    if (!scrollHeightMax) return false;
    
    var percent = clientHeight / scrollHeight
      , height = Math.max(scrollbars.MIN_LENGTH, clientHeight * percent)
    ;
    
    return {
        scrollHeightMax: scrollHeightMax
      , height: height
    };
    
}

function horizontalDimensions(scroller) {
    var clientWidth = scroller.clientWidth
      , scrollWidth = scroller.scrollWidth
      , scrollWidthMax = Math.max(scrollWidth - clientWidth, 0)
    ;
    
    if (!scrollWidthMax) return false;
    
    var percent = clientWidth / scrollWidth
      , width = Math.max(scrollbars.MIN_LENGTH, clientWidth * percent)
    ;
    
    return {
        scrollWidthMax: scrollWidthMax
      , width: width
    };
    
}

scrollbars.MIN_LENGTH = 25;
function scrollbars(el) {
    
    if (scrollbarSize === 0) return el;
    
    var hide
      
      , elComputedStyle = computedStyle(el)
      , elClasses = classes(el).add('scrollbars')
      , scroller = createDiv('scroller')
    
      , handles = {}
    ;
    
    hide = debounce(function () {
        elClasses.add('hidden-bars');
    }, 1000);
    
    scroller.style.right = -scrollbarSize + 'px';
    scroller.style.bottom = -scrollbarSize + 'px';
    
    loop(directions, function (dir) {
        scroller.style['padding-' + dir] = elComputedStyle['padding-' + dir];
    });
    
    moveChildren(el, scroller);
    append(el, scroller);
    
    events.bind(scroller, 'scroll', refresh);
    events.bind(scroller, 'mouseenter', refresh);
    
    function dragStart(e) {
        prevent(e);
        if (handles.vertical && this.el === handles.vertical.bar) {
            handles.vertical.initial = scroller.scrollTop;
        } else {
            handles.horizontal.initial = scroller.scrollLeft;
        }
    }
    
    function drag(e, start) {
        if (handles.vertical && this.el === handles.vertical.bar) {
            scroller.scrollTop = handles.vertical.initial + ((e.pageY - start.pageY) / (scroller.clientHeight - handles.vertical.size.height)) * handles.vertical.size.scrollHeightMax;
        } else {
            scroller.scrollLeft = handles.horizontal.initial + ((e.pageX - start.pageX) / (scroller.clientWidth - handles.horizontal.size.width)) * handles.horizontal.size.scrollWidthMax;
        }
    }
    
    function refresh() {
        
        var vSize = verticalDimensions(scroller)
          , hSize = horizontalDimensions(scroller)
        ;
        
        if (vSize) {
            if (!handles.vertical) initializeHandle('vertical');
            handles.vertical.size = vSize;
            handles.vertical.bar.style.height = vSize.height + 'px';
            handles.vertical.bar.style.top = (scroller.scrollTop / vSize.scrollHeightMax) * (handles.vertical.handle.clientHeight - vSize.height) + 'px';
        } else if (handles.vertical) {
            removeHandle('vertical');
        }
        
        if (hSize) {
            if (!handles.horizontal) initializeHandle('horizontal');
            handles.horizontal.size = hSize;
            handles.horizontal.bar.style.width = hSize.width + 'px';
            handles.horizontal.bar.style.left = (scroller.scrollLeft / hSize.scrollWidthMax) * (handles.horizontal.handle.clientWidth - hSize.width) + 'px';
        } else if (handles.horizontal) {
            removeHandle('horizontal');
        }
        
        elClasses.remove('hidden-bars');
        
        hide();
        
    }
    
    function initializeHandle(direction) {
        var handle = createDiv('handle ' + direction)
          , bar = createDiv('bar')
          , dragger = new Drag(bar)
        ;
        
        dragger
          .on('dragstart', dragStart)
          .on('drag', drag)
        ;
        
        handle.appendChild(bar);
        el.appendChild(handle);
        
        handles[direction] = {
            handle: handle
          , bar: bar
          , drag: dragger
        };
        
        return handle;
    }
    
    function removeHandle(direction) {
        if (!handles[direction]) return;
        el.removeChild(handles[direction].handle);
        delete handles[direction];
    }
    
    return scroller;
    
}

function loop(arr, fn, ctx) {
    var i = 0
      , l = arr.length
    ;
    while (i < l) {
        fn.call(ctx || null, arr[i], i);
        i += 1;
    }
}

function moveChildren(el, target) {
    while (el.firstChild) {
        target.appendChild(el.firstChild);
    }
}

function createDiv(className) {
    var div = document.createElement('div');
    div.className = className;
    return div;
}

function append(el) {
    var i = 1
      , l = arguments.length
    ;
    while (i < l) {
        el.appendChild(arguments[i]);
        i += 1;
    }
    return el;
}