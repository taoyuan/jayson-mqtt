# rayson

[![Build Status](https://travis-ci.org/taoyuan/rayson.svg?branch=master)](https://travis-ci.org/taoyuan/rayson)
[![Dependencies](https://david-dm.org/taoyuan/rayson.svg)](https://david-dm.org/taoyuan/rayson)

> Rayson is a JSON-RPC 2.0 mqtt client and mqtt server for node.js based on jayson.


## Installation

```
$ npm install --save rayson
```


## Server

jason-mqtt server played as a mqtt consumer, so it need a mqtt server start first. We can use [mosca](https://github.com/mcollina/mosca).

Exposes an array of functions which retrieves and returns data.

```js
var rayson = require('../'/*'rayson'*/);

var moscaServer = new require('mosca').Server({port: 9999}); // start mosca server for test

var server = rayson.server({
	localtime: function (cb) {
		console.log('localtime has been called');
		cb(null, new Date());
	}
}).mqtt('mqtt://localhost:9999', '$rpc/server1/localtime');

server.format('msgpack'); // default is `json`

```

## Client

Consumes the api exposed by the previous example.

```js
var rayson = require('../'/*'rayson'*/);

var client = rayson.client.mqtt('mqtt://localhost:9999', '$rpc/:sid/localtime');

client.format('msgpack'); // default is `json`

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

```

## License

MIT © [taoyuan](https://github.com/taoyuan/rayson)
