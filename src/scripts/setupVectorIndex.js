// One-off setup: creates the Atlas Vector Search index on kb_chunks.
// Must run against the Atlas cluster (Vector Search isn't available on a
// plain self-hosted/dockerized MongoDB, which is what DATABASEURI points
// to for local dev by default).
//
// Run with: npm run setup-vector-index

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { EMBEDDING_DIMENSION } = require('../services/embeddingService');

const INDEX_NAME = 'kb_chunks_vector_index';

const definition = {
    fields: [
        {
            type: 'vector',
            path: 'embedding',
            numDimensions: EMBEDDING_DIMENSION,
            similarity: 'cosine',
        },
        { type: 'filter', path: 'source' },
    ],
};

const run = async () => {
    await connectDB();
    const collection = mongoose.connection.collection('kbchunks');

    const [existing] = await collection.listSearchIndexes(INDEX_NAME).toArray().catch(() => []);

    if (!existing) {
        await collection.createSearchIndex({ name: INDEX_NAME, type: 'vectorSearch', definition });
        console.log(`=== created index "${INDEX_NAME}" (Atlas takes a minute to build it)`);
    } else {
        const existingDims = existing.latestDefinition.fields.find((f) => f.type === 'vector').numDimensions;
        if (existingDims === EMBEDDING_DIMENSION) {
            console.log(`=== index "${INDEX_NAME}" already exists with ${existingDims} dims, skipping`);
        } else {
            // Happens when the embedding model changes; the old index would
            // reject queries from the new model.
            await collection.updateSearchIndex(INDEX_NAME, definition);
            console.log(`=== updated index "${INDEX_NAME}" ${existingDims} -> ${EMBEDDING_DIMENSION} dims (Atlas is rebuilding it)`);
        }
    }

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error('=== setup-vector-index failed', err);
    console.error(
        '\nIf this errors with an unsupported-command message, create the index manually instead:\n' +
        'Atlas dashboard -> your cluster -> Search -> Create Search Index -> JSON Editor, on collection ' +
        '"kbchunks", using this definition:\n' +
        JSON.stringify(definition, null, 2)
    );
    process.exit(1);
});
