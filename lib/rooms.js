import Room from './room.js';
import { randomUUID } from 'crypto';

/**
 * @typedef {Object} RedisOptions
 * @property {Object} pub - Redis publisher client
 * @property {Object} sub - Redis subscriber client
 * @property {string} [channel='primus'] - Base channel name for pub/sub
 */

/**
 * @typedef {Object} RoomsOptions
 * @property {RedisOptions} redis - Redis configuration
 */

/**
 * Manages multiple rooms for a Primus server instance.
 * Handles room creation, joining, leaving, and cross-server messaging via Redis pub/sub.
 *
 * @class Rooms
 */
export default class Rooms {
	/**
	 * Creates a new Rooms manager instance.
	 *
	 * @param {RoomsOptions} options - Configuration options
	 * @throws {TypeError} If options.redis is not provided or invalid
	 */
	constructor(options) {
		if (!options?.redis || typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required and must be an object');
		}

		const prefix = (options.redis.channel || 'primus') + '.';
		const pattern = prefix + '*';

		/** @type {Map<string, Room>} */
		this.rooms = new Map();

		/** @type {string} Unique identifier for this server instance */
		this.id = randomUUID();

		/** @type {RedisOptions} */
		this.redis = options.redis;

		/** @type {string} Redis channel for this instance */
		this.channel = prefix + this.id;

		this.redis.sub.pSubscribe(pattern, (message, channel) => {
			// Ignore messages from our own channel
			if (channel === this.channel) {
				return;
			}

			let parsed;
			try {
				parsed = JSON.parse(message);
			} catch {
				// Silently ignore malformed messages - could be from other applications
				// using the same Redis channel prefix
				return;
			}

			const room = this.rooms.get(parsed.room);
			if (room) {
				room.__write(parsed.data);
			}
		});
	}

	/**
	 * Gets or creates a room by name.
	 *
	 * @param {string|number|{toString(): string}} name - Room name (will be converted to string)
	 * @returns {Room} The room instance
	 * @throws {Error} If room name is empty or cannot be converted to string
	 */
	room(name) {
		// Validate and normalize room name
		if (name == null || name === '') {
			throw new Error('Room name cannot be empty');
		}

		name = String(name).trim();

		if (!name) {
			throw new Error('Room name cannot be empty after trimming');
		}

		// Return existing room if found
		const existingRoom = this.rooms.get(name);
		if (existingRoom) {
			return existingRoom;
		}

		// Create new room
		const room = new Room({
			name,
			redis: this.redis,
			channel: this.channel
		});

		this.rooms.set(name, room);

		// Clean up room when empty
		room.once('empty', () => {
			this.remove(room);
		});

		return room;
	}

	/**
	 * Joins a spark to a room.
	 *
	 * @param {Object} spark - The Primus spark (client connection)
	 * @param {Room|string} room - Room instance or room name
	 * @returns {Room|Rooms} The room if Room instance provided, otherwise this for chaining
	 */
	join(spark, room) {
		if (room instanceof Room) {
			return room.join(spark);
		}

		this.room(room).join(spark);
		return this;
	}

	/**
	 * Removes a spark from a room.
	 *
	 * @param {Object} spark - The Primus spark (client connection)
	 * @param {Room|string} room - Room instance or room name
	 * @returns {Room|Rooms} The room if Room instance provided, otherwise this for chaining
	 */
	leave(spark, room) {
		if (room instanceof Room) {
			return room.leave(spark);
		}

		const existingRoom = this.rooms.get(room);
		if (existingRoom) {
			existingRoom.leave(spark);
		}
		return this;
	}

	/**
	 * Removes a room from the manager.
	 *
	 * @param {Room} room - The room to remove
	 * @returns {Rooms} This instance for chaining
	 */
	remove(room) {
		this.rooms.delete(room.name);
		return this;
	}

	/**
	 * Removes a spark from all rooms it has joined.
	 *
	 * @param {Object} spark - The Primus spark (client connection)
	 * @returns {Rooms} This instance for chaining
	 */
	leaveAll(spark) {
		// Iterate over a copy to avoid mutation issues during iteration
		for (const room of [...spark._rooms]) {
			room.leave(spark);
		}
		return this;
	}
}
