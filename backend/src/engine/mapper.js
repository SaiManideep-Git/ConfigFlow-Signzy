// Lightweight declarative mapping engine used for request-body construction and
// simple response shaping. Kept separate from the jsonata-based transform step
// (engine/jsonataEval.js) which handles the more complex merge/aggregate cases.
//
// Mapping spec rules (applied recursively):
//   - a string starting with "$."  -> resolved as a dot-path lookup into the context
//       e.g. "$.input.pan" reads context.input.pan
//   - a string starting with "$$"  -> literal string, with one leading "$" stripped
//       e.g. "$$literal-$-value" -> "$literal-$-value" (escape hatch for literal "$.*")
//   - any other string/number/boolean/null -> used as-is (literal)
//   - arrays/objects -> mapped element-by-element / key-by-key

function getByPath(obj, path) {
  return path
    .split('.')
    .filter(Boolean)
    .reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), obj);
}

function resolveValue(spec, context) {
  if (typeof spec === 'string') {
    if (spec.startsWith('$.')) return getByPath(context, spec.slice(2));
    if (spec.startsWith('$$')) return spec.slice(1);
    return spec;
  }
  if (Array.isArray(spec)) return spec.map((item) => resolveValue(item, context));
  if (spec && typeof spec === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(spec)) out[key] = resolveValue(value, context);
    return out;
  }
  return spec;
}

// Template strings like "https://vendor.example.com/{{input.pan}}/status" used in
// URLs, headers, auth tokens - anywhere a plain string with embedded lookups is needed.
function interpolate(template, context) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = getByPath(context, path);
    return value === undefined || value === null ? '' : String(value);
  });
}

function interpolateDeep(spec, context) {
  if (typeof spec === 'string') return interpolate(spec, context);
  if (Array.isArray(spec)) return spec.map((item) => interpolateDeep(item, context));
  if (spec && typeof spec === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(spec)) out[key] = interpolateDeep(value, context);
    return out;
  }
  return spec;
}

module.exports = { getByPath, resolveValue, interpolate, interpolateDeep };
