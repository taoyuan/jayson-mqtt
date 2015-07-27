"use strict";

var jmqtt = require('../'/*'jayson-mqtt'*/);

var client = jmqtt.client('mqtt://localhost:9999', '$rpc/:sid/localtime');

client.mqtt.on('error', function (err) {
	console.error(err);
});

client.mqtt.on('connect', function () {
	console.log('connected');
});

client.mqtt.on('reconnect', function () {
	console.log('reconnect');
});

client.mqtt.on('offline', function () {
	console.log('offline');
});

client.sid('server1').request('localtime', [], function(err, error, time) {
	console.log('localtime: ', time);
}).timeout(10);
