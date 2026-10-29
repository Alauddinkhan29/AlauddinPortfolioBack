const { pipeline } = require('@huggingface/transformers');

// Runs locally via Transformers.js (ONNX on CPU): no API key, no rate limit.
// Changing the model means re-running ingest AND updating the Atlas index,
// since vectors from different models aren't comparable.
const EMBEDDING_MODEL = 'Xenova/bge-small-en-v1.5';
const EMBEDDING_DIMENSION = 384;

// bge expects this prefix on queries only, never on documents.
const QUERY_PREFIX = 'Represent this sentence for searching relevant passages: ';

let extractorPromise;
let embeddingReady = false;
const getExtractor = () => {
    extractorPromise ??= pipeline('feature-extraction', EMBEDDING_MODEL, { dtype: 'q8' })
        .then((extractor) => { embeddingReady = true; return extractor; })
        .catch((error) => { extractorPromise = undefined; embeddingReady = false; throw error; });
    return extractorPromise;
};
const isEmbeddingReady = () => embeddingReady;

// Splits text into ~chunkSize-char chunks on paragraph/sentence
// boundaries where possible, with overlap so context isn't lost at
// chunk edges.
const chunkText = (text, chunkSize = 1000, overlap = 150) => {
    const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
    const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    const chunks = [];
    let current = '';

    for (const paragraph of paragraphs) {
        if ((current + '\n\n' + paragraph).length <= chunkSize) {
            current = current ? `${current}\n\n${paragraph}` : paragraph;
            continue;
        }

        if (current) chunks.push(current);

        if (paragraph.length <= chunkSize) {
            current = paragraph;
        } else {
            // Paragraph itself is too long, hard-split it with overlap.
            let start = 0;
            while (start < paragraph.length) {
                const end = start + chunkSize;
                chunks.push(paragraph.slice(start, end));
                start = end - overlap;
            }
            current = '';
        }
    }
    if (current) chunks.push(current);

    return chunks;
};

const embed = async (texts) => {
    const extractor = await getExtractor();
    // bge is trained with CLS pooling; mean pooling would silently degrade results.
    const output = await extractor(texts, { pooling: 'cls', normalize: true });
    return output.tolist();
};

const embedQuery = async (query) => {
    const [vector] = await embed([QUERY_PREFIX + query]);
    return vector;
};

const embedBatch = (texts) => embed(texts);

const warmUpEmbeddings = () => getExtractor();

module.exports = {
    chunkText,
    embedQuery,
    embedBatch,
    warmUpEmbeddings,
    isEmbeddingReady,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSION,
};
