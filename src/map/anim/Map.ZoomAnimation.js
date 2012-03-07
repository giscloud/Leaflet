L.Map.mergeOptions({
	zoomAnimation: L.DomUtil.TRANSITION && !L.Browser.android && !L.Browser.mobileOpera
});

L.Map.include(!L.DomUtil.TRANSITION ? {} : {
	_zoomToIfCenterInView: function (center, zoom, centerOffset) {

		if (this._animatingZoom) {
			return true;
		}
		if (!this.options.zoomAnimation) {
			return false;
		}

		var scale = Math.pow(2, zoom - this._zoom),
			offset = centerOffset.divideBy(1 - 1 / scale);

		// if offset does not exceed half of the view
		if (!this._offsetIsWithinView(offset, 1)) {
			return false;
		}

		this._mapPane.className += ' leaflet-zoom-anim';

        this
			.fire('movestart')
			.fire('zoomstart');

		this._prepareTileBg();

		var centerPoint = this.containerPointToLayerPoint(this.getSize().divideBy(2)),
			origin = centerPoint.add(offset);

		this._runAnimation(center, zoom, scale, origin);

		return true;
	},


	_runAnimation: function (center, zoom, scale, origin) {
		var id, layer;
		this._animatingZoom = true;

		this._animateToCenter = center;
		this._animateToZoom = zoom;
		this._animateOrigin = origin;
		this._animateScale = scale;

		var transform = L.DomUtil.TRANSFORM;
		var hasAnimated = false;
		clearTimeout(this._clearTileBgTimer);

		for (id in this._layers) {
			if (this._layers.hasOwnProperty(id)) {

				layer = this._layers[id];
				if (L.TileLayer && (layer instanceof L.TileLayer) && layer.getVisible() &&
					layer._container && layer.options.zoomAnimation) {

					hasAnimated = true;

					var container = layer._container;

					//dumb FireFox hack, I have no idea why this magic zero translate fixes the scale transition problem
					if (L.Browser.gecko || window.opera) {
						container.style[transform] += ' translate(0,0)';
					}

					var scaleStr;

					// Android 2.* doesn't like translate/scale chains, transformOrigin + scale works better but
					// it breaks touch zoom which Anroid doesn't support anyway, so that's a really ugly hack

					// TODO work around this prettier
					if (L.Browser.android) {
						container.style[transform + 'Origin'] = origin.x + 'px ' + origin.y + 'px';
						scaleStr = 'scale(' + scale + ')';
					} else {
						scaleStr = L.DomUtil.getScaleString(scale, origin);
					}

					L.Util.falseFn(container.offsetWidth); //hack to make sure transform is updated before running animation

					var options = {};
					options[transform] = container.style[transform] + ' ' + scaleStr;
					container.transition.run(options);
				}
			}
		}
		if (!hasAnimated) {
            this._onZoomTransitionEnd();
        }
	},

	_prepareTileBg: function () {

		this._tileBg = this._tilePane;
		this._tilePane.empty = true;

		var id, layer, i = 0;
		for (id in this._layers) {
			if (this._layers.hasOwnProperty(id)) {
				layer = this._layers[id];
				if (L.TileLayer && (layer instanceof L.TileLayer) &&
					layer.getVisible() && !layer._container.transition && layer.options.zoomAnimation) {

                    if (layer.options.zoomAnimation) {
					    layer._container.transition =
						    new L.Transition(layer._container,
                                             {duration: 0.25, easing: 'cubic-bezier(0.25,0.1,0.25,0.75)'});
						if (i++ === 0) {
						    layer._container.transition.on('end', this._onZoomTransitionEnd, this);
						}
                    } else {
						layer._container.innerHTML = "";
					}
				}
			}
		}

		this._stopLoadingBgTiles();
	},

	// stops loading all tiles in the background layer
	_stopLoadingBgTiles: function () {
		var tiles = Array.prototype.slice.call(this._tileBg.getElementsByTagName('img')),
		i, len, tile, id;

		for (id in this._layers) {
			if (this._layers.hasOwnProperty(id)) {
				this._layers[id].fire("stoploadingtiles");
			}
		}

		for (i = 0, len = tiles.length; i < len; i++) {
			tile = tiles[i];

			if (!tile.complete) {
				tile.onload = L.Util.falseFn;
				tile.onerror = L.Util.falseFn;
				tile.src = L.Util.emptyImageUrl;

				tile.parentNode.removeChild(tile);
			}
		}
	},

	_onZoomTransitionEnd: function () {
		var id, layer;
		for (id in this._layers) {
			if (this._layers.hasOwnProperty(id)) {

				layer = this._layers[id];
				if (L.TileLayer && (layer instanceof L.TileLayer) && layer.getVisible() &&
					layer._container && layer.options.zoomAnimation) {
					L.Util.falseFn(layer._container);
				}
			}
		}

		this._resetView(this._animateToCenter, this._animateToZoom, true, true);

		this._mapPane.className = this._mapPane.className.replace(' leaflet-zoom-anim', ''); //TODO toggleClass util
		this._animatingZoom = false;
	},

	_clearTileBg: function () {
		if (!this._animatingZoom && !this.touchZoom._zooming) {
			var id, layer;
			for (id in this._layers) {
				if (this._layers.hasOwnProperty(id)) {
					layer = this._layers[id];

					if (L.TileLayer && (layer instanceof L.TileLayer) && layer.options.zoomAnimation) {
						layer._removeOldContainer();
					}
				}
			}
		}
	}
});
