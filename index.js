'use strict';

var rayson = module.exports = require('jayson');

rayson.client.mqtt = require('./lib/client/mqtt');
rayson.server.interfaces.mqtt = require('./lib/server/mqtt');
