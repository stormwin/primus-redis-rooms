'use strict';

const Rooms = require('./rooms'),
	Spark = require('./spark');

class PrimusRedisRooms {
	constructor (primus, options) {


		if (typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required');
		}

		this.channel = options.redis.channel || 'primus';

		primus.rooms = new Rooms({
			redis: {
				pub: options.redis.pub,
				sub: options.redis.sub,
				channel: this.channel
			}
		});

		primus.room = function (name) {
			return this.rooms.room(name);
		};

		Spark(primus.Spark);
	}
}

module.exports = PrimusRedisRooms;