/**
 * Extends the Primus Spark prototype with room functionality.
 *
 * Adds the following properties and methods to each spark:
 * - `_rooms` - Array of Room instances the spark has joined
 * - `join(room)` - Join a room by name or Room instance
 * - `leave(room)` - Leave a room by name or Room instance
 * - `leaveAll()` - Leave all rooms (called automatically on disconnect)
 *
 * @param {Function} Spark - The Primus Spark constructor to extend
 */
export default (Spark) => {
	const originalInitialise = Spark.prototype.initialise;

	/**
	 * Extended initialise that sets up room tracking and auto-cleanup.
	 * @private
	 */
	Spark.prototype.initialise = function (...args) {
		/** @type {Array<import('./room.js').default>} */
		this._rooms = [];

		// Bind to preserve context when called as event handler
		this.leaveAll = this.leaveAll.bind(this);
		this.once('end', this.leaveAll);

		originalInitialise.call(this, ...args);
	};

	/**
	 * Joins this spark to a room.
	 *
	 * @param {string|import('./room.js').default} room - Room name or Room instance
	 * @returns {import('./room.js').default|import('./rooms.js').default} The room or Rooms instance
	 */
	Spark.prototype.join = function (room) {
		return this.primus.rooms.join(this, room);
	};

	/**
	 * Removes this spark from a room.
	 *
	 * @param {string|import('./room.js').default} room - Room name or Room instance
	 * @returns {import('./room.js').default|import('./rooms.js').default} The room or Rooms instance
	 */
	Spark.prototype.leave = function (room) {
		return this.primus.rooms.leave(this, room);
	};

	/**
	 * Removes this spark from all rooms it has joined.
	 * Called automatically when the spark disconnects.
	 *
	 * @returns {import('./rooms.js').default} The Rooms instance
	 */
	Spark.prototype.leaveAll = function () {
		return this.primus.rooms.leaveAll(this);
	};
};
