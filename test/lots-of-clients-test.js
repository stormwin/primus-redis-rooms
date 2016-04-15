'use strict';

const 	assert = require('assert'),
		cb = require('assert-called'),
		getPrimus = require('./helpers/get-primus.js'),
		PORT = 3456;

let clients = 0;
let primus0, primus1;

function onConnection(spark) {
	spark.join('our-room');
}

function getClient(primus) {
	clients += 3;
	const client = new (primus.Socket)('http://localhost:' + primus.port);

	client.on('open', cb(function () { }));

	client.on('data', cb(function (msg) {
		assert.deepEqual(msg, { hello: 'world' });
		clients--;
		console.log('clients left', clients);
		if (clients === 0) {
			process.exit();
		}
	}));
}

primus0 = getPrimus(PORT+1);
primus1 = getPrimus(PORT+2);

primus0.on('connection', cb(onConnection));
primus1.on('connection', cb(onConnection));

for (let i = 0; i < 100; i++) {
	getClient(primus0);
	getClient(primus1);
}

setTimeout(function () {
	primus0.room('our-room').write({ hello: 'world' });
	setTimeout(function () {
		primus1.room('our-room').write({ hello: 'world' });

		setTimeout(function () {
			primus0.room('our-room').write({ hello: 'world' });
		}, 50);
	}, 50);
}, 1000);