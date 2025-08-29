#!/bin/bash

# OpenTelemetry API Test Script
# Tests the new OTLP endpoints and telemetry query API

BASE_URL="https://localhost:7201"
OTLP_URL="$BASE_URL/v1"
TELEMETRY_URL="$BASE_URL/api/v1/telemetry"

echo "🧪 Testing OpenTelemetry API Endpoints"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo "  $method $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -k -w "HTTPSTATUS:%{http_code}" "$url" 2>/dev/null)
    else
        response=$(curl -s -k -w "HTTPSTATUS:%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    content=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✓ Status: $http_code${NC}"
    else
        echo -e "  ${RED}✗ Status: $http_code${NC}"
    fi
    
    if [ ${#content} -gt 200 ]; then
        echo "  Response: $(echo "$content" | cut -c1-200)..."
    else
        echo "  Response: $content"
    fi
    echo ""
}

# Test 1: Health check
test_endpoint "GET" "$OTLP_URL/health" "" "OTLP Health Check"

# Test 2: Send sample metrics
METRICS_DATA='{
  "resourceMetrics": [
    {
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "test-service"}},
          {"key": "host.name", "value": {"stringValue": "localhost"}}
        ]
      },
      "scopeMetrics": [
        {
          "scope": {"name": "test-meter", "version": "1.0.0"},
          "metrics": [
            {
              "name": "cpu_usage_percent",
              "description": "CPU usage percentage",
              "unit": "percent",
              "gauge": {
                "dataPoints": [
                  {
                    "timeUnixNano": "'$(date +%s)000000000'",
                    "asDouble": 75.5,
                    "attributes": [{"key": "core", "value": {"stringValue": "0"}}]
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}'

test_endpoint "POST" "$OTLP_URL/metrics" "$METRICS_DATA" "Send OTLP Metrics"

# Test 3: Send sample logs
LOGS_DATA='{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "test-service"}}
        ]
      },
      "scopeLogs": [
        {
          "scope": {"name": "test-logger", "version": "1.0.0"},
          "logRecords": [
            {
              "timeUnixNano": "'$(date +%s)000000000'",
              "severityNumber": 9,
              "severityText": "INFO",
              "body": {"stringValue": "Test log from curl script"},
              "attributes": [
                {"key": "test.source", "value": {"stringValue": "curl-script"}}
              ]
            }
          ]
        }
      ]
    }
  ]
}'

test_endpoint "POST" "$OTLP_URL/logs" "$LOGS_DATA" "Send OTLP Logs"

echo -e "${YELLOW}⏳ Waiting 2 seconds for data processing...${NC}"
sleep 2
echo ""

# Test 4: Query metrics
START_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
QUERY_URL="$TELEMETRY_URL/metrics?startTime=$START_TIME&endTime=$END_TIME&limit=10"

test_endpoint "GET" "$QUERY_URL" "" "Query Metrics"

# Test 5: Get metrics metadata
test_endpoint "GET" "$TELEMETRY_URL/metrics/metadata" "" "Get Metrics Metadata"

# Test 6: Query logs
LOG_QUERY_URL="$TELEMETRY_URL/logs?startTime=$START_TIME&endTime=$END_TIME&limit=10"
test_endpoint "GET" "$LOG_QUERY_URL" "" "Query Logs"

# Test 7: Telemetry health
test_endpoint "GET" "$TELEMETRY_URL/health" "" "Telemetry Health Check"

# Test 8: Telemetry stats
test_endpoint "GET" "$TELEMETRY_URL/stats" "" "Telemetry Statistics"

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "📖 Next steps:"
echo "  1. Check the WebUI at: https://localhost:3000/telemetry/testing"
echo "  2. Start your API: cd MetricsApp.Api && dotnet run --launch-profile https"
echo "  3. Start your WebUI: cd MetricsApp.WebUI && npm run dev"

