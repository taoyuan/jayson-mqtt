"use strict";

var t = require('chai').assert;
var s = require('./support');
var rayson = require('../');

describe('Rayson.MQTT', function() {

	describe('server', function () {

		var server = null;

		before(s.abStartMosca());

		after(function (done) {
			if (server) return server.mqtt.end(done);
			done();
		});

		after(s.abStopMosca());

		it('should connect to ', function(done) {
			server = rayson.server(s.server.methods).mqtt('mqtt://localhost:' + s.port, '$RPC/service/123');
			if (server.mqtt.connected) return done();
			server.mqtt.on('connect', done);
		});

	});

	describe('client', function() {

		var url = 'mqtt://localhost:' + s.port;

		var server, client;

		before(s.abStartMosca());

		before(function () {
			server = rayson.server(s.server.methods).mqtt(url, '$RPC/service/123');
			client = rayson.client.mqtt(url, {topic: '$RPC/service/:service'});
		});

		after(function (done) {
			server.mqtt.end(function () {
				client.mqtt.end(done);
			});
		});

		after(s.abStopMosca());


		it('should request with array params', function (done) {
			client
				.service('123')
				.request('add', [2, 3], function (err, error, data) {
					t.equal(data, 5);
					done();
				});
		});

		it('should request with object params', function (done) {
			client
				.service('123')
				.request('add', {a: 2, b: 3}, function (err, error, data) {
					t.equal(data, 5);
					done();
				});
		});

		it('should callback with an error on timeout', function(done) {
			client.request('add_slow', [4, 3, true], function(err, response) {
				t.instanceOf(err, Error);
				t.notOk(response);
				done();
			}).timeout(10);
		});

		it('should timeout if path param is incorrect', function (done) {
			client
				.service('321')
				.request('add', {a: 2, b: 3}, function(err, response) {
					t.instanceOf(err, Error);
					t.notOk(response);
					done();
				}).timeout(10);
		});
	});
});
