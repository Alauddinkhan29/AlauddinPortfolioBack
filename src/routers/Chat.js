const express = require('express');
const { randomUUID } = require('node:crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { answerQuestion } = require('../services/ragService');
const { retryAfterSeconds } = require('../services/generationResilience');
const { validateHistory } = require('../services/chatHistory');

const MAX_MESSAGE_LENGTH = 500;

// Each request costs an embedding + LLM call, so this public endpoint
// needs a limit to avoid abuse burning through the free-tier quotas.
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', code: 'CHAT_RATE_LIMIT', retryAfterSeconds: 60, message: 'Too many questions. Please wait before trying again.' },
});

const observeChat = (req, res, next) => {
    const requestId = randomUUID();
    const start = Date.now();
    res.set('X-Request-Id', requestId);
    res.on('finish', () => console.log(JSON.stringify({ event: 'chat_request', requestId, status: res.statusCode, durationMs: Date.now() - start })));
    next();
};

router.post('/api/chat', observeChat, chatLimiter, async (req, res) => {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).send({ status: 'fail', message: 'message is required' });
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
        return res.status(400).send({
            status: 'fail',
            message: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
        });
    }

    let safeHistory;
    try {
        safeHistory = validateHistory(history);
    } catch (error) {
        return res.status(400).send({ status: 'fail', message: error.message });
    }

    try {
        const { answer, sources } = await answerQuestion(message.trim(), safeHistory);
        return res.status(200).send({ status: 'success', data: { answer, sources } });
    } catch (err) {
        console.error('=== error in /api/chat', { name: err.name, status: err.status, limitType: err.limitType, retryAfterSeconds: err.retryAfterSeconds });
        if (err.status === 429) {
            const wait = retryAfterSeconds(err);
            return res.set('Retry-After', String(wait)).status(429).send({
                status: 'fail', code: 'ASSISTANT_RATE_LIMIT', limitType: err.limitType, retryAfterSeconds: wait,
                message: 'The assistant reached a temporary usage limit. Please wait before trying again.',
            });
        }
        if (err.status >= 500 || err.name === 'APIConnectionTimeoutError') {
            return res.set('Retry-After', '10').status(503).send({
                status: 'fail', code: 'ASSISTANT_BUSY', retryAfterSeconds: 10,
                message: 'The assistant is temporarily busy. Please try again shortly.',
            });
        }
        return res.status(500).send({ status: 'fail', message: 'Something went wrong answering that.' });
    }
});

module.exports = router;
