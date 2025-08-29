// Test script for new OpenTelemetry API endpoints
// Run with: node test-otlp-api.js

const https = require('https');

// Disable SSL verification for self-signed certificates
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const API_BASE = 'https://localhost:7201'

// Sample OTLP data
const sampleMetrics = {
  resourceMetrics: [
    {
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: "test-service" } },
          { key: "host.name", value: { stringValue: "localhost" } }
        ]
      },
      scopeMetrics: [
        {
          scope: { name: "test-meter", version: "1.0.0" },
          metrics: [
            {
              name: "cpu_usage_percent",
              description: "CPU usage percentage",
              unit: "percent",
              gauge: {
                dataPoints: [
                  {
                    timeUnixNano: (Date.now() * 1000000).toString(),
                    asDouble: 75.5,
                    attributes: [
                      { key: "core", value: { stringValue: "0" } }
                    ]
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}

const sampleLogs = {
  resourceLogs: [
    {
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: "test-service" } }
        ]
      },
      scopeLogs: [
        {
          scope: { name: "test-logger", version: "1.0.0" },
          logRecords: [
            {
              timeUnixNano: (Date.now() * 1000000).toString(),
              severityNumber: 9,
              severityText: "INFO",
              body: { stringValue: "Test log message from Node.js test script" },
              attributes: [
                { key: "test.source", value: { stringValue: "node-test-script" } }
              ]
            }
          ]
        }
      ]
    }
  ]
}

// Helper function to make requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 7201,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing OpenTelemetry API Endpoints');
  console.log('=====================================\n');

  try {
    // Test 1: Health check
    console.log('1. Testing OTLP Health (/v1/health)');
    const healthResponse = await makeRequest('GET', '/v1/health');
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response:`, JSON.stringify(healthResponse.data, null, 2));
    console.log('');

    // Test 2: Send metrics
    console.log('2. Sending sample metrics (/v1/metrics)');
    const metricsResponse = await makeRequest('POST', '/v1/metrics', sampleMetrics);
    console.log(`   Status: ${metricsResponse.statusCode}`);
    console.log(`   Response:`, JSON.stringify(metricsResponse.data, null, 2));
    console.log('');

    // Test 3: Send logs
    console.log('3. Sending sample logs (/v1/logs)');
    const logsResponse = await makeRequest('POST', '/v1/logs', sampleLogs);
    console.log(`   Status: ${logsResponse.statusCode}`);
    console.log(`   Response:`, JSON.stringify(logsResponse.data, null, 2));
    console.log('');

    // Wait a moment for data to be processed
    console.log('⏳ Waiting 2 seconds for data processing...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Query metrics
    console.log('4. Querying metrics (/api/v1/telemetry/metrics)');
    const startTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const endTime = new Date().toISOString();
    const queryResponse = await makeRequest('GET', `/api/v1/telemetry/metrics?startTime=${startTime}&endTime=${endTime}&limit=10`);
    console.log(`   Status: ${queryResponse.statusCode}`);
    console.log(`   Response:`, JSON.stringify(queryResponse.data, null, 2));
    console.log('');

    // Test 5: Get metrics metadata
    console.log('5. Getting metrics metadata (/api/v1/telemetry/metrics/metadata)');
    const metadataResponse = await makeRequest('GET', '/api/v1/telemetry/metrics/metadata');
    console.log(`   Status: ${metadataResponse.statusCode}`);
    console.log(`   Response:`, JSON.stringify(metadataResponse.data, null, 2));
    console.log('');

    // Test 6: Query logs
    console.log('6. Querying logs (/api/v1/telemetry/logs)');
    const logsQueryResponse = await makeRequest('GET', `/api/v1/telemetry/logs?startTime=${startTime}&endTime=${endTime}&limit=10`);
    console.log(`   Status: ${logsQueryResponse.statusCode}`);
    console.log(`   Response:`, JSON.stringify(logsQueryResponse.data, null, 2));
    console.log('');

    // Test 7: Telemetry health
    console.log('7. Testing telemetry health (/api/v1/telemetry/health)');
    const telemetryHealthResponse = await makeRequest('GET', '/api/v1/telemetry/health');
    console.log(`   Status: ${telemetryHealthResponse.statusCode}`);
    console.log(`   Response:`, JSON.stringify(telemetryHealthResponse.data, null, 2));
    console.log('');

    // Test 8: Telemetry stats
    console.log('8. Getting telemetry stats (/api/v1/telemetry/stats)');
    const statsResponse = await makeRequest('GET', '/api/v1/telemetry/stats');
    console.log(`   Status: ${statsResponse.statusCode}`);
    console.log(`   Response:`, JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
runTests();

