'use strict';

const 	Room = require('./room'),
	uuid = require('node-uuid');

class Rooms {
	constructor(options){

		if (typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required');
		}

		const prefix = (options.redis.channel || 'primus') + '.';
		const pattern = prefix + '*';

		this.rooms = {};
		this.id = uuid.v4();
		this.redis = options.redis;
		this.redis.sub.psubscribe(pattern);
		this.channel = prefix + this.id;
		let self = this;

		this.redis.sub.on('pmessage', function (pattern_, channel, chunk) {

			if (pattern !== pattern_ || channel === self.channel) {
				// We already wrote to our own sparks.
				return;
			}

			try {
				chunk = JSON.parse(chunk);
			}
			catch (err) {
				throw new Error(err);
			}

			let room = self.rooms['+' + chunk.room];
			if (room) {
				room.__write(chunk.data);
			}
		});
	}

	room(name) {
		let room = this.rooms['+' + name];

		if (room) {
			return room;
		}

		room = new Room({ name: name, redis: this.redis, channel: this.channel });

		this.rooms['+' + name] = room;
		let self = this;
		room.once('empty', function () {
			self.remove(room);
			room = null;
		});

		return room;
	}

	join(spark, room) {
		if (room instanceof Room) {
			return room.join(spark);
		}

		this.room(room).join(spark);
		return this;
	}

	leave(spark, room) {
		if (room instanceof Room) {
			return room.leave(spark);
		}

		room = this.rooms['+' + room];
		if (room) {
			room.leave(spark);
		}
		return this;
	}

	remove(room) {
		delete this.rooms['+' + room.name];
		return this;
	}

	leaveAll(spark) {
		spark._rooms.forEach(function (room) {
			room.leave(spark);
		});
		return this;
	}
}

module.exports = Rooms;
