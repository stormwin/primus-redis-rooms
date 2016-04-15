'use strict';

const 	assert = require('assert'),
		cb = require('assert-called'),
		getPrimus = require('./helpers/get-primus.js');

let PORT = 3457;

var clients = 0;
var primus0, primus1;

function onConnection(spark) {
	spark.join('our-room');
}

function getClient(primus) {
	++clients;
	const client = new (primus.Socket)('http://localhost:' + primus.port);

	client.on('open', cb(function () { }));

	client.on('data', cb(function (msg) {
		assert.deepEqual(msg, { hello: 'world' });
		clients--;
		console.log('clients left', clients, msg);
		if (clients === 0) {
			process.exit();
		}
	}));
}

primus0 = getPrimus(PORT++);
primus1 = getPrimus(PORT++);

primus0.on('connection', cb(onConnection));
primus1.on('connection', cb(onConnection));

getClient(primus0);
getClient(primus1);

setTimeout(function () {
	primus0.room('our-room').write({ hello: 'world' });
	primus1.room('our-room').write({ hello: 'world' });
}, 100);