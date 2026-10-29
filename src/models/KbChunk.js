const mongoose = require('mongoose');

// Powers the RAG portfolio assistant. `embedding` is queried via an Atlas
// Vector Search index (created by src/scripts/setupVectorIndex.js), not a
// normal Mongo index.
const kbChunkSchema = new mongoose.Schema({
    source: {
        type: String,
        required: true, // e.g. 'resume', 'project'
    },
    sourceRef: {
        type: String, // e.g. the Mongo _id of the ProjectDetails doc
        default: null,
    },
    content: {
        type: String,
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
    },
}, { timestamps: true });

kbChunkSchema.index({ source: 1 });

module.exports = mongoose.model('KbChunk', kbChunkSchema);
