import assert from 'assert';
import cb from 'assert-called';
import getPrimus from './helpers/get-primus.js';

const PORT = 11000;

let primus;

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

const runTest = async () => {
	primus = await getPrimus(PORT);
	primus.on('connection', cb(onConnection));

	getClient(primus);

	setTimeout(() => {
		primus.room('our-room').write({ hello: 'world' });
	}, 100);
};

runTest();
