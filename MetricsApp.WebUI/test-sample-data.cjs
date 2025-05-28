// Test script to verify data parsing with sample response
// Run with: node test-sample-data.cjs

const fs = require('fs');
const path = require('path');

// Read the sample response
const samplePath = path.join(__dirname, 'sample_payloads', 'query_response.json');
const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

console.log('🧪 Testing MetricsApp API Response Parsing');
console.log('==========================================\n');

// Simulate the parsing logic from the updated code
function parseMetricsResponse(data) {
  let metricsArray = [];
  
  if (data && data.status === 'success' && data.data && Array.isArray(data.data.result)) {
    // Handle the specific MetricsApp API format
    const results = data.data.result;
    
    // Flatten the time-series data into individual metric records
    results.forEach((metric, metricIndex) => {
      const metricInfo = metric.metricInfo || {};
      const metricName = metricInfo.name || 'unknown';
      const hostName = metricInfo.resource?.['host.name'] || 'unknown';
      const values = metric.values || [];
      
      // Create a record for each time-value pair
      values.forEach((valuePoint, valueIndex) => {
        const timestamp = valuePoint.item1 ? new Date(valuePoint.item1 * 1000).toISOString() : new Date().toISOString();
        const value = valuePoint.item2 || '0';
        
        metricsArray.push({
          id: `${metricIndex}-${valueIndex}`,
          timestamp: timestamp,
          metricName: metricName,
          value: value,
          source: hostName,
          environment: 'Production'
        });
      });
    });
  }
  
  return metricsArray;
}

// Test the parsing
const parsedMetrics = parseMetricsResponse(sampleData);

console.log('✅ Parsing Results:');
console.log(`- Original response status: ${sampleData.status}`);
console.log(`- Original metric series count: ${sampleData.data.result.length}`);
console.log(`- Parsed individual records: ${parsedMetrics.length}`);

if (parsedMetrics.length > 0) {
  console.log('\n📊 Sample parsed records:');
  
  // Show first few records
  parsedMetrics.slice(0, 5).forEach((record, index) => {
    console.log(`${index + 1}. ${record.metricName}`);
    console.log(`   Timestamp: ${record.timestamp}`);
    console.log(`   Value: ${record.value}`);
    console.log(`   Source: ${record.source}`);
    console.log('');
  });
  
  // Show metrics breakdown
  const metricTypes = [...new Set(parsedMetrics.map(m => m.metricName))];
  console.log(`📈 Unique metrics found: ${metricTypes.length}`);
  metricTypes.forEach(metric => {
    const count = parsedMetrics.filter(m => m.metricName === metric).length;
    console.log(`- ${metric}: ${count} data points`);
  });
  
  console.log('\n🎉 Data parsing successful! The web interface should now work correctly.');
} else {
  console.log('❌ No metrics were parsed. Check the parsing logic.');
} 