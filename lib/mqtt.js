"use strict";

function noop() {
// noop
}

function isMqttClient(obj) {
	return obj && obj.subscribe && obj.publish;
}

exports.connect = function connect(client, options) {
	if (!isMqttClient(client)) {
		client = require('mqtt').connect(client);
	}
	var router = require('mqtt-router').wrap(client);
	var codec;

	format(options && options.fmt);

	function format(fmt) {
		codec = require('./codecs').byName(fmt || 'json');
	}

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

