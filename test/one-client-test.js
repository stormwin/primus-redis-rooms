'use strict';

const 	assert = require('assert'),
		cb = require('assert-called'),
		getPrimus = require('./helpers/get-primus.js'),
		PORT = 3459;

const noop = function () {};

let primus, client;

function onConnection(spark) {
	spark.join('our-room');
}

function getClient(primus) {
	const client = new (primus.Socket)('http://localhost:' + primus.port);

	client.on('open', cb(noop));

	client.on('data', cb(function (msg) {
		assert.deepEqual(msg, { hello: 'world' });
		client.end();
	}));

	primus.on('leave', cb(function onleave(room) {
		assert.equal(room, primus.room('our-room'));
		process.exit();
	}));

	return client;
}

primus = getPrimus(PORT+1);
primus.on('connection', cb(onConnection));

client = getClient(primus);

setTimeout(function () {
	primus.room('our-room').write({ hello: 'world' });
}, 100);