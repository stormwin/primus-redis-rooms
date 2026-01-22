import Rooms from './rooms.js';
import Spark from './spark.js';

/**
 * @typedef {Object} RedisConfig
 * @property {Object} pub - Redis publisher client instance
 * @property {Object} sub - Redis subscriber client instance
 * @property {string} [channel='primus'] - Base channel name for Redis pub/sub
 */

/**
 * @typedef {Object} PrimusRedisRoomsOptions
 * @property {RedisConfig} redis - Redis configuration object
 */

/**
 * Primus plugin that adds room functionality with Redis-backed pub/sub
 * for cross-server message broadcasting.
 *
 * This plugin extends a Primus server instance with:
 * - `primus.rooms` - A Rooms manager for creating and managing rooms
 * - `primus.room(name)` - Shorthand method to get or create a room
 * - Spark prototype methods: `join()`, `leave()`, `leaveAll()`
 *
 * @class PrimusRedisRooms
 *
 * @example
 * import Primus from 'primus';
 * import PrimusRedisRooms from 'primus-redis-rooms';
 * import { createClient } from 'redis';
 *
 * const primus = new Primus(server);
 * const pub = createClient();
 * const sub = pub.duplicate();
 *
 * await Promise.all([pub.connect(), sub.connect()]);
 *
 * new PrimusRedisRooms(primus, {
 *   redis: { pub, sub, channel: 'myapp' }
 * });
 *
 * // Now you can use rooms
 * primus.room('lobby').write({ message: 'Hello everyone!' });
 */
export default class PrimusRedisRooms {
	/**
	 * Creates a new PrimusRedisRooms plugin instance and attaches it to a Primus server.
	 *
	 * @param {Object} primus - The Primus server instance to extend
	 * @param {PrimusRedisRoomsOptions} options - Plugin configuration options
	 * @throws {TypeError} If options.redis is not an object
	 */
	constructor(primus, options) {
		if (!options?.redis || typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required and must be an object');
		}

		/** @type {string} Base channel name for Redis pub/sub */
		this.channel = options.redis.channel || 'primus';

		primus.rooms = new Rooms({
			redis: {
				pub: options.redis.pub,
				sub: options.redis.sub,
				channel: this.channel
			}
		});

		/**
		 * Shorthand method to get or create a room by name.
		 * @param {string} name - Room name
		 * @returns {import('./room.js').default} The room instance
		 */
		primus.room = (name) => {
			return primus.rooms.room(name);
		};

		Spark(primus.Spark);
	}
}
