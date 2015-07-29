"use strict";

var debug = require('debug')('rayson:amqp:server');
var path = require('path');
var _ = require('lodash');
var AMQPBase = require('./amqp-base');

module.exports = AMQPServer;

/**
 *  Constructor for a Jayson MQTT server
 *  @param {jayson.Server} server Server instance
 *  @param {Object|String} amqpclient The mqtt.js client or connection url or the options.
 *  @param {Object|String} [options] The topic or options.
 *  @param {String} options.topic The service topic. should be like `hello/:param1/:param2/service`
 *  @param {String} [options.format] The codec for encode and decode the message by default mqtt client. Cloud be `json` or
 *  `msgpack`, default is `json`.
 *  @return {AMQPServer}
 *  @api public
 */
function AMQPServer(server, amqpclient, options) {
	if (!(this instanceof AMQPServer)) return new AMQPServer(server, amqpclient, options);

	AMQPBase.call(this, amqpclient, options);

	this.options = options = _.defaults(this.options, server.options);

	var that = this;
	var client = this.client;
	this.$promise = client.$promise.then(function () {
		debug('subscribe', options.topic);
		return client.subscribe(options.topic, options, getRequestHandler(server, that));
	});
}

AMQPServer.prototype.ready = function (cb) {
	return this.$promise.then(function () {
		if (cb) cb();
	})
};

function getRequestHandler(server, mqttserver) {
	return function (message) {
		var payload = message.payload;
		debug('received request', payload);
		server.call(payload, function (error, success) {
			var response = success;
			if (error) {
				response = {id: payload.id, jsonrpc: payload.jsonrpc, error: error}
			}
			var replyTo = message.fields.routingKey + '.reply';
			debug('publish reply', replyTo, response);
			mqttserver.client.publish(message.fields.exchange, replyTo, response);
		});
	}
}
