'use strict';

var jayson = require('jayson');

var Server = require('./lib/server');
var Client = require('./lib/client');

exports.client = exports.Client = Client;

exports.server = function (methods, options) {
	var s = jayson.server(methods, options);
	s.mqtt = Server.bind(undefined, s);
	return s;
};
