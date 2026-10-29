// Compensation is a fixed product policy, not a fact for an LLM to estimate.
// Keep matching specific enough not to redirect technical "frame rate" questions.
const SALARY_QUESTION = /\b(?:salary|salaries|compensation|remuneration|ctc|lpa|hourly(?:\s+(?:rate|pay))?|(?:daily|day|billing|freelance)\s+rates?|pay\s+expectations?|(?:his|your|agreed)\s+rates?|tankhwa|tankhah)\b/i;
const getPolicyAnswer = (question) => SALARY_QUESTION.test(question)
    ? 'Compensation depends on the role. Please use the contact section or arrange a call with Alauddin to discuss salary or rates.'
    : null;
module.exports = { getPolicyAnswer };
