/*
 * L.DomEvent contains functions for working with DOM events.
 */

L.DomEvent = {
	/* inpired by John Resig, Dean Edwards and YUI addEvent implementations */
	addListener: function(/*HTMLElement*/ obj, /*String*/ type, /*Function*/ fn, /*Object*/ context) {
		var id = L.Util.stamp(fn),
			key = '_leaflet_' + type + id;

		if (obj[key]) { return; }

		function handler(e) {
			return fn.call(context || obj, e || L.DomEvent._getEvent());
		}

		if (L.Browser.touch && (type == 'dblclick') && this.addDoubleTapListener) {
			this.addDoubleTapListener(obj, handler, id);
		} else if ('addEventListener' in obj) {
			if (type == 'mousewheel') {
				obj.addEventListener('DOMMouseScroll', handler, false);
				obj.addEventListener(type, handler, false);
			} else if ((type == 'mouseenter') || (type == 'mouseleave')) {
				var originalHandler = handler,
					newType = (type == 'mouseenter' ? 'mouseover' : 'mouseout');
				handler = function(e) {
					if (!L.DomEvent._checkMouse(obj, e)) return;
					return originalHandler(e);
				};
				obj.addEventListener(newType, handler, false);
			} else {
				obj.addEventListener(type, handler, false);
			}
		} else if ('attachEvent' in obj) {
			obj.attachEvent("on" + type, handler);
		}

		obj[key] = handler;
	},

	removeListener: function(/*HTMLElement*/ obj, /*String*/ type, /*Function*/ fn) {
		var id = L.Util.stamp(fn),
			key = '_leaflet_' + type + id;
			handler = obj[key];

		if (!handler) { return; }

		if (L.Browser.touch && (type == 'dblclick') && this.removeDoubleTapListener) {
			this.removeDoubleTapListener(obj, id);
		} else if ('removeEventListener' in obj) {
			if (type == 'mousewheel') {
				obj.removeEventListener('DOMMouseScroll', handler, false);
				obj.removeEventListener(type, handler, false);
			} else if ((type == 'mouseenter') || (type == 'mouseleave')) {
				obj.removeEventListener((type == 'mouseenter' ? 'mouseover' : 'mouseout'), handler, false);
			} else {
				obj.removeEventListener(type, handler, false);
			}
		} else if ('detachEvent' in obj) {
			obj.detachEvent("on" + type, handler);
		}
		delete obj[key];
	},

	_checkMouse: function(el, e) {
		var related = e.relatedTarget;

		if (!related) return true;

		try {
			while (related && (related != el)) {
				related = related.parentNode;
			}
		} catch(err) { return false; }

		return (related != el);
	},

	_getEvent: function()/*->Event*/ {
		var e = window.event;
		if (!e) {
			var caller = arguments.callee.caller;
			while (caller) {
				e = caller['arguments'][0];
				if (e && Event == e.constructor) { break; }
				caller = caller.caller;
			}
		}
		return e;
	},

	stopPropagation: function(/*Event*/ e) {
		if (e.stopPropagation) {
			e.stopPropagation();
		} else {
			e.cancelBubble = true;
		}
	},

	disableClickPropagation: function(/*HTMLElement*/ el) {
		L.DomEvent.addListener(el, 'mousedown', L.DomEvent.stopPropagation);
		L.DomEvent.addListener(el, 'mouseup', L.DomEvent.stopPropagation);
		L.DomEvent.addListener(el, 'click', L.DomEvent.stopPropagation);
		L.DomEvent.addListener(el, 'dblclick', L.DomEvent.stopPropagation);
	},

	preventDefault: function(/*Event*/ e) {
		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
	},

	stop: function(e) {
		L.DomEvent.preventDefault(e);
		L.DomEvent.stopPropagation(e);
	},

	getMousePosition: function(e, container) {
		var x = e.pageX ? e.pageX : e.clientX +
				document.body.scrollLeft + document.documentElement.scrollLeft,
			y = e.pageY ? e.pageY : e.clientY +
					document.body.scrollTop + document.documentElement.scrollTop,
			pos = new L.Point(x, y);
		return (container ?
					pos.subtract(L.DomUtil.getViewportOffset(container)) : pos);
	},

	getWheelDelta: function(e) {
		var delta = 0;
		if (e.wheelDelta) { delta = e.wheelDelta/120; }
			if (e.detail) { delta = -e.detail/3; }
			return delta;
	}
};

