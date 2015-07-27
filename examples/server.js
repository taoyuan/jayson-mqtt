"use strict";

var rayson = require('../'/*'rayson'*/);

var moscaServer = new require('mosca').Server({port: 9999}); // start mosca server for test

var server = rayson.server({
	localtime: function (cb) {
		console.log('localtime has been called');
		cb(null, new Date());
	}
}).mqtt('mqtt://localhost:9999', '$rpc/server1/localtime');

server.format('msgpack'); // default is `json`
