
var scrollbarSize = require('scrollbar-size');
var debounce = require('debounce');
var classes = require('classes');

module.exports = Scrollbars;

Scrollbars.MIN_SIZE = 25;
Scrollbars.CORNER = 6;

var positioned = ['relative', 'absolute', 'fixed'];

function Scrollbars(element) {
	if (!(this instanceof Scrollbars))
		return new Scrollbars(element);

	var self = this;

	this.elem = element;

	// inject the wrapper
	this.wrapper = document.createElement('div');
    
    moveChildren(this.elem, this.wrapper);
    
    this.elem.appendChild(this.wrapper);
    
	// inherit the classes for styling
	// TODO: also make this work with styling based on id
	//this.wrapper.className = this.elem.className;
	//this.elem.parentNode.replaceChild(this.wrapper, this.elem);
	//this.wrapper.appendChild(this.elem);

	// save the current style, so we can restore if necessary
	var compStyle = getComputedStyle(this.elem);
	this.elemstyle = {
		position: compStyle.position,
		top: compStyle.top,
		right: compStyle.right,
		bottom: compStyle.bottom,
		left: compStyle.left,
	};

	classes(this.wrapper).add('scrollbars-override');
	setPosition(this.wrapper, [0, -scrollbarSize, -scrollbarSize, 0]);

	var style = this.elem.style;
	// set the wrapper to be positioned
	// but don’t mess with already positioned elements
	if (!~positioned.indexOf(this.elemstyle.position))
		style.position = 'relative';
	style.overflow = 'hidden';
    
    // fix padding
    ['left', 'right', 'top', 'bottom'].forEach(function (dir) {
        self.wrapper.style['padding-' + dir] = compStyle['padding-' + dir];
    });
    
	// and create scrollbar handles
	this.handleV = handle('vertical', [0, 0, 0, undefined]);
	this.elem.appendChild(this.handleV);
	this.handleH = handle('horizontal', [undefined, 0, 0, 0]);
	this.elem.appendChild(this.handleH);

	this.dragging = null;

	// hide after some inactivity
	this.hide = debounce(function () {
		if (!self.dragging || self.dragging.elem != self.handleV)
			self.handleV.firstChild.className = 'scrollbars-handle vertical';
		if (!self.dragging || self.dragging.elem != self.handleH)
			self.handleH.firstChild.className = 'scrollbars-handle horizontal';
	}, 1000);

	// hook them up to scroll events
	this.wrapper.addEventListener('scroll', function () {
		self.refresh();
	}, false);
	// and mouseenter
	this.wrapper.addEventListener('mouseenter', function () {
		self.refresh();
	}, false);

	[this.handleV, this.handleH].forEach(function (handle) {
		// don’t hide handle when hovering
		handle.firstChild.addEventListener('mouseenter', function (ev) {
			if (!self.dragging)
				self.dragging = {elem: handle};
		}, false);
		handle.firstChild.addEventListener('mouseleave', function (ev) {
			if (self.dragging && !self.dragging.handler)
				self.dragging = null;
		}, false);

		// and do the dragging
		handle.firstChild.addEventListener('mousedown', function (ev) {
			self._startDrag(handle, ev);
			ev.preventDefault();
		}, false);
	});

	this._endDrag = function () {
		document.removeEventListener('mousemove', self.dragging.handler);
		document.removeEventListener('mouseup', self._endDrag);
		self.dragging = null;
	};
}

Scrollbars.prototype._startDrag = function Scrollbars__startDrag(handle, ev) {
	var vertical = handle == this.handleV;
	var self = this;
	var handler = function (ev) {
		self._mouseMove(ev);
	};
	document.addEventListener('mousemove', handler, false);
	document.addEventListener('mouseup', this._endDrag, false);
	var rect = handle.getBoundingClientRect();
	this.dragging = {
		elem: handle,
		handler: handler,
		offset: vertical ? ev.pageY - rect.top : ev.pageX - rect.left
	};
};

Scrollbars.prototype._mouseMove = function Scrollbars__mouseMove(ev) {
	var vertical = this.dragging.elem == this.handleV;
	var rect = this.wrapper.getBoundingClientRect();
	var size = handleSize(this.wrapper);
	var offset;
	if (vertical) {
		offset = ev.pageY - rect.top - this.dragging.offset;
		this.wrapper.scrollTop = offset / size.sizeH * size.sTM;
	} else {
		offset = ev.pageX - rect.left - this.dragging.offset;
		this.wrapper.scrollLeft = offset / size.sizeW * size.sLM;
	}
};

function handleSize(elem) {
	var cH = elem.clientHeight;
	var sH = elem.scrollHeight;
	var sTM = elem.scrollTopMax || Math.max(sH - cH, 0);
	var cW = elem.clientWidth;
	var sW = elem.scrollWidth;
	var sLM = elem.scrollLeftMax || Math.max(sW - cW, 0);

	var pH = cH / sH;
	var pW = cW / sW;

	var corner = sTM && sLM ? Scrollbars.CORNER : 0;

	var sizeH = cH - Math.max(Scrollbars.MIN_SIZE, pH * (cH - corner)) - corner;
	var sizeW = cW - Math.max(Scrollbars.MIN_SIZE, pW * (cW - corner)) - corner;

	return {
		corner: corner,
		sTM: sTM,
		sLM: sLM,
		sizeH: sizeH,
		sizeW: sizeW,
		pH: pH,
		pW: pW,
	};
}

/*
 * Refreshes (and shows) the scrollbars
 */
Scrollbars.prototype.refresh = function Scrollbars_refresh() {
	var size = handleSize(this.wrapper);
	var scrolledPercentage;
	// vertical
	if (size.sTM) {
		scrolledPercentage = this.wrapper.scrollTop / size.sTM;
		setPosition(this.handleV, [
			scrolledPercentage * size.sizeH,
			0,
			(1 - scrolledPercentage) * size.sizeH + size.corner,
			undefined
		]);
		this.handleV.firstChild.className = 'scrollbars-handle vertical show';
	}

	// horizontal
	if (size.sLM) {
		scrolledPercentage = this.wrapper.scrollLeft / size.sLM;
		setPosition(this.handleH, [
			undefined,
			(1 - scrolledPercentage) * size.sizeW + size.corner,
			0,
			scrolledPercentage * size.sizeW,
		]);
		this.handleH.firstChild.className = 'scrollbars-handle horizontal show';
	}

	this.hide();
};

Scrollbars.prototype.destroy = function Scrollbars_destroy() {
	var self = this;
	if (this.dragging && this.dragging.handler)
		this._endDrag(); // clear global events
    
    moveChildren(this.wrapper, this.elem);
    this.elem.removeChild(this.wrapper);
};

// create a handle
function handle(klass, pos) {
	// a container that has the handles position
	var container = document.createElement('div');
	var style = container.style;
	style.position = 'absolute';
	setPosition(container, pos);

	// the handle itself
	var handle = document.createElement('div');
	handle.className = 'scrollbars-handle ' + klass;
	container.appendChild(handle);

	return container;
}

// set absolute positioning properties
var props = ['top', 'right', 'bottom', 'left'];
function setPosition(el, positions) {
	for (var i = 0; i < props.length; i++) {
		var prop = props[i];
		var pos = positions[i];
		if (typeof pos !== 'undefined')
			el.style[prop] = Math.round(pos) + 'px';
	}
}

function empty(el) {
	while (el.firstChild)
		el.removeChild(el.firstChild);
}

function moveChildren(el, target) {
    while (el.firstChild) {
        target.appendChild(el.firstChild);
    }
}
