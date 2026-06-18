// Module-level singleton — persists across warm serverless invocations
const store = { payments: {}, disputes: {}, audits: {} };
export default store;
