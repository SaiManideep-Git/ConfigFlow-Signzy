const jsonata = require('jsonata');
const AppError = require('../utils/AppError');

// Small cache so repeated executions of the same workflow don't recompile the
// same jsonata expression string on every request.
const compiledCache = new Map();

function compile(expression) {
  let expr = compiledCache.get(expression);
  if (!expr) {
    expr = jsonata(expression);
    compiledCache.set(expression, expr);
  }
  return expr;
}

async function evaluate(expression, context) {
  try {
    const expr = compile(expression);
    return await expr.evaluate(context);
  } catch (err) {
    throw new AppError(`Expression evaluation failed: ${err.message}`, 500, { expression });
  }
}

module.exports = { evaluate };
