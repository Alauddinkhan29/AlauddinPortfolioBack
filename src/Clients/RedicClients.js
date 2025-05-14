const redis = require('redis');

const redisClient = redis.createClient(
    {
        url: process.env.REDIS_URL || 'redis://localhost:6379', // dynamic from Heroku env
        socket: {
            tls: true,
            rejectUnauthorized: false, // <-- Accept self-signed certificate
        },
    }
);

redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    await redisClient.connect();
})();

module.exports = redisClient;
