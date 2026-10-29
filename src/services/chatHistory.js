const MAX_HISTORY_MESSAGES = 8;
const MAX_USER_LENGTH = 500;
const MAX_ASSISTANT_LENGTH = 4000;

// Only complete user/assistant pairs are accepted. Browser-supplied history
// cannot introduce system messages or unbounded prompt content.
const validateHistory = (history = []) => {
    if (!Array.isArray(history) || history.length > MAX_HISTORY_MESSAGES || history.length % 2 !== 0) {
        throw new Error('history must contain at most 4 completed user/assistant exchanges');
    }
    return history.map((message, index) => {
        const expectedRole = index % 2 === 0 ? 'user' : 'assistant';
        const maxLength = expectedRole === 'user' ? MAX_USER_LENGTH : MAX_ASSISTANT_LENGTH;
        if (!message || message.role !== expectedRole || typeof message.content !== 'string' ||
            !message.content.trim() || message.content.length > maxLength) {
            throw new Error(`history entries must alternate user (max 500 chars) and assistant (max 4000 chars)`);
        }
        return { role: expectedRole, content: message.content.trim() };
    });
};

// Earlier user questions resolve pronouns for vector search without another LLM
// call. Assistant replies are never used as factual retrieval evidence.
const buildRetrievalQuery = (question, history) => [
    ...history.filter((message) => message.role === 'user').slice(-2).map((message) => message.content),
    question,
].join('\n');

// Resolve short follow-ups only against KB-known names, never invented names.
const resolveProjectReference = (question, history, projectNames) => {
    const mentions = (text) => {
        const normal = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
        const matches = projectNames.filter((name) => {
            const aliases = [name, name.replace(/^Tata\s+/i, '').replace(/\s*\(.*\)/, '')];
            return aliases.some((alias) => normal.includes(` ${alias.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `));
        });
        // Teracar Driver is one project, not a comparison with Teracar.
        return matches.filter((name) => !matches.some((other) => other !== name &&
            other.toLowerCase().startsWith(`${name.toLowerCase()} `)));
    };
    if (!history.length || mentions(question).length ||
        !/\b(?:it|its|that|this|there|his|usmein|usme|uska|uski|ismein|isme|unka|unki|unke|unmein)\b/i.test(question)) return null;
    for (const role of ['user', 'assistant']) {
        for (const message of [...history].reverse().filter((item) => item.role === role)) {
            const names = mentions(message.content);
            if (names.length) return names.length === 1 ? { project: names[0] } : { ambiguous: true };
        }
    }
    return null;
};

module.exports = { validateHistory, buildRetrievalQuery, resolveProjectReference };
