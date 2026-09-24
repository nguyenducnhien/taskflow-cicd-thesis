const client = require('prom-client');

// A dedicated registry (not the global default one) so this module's
// metrics are the only thing /metrics ever exposes, regardless of what
// else might register default metrics elsewhere.
const register = new client.Registry();

// Node.js process/runtime metrics (heap, event loop lag, GC, open handles,
// CPU) — not asked for explicitly in CLAUDE.md's MONITORING SCOPE, but
// prom-client provides them for free and they're standard practice on any
// "Application" Grafana dashboard alongside request count/latency/errors.
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Collapses numeric path segments (ids) to ":id" so /api/tasks/17 and
// /api/tasks/42 count as the same route instead of exploding the metric
// into one time series per id. Simpler than introspecting Express's
// req.route/baseUrl (which behaves differently across this app's mix of
// flat and mergeParams-nested routers) for the same result.
function normalizeRoute(path) {
  return path.replace(/\/\d+(?=\/|$)/g, '/:id');
}

function metricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();
  // Captured NOW, not inside the 'finish' listener below: as the request
  // is dispatched into a nested router (e.g. authRoutes mounted at
  // /api/auth), Express temporarily rewrites req.url to strip the mount
  // prefix, and only restores it once that router finishes. The 'finish'
  // event tends to fire before that unwind/restore happens, so reading
  // req.path there was observed to yield "/login" instead of
  // "/api/auth/login". req.originalUrl is unaffected by that rewriting at
  // any point, so capture the route from it up front instead.
  const route = normalizeRoute(req.originalUrl.split('?')[0]);
  res.on('finish', () => {
    const labels = { method: req.method, route, status_code: res.statusCode };
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });
  next();
}

module.exports = { register, metricsMiddleware };
