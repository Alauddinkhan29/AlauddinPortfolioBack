// Offline read-only evals use real Atlas retrieval + Groq generation.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const raw = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
Object.assign(process.env, dotenv.parse(raw));
const atlasUri = raw.match(/mongodb\+srv:\/\/[^\s'"\r\n]+/)?.[0];
const cases = require('../evals/goldenSet');
const gradeAnswer = require('../evals/gradeAnswer');
const { answerQuestion } = require('../services/ragService');
const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const outputPath = path.resolve(option('--output') || 'work/chat-eval-report.json');
const selected = cases.filter((test) => !option('--case') || test.id === option('--case'));
const matchesSource = (chunk, source) => chunk.source === source.source &&
    (!source.sourceRef || chunk.source_ref === source.sourceRef) && (!source.content || source.content.test(chunk.content));
const percent = (items, field) => items.length ? Math.round(1000 * items.filter((item) => item[field]).length / items.length) / 10 : null;

const run = async () => {
    if (!atlasUri || !process.env.GROQ_API_KEY || !selected.length) throw new Error('Missing Atlas/Groq configuration or unknown case');
    const results = [];
    try {
        await mongoose.connect(atlasUri);
        for (const test of selected) {
            let row;
            try {
                const result = await answerQuestion(test.question, test.history || [], { includeDiagnostics: true });
                const { pass, missingFacts, forbiddenMatches } = gradeAnswer(test, result.answer);
                const retrievalHit = !test.source || test.source.source === 'profile' ? null :
                    result.diagnostics.retrieved.some((chunk) => matchesSource(chunk, test.source));
                row = { id: test.id, category: test.category, question: test.question, expected: test.expected,
                    pass, missingFacts, forbiddenMatches,
                    redirect: Boolean(test.redirect), retrievalHit, answer: result.answer,
                    latencyMs: result.diagnostics.latencyMs, tokens: result.diagnostics.usage?.total_tokens,
                    retrieved: result.diagnostics.retrieved.map((chunk) => ({ source: chunk.source, sourceRef: chunk.source_ref, score: chunk.similarity })) };
            } catch (error) {
                row = { id: test.id, category: test.category, question: test.question, pass: false,
                    redirect: Boolean(test.redirect), error: { name: error.name, status: error.status } };
            }
            results.push(row);
            console.log(`${row.pass ? 'PASS' : 'FAIL'} ${row.id}${row.retrievalHit === null || row.retrievalHit === undefined ? '' : ` retrieval@5=${row.retrievalHit}`}`);
            // Save incremental results too, so interrupted/limited runs remain reviewable.
            const retrieval = results.filter((item) => typeof item.retrievalHit === 'boolean');
            const report = { generatedAt: new Date().toISOString(), model: 'openai/gpt-oss-20b',
                coverage: { completed: results.length, selected: selected.length, goldenSet: cases.length },
                metrics: { factCheckPassPercent: percent(results, 'pass'), retrievalHitAt5Percent: percent(retrieval, 'retrievalHit'),
                    redirectPassPercent: percent(results.filter((item) => item.redirect), 'pass'),
                    forbiddenClaimFlags: results.reduce((sum, item) => sum + (item.forbiddenMatches?.length || 0), 0),
                    requestFailures: results.filter((item) => item.error).length,
                    totalTokens: results.reduce((sum, item) => sum + (item.tokens || 0), 0) },
                limitation: 'Regex fact/redirect checks are regression indicators, not proof of zero hallucinations. Review answers manually. Profile facts are pinned and excluded from vector hit@5.', results };
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
        }
        console.log(`Report: ${outputPath}`);
        if (results.some((row) => !row.pass)) process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};
run().catch((error) => { console.error('Eval failed:', error.name); process.exitCode = 1; });
