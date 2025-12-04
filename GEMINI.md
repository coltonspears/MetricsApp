
# Gemini MVP Plan

This document outlines the plan to get the MetricsApp to a Minimum Viable Product (MVP) state.

## Goal

The primary goal is to demonstrate a complete, end-to-end data flow:
1.  **Ingestion:** Receive data from a sample source.
2.  **Storage:** Persist the data in a chosen backend.
3.  **Querying:** Retrieve the data via the API.
4.  **Visualization:** Display the data in the React-based Web UI.

## Core Components for MVP

*   **MetricsApp.Api:** The backend API will be the central hub for all operations.
*   **MetricsApp.WebUI:** The frontend for user interaction and data visualization.
*   **Data Store:** A single, simple data store to begin with. I'll start with SqlServer since there's already a `SqlServerDataSource.cs` file.
*   **Data Ingestion:** A simple mechanism to get data into the system. The existing `IngestController` looks like a good starting point.

## MVP Plan

### 1. Backend API (MetricsApp.Api)

*   **Data Ingestion Endpoint:**
    *   Review and, if necessary, simplify the `IngestController` to handle a basic data format.
    *   Ensure the endpoint can receive and process a simple JSON payload representing a metric.
*   **Data Persistence:**
    *   Focus on the `SqlServerDataSource` as the primary data store for the MVP.
    *   Verify that the `SqlServerDataSource` can correctly write to and read from the database.
    *   I will need to set up the database and update the connection string in `appsettings.json`.
*   **Query Endpoint:**
    *   Implement a basic query endpoint in the `TelemetryController` that can retrieve all metrics.
    *   This endpoint will be used by the frontend to display the data.

### 2. Frontend (MetricsApp.WebUI)

*   **Data Source Connection:**
    *   Create a simple UI to configure the connection to the backend API.
*   **Data Visualization:**
    *   Create a basic chart or table in the `Explore.tsx` page to display the metrics retrieved from the API.
    *   The focus will be on demonstrating that data can be fetched and displayed, not on a polished UI.

### 3. Data Flow

*   **Sample Data:**
    *   I will use the `MetricsApp.Demo.DummyLogGenerator` to generate some sample data to send to the ingestion endpoint.
*   **End-to-End Test:**
    *   Once the backend and frontend are ready, I will perform an end-to-end test to ensure the entire data flow is working as expected.

## Out of Scope for MVP

*   **Authentication and Authorization:** For the MVP, all endpoints will be public.
*   **Multi-tenancy:** The MVP will be single-tenant.
*   **Advanced Querying:** The query capabilities will be very basic.
*   **Multiple Data Sources:** Only the `SqlServerDataSource` will be used for the MVP.
*   **Alerting:** No alerting functionality will be included in the MVP.

## Next Steps

1.  Set up the SqlServer database.
2.  Update the connection string in `appsettings.json`.
3.  Review and simplify the `IngestController`.
4.  Implement the basic query endpoint in the `TelemetryController`.
5.  Create the data visualization page in the `MetricsApp.WebUI`.
6.  Test the end-to-end data flow.

