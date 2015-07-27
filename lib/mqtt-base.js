"use strict";

var assert = require('assert');
var mqtt = require('./mqtt');

module.exports = MQTTBase;

/**
 *  @param {Object|String} mqttclient The real mqtt client or connection url or the options.
 *  @param {Object|String} [options] The topic or options.
 *  @param {String} [options.url] the connection url.
 *  @param {String} options.topic The service topic. should be like `hello/:param1/:param2/service`
 *  @param {String} [options.format] The codec for encode and decode the message by default mqtt client. Cloud be `json` or
 *  `msgpack`, default is `json`.
 *  @param {Number} [options.timeout] The callback cache timeout. 10 seconds is default.
 *  @param {Boolean|Number} [options.scan] The interval time scan the callback cache for timeout. 10 seconds is default.
 *  @return {MQTTBase}
 *  @api public
 */
function MQTTBase(mqttclient, options) {
	this.adapter = mqtt.connect(mqttclient);
	var client = this.mqtt = this.client = this.adapter.client;
	if (client !== mqttclient && !options) {
		options = mqttclient;
	}

	if (typeof options === 'string') {
		options = {topic: options};
	}

	this.options = options || {};
	assert(typeof this.options.topic === 'string', 'options.topic is required');

	this.format = function (fmt) {
		this.adapter.format(fmt);
	};

	this.ready = function (cb) {
		if (this.client.connected) {
			return cb();
		}
		this.client.once('connect', cb);
	};

	this.close = function (done) {
		if (this.client) {
			return this.client.end(true, done);
		}
		done();
	};
}
