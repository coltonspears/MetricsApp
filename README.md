# ASP.NET Core Metrics Application

This application provides a professional, modern dashboard to display metrics from QA and production servers. It includes REST endpoints for posting new metrics, loading metrics data for the web interface, and managing application settings. Data is stored in a SQLite database and cached using Redis for performance. The frontend features interactive charts, key performance indicators (KPIs), a dedicated metrics overview page, and a settings management page.

## Features

-   **Interactive Metrics Dashboard (`/Index` or `/`)**:
    -   Displays Key Performance Indicators (KPIs): Total Metrics, Unique Servers, Unique Metric Types, Last Metric Received Time.
    -   Interactive Charts using ApexCharts:
        -   Metric Timeline (e.g., for CPU Usage, filterable by Metric Type).
        -   Metrics by Environment (Donut Chart).
        -   Top Metric Types by Count (Bar Chart).
        -   Top Servers by Metric Count (Horizontal Bar Chart).
    -   Detailed Metrics Data Table.
    -   Advanced Filtering: By Server Name, Environment, Metric Type, and Date Range.
    -   Persistent Filters: Filter selections are saved in browser localStorage and persist across page refreshes.
-   **Metrics Overview Page (`/MetricsOverview`)**:
    -   Displays a table of all available metric types, the total quantity of each, and the last time each metric type was updated.
-   **Application Settings Page (`/Settings`)**:
    -   Provides a UI to configure application-level settings.
    -   Settings are managed via a dedicated REST API and stored in a JSON file.
-   **Performance Counters Page (`/PerformanceCounters`)**:
    -   Placeholder page for configuring and viewing Windows Performance Counters. (Functionality to be implemented)
-   **REST API**:
    -   **Metrics (`/api/Metrics`)**:
        -   `POST /api/Metrics`: Submit new metric items.
        -   `GET /api/Metrics`: Retrieve metric items with optional filtering (supports dashboard table and timeline chart).
        -   `GET /api/Metrics/summary`: Retrieve aggregated KPI data for the dashboard.
        -   `GET /api/Metrics/overview`: Retrieve data for the Metrics Overview page.
        -   `GET /api/Metrics/distribution/environment`: Retrieve data for the environment distribution chart.
        -   `GET /api/Metrics/distribution/type`: Retrieve data for the metrics by type chart.
        -   `GET /api/Metrics/distribution/server`: Retrieve data for the metrics by server chart.
    -   **Settings (`/api/Settings`)**:
        -   `GET /api/Settings`: Retrieve current application settings.
        -   `POST /api/Settings`: Update application settings.
-   **Database**: SQLite for persistent storage of metrics.
-   **Caching**: Redis for caching frequently accessed metrics data and API responses.
-   **Configuration**: Application settings (e.g., refresh intervals, thresholds) stored in `applicationSettings.json`.
-   **Expandability**: Designed to easily accommodate new types of metrics and settings.
-   **Styling**: Modern and professional look and feel with custom CSS, responsive design.

## Project Structure

-   `/`: Root project directory.
-   `MetricsApp.csproj`: Project file.
-   `Program.cs`: Application entry point, service configuration (DbContext, Redis, MVC, Razor Pages, CORS).
-   `appsettings.json`: Configuration for connection strings (SQLite, Redis), logging.
-   `applicationSettings.json`: Stores user-configurable application settings (e.g., theme, refresh interval).
-   `Controllers/`:
    -   `MetricsController.cs`: Handles all API requests for metrics data, aggregation, and submission.
    -   `SettingsController.cs`: Handles API requests for retrieving and updating application settings.
-   `Data/`:
    -   `MetricsDbContext.cs`: Entity Framework Core DbContext for SQLite.
-   `Migrations/`: EF Core database migration files.
-   `Models/`:
    -   `MetricItem.cs`: Defines the structure of a metric entry.
    -   `ApplicationSettings.cs`: Defines the structure for application settings.
-   `Pages/`:
    -   `Index.cshtml` & `Index.cshtml.cs`: Main dashboard page.
    -   `MetricsOverview.cshtml` & `MetricsOverview.cshtml.cs`: Metrics overview page.
    -   `Settings.cshtml` & `Settings.cshtml.cs`: Application settings management page.
    -   `PerformanceCounters.cshtml` & `PerformanceCounters.cshtml.cs`: Performance counters display page.
    -   `Shared/`: Layout files (if a global layout is used, though this project uses self-contained pages primarily).
-   `Services/`:
    -   `CacheService.cs`: Interface (`ICacheService`) and implementation (`RedisCacheService`) for Redis caching.
-   `wwwroot/`:
    -   `css/site.css`: Custom styles for the application.
    -   `js/metrics.js`: JavaScript for the main dashboard (filters, KPIs, charts, data table).
    -   `js/metricsOverview.js`: JavaScript for the Metrics Overview page.
    -   (Potentially `js/settings.js` in the future for the settings page).
-   `metrics.db`: The SQLite database file (created in project root on first run/migration).
-   `README.md`: This file.

## Setup and Running the Application

### Prerequisites

1.  **.NET 8 SDK**: Ensure the .NET 8 SDK is installed. This project was built with .NET 8.0.x.
2.  **Redis Server**: A Redis server instance must be running and accessible. Default: `localhost:6379` (configurable in `appsettings.json`).

### Steps to Run

1.  **Clone/Download Project**: Get the project files.
2.  **Navigate to Project Directory**: Open a terminal in `/home/ubuntu/MetricsApp/MetricsApp` (or your project location).
3.  **Restore Dependencies**: Run `dotnet restore`.
4.  **Database Migration**:
    -   The initial migration is included. The `metrics.db` file will be created automatically.
    -   To apply migrations manually or if `dotnet ef` isn't global: `dotnet tool install --global dotnet-ef` (ensure `~/.dotnet/tools` is in PATH), then `dotnet ef database update`.
5.  **Configure Redis**: Ensure Redis is running. Modify `appsettings.json` if your Redis is not on `localhost:6379`.
6.  **Run Application**: `dotnet run`.
    -   The `applicationSettings.json` file will be created with default values if it doesn't exist when `/api/Settings` is first accessed or when settings are saved.
7.  **Access Application**:
    -   Dashboard: `http://localhost:PORT_NUMBER/` (e.g., `http://localhost:5000`)
    -   Metrics Overview: `http://localhost:PORT_NUMBER/MetricsOverview`
    -   Settings: `http://localhost:PORT_NUMBER/Settings`

## Adding a New Metric Type

(This section remains largely the same as the previous README, as the core `MetricItem` model supports flexibility.)

The application is designed for easy expansion:

1.  **`MetricItem` Model**: `MetricType` (string) and `MetricValue` (string) allow diverse data.
2.  **Posting New Types**: No backend changes needed to *start* posting. Send a POST to `/api/Metrics` with the new `metricType`.
    ```json
    // Example: New "TransactionCount" metric
    {
      "serverName": "PROD-API-03",
      "environment": "Production",
      "metricType": "TransactionCount",
      "metricValue": "1520",
      "source": "APILogger"
    }
    ```
3.  **Frontend Display**:
    -   **Dashboard**: New metric types will appear in the "Metric Type" filter and can be visualized in the "Metric Timeline" chart if numeric and selected. The "Top Metric Types by Count" chart will also reflect new types.
    -   **Metrics Overview Page**: New metric types will automatically appear in the overview table with their quantity and last update time.
    -   **`MetricValue` Handling**: Simple values display as is. For complex JSON in `MetricValue`, custom parsing in `wwwroot/js/metrics.js` (for the main table) or specific chart rendering functions might be needed for tailored display.

## API Endpoints (Summary)

-   **`POST /api/Metrics`**: Submit a new metric.
-   **`GET /api/Metrics`**: Retrieve metrics with filters.
-   **`GET /api/Metrics/summary`**: KPIs for dashboard.
-   **`GET /api/Metrics/overview`**: Data for Metrics Overview page.
-   **`GET /api/Metrics/distribution/environment`**: Data for environment chart.
-   **`GET /api/Metrics/distribution/type`**: Data for metric type chart.
-   **`GET /api/Metrics/distribution/server`**: Data for server chart.
-   **`GET /api/Settings`**: Retrieve current application settings.
-   **`POST /api/Settings`**: Update application settings.

## Caching Strategy

-   GET requests to `/api/Metrics/*` endpoints are cached in Redis (summary, overview, distributions, and filtered/all metrics).
-   Cache keys are generated based on endpoint and filter parameters.
-   POSTing new metrics invalidates relevant caches (e.g., `all_metrics`, `metrics_summary`, `metric_types_overview`). Filtered results rely on TTL or prefix-based invalidation for simplicity, which could be enhanced.
-   The `/api/Settings` endpoint currently reads directly from/writes directly to `applicationSettings.json` and does not use Redis caching.

## Work in Progress / Future Enhancements

-   More sophisticated, granular cache invalidation for metrics.
-   User authentication and authorization for accessing the application and API endpoints.
-   Dedicated UI components/charts for specific complex metric types.
-   Pagination for the detailed metrics table on the dashboard.
-   Full implementation of the `/Settings` page UI to interact with the `/api/Settings` endpoint.
-   Full implementation of the `/PerformanceCounters` page.
-   User-configurable dashboard layouts or chart selections.
-   Alerting based on metric thresholds (configurable via the Settings page).
-   Consider caching for `/api/Settings` if read frequency becomes very high.
