const retryAfterSeconds = (error, now = Date.now()) => {
    const value = error.retryAfterSeconds ?? error.headers?.get?.('retry-after') ?? error.headers?.['retry-after'];
    const number = Number(value);
    if (value != null && Number.isFinite(number) && number > 0) return Math.ceil(number);
    const date = Date.parse(value);
    return Number.isFinite(date) && date > now ? Math.ceil((date - now) / 1000) : 30;
};

const createGenerationManager = ({ createCompletion, now = Date.now, ttlMs = 5 * 60 * 1000, maxEntries = 64 }) => {
    const cache = new Map();
    const inFlight = new Map();
    let blockedUntil = 0;
    let blockedType;
    const generate = async (key, options) => {
        for (const [id, entry] of cache) if (entry.expiresAt <= now()) cache.delete(id);
        const saved = cache.get(key);
        if (saved) return { response: saved.response, cacheHit: true };
        if (inFlight.has(key)) return inFlight.get(key);
        if (now() < blockedUntil) {
            const error = new Error('Provider cooldown is active');
            error.status = 429;
            error.retryAfterSeconds = Math.ceil((blockedUntil - now()) / 1000);
            error.limitType = blockedType;
            throw error;
        }
        const pending = (async () => {
            try {
                const response = await Promise.resolve().then(() => createCompletion(options));
                const answer = response.choices?.[0]?.message?.content;
                if (typeof answer !== 'string' || !answer.trim() || response.choices[0].finish_reason === 'length') {
                    const error = new Error('Generation did not produce a complete answer');
                    error.status = 502;
                    throw error;
                }
                if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
                cache.set(key, { response, expiresAt: now() + ttlMs });
                return { response, cacheHit: false };
            } catch (error) {
                if (error.status === 429) {
                    const detail = error.error?.error?.message || error.message || '';
                    error.limitType = /tokens per day|TPD/i.test(detail) ? 'daily_tokens'
                        : /tokens per minute|TPM/i.test(detail) ? 'minute_tokens' : 'provider';
                    blockedType = error.limitType;
                    error.retryAfterSeconds = retryAfterSeconds(error, now());
                    blockedUntil = Math.max(blockedUntil, now() + error.retryAfterSeconds * 1000);
                }
                throw error;
            } finally {
                inFlight.delete(key);
            }
        })();
        inFlight.set(key, pending);
        return pending;
    };
    return { generate };
};

module.exports = { createGenerationManager, retryAfterSeconds };
