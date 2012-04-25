/*
 * L.Marker is used to display clickable/draggable icons on the map.
 */

L.Marker = L.Class.extend({

	includes: L.Mixin.Events,

	options: {
		icon: new L.Icon.Default(),
		title: '',
		visible: true,
		clickable: true,
		draggable: false,
		zIndexOffset: 0,
		opacity: 1,
        rotation: 0
	},

	initialize: function (latlng, options) {
		L.Util.setOptions(this, options);
		this._latlng = latlng;
	},

	onAdd: function (map) {
		this._map = map;

		this._initIcon();

		map.on('viewreset', this._reset, this);

		this._initIcon();
		this._reset();
	},

	onRemove: function (map) {
		this._removeIcon();

		this._map = null;

		// TODO move to Marker.Popup.js
		if (this.closePopup) {
			this.closePopup();
		}

		map.off('viewreset', this._reset, this);

		this._map = null;
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		this._latlng = latlng;

		this._reset();

		if (this._popup) {
			this._popup.setLatLng(latlng);
		}
	},

	setZIndexOffset: function (offset) {
		this.options.zIndexOffset = offset;
		this._reset();
	},

	setIcon: function (icon) {
		if (this._map) {
			this._removeIcon();
		}

		this._icon = this._shadow = null;
		this.options.icon = icon;

		if (this._map) {
			this._initIcon();
			this._reset();
		}
	},

	setVisible: function (onoff) {
		this._icon && L.DomUtil.setVisible(this._icon, onoff);
		this._shadow && L.DomUtil.setVisible(this._shadow, onoff);
		this.options.visible = onoff;
		return this;
	},

	getVisible: function (onoff) {
		return this.options.visible;
	},
    
    setLabelVisible: function (onoff) {
        if (this.options.icon && this.options.icon instanceof L.Icon.Label) {
            this.options.icon.setLabelVisible(onoff);
        }
    },
    
    getLabelVisible: function () {
        if (this.options.icon && this.options.icon instanceof L.Icon.Label) {
            return this.options.icon.getLabelVisible();
        }
    },
    
    setLabelText: function (text) {
        if (this.options.icon && this.options.icon instanceof L.Icon.Label) {
            this.options.icon.setLabelText(text);
        }
    },
    
    getLabelText: function () {
        if (this.options.icon && this.options.icon instanceof L.Icon.Label) {
            return this.options.icon.getLabelText();
        }
    },

	_initIcon: function () {
		var options = this.options;

		if (!this._icon) {
			this._icon = options.icon.createIcon();

			if (options.title) {
				this._icon.title = options.title;
			}

			this._initInteraction();
			this._updateOpacity();
		}
		if (!this._shadow) {
			this._shadow = options.icon.createShadow();
		}

		var panes = this._map._panes;

		panes.markerPane.appendChild(this._icon);

		if (this._shadow) {
			panes.shadowPane.appendChild(this._shadow);
		}
	},

	_removeIcon: function () {
		var panes = this._map._panes;

		panes.markerPane.removeChild(this._icon);

		if (this._shadow) {
			panes.shadowPane.removeChild(this._shadow);
		}

		this._icon = this._shadow = null;
	},

	_reset: function () {
		var icon = this._icon;

		if (!icon) {
			return;
		}

		var pos = this._map.latLngToLayerPoint(this._latlng).round();

		L.DomUtil.setPosition(icon, pos);

		if (this._shadow) {
			L.DomUtil.setPosition(this._shadow, pos);
		}

		icon.style.zIndex = pos.y + this.options.zIndexOffset;
	},

	_initInteraction: function () {
		if (!this.options.clickable) {
			return;
		}

		var icon = this._icon,
			events = ['dblclick', 'mousedown', 'mouseover', 'mouseout'];

		icon.className += ' leaflet-clickable';
		L.DomEvent.addListener(icon, 'click', this._onMouseClick, this);

		for (var i = 0; i < events.length; i++) {
			L.DomEvent.addListener(icon, events[i], this._fireMouseEvent, this);
		}

		if (L.Handler.MarkerDrag) {
			this.dragging = new L.Handler.MarkerDrag(this);

			if (this.options.draggable) {
				this.dragging.enable();
			}
		}
	},

	_onMouseClick: function (e) {
		L.DomEvent.stopPropagation(e);
		if (this.dragging && this.dragging.moved()) { return; }
		if (this._map.dragging && this._map.dragging.moved()) { return; }
		this.fire(e.type, {
			originalEvent: e
		});
	},

	_fireMouseEvent: function (e) {
		this.fire(e.type, {
			originalEvent: e
		});
		if (e.type !== 'mousedown') {
			L.DomEvent.stopPropagation(e);
		}
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		if (this._map) {
			this._updateOpacity();
		}
	},

	_updateOpacity: function (opacity) {
		L.DomUtil.setOpacity(this._icon, this.options.opacity);
	},
    
    setRotation: function (degrees) {
        var icon = this._icon;
        
        this.options.rotation = degrees;
        
        if (icon.children && icon.children.length) {
            L.DomUtil.setRotation(this._icon.children[0], degrees);
        } else {
            L.DomUtil.setRotation(this._icon, degrees);
        }
    },
    
    getRotation: function () {
        return this.options.rotation;
    }
});

