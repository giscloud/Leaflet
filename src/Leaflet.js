/*
 * The L namespace contains all Leaflet classes and functions.
 * This code allows you to handle any possible namespace conflicts.
 */

 /*jshint -W079 */
 /*jshint -W020 */

var L, originalL;

if (typeof exports !== undefined + '') {
	L = exports;
} else {
	originalL = window.L;
	L = {};

	L.noConflict = function () {
		window.L = originalL;
		return this;
	};

	window.L = L;
}

L.version = '0.5';
