L.Map.Measure = L.Handler.extend({

    initialize: function (map) {
        this._map = map;
        this._container = map._container;
        this._points = [];
    },

    addHooks: function () {
        this._map.on("dblclick", this._onDoubleClick, this);
        this._map.on("click", this._onClick, this);
        
        // save doubleclick zoom enabled state
        this._doubleClickZoomOriginallyEnabled = this._map.doubleClickZoom.enabled;
        this._map.doubleClickZoom.disable();
        
        this._container.style.cursor = 'crosshair';
        
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
        
        // restore map state
        if (this._doubleClickZoomOriginallyEnabled) {
            this._map.doubleClickZoom.enable();
        }
        this._container.style.cursor = '';
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
        this.disable();
        e.originalEvent.stopPropagation();
    },

    _onClick: function (e) {
        console.log("sgl");
        var p = e.latlng;

        if (this._points.length === 0) {
            // first click
            this._line = new L.Polyline([p]);
            this._map.addLayer(this._line);
            this._map.fire("measurestart", { startLatLng: p });
            this._drawElasticLine(p);
        } else {
            this._line.addLatLng(p);
            this._calculate(p);
            this._segments.push(this._current);
            this._total += this._current;
        }
        this._points.push(p);
        this._lastPoint = p;
        this._map.fire("measureclick", { latlng: p,
                                         total: this._total, 
                                         current: this._current,
                                         segments: this._segments, 
                                         waypoints: this._points });
    },
    
    _drawElasticLine: function (startPoint) {
        this._line.addLatLng(startPoint);
        this._map.on("mousemove", this._stretchElasticLine, this);
    },
    
    _stretchElasticLine: function (e) {
        var p = e.latlng;
        
        this._line.spliceLatLngs(this._line._latlngs.length - 1, 1, p);
        this._calculate(p);
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
        this._current = this._haversine(last.lat, last.lng, latlng.lat, latlng.lng);
    },
    
    _haversine: function (lat1, lon1, lat2, lon2) {
        var R, dLat, dLon, a, c;
        
        R = 6371;
        lat1 = lat1 * Math.PI / 180;
        lat2 = lat2 * Math.PI / 180;                        
        dLat = lat2 - lat1;
        dLon = lon2 - lon1;
        a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);                            
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        
        return R * c;
    }
    
});

L.Map.addInitHook('addHandler', 'measure', L.Map.Measure);