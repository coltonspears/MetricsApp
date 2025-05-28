// Simple test script to check API response structure
// Run with: node test-api.js

const https = require('https');

// Disable SSL verification for self-signed certificates
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const testApiEndpoint = () => {
  const url = 'https://localhost:7201/api/v1/metrics/Query?limit=5';
  
  console.log('Testing API endpoint:', url);
  console.log('---');
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ API Response received successfully!');
        console.log('Response type:', Array.isArray(jsonData) ? 'Array' : typeof jsonData);
        console.log('Response structure:');
        console.log(JSON.stringify(jsonData, null, 2));
        
        if (Array.isArray(jsonData)) {
          console.log('\n📊 Analysis:');
          console.log(`- Response is an array with ${jsonData.length} items`);
          if (jsonData.length > 0) {
            console.log('- First item keys:', Object.keys(jsonData[0]));
          }
        } else if (jsonData && typeof jsonData === 'object') {
          console.log('\n📊 Analysis:');
          console.log('- Response is an object with keys:', Object.keys(jsonData));
          
          // Check for MetricsApp specific structure
          if (jsonData.status && jsonData.data) {
            console.log(`- Status: ${jsonData.status}`);
            if (jsonData.data.resultType) {
              console.log(`- Result Type: ${jsonData.data.resultType}`);
            }
            if (Array.isArray(jsonData.data.result)) {
              console.log(`- Found ${jsonData.data.result.length} metric series in data.result`);
              
              if (jsonData.data.result.length > 0) {
                const firstMetric = jsonData.data.result[0];
                console.log('- First metric structure:');
                console.log(`  - Metric name: ${firstMetric.metricInfo?.name || 'N/A'}`);
                console.log(`  - Host: ${firstMetric.metricInfo?.resource?.['host.name'] || 'N/A'}`);
                console.log(`  - Values count: ${firstMetric.values?.length || 0}`);
                
                if (firstMetric.values && firstMetric.values.length > 0) {
                  const firstValue = firstMetric.values[0];
                  console.log(`  - First value: timestamp=${firstValue.item1}, value=${firstValue.item2}`);
                  
                  // Calculate total data points
                  const totalDataPoints = jsonData.data.result.reduce((sum, metric) => 
                    sum + (metric.values?.length || 0), 0);
                  console.log(`- Total data points across all metrics: ${totalDataPoints}`);
                }
              }
            }
          }
          
          // Check for common array properties (fallback)
          const arrayProps = ['data', 'results', 'metrics', 'items'];
          for (const prop of arrayProps) {
            if (Array.isArray(jsonData[prop])) {
              console.log(`- Found array in property "${prop}" with ${jsonData[prop].length} items`);
            }
          }
        }
        
      } catch (error) {
        console.log('❌ Failed to parse JSON response');
        console.log('Raw response:', data);
      }
    });
    
  }).on('error', (error) => {
    console.log('❌ API request failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure your MetricsApp API is running on https://localhost:7201');
    console.log('2. Check if the endpoint path is correct: /api/v1/metrics/Query');
    console.log('3. Verify the API accepts GET requests with query parameters');
  });
};

testApiEndpoint(); 