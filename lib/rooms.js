'use strict';

const Room = require('./room'),
	uuidv4 = require('uuid/v4');

class Rooms {
	constructor(options) {

		if (typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required');
		}

		const prefix = (options.redis.channel || 'primus') + '.';
		const pattern = prefix + '*';

		this.rooms = {};
		this.id = uuidv4();
		this.redis = options.redis;
		this.redis.sub.psubscribe(pattern);
		this.channel = prefix + this.id;

		this.redis.sub.on('pmessage', (pattern_, channel, chunk) => {

			if (pattern !== pattern_ || channel === this.channel) {
				// We already wrote to our own sparks.
				return;
			}

			try {
				chunk = JSON.parse(chunk);
			}
			catch (err) {
				throw new Error(err);
			}

			let room = this.rooms['+' + chunk.room];
			if (room) {
				room.__write(chunk.data);
			}
		});
	}

	room(name) {
		if ([null, undefined, ''].includes(name)) {
			throw 'Room name cannot be empty';
		}

		if ((typeof name.toString) === 'function') {
			name = name.toString().trim();
		}

		if ((typeof name) !== 'string') {
			throw 'Room name cannot be converted to string';
		}

		let room = this.rooms['+' + name];

		if (room) {
			return room;
		}

		room = new Room({ name: name, redis: this.redis, channel: this.channel });

		this.rooms['+' + name] = room;

		room.once('empty', () => {
			this.remove(room);
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
		spark._rooms.forEach((room) => {
			room.leave(spark);
		});
		return this;
	}
}

module.exports = Rooms;
