var debug = require('debug')('jayson:client:mqtt');
var path = require('path');
var assert = require('assert');
var _ = require('lodash');
var Expirable = require('expirable');
var Client = require('jayson').Client;
var mqtt = require('../mqtt');
var errors = require('../errors');

/**
 *  Constructor for a Jayson MQTT Client
 *  @class Jayson JSON-RPC MQTT Client
 *  @constructor
 *  @extends Client
 *  @param {Object|String} mqttclient The real mqtt client or connection url or connect options.
 *  @param {Object|String} [options] The topic or options.
 *  @param {String} options.topic The service topic. should be like `hello/:param1/:param2/service`
 *  @param {Number} [options.timeout] The callback cache timeout. 10 seconds is default.
 *  @param {Boolean|Number} [options.scan] The interval time scan the callback cache for timeout. 10 seconds is default.
 *  @param {String} [options.format] The codec for encode and decode the message by default mqtt client. Cloud be `json` or
 *  `msgpack`, default is `json`.
 *  @return {MQTTClient}
 *  @api public
 */
function MQTTClient(mqttclient, options) {
	if (!(this instanceof MQTTClient)) return new MQTTClient(mqttclient, options);
	Client.call(this);

	var that = this;
	this.adapter = mqtt.connect(mqttclient);
	this.mqtt = this.adapter.client;

	if (typeof options === 'string') {
		options = {topic: options};
	}

	this.options = options = options || {};
	assert(typeof options.topic === 'string', 'options.topic is required');

	options.timeout = options.timeout || 10; // seconds
	if (options.scan !== false) {
		options.scan = options.scan === true ? 10 : Number(options.scan);
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

	// init call back cache
	var cache = this.cache = new Expirable({expiree: options.timeout + 's', interval: options.scan});
	if (options.scan) cache.start();

	// subscribe reply topic
	var replyTopic = path.join(options.topic, 'reply');
	debug('subscribe reply topic:', replyTopic);
	this.adapter.subscribe(replyTopic, getResponseHandler(this));
}

require('util').inherits(MQTTClient, Client);

module.exports = MQTTClient;

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
	var item = {cb: callback};
	this.adapter.publish(topic, request, function (err) {
		if (err) return callback(err);
		that.cache.set(request.id, item, null);
	});

	request.timeout = function (ms) {
		var item = that.cache.get(request.id);
		if (!item) return request;
		if (item.timer) clearTimeout(item.timer);
		item.timer = setTimeout(getTimeoutHandler(that.cache, request.id, ms), ms);
		return request;
	}
};

function getResponseHandler(client) {
	return function (topic, message) {
		if (!message || !message.id) return debug('response invalid message', message);

		debug('response #' + message.id, message.error ? message.error : '-', message.result ? message.result : '-');

		var item = client.cache.get(message.id, true);
		client.cache.remove(message.id, false);
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
		cache.remove(id);
		debug('response #' + id, 'with timeout error after ' + ms + 'ms');
		item.cb(new errors.TimeoutError('Request timed out after ' + ms + 'ms'));
	}
}

