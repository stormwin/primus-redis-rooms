'use strict';

const assert = require('assert'),
	cb = require('assert-called'),
	getPrimus = require('./helpers/get-primus.js'),
	PORT = 3459;

let primus, client;

function onConnection(spark) {
	spark.join('our-room');
}

const getClient = (primus) => {
	const client = new (primus.Socket)('http://localhost:' + primus.port);

	client.on('open', cb(() => undefined));

	client.on('data', cb((msg) => {
		assert.deepEqual(msg, { hello: 'world' });
		client.end();
	}));

	primus.on('leave', cb((room) => {
		assert.equal(room, primus.room('our-room'));
		process.exit();
	}));

	return client;
};

primus = getPrimus(PORT + 1);
primus.on('connection', cb(onConnection));

client = getClient(primus);

setTimeout(() => {
	primus.room('our-room').write({ hello: 'world' });
}, 100);