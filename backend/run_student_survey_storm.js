const https = require('https');

// ==========================================
// CONFIGURATION
// ==========================================
const BASE_URL = process.argv[2] || 'https://api-micobe.mictech.dpdns.org/api/v1';
const TOTAL_REQUESTS = parseInt(process.argv[3], 10) || 20000;
const CONCURRENCY = parseInt(process.argv[4], 10) || 100;
const NUM_STUDENTS = 1000;
const STUDENT_PASSWORD = 'student123';

const latencies = [];
const statusCodes = {};
let completed = 0;
let success = 0;
let failed = 0;
let startTime = 0;

function request(method, path, data = null, token = null) {
  return new Promise((resolve) => {
    const reqStart = Date.now();
    const url = new URL(BASE_URL + path);

    const headers = {
      'User-Agent': 'OBEMIC-StudentStorm/1.0',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Type'] = 'application/json';

    const req = https.request(url, {
      method,
      headers,
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;

        if (res.statusCode >= 200 && res.statusCode < 400) {
          success++;
        } else {
          failed++;
        }
        completed++;

        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      failed++;
      completed++;
      statusCodes['TIMEOUT'] = (statusCodes['TIMEOUT'] || 0) + 1;
      resolve({ status: 408 });
    });

    req.on('error', () => {
      failed++;
      completed++;
      statusCodes['ERROR'] = (statusCodes['ERROR'] || 0) + 1;
      resolve({ status: 500 });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Student session: Login -> Get subjects -> Get survey -> Submit ratings
async function simulateStudent(studentIndex) {
  const pad = String((studentIndex % NUM_STUDENTS) + 1).padStart(4, '0');
  const rollNumber = `STU_TEST_${pad}`;

  // Step 1: Login
  const loginRes = await request('POST', '/student/login', {
    rollNumber,
    password: STUDENT_PASSWORD
  });

  const token = loginRes.body?.accessToken;
  if (!token) return;

  // Step 2: Get Subjects
  const subjectsRes = await request('GET', '/student/subjects', null, token);
  const assignments = subjectsRes.body;
  if (!Array.isArray(assignments) || assignments.length === 0) return;

  const targetAssignment = assignments[0];
  const assignmentId = targetAssignment.id;

  // Step 3: Get Survey Details & COs
  const surveyRes = await request('GET', `/student/subjects/${assignmentId}/survey`, null, token);
  const cos = surveyRes.body?.courseOutcomes || [];

  if (cos.length === 0) return;

  // Step 4: Submit Survey
  const ratings = cos.map(co => ({
    courseOutcomeId: co.id,
    rating: Math.floor(Math.random() * 3) + 1 // Rating 1 to 3
  }));

  await request('POST', '/student/survey/submit', {
    facultyAssignmentId: assignmentId,
    ratings
  }, token);
}

async function runWorker(workerId, quota) {
  for (let i = 0; i < quota; i++) {
    const studentIdx = (workerId * 100 + i) % NUM_STUDENTS;
    await simulateStudent(studentIdx);
    if (completed >= TOTAL_REQUESTS) break;
  }
}

async function main() {
  console.log(`\n===============================================================`);
  console.log(`🎓 OBEMIC STUDENT SURVEY STORM (20,000 REQUESTS)`);
  console.log(`🎯 Target API    : ${BASE_URL}`);
  console.log(`👥 Virtual Users : ${NUM_STUDENTS} Students`);
  console.log(`⚡ Concurrency   : ${CONCURRENCY} Concurrent Workers`);
  console.log(`📦 Quota Target  : ${TOTAL_REQUESTS} Requests`);
  console.log(`===============================================================\n`);

  startTime = Date.now();
  const perWorker = Math.ceil(TOTAL_REQUESTS / (CONCURRENCY * 4)); // ~4 reqs per student cycle
  const workers = Array.from({ length: CONCURRENCY }, (_, i) => runWorker(i, perWorker));

  const progressTimer = setInterval(() => {
    const pct = Math.min(100, Math.round((completed / TOTAL_REQUESTS) * 100));
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rps = (completed / (elapsed || 1)).toFixed(1);
    process.stdout.write(`\r[${pct}%] Completed: ${completed}/${TOTAL_REQUESTS} reqs | Elapsed: ${elapsed}s | Speed: ${rps} req/s | Success: ${success} | Failed: ${failed}`);
  }, 200);

  await Promise.all(workers);
  clearInterval(progressTimer);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));

  console.log(`\n\n==================== SURVEY STORM REPORT ====================`);
  console.log(`📦 Total Requests Executed : ${completed}`);
  console.log(`🟢 Successful (2xx)        : ${success} (${((success/completed)*100).toFixed(1)}%)`);
  console.log(`🔴 Failed / Timeouts       : ${failed}`);
  console.log(`📊 Status Code Summary     : ${JSON.stringify(statusCodes)}`);
  console.log(`⏱️ Total Time Elapsed      : ${totalTime} seconds`);
  console.log(`⚡ Throughput (RPS)        : ${(completed / totalTime).toFixed(1)} requests/sec`);
  console.log(`--------------------- Latency Breakdown ---------------------`);
  console.log(`   Average Latency         : ${avg} ms`);
  console.log(`   Median Latency (p50)    : ${p50} ms`);
  console.log(`   95th Percentile (p95)   : ${p95} ms`);
  console.log(`   99th Percentile (p99)   : ${p99} ms`);
  console.log(`=============================================================\n`);
}

main();
