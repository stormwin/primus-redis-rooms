var redis = require('redis');
var sentinel = require('redis-sentinel');
var Rooms = require('./rooms');
var Spark = require('./spark');

var PrimusRedisRooms = module.exports = function (primus, options) {
  var self = this;
  var sub, pub, channel;
  self.options = options;

  function getClient() {
    if (self.options.redis.sentinel) {
      return sentinel.createClient(
        self.options.redis.endpoints,
        self.options.redis.masterName,
        self.options.redis
      );
    }

    return redis.createClient(self.options.redis.port, self.options.redis.host, self.options.redis.options);
  }

  channel = options.redis.channel || 'primus';

  pub = options.redis.pub || getClient();
  sub = options.redis.sub || getClient();

  self.rooms = new Rooms({
    redis: {
      pub: pub,
      sub: sub,
      channel: channel
    }
  });

  primus.room = function (name) {
    return self.rooms.room(name);
  };

  Spark(primus.Spark);
};

// Hack so that you can `primus.use(require('primus-redis-rooms'))`.
PrimusRedisRooms.server = PrimusRedisRooms;
