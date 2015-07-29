"use strict";

var debug = require('debug')('rayson:amqp:client');
var _ = require('lodash');
var assert = require('assert');
var NodeCache = require("node-cache");
var Client = require('jayson').Client;
var AMQPBase = require('../amqp/amqp-base');
var errors = require('../errors');

module.exports = AMQPClient;

/**
 *  Constructor for a Rayson MQTT Client
 *  @class Rayson JSON-RPC MQTT Client
 *  @constructor
 *  @extends Client
 *  @param {Object|String} amqpclient The real mqtt client or connection url or the options.
 *  @param {Object|String} [options] The topic or options.
 *  @param {String} [options.url] the connection url.
 *  @param {String} [options.exchange] The exchange string. 'amq.topic' is default.
 *  @param {String} [options.topic] The service topic. should be like `hello/:param1/:param2/service`
 *  @param {String} [options.format] The codec for encode and decode the message by default mqtt client. C
 *  loud be `json` or `msgpack`, default is `json`.
 *  @param {Number} [options.timeout] The callback cache timeout. 10 seconds is default.
 *  @param {Boolean|Number} [options.cacheCheckInterval] The interval time scan the callback cache for timeout.
 *  10 seconds is default.
 *  @return {AMQPClient}
 *  @api public
 */
function AMQPClient(amqpclient, options) {
	if (!(this instanceof AMQPClient)) return new AMQPClient(amqpclient, options);

	Client.call(this);
	AMQPBase.call(this, amqpclient, options);

	var that = this;
	options = this.options;

	options.ttl = options.ttl || 10; // seconds
	options.cacheCheckInterval = options.cacheCheckInterval || 12;

	var params = this.params = options.topic.match(/:[a-zA-Z0-9]+/g);
	this.values = {};

	if (params) {
		// transform the params
		this.params = _.map(params, function (param) {
			return param.substring(1);
		});
	}

	// init callback cache
	this.cache = new NodeCache({stdTTL: options.ttl, checkperiod: options.cacheCheckInterval});

	// subscribe reply topic
	var client = this.client;
	var replyTo = options.topic + '.reply';
	options.queue = options.queue + '_reply';
	that.$promise = client.$promise.then(function () {
		debug('subscribe reply to topic:', replyTo);
		return client.subscribe(replyTo, options, getResponseHandler(that.cache));
	});
}

require('util').inherits(AMQPClient, Client);

AMQPClient.prototype._request = function (request, callback) {
	var topic = this.options.topic;
	if (this.params) {
		// validate topic params
		for (var i = 0; i < this.params.length; i++) {
			var param = this.params[i];
			var value = this.values[param];
			if (value === undefined || value === null) {
				throw new Error('Missing topic param `' + param + '`');
			}
			topic = topic.replace(':' + param, value);
		}
	}

	// clear values when request to force to fill value for next request
	this.values = {};

	var that = this;
	var options = this.options;
	var cache = this.cache;
	var ok = this.$promise.then(function () {
		debug('publish request', topic, request);
		return that.client.publish(options.exchange, topic, request).then(function () {
			if (callback) {
				cache.set(request.id, {cb: callback});
			}
		}, function (err) {
			if (callback) callback(err);
		});
	});

	request.timeout = function (ms) {
		ok.then(function () {
			var item = cache.get(request.id);
			if (!item) return request;
			if (item.timer) clearTimeout(item.timer);
			item.timer = setTimeout(getTimeoutHandler(that.cache, request.id, ms), ms);
		});
		return request;
	}
};

Client.prototype.for = function (params) {
	if (Array.isArray(params)) {
		assert(params.length === this.params.length, 'The params provided length is ' + params.length + ', but required' + this.params.length);
		for (var i = 0; i < params.length; i++) {
			this.values[this.params[i]] = params[i];
		}
	} else if (arguments.length > 1 || !_.isPlainObject(params)) {
		this.for(Array.prototype.slice.call(arguments));
	} else if (params) {
		_.assign(this.values, params);
	}

	return this;
};

function getResponseHandler(cache) {
	return function (message) {
		var payload = message.payload;
		if (!payload || !payload.id) return debug('invalid response', payload);

		debug('response #' + payload.id, payload.error ? payload.error : '-', payload.result ? payload.result : '-');

		var item = cache.get(payload.id);
		cache.del(payload.id);
		if (!item) return debug('no cache callback for response #' + payload.id, '. maybe it\'s timeout.');

		if (item.timer) {
			clearTimeout(item.timer);
			item.timer = null;
		}
		item.cb(null, payload);
	}
}

function getTimeoutHandler(cache, id, ms) {
	return function () {
		var item = cache.get(id);
		if (!item) return;
		cache.del(id);
		debug('response #' + id, 'with timeout error after ' + ms + 'ms');
		item.cb(new errors.TimeoutError('Request timed out after ' + ms + 'ms'));
	}
}
