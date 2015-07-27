# jayson-mqtt

[![Build](https://circleci.com/gh/taoyuan/jayson-mqtt.svg?style=shield)](https://circleci.com/gh/taoyuan/jayson-mqtt)
[![Dependencies](https://david-dm.org/taoyuan/jayson-mqtt.svg)](https://david-dm.org/taoyuan/jayson-mqtt)

> A JSON-RPC 2.0 client and server for mqtt based on jayson. 


## Installation

```
$ npm install --save jayson-mqtt
```


## Server

jason-mqtt server played as a mqtt consumer, so it need a mqtt server start first. We can use [mosca](https://github.com/mcollina/mosca).

Exposes an array of functions which retrieves and returns data.

```js
var jmqtt = require('../'/*'jayson-mqtt'*/);

var moscaServer = new require('mosca').Server({port: 9999}); // start mosca server for test

var server = jmqtt.server({
	localtime: function (cb) {
		console.log('localtime has been called');
		cb(null, new Date());
	}
}).mqtt('mqtt://localhost:9999', '$rpc/server1/localtime');

```

## Client

Consumes the api exposed by the previous example.

```js
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

```

## License

MIT © [taoyuan](https://github.com/taoyuan/jayson-mqtt)
