// Isolated tests: no Mongo connection or provider call.
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
const operations = [];
let shouldFailInsert = false;
let vectors = [[1, 2, 3]];
const fakeModel = {
    insertMany: async (docs) => { operations.push(['insert', docs]); if (shouldFailInsert) throw new Error('insert failed'); },
    deleteMany: async (filter) => { operations.push(['delete', filter]); },
};
Module._load = function (id, parent, isMain) {
    if (id === '../models/KbChunk' && parent.filename.endsWith('/ingest.js')) return fakeModel;
    if (id === '../services/embeddingService' && parent.filename.endsWith('/ingest.js')) return { embedBatch: async () => vectors, EMBEDDING_DIMENSION: 3, chunkText: () => [] };
    return originalLoad.apply(this, arguments);
};
const { prepareChunks, replaceSourceChunks } = require('./ingest');
Module._load = originalLoad;
(async () => {
    await assert.rejects(prepareChunks('resume', []), /preserved/);
    vectors = [[NaN, 2, 3]];
    await assert.rejects(prepareChunks('resume', [{ source: 'resume', content: 'text' }]), /Invalid/);
    assert.equal(operations.length, 0);
    vectors = [[1, 2, 3]];
    const docs = await prepareChunks('resume', [{ source: 'resume', content: 'text' }]);
    await replaceSourceChunks('resume', docs);
    assert.deepEqual(operations.map(([action]) => action), ['insert', 'delete']);
    assert.equal(operations[1][1].source, 'resume');
    assert.deepEqual(operations[1][1]._id.$nin, [docs[0]._id]);
    operations.length = 0;
    shouldFailInsert = true;
    await assert.rejects(replaceSourceChunks('resume', docs), /insert failed/);
    assert.deepEqual(operations.map(([action]) => action), ['insert', 'delete']);
    assert.deepEqual(operations[1][1]._id.$in, [docs[0]._id]);
    console.log('PASS: ingestion validates before writes, inserts before deletion, and cleans up only new IDs on failure');
})().catch((error) => { console.error(error); process.exitCode = 1; });
