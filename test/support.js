"use strict";

var _ = require('lodash');
var mosca = require('mosca');

var port = 9876;

Object.defineProperty(exports, 'port', {
	get: function () {
		return port;
	}
});

exports.startMosca = function (settings) {
	settings = _.assign({port: port}, settings);
	return new mosca.Server(settings);
};

exports.abStartMosca = function (settings) {
	return function (done) {
		this.mosca = exports.startMosca(settings);
		this.mosca.on('ready', done);
	}
};

exports.abStopMosca = function () {
	return function(done) {
		if (this.mosca) return this.mosca.close(done);
		done();
	}
};

exports.delaycall = function delaycall(ms, done) { // delay done for send message ack
	if (typeof ms === 'function') {
		done = ms;
		ms = 100;
	}
	setTimeout(done, ms || 100);
};

exports.server = {};
/*
 * Methods for the common test server
 */
exports.server.methods = {

	error: function(callback) {
		callback(this.error(-1000, 'An error message'));
	},

	incrementCounterBy: function(counter, value, callback) {
		if(!(counter instanceof exports.Counter)) {
			return callback(this.error(-1000, 'Argument not an instance of Counter'));
		}
		counter.incrementBy(value);
		callback(null, counter);
	},

	add: function(a, b, callback) {
		var result = a + b;
		callback(null, result);
	},

	add_slow: function(a, b, isSlow, callback) {
		var result = a + b;
		if(!isSlow) return callback(null, result);
		setTimeout(function() {
			callback(null, result);
		}, 15);
	},

	empty: function(arg, callback) {
		callback();
	},

	no_args: function(callback) {
		callback(null, true);
	},

	invalidError: function(arg, callback) {
		callback({invalid: true});
	}

};
