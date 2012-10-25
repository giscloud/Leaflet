L.Map.Measure = L.Handler.extend({
	options: {
		icon: new L.DivIcon({
			iconSize: new L.Point(8, 8),
			className: 'leaflet-div-icon leaflet-editing-icon'
		}),
		lineOptions: {
			color: "black",
			weight: 2,
			dasharray: "5, 7"
		},
		labelFunction: function (latlng, current, segments, total) {
			if (total > 1000) {
				return Math.round(total) + "km";
			} else if (total > 100) {
				return Math.round(total * 10) / 10 + "km";
			} else if (total > 10) {
				return Math.round(total * 100) / 100 + "km";
			} else {
				return Math.round(total * 1000) + "m";
			}
		},
		tipLabelFunction: function () {
			return this.options.labelFunction(null, null, null, this._current);
		}
	},

	initialize: function (map, options) {
		this._map = map;
		this._container = map._container;
		this._points = [];
		L.Util.setOptions(this, options);
		this._IconLabel = L.Icon.Label.extend({
			options: {
				icon: this.options.icon,
				labelAnchor: new L.Point(16, -8),
				wrapperAnchor: new L.Point(4, 4),
				iconAnchor: new L.Point(0, 0),
				labelText: null
			}
		});
	},

	addHooks: function () {
		this._map.on("dblclick", this._onDoubleClick, this);
		this._map.on("click", this._onClick, this);

		// save doubleclick zoom enabled state
		this._doubleClickZoomOriginallyEnabled = this._map.doubleClickZoom.enabled;
		this._map.doubleClickZoom.disable();

		this._total = 0;
		this._current = 0;
		this._segments = [];
	},

	removeHooks: function () {
		// remove event handlers
		this._map.off("dblclick", this._onDoubleClick, this);
		this._map.off("click", this._onClick, this);

		// remove map objects
		this._map.removeLayer(this._line);
		this._removeElasticLine();
		this._points = [];
		this._markers.clearLayers();
		this._map.removeLayer(this._markers);
		this._elasticLineTipMarker = null;

		// restore map state
		if (this._doubleClickZoomOriginallyEnabled) {
			this._map.doubleClickZoom.enable();
		}
	},

	_onDoubleClick: function (e) {
		// cut off last points because of the two clicks emitted befor doubleclick
		this._segments.splice(this._segments.length - 1, 1);
		this._points.splice(this._points.length - 1, 1);
		this._calculate(e.latlng);
		this._map.fire("measureend", { latlng: e.latlng,
									   total: this._total,
									   current: this._segments[this._segments.length - 1],
									   segments: this._segments,
									   waypoints: this._points });
		this.removeHooks();
		this.addHooks();
		e.originalEvent.stopPropagation();
	},

	_onClick: function (e) {
		var p = e.latlng;

		if (this._points.length === 0) {

			// first click: add the polyline
			this._line = new L.Polyline([p], this.options.lineOptions);
			this._map.addLayer(this._line);
			// the first marker has an icon without the label
			this._markers = new L.LayerGroup();
			this._markers.addLayer(
				new L.Marker(p, {
					icon: this.options.icon,
					clickable: false
				}));
			this._map.addLayer(this._markers);
			// fire start event
			this._map.fire("measurestart", { startLatLng: p });
			this._drawElasticLine(p);

		} else {

			// extend the line
			this._line.addLatLng(p);
			// calculate distance and set the values
			this._calculate(p);
			this._segments.push(this._current);
			this._total += this._current;
			// create a labeled marker
			this._markers.addLayer(this._getLabeledIconMarker(p));

		}
		// save point
		this._points.push(p);
		this._lastPoint = p;
		// fire click event
		this._map.fire("measureclick", { latlng: p,
										 total: this._total,
										 current: this._current,
										 segments: this._segments,
										 waypoints: this._points });
	},

	_getLabeledIconMarker: function (latlng) {
		return new L.Marker(latlng, {
			icon: new this._IconLabel({options: { labelText: this._getMarkerLabelText(latlng) }}),
			clickable: false
		});
	},

	_getMarkerLabelText: function (latlng, labelFunction) {
		if (labelFunction === undefined) {
			labelFunction = this.options.labelFunction;
		}

		if (typeof labelFunction === "function") {
			return labelFunction.call(
				this,
				latlng,
				this._current,
				this._segments,
				this._total
			);
		} else if (typeof labelFunction === "string") {
			return labelFunction;
		}

		return null;
	},

	_drawElasticLine: function (startPoint) {
		this._line.addLatLng(startPoint);
		this._map.on("mousemove", this._stretchElasticLine, this);
	},

	_stretchElasticLine: function (e) {
		var p = e.latlng;

		this._line.spliceLatLngs(this._line._latlngs.length - 1, 1, p);
		this._calculate(p);
		if (this._elasticLineTipMarker) {
			this._elasticLineTipMarker.setLatLng(p);
			this._elasticLineTipMarker.options.icon.setLabelText(
				this._getMarkerLabelText(p, this.options.tipLabelFunction));
		} else {
			this._elasticLineTipMarker = this._getLabeledIconMarker(p);
			this._markers.addLayer(this._elasticLineTipMarker);
		}
		this._map.fire("measure", { latlng: p,
									total: this._total,
									current: this._current,
									segments: this._segments,
									waypoints: this._points });
	},

	_removeElasticLine: function () {
		this._map.off("mousemove", this._stretchElasticLine);
	},

	_calculate: function (latlng) {
		var last = this._lastPoint;
        if (this.options.calculateDistance && this.options.calculateDistance.call) {
            this._current = this.options.calculateDistance.call(this, last.lat, last.lng, latlng.lat, latlng.lng);
        } else {
            this._current = this._haversine(last.lat, last.lng, latlng.lat, latlng.lng);
        }
	},

	_haversine: function (lat1, lon1, lat2, lon2) {
		var R, dLat, dLon, a, c;

		R = 6371;
		lat1 = lat1 * Math.PI / 180;
		lat2 = lat2 * Math.PI / 180;
        lon1 = lon1 * Math.PI / 180;
		lon2 = lon2 * Math.PI / 180;
		dLat = lat2 - lat1;
		dLon = lon2 - lon1;
		a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
		c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c;
	}

});

L.Map.addInitHook('addHandler', 'measure', L.Map.Measure);
