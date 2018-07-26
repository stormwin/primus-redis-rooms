'use strict';

const http = require('http'),
	Primus = require('primus'),
	Redis = require('redis'),
	PrimusRedisRooms = require('../../lib/primus-redis-rooms.js');

module.exports = (port) => {
	const server = http.createServer();
	let primus = new Primus(server, {
		redis: {
			pub: Redis.createClient({ host: 'localhost', port: 6379 }),
			sub: Redis.createClient({ host: 'localhost', port: 6379 })
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