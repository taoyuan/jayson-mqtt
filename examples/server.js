"use strict";

const rayson = require('..'/*'rayson'*/);

// const moscaServer = new require('mosca').Server({port: 9999}); // start mosca server for test

const server = rayson.server({
	localtime: function (cb) {
		console.log('localtime has been called');
		cb(null, new Date());
	}
}, {collect: false}).mqtt('mqtt://localhost:9999', '$rpc/server1/localtime');

// server.format('msgpack'); // default is `json`
