// Load test for the GOPD queue API. Requires Node 18+ (uses global fetch). No installs needed.
// Usage: node loadtest.mjs <API_BASE> [count] [concurrency]
// Example: node loadtest.mjs https://abc123.execute-api.us-west-2.amazonaws.com/prod 200 10

const [, , base, countArg = '200', concArg = '10'] = process.argv;
if (!base) {
  console.error('Usage: node loadtest.mjs <API_BASE> [count] [concurrency]');
  process.exit(1);
}

const COUNT = Number(countArg);
const CONCURRENCY = Number(concArg);
// Random single digit so each run uses fresh phone numbers
const RUN = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
const phoneFor = (i) => '080' + RUN + String(i).padStart(5, '0');
const typeFor = (i) => (i % 6 === 5 ? 'EMERGENCY' : ['CASH', 'NHIA', 'HMO'][i % 3]);
const isEmergencyRecord = (p) => p.urgency === 'EMERGENCY' || p.patientType === 'EMERGENCY';

async function checkIn(i) {
  const body = { name: 'Load Test', phone: phoneFor(i), patientType: typeFor(i) };
  const t0 = performance.now();
  try {
    const res = await fetch(`${base}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const ms = performance.now() - t0;
    const json = await res.json().catch(() => ({}));
    return {
      i,
      type: body.patientType,
      ok: res.status === 201,
      status: res.status,
      ms,
      error: json.message || json.error
    };
  } catch (e) {
    return { i, type: body.patientType, ok: false, status: 'NETWORK', ms: performance.now() - t0, error: e.message };
  }
}

async function runPool(items, worker, limit) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function main() {
  console.log(`Run ${RUN}: registering ${COUNT} patients, concurrency ${CONCURRENCY}, against ${base}\n`);

  const started = performance.now();
  const results = await runPool([...Array(COUNT).keys()], checkIn, CONCURRENCY);
  const elapsedSec = ((performance.now() - started) / 1000).toFixed(1);

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const latencies = ok.map((r) => r.ms);
  const expectedEmergency = results.filter((r) => r.type === 'EMERGENCY').length;

  console.log('--- Registration ---');
  console.log(`Total: ${COUNT}  Succeeded: ${ok.length}  Failed: ${failed.length}  Time: ${elapsedSec}s`);
  console.log(
    `Latency  p50: ${percentile(latencies, 50).toFixed(0)}ms  ` +
    `p95: ${percentile(latencies, 95).toFixed(0)}ms  ` +
    `max: ${Math.max(0, ...latencies).toFixed(0)}ms`
  );
  if (failed.length > 0) {
    const byError = {};
    for (const f of failed) {
      const key = `HTTP ${f.status}: ${f.error}`;
      byError[key] = (byError[key] || 0) + 1;
    }
    console.log('Failures:', byError);
  }

  // Queue checks use this run's phones only, so earlier test data does not affect the result
  const queueRes = await fetch(`${base}/queue/GOPD`);
  const queueJson = await queueRes.json();
  const mine = (queueJson.queue || []).filter((p) => String(p.phone || '').startsWith('080' + RUN));

  const emergencyIdx = mine.map((p, idx) => (isEmergencyRecord(p) ? idx : -1)).filter((x) => x >= 0);
  const routineIdx = mine.map((p, idx) => (isEmergencyRecord(p) ? -1 : idx)).filter((x) => x >= 0);
  const emergencyFirst =
    emergencyIdx.length === 0 || routineIdx.length === 0 || Math.max(...emergencyIdx) < Math.min(...routineIdx);

  // Positions should be 1..n with no gaps or duplicates
  const allWaiting = queueJson.queue || [];
  const positionsOk = allWaiting.every((p, idx) => p.position === idx + 1);

  console.log('\n--- Queue (this run only) ---');
  console.log(`In queue: ${mine.length} of ${ok.length} successful registrations`);
  console.log(`Emergency: ${expectedEmergency} expected, ${emergencyIdx.length} in queue`);
  console.log(`All emergency before routine: ${emergencyFirst ? 'PASS' : 'FAIL'}`);
  console.log(`Positions run 1..n across full queue (${allWaiting.length} waiting): ${positionsOk ? 'PASS' : 'FAIL'}`);

  // Duplicate and validation checks (expect 409 and 400 once the new check-in is deployed)
  const dup = await fetch(`${base}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Load Test', phone: phoneFor(0), patientType: 'CASH' })
  });
  const badPhone = await fetch(`${base}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Load Test', phone: '12345', patientType: 'CASH' })
  });

  console.log('\n--- Validation ---');
  console.log(`Duplicate phone same day: HTTP ${dup.status} (expect 409)`);
  console.log(`Invalid phone: HTTP ${badPhone.status} (expect 400)`);
}

main().catch((e) => {
  console.error('Load test crashed:', e);
  process.exit(1);
});
