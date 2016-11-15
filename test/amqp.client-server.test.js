"use strict";

var t = require('chai').assert;
var s = require('./support');
var rayson = require('../');

describe('Rayson.AMQP', function () {
	this.timeout(10000);

	describe('server', function () {

		var server = null;

		after(function (done) {
			server.close(done);
		});

		it('should connect to ', function (done) {
			server = rayson.server(s.server.methods).amqp('amqp://localhost', '$RPC/service/123');
			server.ready(function () {
				s.delaycall(done);
			});
		});

	});

	describe('client', function () {

		it('should initiate client with 2 params', function (done) {
			var client = rayson.client.amqp('amqp://localhost', '$RPC/service/:service');
			t.ok(client.client);
			t.ok(client.options.topic);
			client.close(done);
		});

		it('should initiate client with 1 params', function (done) {
			var client = rayson.client.amqp({url: 'amqp://localhost', topic: '$RPC/service/:service'});
			t.ok(client.client);
			t.ok(client.options.topic);
			client.close(done);
		});

		it('should initiate amqp js client', function (done) {
			var amqpclient = require('amqper').connect('amqp://localhost');
			var client = rayson.client.amqp(amqpclient, {topic: '$RPC/service/:service'});
			t.equal(client.client, amqpclient);
			t.ok(client.options.topic);
			client.close(done);
		});
	});

	describe('integration', function () {
		var url = 'amqp://localhost';

		var server, client;

		beforeEach(function (done) {
			server = rayson.server(s.server.methods).amqp(url, 'rpc/service/123');
			client = rayson.client.amqp(url, {topic: 'rpc/service/:service'});

			server.ready(function () {
				s.delaycall(100, done);
			})
		});

		afterEach(function (done) {
			server.close(function () {
				client.close(done);
			});
		});

		it('should request with array params', function (done) {
			client
				.for(['123'])
				.request('add', [2, 3], function (err, error, data) {
					t.equal(data, 5);
					s.delaycall(done);
				});
		});

		it('should request with object params', function (done) {
			client
				.for({service: '123'})
				.request('add', {a: 2, b: 3}, function (err, error, data) {
					t.equal(data, 5);
					s.delaycall(done);
				});
		});

		it('should callback with an error on timeout', function (done) {
			client
				.for('321')
				.request('add_slow', [4, 3, true], function (err, response) {
					t.instanceOf(err, Error);
					t.notOk(response);
					s.delaycall(done);
				}).timeout(10);
		});

		it('should timeout if path param is incorrect', function (done) {
			client
				.for('321')
				.request('add', {a: 2, b: 3}, function (err, response) {
					t.instanceOf(err, Error);
					t.notOk(response);
					s.delaycall(done);
				}).timeout(10);
		});

		it('should throw error without params settings', function () {
			t.throw(function () {
				client.request('add', [2, 3], function (err, error, data) {
				});
			});
		});
	});
});

