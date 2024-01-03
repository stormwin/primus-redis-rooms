'use strict';

const http = require('http'),
	Primus = require('primus'),
	{ createClient } = require('redis'),
	PrimusRedisRooms = require('../../lib/primus-redis-rooms.js');

module.exports = async (port) => {
	const server = http.createServer();
	const [ redisPub, redisSub ] = await Promise.all([
		createClient({ host: 'localhost' }).connect(),
		createClient({ host: 'localhost' }).connect()
	]);

	let primus = new Primus(server, {
		redis: {
			pub: redisPub,
			sub: redisSub
		},
		transformer: 'websockets'
	});
	primus.plugin('redis', {
		server: (primus, options) => new PrimusRedisRooms(primus, options)
	});


	primus.port = port;
	primus.server = server;
	server.listen(port);
	return primus;
};
