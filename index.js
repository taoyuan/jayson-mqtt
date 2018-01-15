'use strict';

const rayson = module.exports = require('jayson');

rayson.client.mqtt = require('./lib/mqtt/mqtt-client');
rayson.client.amqp = require('./lib/amqp/amqp-client');

rayson.server.interfaces.mqtt = require('./lib/mqtt/mqtt-server');
rayson.server.interfaces.amqp = require('./lib/amqp/amqp-server');
