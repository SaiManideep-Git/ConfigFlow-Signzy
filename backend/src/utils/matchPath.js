// Minimal path matcher supporting ":param" segments, e.g. pattern "/users/:id/orders"
// matches "/users/42/orders" -> { id: "42" }. No wildcards/regex - kept intentionally
// simple since generated endpoints are flat, single-purpose API definitions.
function matchPath(pattern, actualPath) {
  const patternParts = pattern.split('/').filter(Boolean);
  const actualParts = actualPath.split('/').filter(Boolean);
  if (patternParts.length !== actualParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const p = patternParts[i];
    const a = actualParts[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

module.exports = matchPath;
