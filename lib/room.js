'use strict';

const Writable = require('stream').Writable;

class Room extends Writable {
	constructor (options) {
		if (typeof options.name !== 'string') {
			throw new TypeError('`options.name` is required');
		}
		super({ objectMode: true });

		this.name = options.name;
		this.sparks = options.sparks || [];
		this.pub = options.redis.pub;
		this.channel = options.channel;
	}

	_write(data, enc, callback) {
		this.__write(data);
		this.pub.publish(this.channel, JSON.stringify({ room: this.name, data: data }));
		callback();
		return this;
	}

	__write(data) {
		this.sparks.forEach(function (spark) {
			spark.write(data);
		});
		return this;
	}

	join(spark) {
		if (this.sparks.indexOf(spark) === -1) {
			this.sparks.push(spark);
			spark._rooms.push(this);
		}
		return this;
	}

	leave(spark) {
		let index = this.sparks.indexOf(spark);
		if (index !== -1) {
			this.sparks.splice(index, 1);
		}

		index = spark._rooms.indexOf(this);
		if (index !== -1) {
			spark._rooms.splice(index, 1);
		}

		spark.primus.emit('leave', this, spark);

		if (this.sparks.length === 0) {
			this.emit('empty');
		}

		return this;
	}

	clients() {
		return this.sparks;
	}
}

module.exports = Room;