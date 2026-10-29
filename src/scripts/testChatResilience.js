// Read-only Atlas context check + simulated provider faults (no Groq calls).
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const raw = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
Object.assign(process.env, require('dotenv').parse(raw));
const { createGenerationManager, retryAfterSeconds } = require('../services/generationResilience');
const run = async () => {
    let server;
    const rag = require('../services/ragService');
    const originalAnswer = rag.answerQuestion;
    try {
        await mongoose.connect(raw.match(/mongodb\+srv:\/\/[^\s'"\r\n]+/)[0]);
        const { chunks, retrieved } = await rag.retrieveAnswerContext('What React Native projects has Alauddin shipped?', { withDiagnostics: true });
        const KbChunk = require('../models/KbChunk');
        assert.equal(chunks.filter(c => c.source === 'resume').length, await KbChunk.countDocuments({ source: 'resume' }));
        assert(chunks.some(c => c.source === 'profile'));
        assert.equal(new Set(chunks.filter(c => c.source === 'project').map(c => c.source_ref)).size, await KbChunk.countDocuments({ source: 'project' }));
        assert(chunks.filter(c => c.source === 'project' && c.content.includes('\nDescription:')).length <= 2);
        const detail = retrieved.filter(c => c.source === 'project');
        const savedChars = detail.slice(2).reduce((sum,c) => sum + c.content.length, 0);
        console.log(`PASS context: complete career/project metadata kept; ${savedChars} unnecessary description characters removed for this query.`);

        let clock = 0;
        let calls = 0;
        let limited = true;
        const manager = createGenerationManager({ now: () => clock, ttlMs: 10000, createCompletion: async () => {
            calls += 1;
            if (limited) { const error = new Error('Simulated limit'); error.status = 429; error.headers = new Headers({ 'retry-after': '2' }); throw error; }
            return { choices: [{ message: { content: 'Verified test response' }, finish_reason: 'stop' }] };
        } });
        await assert.rejects(manager.generate('a', {}), e => e.status === 429 && e.retryAfterSeconds === 2);
        await assert.rejects(manager.generate('b', {}), e => e.status === 429);
        assert.equal(calls, 1);
        clock = 2001; limited = false;
        assert.equal((await manager.generate('b', {})).cacheHit, false);
        assert.equal((await manager.generate('b', {})).cacheHit, true);
        assert.equal(calls, 2);
        clock += 10001;
        await manager.generate('b', {});
        assert.equal(calls, 3);
        assert.equal(retryAfterSeconds({ headers: { 'retry-after': '2.1' } }), 3);
        let release;
        let concurrentCalls = 0;
        const concurrent = createGenerationManager({ createCompletion: () => { concurrentCalls++; return new Promise(resolve => { release = resolve; }); } });
        const first = concurrent.generate('same', {});
        const second = concurrent.generate('same', {});
        await Promise.resolve();
        release({ choices: [{ message: { content: 'Shared response' }, finish_reason: 'stop' }] });
        await Promise.all([first, second]);
        assert.equal(concurrentCalls, 1);
        console.log('PASS provider faults: cooldown blocks extra calls, expires correctly, successful responses cache, and concurrent requests deduplicate.');

        let status = 429;
        rag.answerQuestion = async () => {
            if (!status) return { answer: 'Recovered response', sources: [] };
            const error = new Error('Simulated provider failure'); error.status = status; error.retryAfterSeconds = 2; throw error;
        };
        const app = express(); app.use(express.json()); app.use(require('../routers/Chat'));
        server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
        const post = () => fetch(`http://127.0.0.1:${server.address().port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Test recovery' }) });
        let response = await post();
        assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '2');
        assert.equal((await response.json()).code, 'ASSISTANT_RATE_LIMIT');
        status = 502; response = await post(); assert.equal(response.status, 503);
        status = 0; response = await post(); assert.equal(response.status, 200);
        console.log('PASS HTTP recovery: provider 429 stays 429 with retry time; provider 5xx becomes recoverable 503; next successful request returns 200.');
    } finally {
        rag.answerQuestion = originalAnswer;
        if (server) await new Promise(resolve => server.close(resolve));
        await mongoose.disconnect();
    }
};
run().catch(error => { console.error('Resilience test failed:', error.name); process.exitCode = 1; });
