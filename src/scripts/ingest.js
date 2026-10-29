// One-off ingestion script: parses the resume PDF + pulls project data
// from Mongo, chunks it, embeds each chunk, and (re)populates the
// `kbchunks` collection (Atlas Vector Search) used for RAG retrieval.
//
// Run with: npm run ingest

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const fs = require('fs');
const mongoose = require('mongoose');
const { PDFParse } = require('pdf-parse');

const connectDB = require('../config/database');
const ProjectDetails = require('../models/ProjectDetails');
const KbChunk = require('../models/KbChunk');
const { chunkText, embedBatch, EMBEDDING_DIMENSION } = require('../services/embeddingService');

const RESUME_PATH =
    process.env.RESUME_PATH ||
    path.join(__dirname, '../../uploads/1745836693802LatestResumeAlauddin.pdf');

const buildResumeChunks = async () => {
    if (!fs.existsSync(RESUME_PATH)) {
        throw new Error('Resume file not found; existing knowledge base was not changed');
    }
    const buffer = fs.readFileSync(RESUME_PATH);
    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText();
    await parser.destroy();
    const chunks = chunkText(text);
    return chunks.map((content) => ({ source: 'resume', sourceRef: null, content }));
};

const buildProjectChunks = async () => {
    const projects = await ProjectDetails.find({});
    const STATUS_LABELS = {
        live: 'Live on the app stores',
        internal: 'Internal app, not publicly available',
        unpublished: 'No longer published',
    };

    return projects.map((project) => {
        const lines = [
            `Project: ${project.name}`,
            project.role && `Alauddin's role: ${project.role}`,
            `Framework: ${project.framework}`,
            `State management: ${project.stateManagementSystem}`,
            `Language: ${project.programmingLanguage}`,
            project.version && `Framework version: ${project.version}`,
            project.status && `Status: ${STATUS_LABELS[project.status]}`,
            project.downloads && `Downloads (Google Play): ${project.downloads}`,
            project.playStoreUrl && `Google Play: ${project.playStoreUrl}`,
            project.appStoreUrl && `App Store: ${project.appStoreUrl}`,
            ...(project.highlights || []).map((h) => `Highlight: ${h}`),
            `Description: ${project.description}`,
        ];
        const content = lines.filter(Boolean).join('\n');
        return { source: 'project', sourceRef: String(project._id), content };
    });
};

// Prepare everything before touching the existing knowledge base.
const prepareChunks = async (source, records) => {
    if (!records.length) throw new Error(`No ${source} content; existing chunks were preserved`);
    const embeddings = await embedBatch(records.map((record) => record.content));
    if (embeddings.length !== records.length || embeddings.some((vector) =>
        !Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSION || vector.some((value) => !Number.isFinite(value)))) {
        throw new Error(`Invalid ${source} embeddings; existing chunks were preserved`);
    }
    return records.map((record, index) => ({ ...record, _id: new mongoose.Types.ObjectId(), embedding: embeddings[index] }));
};

// Insert first. On insertion failure remove only this attempt's IDs; never delete old chunks.
const replaceSourceChunks = async (source, docs) => {
    const ids = docs.map((doc) => doc._id);
    try {
        await KbChunk.insertMany(docs);
    } catch (error) {
        await KbChunk.deleteMany({ _id: { $in: ids } });
        throw error;
    }
    await KbChunk.deleteMany({ source, _id: { $nin: ids } });
    console.log(`=== ingested ${docs.length} chunks for source "${source}"`);
};

const run = async () => {
    try {
        await connectDB();
        if (mongoose.connection.readyState !== 1) throw new Error('Database connection unavailable');
        const resume = await prepareChunks('resume', await buildResumeChunks());
        const projects = await prepareChunks('project', await buildProjectChunks());
        await replaceSourceChunks('resume', resume);
        await replaceSourceChunks('project', projects);
        console.log('=== ingest complete');
    } finally {
        await mongoose.disconnect();
    }
};

if (require.main === module) run().catch((err) => {
    console.error('=== ingest failed', err.message);
    process.exitCode = 1;
});

module.exports = { prepareChunks, replaceSourceChunks };
