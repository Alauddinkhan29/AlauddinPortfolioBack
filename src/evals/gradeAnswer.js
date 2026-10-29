// Compare facts independently of Markdown emphasis and Unicode typography.
const gradeAnswer = (test, answer) => {
    const text = answer.normalize('NFKC').replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ');
    const missingFacts = test.required.filter((pattern) => !pattern.test(text)).map(String);
    const forbiddenMatches = (test.forbidden || []).filter((pattern) => pattern.test(text)).map(String);
    return { pass: missingFacts.length === 0 && forbiddenMatches.length === 0, missingFacts, forbiddenMatches };
};
module.exports = gradeAnswer;
