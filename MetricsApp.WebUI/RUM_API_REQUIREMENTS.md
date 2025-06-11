# RUM API Requirements for MetricsApp

This document outlines the API endpoints you need to implement in your MetricsApp backend to support the Real User Monitoring (RUM) functionality.

## Overview

The RUM system captures and analyzes user interactions, performance metrics, and errors in real-time. It provides insights similar to Splunk RUM, including:

- User session tracking
- Performance monitoring (Core Web Vitals)
- Error tracking and analysis
- Device and browser analytics
- Geographic distribution
- Real-time metrics

## Required API Endpoints

### 1. RUM Events Collection

**Endpoint:** `POST /api/v1/rum/events`

**Purpose:** Collect RUM events from the frontend

**Request Body:**
```json
{
  "events": [
    {
      "id": "string",
      "sessionId": "string", 
      "userId": "string (optional)",
      "timestamp": "number (Unix timestamp)",
      "type": "pageview | interaction | error | performance | custom",
      "data": "object (event-specific data)",
      "userAgent": "string",
      "url": "string",
      "referrer": "string",
      "viewport": {
        "width": "number",
        "height": "number"
      },
      "connection": {
        "effectiveType": "string",
        "downlink": "number", 
        "rtt": "number"
      },
      "location": {
        "country": "string",
        "region": "string",
        "city": "string"
      }
    }
  ],
  "sessionId": "string",
  "timestamp": "number"
}
```

**Response:** `200 OK` or appropriate error status

### 2. Sessions API

**Endpoint:** `GET /api/v1/rum/sessions`

**Purpose:** Retrieve user sessions with filtering

**Query Parameters:**
- `startTime` (ISO string) - Filter sessions from this time
- `endTime` (ISO string) - Filter sessions until this time  
- `userId` (string) - Filter by specific user
- `limit` (number) - Limit number of results
- `offset` (number) - Pagination offset

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "string",
      "userId": "string",
      "startTime": "number",
      "endTime": "number", 
      "duration": "number",
      "pageViews": "number",
      "interactions": "number",
      "errors": "number",
      "userAgent": "string",
      "location": {
        "country": "string",
        "region": "string",
        "city": "string"
      },
      "device": {
        "type": "desktop | mobile | tablet",
        "browser": "string",
        "os": "string"
      },
      "performance": {
        "avgPageLoadTime": "number",
        "avgLcp": "number",
        "avgFid": "number", 
        "avgCls": "number"
      }
    }
  ],
  "total": "number",
  "hasMore": "boolean"
}
```

**Endpoint:** `GET /api/v1/rum/sessions/{sessionId}`

**Purpose:** Get detailed information for a specific session

**Response:** Single session object (same structure as above)

### 3. Page Views API

**Endpoint:** `GET /api/v1/rum/pageviews`

**Purpose:** Retrieve page view data

**Query Parameters:**
- `startTime`, `endTime`, `sessionId`, `url`, `limit`, `offset`

**Response:**
```json
{
  "pageViews": [
    {
      "id": "string",
      "sessionId": "string",
      "url": "string",
      "title": "string",
      "timestamp": "number",
      "loadTime": "number",
      "lcp": "number",
      "fid": "number",
      "cls": "number", 
      "ttfb": "number",
      "errors": "number",
      "interactions": "number"
    }
  ]
}
```

### 4. Errors API

**Endpoint:** `GET /api/v1/rum/errors`

**Purpose:** Retrieve error data

**Query Parameters:**
- `startTime`, `endTime`, `sessionId`, `errorType`, `severity`, `limit`, `offset`

**Response:**
```json
{
  "errors": [
    {
      "id": "string",
      "sessionId": "string", 
      "timestamp": "number",
      "message": "string",
      "stack": "string",
      "filename": "string",
      "lineno": "number",
      "colno": "number",
      "type": "javascript | network | resource | custom",
      "severity": "low | medium | high | critical",
      "url": "string",
      "userAgent": "string",
      "resolved": "boolean"
    }
  ]
}
```

**Endpoint:** `POST /api/v1/rum/errors/{errorId}/resolve`

**Purpose:** Mark an error as resolved

**Response:** `200 OK`

### 5. Analytics API

**Endpoint:** `GET /api/v1/rum/analytics`

**Purpose:** Get aggregated analytics data

**Query Parameters:**
- `startTime`, `endTime`

**Response:**
```json
{
  "overview": {
    "totalSessions": "number",
    "totalPageViews": "number", 
    "totalErrors": "number",
    "avgSessionDuration": "number",
    "bounceRate": "number",
    "errorRate": "number"
  },
  "performance": {
    "avgPageLoadTime": "number",
    "avgLcp": "number",
    "avgFid": "number",
    "avgCls": "number", 
    "p95PageLoadTime": "number",
    "p95Lcp": "number"
  },
  "topPages": [
    {
      "url": "string",
      "views": "number",
      "avgLoadTime": "number",
      "errorRate": "number"
    }
  ],
  "topErrors": [
    {
      "message": "string",
      "count": "number", 
      "affectedSessions": "number",
      "severity": "string"
    }
  ],
  "devices": [
    {
      "type": "string",
      "count": "number",
      "percentage": "number"
    }
  ],
  "browsers": [
    {
      "name": "string", 
      "count": "number",
      "percentage": "number"
    }
  ],
  "locations": [
    {
      "country": "string",
      "count": "number",
      "percentage": "number"
    }
  ]
}
```

### 6. Performance Metrics API

**Endpoint:** `GET /api/v1/rum/metrics`

**Purpose:** Get performance metrics time series

**Query Parameters:**
- `startTime`, `endTime`, `limit`, `offset`

**Response:**
```json
{
  "metrics": [
    {
      "name": "string",
      "value": "number",
      "timestamp": "number", 
      "sessionId": "string",
      "tags": "object"
    }
  ]
}
```

### 7. User Journey API

**Endpoint:** `GET /api/v1/rum/sessions/{sessionId}/journey`

**Purpose:** Get chronological user journey for a session

**Response:**
```json
{
  "journey": [
    {
      "timestamp": "number",
      "type": "pageview | interaction | error",
      "data": "object"
    }
  ]
}
```

### 8. Real-time Metrics API

**Endpoint:** `GET /api/v1/rum/realtime`

**Purpose:** Get current real-time metrics

**Response:**
```json
{
  "activeSessions": "number",
  "currentPageViews": "number", 
  "errorsLastHour": "number",
  "avgResponseTime": "number"
}
```

## Data Storage Considerations

### Database Schema Suggestions

1. **rum_events** table:
   - Primary key: id
   - Indexes: sessionId, timestamp, type, userId
   - JSON column for event data

2. **rum_sessions** table:
   - Primary key: sessionId
   - Indexes: userId, startTime, endTime
   - Computed fields for aggregated metrics

3. **rum_page_views** table:
   - Primary key: id
   - Foreign key: sessionId
   - Indexes: url, timestamp

4. **rum_errors** table:
   - Primary key: id
   - Foreign key: sessionId
   - Indexes: type, severity, timestamp, resolved

### Performance Optimization

1. **Time-based partitioning** for large datasets
2. **Aggregation tables** for analytics (daily/hourly rollups)
3. **Caching** for frequently accessed analytics
4. **Batch processing** for heavy analytics computations

## Event Types and Data Structures

### Page View Events
```json
{
  "type": "pageview",
  "data": {
    "page": "string",
    "title": "string",
    "loadTime": "number",
    "metrics": {
      "lcp": "number",
      "fid": "number", 
      "cls": "number",
      "ttfb": "number"
    }
  }
}
```

### Interaction Events
```json
{
  "type": "interaction", 
  "data": {
    "action": "string",
    "target": "string",
    "coordinates": {
      "x": "number",
      "y": "number"
    }
  }
}
```

### Error Events
```json
{
  "type": "error",
  "data": {
    "message": "string",
    "stack": "string",
    "filename": "string",
    "lineno": "number",
    "colno": "number",
    "severity": "string"
  }
}
```

### Performance Events
```json
{
  "type": "performance",
  "data": {
    "eventType": "page_load | network_request | web_vital",
    "metric": "string",
    "value": "number",
    "rating": "good | needs-improvement | poor"
  }
}
```

## Implementation Notes

1. **Batch Processing**: Events are sent in batches every 5 seconds or when 10 events accumulate
2. **Error Handling**: Failed requests should retry with exponential backoff
3. **Privacy**: Consider GDPR compliance for user data collection
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Data Retention**: Consider data retention policies for large datasets

## Testing

The frontend currently uses mock data generators. You can test the API integration by:

1. Implementing the endpoints
2. Updating the RUM API client to use real endpoints instead of mock data
3. Verifying data collection in the RUM dashboard

## Security Considerations

1. **Authentication**: Consider if RUM endpoints need authentication
2. **CORS**: Configure CORS for cross-origin requests
3. **Input Validation**: Validate all incoming event data
4. **Rate Limiting**: Prevent spam and abuse
5. **Data Sanitization**: Clean user-provided data before storage 