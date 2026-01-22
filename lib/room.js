import { Writable } from 'stream';

/**
 * Represents a room that clients can join to receive broadcast messages.
 * Extends Node.js Writable stream for pipe support.
 *
 * @class Room
 * @extends {Writable}
 */
export default class Room extends Writable {
	/**
	 * Creates a new Room instance.
	 *
	 * @param {Object} options - Room configuration options
	 * @param {string} options.name - Unique room identifier
	 * @param {Object} options.redis - Redis configuration
	 * @param {Object} options.redis.pub - Redis publisher client
	 * @param {string} options.channel - Redis channel for pub/sub
	 * @throws {TypeError} If options is not an object
	 * @throws {TypeError} If options.name is not a non-empty string
	 * @throws {TypeError} If options.redis.pub is not provided
	 * @throws {TypeError} If options.channel is not a string
	 */
	constructor(options) {
		if (!options || typeof options !== 'object') {
			throw new TypeError('options object is required');
		}
		if (typeof options.name !== 'string' || !options.name.trim()) {
			throw new TypeError('options.name must be a non-empty string');
		}
		if (!options.redis?.pub) {
			throw new TypeError('options.redis.pub is required');
		}
		if (typeof options.channel !== 'string') {
			throw new TypeError('options.channel is required');
		}

		super({ objectMode: true });

		this.name = options.name;
		this.sparks = options.sparks ? new Set(options.sparks) : new Set();
		this.pub = options.redis.pub;
		this.channel = options.channel;
	}

	/**
	 * Writable stream _write implementation. Broadcasts data to all local sparks
	 * and publishes to Redis for cross-server distribution.
	 *
	 * @param {*} data - Data to write/broadcast
	 * @param {string} encoding - Character encoding (unused in object mode)
	 * @param {Function} callback - Callback to signal write completion
	 * @private
	 */
	_write(data, encoding, callback) {
		this.__write(data);

		let serialized;
		try {
			serialized = JSON.stringify({ room: this.name, data });
		} catch (_err) {
			return false;
		}

		this.pub.publish(this.channel, serialized);
		callback?.();

		return true;
	}

	/**
	 * Internal method to broadcast data to all sparks in this room.
	 *
	 * @param {*} data - Data to broadcast to all connected sparks
	 * @returns {Room} This room instance for chaining
	 * @private
	 */
	__write(data) {
		for (const spark of this.sparks) {
			spark.write(data);
		}
		return this;
	}

	/**
	 * Adds a spark (client connection) to this room.
	 * If the spark is already in the room, this is a no-op.
	 *
	 * @param {Object} spark - The Primus spark to add to the room
	 * @returns {Room} This room instance for chaining
	 */
	join(spark) {
		if (!this.sparks.has(spark)) {
			this.sparks.add(spark);
			spark._rooms.push(this);
		}
		return this;
	}

	/**
	 * Removes a spark (client connection) from this room.
	 * Emits 'leave' event on the primus instance and 'empty' event if room becomes empty.
	 *
	 * @param {Object} spark - The Primus spark to remove from the room
	 * @returns {Room} This room instance for chaining
	 */
	leave(spark) {
		this.sparks.delete(spark);

		const index = spark._rooms.indexOf(this);
		if (index !== -1) {
			spark._rooms.splice(index, 1);
		}

		spark.primus.emit('leave', this, spark);

		if (this.sparks.size === 0) {
			this.emit('empty');
		}

		return this;
	}

	/**
	 * Returns an array of all sparks (client connections) currently in this room.
	 *
	 * @returns {Array<Object>} Array of spark objects in this room
	 */
	clients() {
		return [...this.sparks];
	}
}
