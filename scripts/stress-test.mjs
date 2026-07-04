#!/usr/bin/env node

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) {
    args.set(key, "true");
  } else {
    args.set(key, next);
    i += 1;
  }
}

const baseUrl = args.get("url") ?? process.env.TARGET_URL ?? "http://127.0.0.1:4177";
const path = args.get("path") ?? process.env.STRESS_PATH ?? "/api/health";
const method = (args.get("method") ?? process.env.STRESS_METHOD ?? "GET").toUpperCase();
const concurrency = Number(args.get("concurrency") ?? process.env.STRESS_CONCURRENCY ?? 100);
const durationSec = Number(args.get("duration") ?? process.env.STRESS_DURATION ?? 20);
const body = args.get("body") ?? process.env.STRESS_BODY ?? "";
const headers = body
  ? { "content-type": "application/json" }
  : {};

const target = new URL(path, baseUrl).toString();
const deadline = Date.now() + durationSec * 1000;
const latencies = [];
const statuses = new Map();
let completed = 0;
let failed = 0;

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function requestOnce() {
  const started = performance.now();
  try {
    const response = await fetch(target, {
      method,
      headers,
      body: body || undefined
    });
    const elapsed = performance.now() - started;
    latencies.push(elapsed);
    statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    await response.arrayBuffer();
    completed += 1;
  } catch (_error) {
    failed += 1;
  }
}

async function worker() {
  while (Date.now() < deadline) {
    await requestOnce();
  }
}

console.log(`Target: ${method} ${target}`);
console.log(`Concurrency: ${concurrency}, Duration: ${durationSec}s`);

const startedAt = Date.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const seconds = (Date.now() - startedAt) / 1000;
const total = completed + failed;
const statusText = [...statuses.entries()]
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([status, count]) => `${status}:${count}`)
  .join(", ");

console.log("");
console.log("Result");
console.log(`Total requests: ${total}`);
console.log(`Completed: ${completed}`);
console.log(`Failed: ${failed}`);
console.log(`Requests/sec: ${(total / seconds).toFixed(2)}`);
console.log(`Status counts: ${statusText || "none"}`);
console.log(`Latency p50: ${percentile(latencies, 50).toFixed(1)} ms`);
console.log(`Latency p95: ${percentile(latencies, 95).toFixed(1)} ms`);
console.log(`Latency p99: ${percentile(latencies, 99).toFixed(1)} ms`);
