var debug = require('debug')('jayson:client:mqtt');
var path = require('path');
var _ = require('lodash');
var NodeCache = require("node-cache");
var Client = require('jayson').Client;
var MQTTBase = require('./mqtt-base');
var errors = require('../errors');

module.exports = MQTTClient;

/**
 *  Constructor for a Rayson MQTT Client
 *  @class Rayson JSON-RPC MQTT Client
 *  @constructor
 *  @extends Client
 *  @param {Object|String} mqttclient The real mqtt client or connection url or the options.
 *  @param {Object|String} [options] The topic or options.
 *  @param {String} [options.url] the connection url.
 *  @param {String} [options.host] the mqtt server host.
 *  @param {String} [options.port] the mqtt server port.
 *  @param {String} [options.topic] The service topic. should be like `hello/:param1/:param2/service`
 *  @param {String} [options.format] The codec for encode and decode the message by default mqtt client. Cloud be `json` or
 *  `msgpack`, default is `json`.
 *  @param {Number} [options.ttl] The callback cache ttl. 10 seconds is default.
 *  @param {Boolean|Number} [options.cacheCheckInterval] The interval time scan the callback cache for ttl. 10 seconds is default.
 *  @return {AMQPClient}
 *  @api public
 */
function MQTTClient(mqttclient, options) {
	if (!(this instanceof MQTTClient)) return new MQTTClient(mqttclient, options);

	Client.call(this);
	MQTTBase.call(this, mqttclient, options);
	var that = this;
	options = this.options;

	options.ttl = options.ttl || 10; // seconds
	if (options.cacheCheckInterval !== false) {
		options.cacheCheckInterval = options.cacheCheckInterval === true ? 10 : Number(options.cacheCheckInterval);
	}

	var params = this.params = options.topic.match(/\:[a-zA-Z0-9]+/g);
	var values = this.values = {};

	if (params) {
		// transform the params
		this.params = _.map(params, function (param) {
			param = param.substring(1);
			that[param] = function (value) {
				values[param] = value;
				return that;
			};
			return param;
		});
	}

	// init callback cache
	this.cache = new NodeCache({stdTTL: options.ttl, checkperiod: options.cacheCheckInterval});

	// subscribe reply topic
	var replyTo = path.join(options.topic, 'reply');
	debug('subscribe reply topic:', replyTo);
	this.adapter.subscribe(replyTo, getResponseHandler(that.cache));
}

require('util').inherits(MQTTClient, Client);

MQTTClient.prototype._request = function (request, callback) {
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

	debug('publish request', topic, request);
	var that = this;
	this.adapter.publish(topic, request, function (err) {
		if (err) return callback(err);
		if (callback) {
			that.cache.set(request.id, {cb: callback}, null);
		}
	});

	request.timeout = function (ms) {
		var item = that.cache.get(request.id);
		if (!item) return request;
		if (item.timer) clearTimeout(item.timer);
		item.timer = setTimeout(getTimeoutHandler(that.cache, request.id, ms), ms);
		return request;
	}
};

function getResponseHandler(cache) {
	return function (topic, message) {
		if (!message || !message.id) return debug('response invalid message', message);

		debug('response #' + message.id, message.error ? message.error : '-', message.result ? message.result : '-');

		var item = cache.get(message.id);
		cache.del(message.id);
		if (!item) return debug('no cache callback for response #' + message.id, '. maybe it\'s timeout.');

		if (item.timer) {
			clearTimeout(item.timer);
			item.timer = null;
		}
		item.cb(null, message);
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

