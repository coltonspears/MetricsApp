# MetricsApp.Api (WIP)

## Overview

The API project provides REST endpoints for data ingestion and querying in the MetricsApp project. It serves as the primary interface for external systems to send metrics/logs and retrieve data through queries.

## Features

- **Data Ingestion**: Accept events from various sources
- **Query Interface**: Search and retrieve logs and metrics
- **Caching**: Automatic caching of query results
- **Validation**: Input validation and error handling
- **Async Processing**: Queue-based processing for scalability

## Endpoints

### Ingestion Controller

#### POST /api/ingest/events
Accepts events for processing.

**Request Body:**
```json
{
  "sourceType": "windows-perfcounters",
  "timestamp": "2024-01-15T10:30:00Z",
  "hostName": "server01",
  "payload": {
    // Source-specific data
  }
}
```

**Response:**
- `200 OK`: Event accepted for processing
- `400 Bad Request`: Invalid event format
- `500 Internal Server Error`: Processing error

#### POST /api/ingest/events/batch
Accepts multiple events in a single request for improved throughput.

**Request Body:**
```json
[
  {
    "sourceType": "windows-perfcounters",
    "timestamp": "2024-01-15T10:30:00Z",
    "hostName": "server01",
    "payload": { /* ... */ }
  },
  // ... more events
]
```

### Query Controller

#### GET /api/query/logs
Search and retrieve log records.

**Query Parameters:**
- `startTime`: Start of time range (ISO 8601)
- `endTime`: End of time range (ISO 8601)
- `severityLevel`: Minimum severity level
- `hostName`: Filter by host name
- `searchText`: Text search in log body
- `limit`: Maximum number of results (default: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "severityText": "INFO",
      "body": "Application started",
      "attributes": { /* ... */ },
      "resource": { /* ... */ }
    }
  ],
  "totalCount": 1500,
  "hasMore": true
}
```

#### GET /api/query/metrics
Search and retrieve metrics.

**Query Parameters:**
- `startTime`: Start of time range
- `endTime`: End of time range
- `metricName`: Filter by metric name
- `hostName`: Filter by host name
- `aggregation`: Aggregation type (avg, sum, min, max)
- `interval`: Time interval for aggregation
- `limit`: Maximum number of results

**Response:**
```json
{
  "metrics": [
    {
      "name": "cpu.usage",
      "timestamp": "2024-01-15T10:30:00Z",
      "value": 75.5,
      "unit": "percent",
      "attributes": { /* ... */ }
    }
  ],
  "totalCount": 500,
  "hasMore": false
}
```

## Configuration

### appsettings.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "AllowedHosts": "*",
  "Caching": {
    "DefaultExpiration": "00:05:00",
    "SlidingExpiration": "00:02:00"
  }
}
```

### Environment Variables
- `ASPNETCORE_ENVIRONMENT`: Environment (Development, Production)
- `ASPNETCORE_URLS`: Binding URLs
- `REDIS_CONNECTION_STRING`: Redis connection (if using Redis cache)

## Dependencies

```xml
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.0.5" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="7.2.0" />
<PackageReference Include="MetricsApp.Core" />
<PackageReference Include="MetricsApp.Abstractions" />
```

## Middleware

- **Exception Handling**: Global exception handling with proper HTTP status codes
- **Request Logging**: Structured logging of all requests
- **CORS**: Cross-origin resource sharing support
- **Swagger**: API documentation and testing interface

## Caching Strategy

- Query results are cached based on query parameters
- Cache keys include all relevant query criteria
- Configurable expiration times
- Cache invalidation on data updates

## Error Handling

- Structured error responses
- Proper HTTP status codes
- Detailed error messages in development
- Sanitized error messages in production

## Usage

### Development
```bash
dotnet run --project MetricsApp.Api
```

### Docker
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0
COPY . /app
WORKDIR /app
EXPOSE 80
ENTRYPOINT ["dotnet", "MetricsApp.Api.dll"]
```

## Security Considerations

- Input validation on all endpoints
- Rate limiting (future enhancement)
- Authentication/Authorization (future enhancement)
- HTTPS enforcement in production 