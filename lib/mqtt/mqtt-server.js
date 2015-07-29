"use strict";

var debug = require('debug')('jayson:server:mqtt');
var path = require('path');
var _ = require('lodash');
var MQTTBase = require('./mqtt-base');

module.exports = MQTTServer;

/**
 *  Constructor for a Jayson MQTT server
 *  @extends require('net').Server
 *  @param {jayson.Server} server Server instance
 *  @param {Object|String} mqttclient The mqtt.js client or connection url or the options.
 *  @param {Object|String} [options] The topic or options.
 *  @param {String} options.topic The service topic. should be like `hello/:param1/:param2/service`
 *  @param {String} [options.format] The codec for encode and decode the message by default mqtt client. Cloud be `json` or
 *  `msgpack`, default is `json`.
 *  @return {MQTTServer}
 *  @api public
 */
function MQTTServer(server, mqttclient, options) {
	if (!(this instanceof MQTTServer)) return new MQTTServer(server, mqttclient, options);

	MQTTBase.call(this, mqttclient, options);

	this.options = options = _.defaults(this.options, server.options);

	debug('subscribe', options.topic);
	this.adapter.subscribe(options.topic, getRequestHandler(server, this));
}

function getRequestHandler(server, mqttserver) {
	return function (topic, message) {
		debug('received request', message);
		server.call(message, function (error, success) {
			var response = success;
			if (error) {
				response = {id: message.id, jsonrpc: message.jsonrpc, error: error}
			}
			var replyTopic = path.join(topic, 'reply');
			debug('publish reply', replyTopic, response);
			mqttserver.adapter.publish(replyTopic, response);
		});
	}
}
