"use strict";

function noop() {
// noop
}

function isMqttClient(obj) {
	return obj && obj.subscribe && obj.publish;
}

/**
 *
 * @param {mqtt.Client|Object|String} client The mqtt.js client or options object or connect url.
 * @param {Object} [options] The additional options.
 * @returns {{client: *, router, format: format, subscribe: Function, publish: Function}}
 */
exports.connect = function connect(client, options) {
	if (!isMqttClient(client)) {
		options = options || client || {};
		if (client.url) {
			client = require('mqtt').connect(client.url, client);
		} else {
			client = require('mqtt').connect(client);
		}
	}
	var router = require('mqtt-router').wrap(client);
	var codec;

	function format(fmt) {
		codec = require('./codecs').byName(fmt || 'json');
	}

	format((options && options.format));

	return {
		client: client,
		router: router,
		format: format,
		subscribe: function(topic, opts, handler) {
			// .subscribe('topic', handler)
			if ('function' === typeof opts) {
				handler = opts;
				opts = null;
			}
			handler = handler || noop;
			topic = topic.replace(/:/g, '+:');
			return router.subscribe(topic, opts, function (topic, message) {
				handler(topic, codec.decode(message));
			});
		},
		publish: function(topic, msg, cb) {
			client.publish(topic, codec.encode(msg), cb);
		}
	}
};

