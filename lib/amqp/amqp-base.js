"use strict";

const assert = require('assert');
const amqper = require('amqper');

module.exports = AMQPBase;

function isAMQPClient(obj) {
	return obj && obj.__amqper__;
}

/**
 *  @param {Object|String} amqpclient The real mqtt client or connection url or the options.
 *  @param {Object|String} [options] The topic or options.
 *  @param {String} [options.url] the connection url.
 *  @param {String} [options.exchange] The exchange string. 'amq.topic' is default.
 *  @param {String} options.topic The service topic. should be like `hello/:param1/:param2/service`
 *  @param {String} [options.format] The codec for encode and decode the message by default mqtt client. Cloud be `json` or
 *  `msgpack`, default is `json`.
 *  @param {Number} [options.timeout] The callback cache timeout. 10 seconds is default.
 *  @param {Boolean|Number} [options.scan] The interval time scan the callback cache for timeout. 10 seconds is default.
 *  @return {AMQPBase}
 *  @api public
 */
function AMQPBase(amqpclient, options) {

	if (isAMQPClient(amqpclient)) {
		this.client = amqpclient;
	} else {
		this.client = amqper.connect(amqpclient);
	}

	const client = this.client;
	if (client !== amqpclient && !options) {
		options = amqpclient;
	}

	if (typeof options === 'string') {
		options = {topic: options};
	}

	this.options = options = options || {};
	options.topic = options.topic || options.routingKey;
	assert(typeof this.options.topic === 'string', 'options.topic is required');

	options.exchange = options.exchange || 'amq.topic';

	// transform topic
	options.topic = options.topic.replace(/\//g, '.');
	options.queue = options.queue || options.topic.replace('/\:/g', '').replace('/\./g', '_');

	// init format
	client.format(options.format);

	this.format = function (fmt) {
		client.format(fmt);
	};

	this.ready = function (cb) {
		return this.$promise.asCallback(cb);
	};

	this.close = function (done) {
		return client.close(done);
	};
}
