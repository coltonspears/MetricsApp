# Connection Testing & Data Source Troubleshooting Guide

## Problem
Data source connections cannot be tested and new data sources cannot be added. Users see errors when trying to test connections or create new data sources.

## Root Cause
The frontend React application is trying to communicate with a backend API at `/api/v1/datasources/*`, but the backend API server is not running or not accessible.

## Solutions

### Solution 1: Run Both Frontend and Backend (Recommended)

The MetricsApp consists of two main components that need to run simultaneously:

1. **Backend API** (`MetricsApp.Api`) - Provides data source management endpoints
2. **Frontend** (`MetricsApp.WebUI`) - React application for the user interface

#### Quick Start with PowerShell Script

```powershell
# Run the development startup script
.\start-dev.ps1
```

This script will:
- Start the backend API on `http://localhost:5000`
- Start the frontend on `http://localhost:5173`
- Open both in separate terminal windows

#### Manual Start

If you prefer to start services manually:

**Terminal 1 - Backend API:**
```powershell
cd MetricsApp.Api
dotnet run
```

**Terminal 2 - Frontend:**
```powershell
cd MetricsApp.WebUI
npm run dev
```

### Solution 2: Mock API Fallback (Development Only)

The application now includes automatic fallback to mock data when the backend is unavailable:

- **Automatic Detection**: If the backend API fails to respond, the app automatically switches to mock data
- **Visual Indicator**: A yellow banner shows when mock data is being used
- **Full Functionality**: Test connections, create data sources, and explore the UI with realistic mock data
- **No Persistence**: Data created with mock API won't be saved when you refresh

#### Benefits of Mock API:
- Continue frontend development without backend
- Test UI components and user flows
- Preview data source types and forms
- Simulate successful and failed connection tests

### Solution 3: API Configuration Issues

If both services are running but connections still fail:

#### Check Backend API Health
```powershell
# Test if API is responding
curl http://localhost:5000/api/v1/datasources/types
```

#### Common Backend Issues:
1. **Port Conflicts**: Backend trying to use a port already in use
2. **Dependencies Missing**: Required NuGet packages not installed
3. **Database Issues**: Database not accessible or migration issues
4. **CORS Issues**: Frontend and backend on different origins

#### Frontend Configuration:
Check `MetricsApp.WebUI/src/lib/datasource-api.ts`:
```typescript
const API_BASE_URL = '/api/v1'  // Should match backend API route
```

## How to Test Connections

Once the backend is running:

1. **Navigate to Add Connection**: `/connections/add`
2. **Select Data Source Type**: Choose from available types (Prometheus, MySQL, etc.)
3. **Fill Form**: Enter connection details
4. **Test Connection**: Click "Test Connection" button
5. **Verify Results**: 
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed with error details
6. **Save Configuration**: Click "Save Configuration" if test passes

## Available Data Source Types

The system supports multiple data source types:

### Monitoring
- **Prometheus**: Metrics collection system
- **Elasticsearch**: Search and analytics engine

### Databases
- **MySQL**: Relational database
- **PostgreSQL**: Advanced relational database
- **SQL Server**: Microsoft database system
- **SQLite**: Lightweight database

### Cache & Queue
- **Redis**: In-memory data structure store

## Connection Examples

### Prometheus Connection
```
Name: Production Prometheus
URL: http://prometheus:9090
Timeout: 30 seconds
```

### MySQL Connection
```
Name: App Database
Host: localhost
Port: 3306
Database: myapp
Username: root
Password: [your-password]
```

## Troubleshooting Checklist

- [ ] Backend API is running (`dotnet run` in MetricsApp.Api)
- [ ] Frontend is running (`npm run dev` in MetricsApp.WebUI)
- [ ] No port conflicts (check ports 5000 and 5173)
- [ ] Browser console shows no CORS errors
- [ ] Network requests reach `/api/v1/datasources/` endpoints
- [ ] Database is accessible (if using persistent storage)

## Error Messages

### "Network error: Unable to connect to the API"
- Backend API is not running
- Use mock data fallback or start backend API

### "HTTP 404: Not Found"
- API endpoint doesn't exist
- Check backend routing configuration

### "HTTP 500: Internal Server Error"
- Backend error occurred
- Check backend logs for details

### "Connection timeout"
- Target data source is not accessible
- Verify data source URL and credentials

### "Authentication failed"
- Invalid credentials for data source
- Check username, password, or API keys

## Development Tips

1. **Use Mock Data**: For UI development, let the app fallback to mock data
2. **Check Console**: Browser dev tools show API request/response details
3. **Backend Logs**: Watch `dotnet run` output for API errors
4. **Test Real Connections**: Only test real connections when both services run
5. **Port Configuration**: Ensure frontend dev server proxies API requests correctly

## Next Steps

1. Start with mock data to explore the UI
2. Run backend API for real connection testing
3. Add your own data sources and test connections
4. Explore the metrics and logging features

The mock API provides a fully functional experience for development and testing purposes. 