// Test script for new OpenTelemetry API endpoints
// Run with: node test-otlp-api.js

const https = require('https');

// Disable SSL verification for local development with self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_HOST = 'localhost';
const API_PORT = 7201;
const BASE_URL = '/api/v1';

// Sample OTLP metric payload (JSON encoding)
const sampleMetrics = {
  resourceMetrics: [
    {
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'test-service' } },
          { key: 'host.name', value: { stringValue: 'localhost' } }
        ]
      },
      scopeMetrics: [
        {
          scope: { name: 'test-meter', version: '1.0.0' },
          metrics: [
            {
              name: 'cpu_usage_percent',
              description: 'CPU usage percentage',
              unit: 'percent',
              gauge: {
                dataPoints: [
                  {
                    timeUnixNano: String(Date.now() * 1_000_000),
                    asDouble: 75.5,
                    attributes: [
                      { key: 'core', value: { stringValue: '0' } }
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
};

const sampleLogs = {
  resourceLogs: [
    {
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'test-service' } }
        ]
      },
      scopeLogs: [
        {
          scope: { name: 'test-logger', version: '1.0.0' },
          logRecords: [
            {
              timeUnixNano: String(Date.now() * 1_000_000),
              severityNumber: 9,
              severityText: 'INFO',
              body: { stringValue: 'Test log message from Node.js test script' },
              attributes: [
                { key: 'test.source', value: { stringValue: 'node-test-script' } }
              ]
            }
          ]
        }
      ]
    }
  ]
};

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const payload = data ? JSON.stringify(data) : null;
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
        } catch (error) {
          resolve({ statusCode: res.statusCode, headers: res.headers, data: responseData });
        }
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

async function runTests() {
  console.log('== Testing OpenTelemetry API Endpoints ==');
  console.log('');

  try {
    console.log('1. OTLP Health check (/api/v1/ingest/otlp/health)');
    const healthResponse = await makeRequest('GET', `${BASE_URL}/ingest/otlp/health`);
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log('   Response:', JSON.stringify(healthResponse.data, null, 2));
    console.log('');

    console.log('2. Send sample metrics (/api/v1/ingest/otlp/metrics)');
    const metricsResponse = await makeRequest('POST', `${BASE_URL}/ingest/otlp/metrics`, sampleMetrics);
    console.log(`   Status: ${metricsResponse.statusCode}`);
    console.log('   Response:', JSON.stringify(metricsResponse.data, null, 2));
    console.log('');

    console.log('3. Send sample logs (/api/v1/ingest/otlp/logs)');
    const logsResponse = await makeRequest('POST', `${BASE_URL}/ingest/otlp/logs`, sampleLogs);
    console.log(`   Status: ${logsResponse.statusCode}`);
    console.log('   Response:', JSON.stringify(logsResponse.data, null, 2));
    console.log('');

    console.log('Waiting 2 seconds for ingestion to process...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('');

    const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();

    console.log('4. Query metrics (/api/v1/telemetry/metrics)');
    const metricsQuery = await makeRequest(
      'GET',
      `${BASE_URL}/telemetry/metrics?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&limit=10`
    );
    console.log(`   Status: ${metricsQuery.statusCode}`);
    console.log('   Response:', JSON.stringify(metricsQuery.data, null, 2));
    console.log('');

    console.log('5. Get metrics metadata (/api/v1/telemetry/metrics/metadata)');
    const metadataResponse = await makeRequest('GET', `${BASE_URL}/telemetry/metrics/metadata`);
    console.log(`   Status: ${metadataResponse.statusCode}`);
    console.log('   Response:', JSON.stringify(metadataResponse.data, null, 2));
    console.log('');

    console.log('6. Query logs (/api/v1/telemetry/logs)');
    const logsQuery = await makeRequest(
      'GET',
      `${BASE_URL}/telemetry/logs?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&limit=10`
    );
    console.log(`   Status: ${logsQuery.statusCode}`);
    console.log('   Response:', JSON.stringify(logsQuery.data, null, 2));
    console.log('');

    console.log('7. Telemetry health (/api/v1/telemetry/health)');
    const telemetryHealth = await makeRequest('GET', `${BASE_URL}/telemetry/health`);
    console.log(`   Status: ${telemetryHealth.statusCode}`);
    console.log('   Response:', JSON.stringify(telemetryHealth.data, null, 2));
    console.log('');

    console.log('8. Telemetry stats (/api/v1/telemetry/stats)');
    const statsResponse = await makeRequest('GET', `${BASE_URL}/telemetry/stats`);
    console.log(`   Status: ${statsResponse.statusCode}`);
    console.log('   Response:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    console.log('All tests completed successfully.');
  } catch (error) {
    console.error('Test execution failed:', error.message);
  }
}

runTests();
