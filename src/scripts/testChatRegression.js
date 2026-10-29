// Real Atlas + Groq regression checks; reads only, never mutates the database.
// Run all checks: npm run test:chat; or one: npm run test:chat -- rn-shipped
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const dotenv = require('dotenv');
const repo = path.resolve(__dirname, '../..');
const raw = fs.readFileSync(path.join(repo, '.env'), 'utf8');
Object.assign(process.env, dotenv.parse(raw));
// Deliberately ignore the local Docker Mongo URI: vector search needs Atlas.
const atlasUri = raw.match(/mongodb\+srv:\/\/[^\s'"\r\n]+/)?.[0];
if (!atlasUri || !process.env.GROQ_API_KEY) {
    throw new Error('Configure an Atlas URI and GROQ_API_KEY in the root .env');
}
const tests=[
 ['experience','How many years of professional experience does Alauddin have?',a=>/5|five/i.test(a)&&!/(two|2) years/i.test(a)],
 ['experience-wording','Tell me about his work experience and employers.',a=>/LogiQuad/i.test(a)&&/Tata/i.test(a)&&/Shopmatic/i.test(a)&&/Softops/i.test(a)],
 ['deployed','How many mobile apps has Alauddin deployed in his career?',a=>/(5\s*[–−—-]\s*6|five.{0,10}six)/i.test(a)],
 ['rn-shipped','How many React Native apps has he shipped? Name them, including previously published apps.',a=>/Shopmatic/i.test(a)&&/Adihex/i.test(a)&&/FleetVerse/i.test(a)&&/Agent/i.test(a)&&/at least|documented/i.test(a)&&!/only (two|four|2|4)/i.test(a)],
 ['live-rn','Which React Native apps are currently live versus previously published?',a=>/Shopmatic/i.test(a)&&/Adihex/i.test(a)&&/unpublish|no longer|previous/i.test(a)&&/FleetVerse/i.test(a)&&/Agent/i.test(a)],
 ['flutter','Are Teracar and Teracar Driver React Native apps?',a=>/Flutter/i.test(a)],
 ['salary','What salary does he expect?',a=>/depends on the role/i.test(a)&&/contact/i.test(a)],
];
const run = async () => {
    let server;
    try {
        await mongoose.connect(atlasUri);
        const app = express();
        app.use(express.json());
        app.use(require('../routers/Chat'));
        server = await new Promise((resolve) => {
            const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
        });
        const selected = tests.filter(([name]) => !process.argv[2] || name === process.argv[2]);
        if (!selected.length) throw new Error('Unknown regression case');
        for (const [name, message, check] of selected) {
            const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
                signal: AbortSignal.timeout(90000),
            });
            const body = await response.json();
            const answer = body.data?.answer || '';
            const pass = response.status === 200 && check(answer);
            console.log(JSON.stringify({ name, status: response.status, pass, answer }));
            if (!pass) process.exitCode = 1;
        }
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
    }
};

run().catch((error) => {
    // Never dump connection details, environment variables or SDK headers.
    console.error('Chat regression failed:', error.name);
    process.exitCode = 1;
});
