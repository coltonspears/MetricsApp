document.addEventListener("DOMContentLoaded", () => {
    const metricsOverviewTableBody = document.getElementById("metricsOverviewTableBody");

    async function fetchMetricsOverview() {
        if (!metricsOverviewTableBody) {
            console.error("Table body for metrics overview not found!");
            return;
        }
        metricsOverviewTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading overview data...</td></tr>';

        try {
            const response = await fetch("/api/Metrics/overview");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const overviewData = await response.json();
            renderMetricsOverview(overviewData);
        } catch (error) {
            console.error("Error fetching metrics overview:", error);
            metricsOverviewTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error loading overview data. Check console for details.</td></tr>';
        }
    }

    function renderMetricsOverview(overviewData) {
        if (!overviewData || overviewData.length === 0) {
            metricsOverviewTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No metric types found.</td></tr>';
            return;
        }

        let tableContent = "";
        overviewData.forEach(item => {
            tableContent += `
                <tr>
                    <td>${item.metricType || 'N/A'}</td>
                    <td>${item.quantity !== undefined ? item.quantity : 'N/A'}</td>
                    <td>${item.lastUpdateTime ? new Date(item.lastUpdateTime).toLocaleString() : 'N/A'}</td>
                </tr>
            `;
        });
        metricsOverviewTableBody.innerHTML = tableContent;
    }

    // Fetch initial data
    fetchMetricsOverview();
});

