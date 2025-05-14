// /wwwroot/js/metrics.js

document.addEventListener("DOMContentLoaded", () => {
    const metricsTableBody = document.getElementById("metricsTableBody");
    const serverNameFilter = document.getElementById("serverNameFilter");
    const environmentFilter = document.getElementById("environmentFilter");
    const metricTypeFilter = document.getElementById("metricTypeFilter");
    const startDateFilter = document.getElementById("startDateFilter");
    const endDateFilter = document.getElementById("endDateFilter");
    const applyFiltersButton = document.getElementById("applyFilters");
    const clearFiltersButton = document.getElementById("clearFilters");

    const filtersLocalStorageKey = "metricsAppFilters";

    function loadFilters() {
        const savedFilters = localStorage.getItem(filtersLocalStorageKey);
        if (savedFilters) {
            const filters = JSON.parse(savedFilters);
            serverNameFilter.value = filters.serverName || "";
            environmentFilter.value = filters.environment || "";
            metricTypeFilter.value = filters.metricType || "";
            startDateFilter.value = filters.startDate || "";
            endDateFilter.value = filters.endDate || "";
        }
    }

    function saveFilters() {
        const filters = {
            serverName: serverNameFilter.value,
            environment: environmentFilter.value,
            metricType: metricTypeFilter.value,
            startDate: startDateFilter.value,
            endDate: endDateFilter.value,
        };
        localStorage.setItem(filtersLocalStorageKey, JSON.stringify(filters));
    }

    async function fetchMetrics() {
        metricsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading metrics...</td></tr>';

        const params = new URLSearchParams();
        if (serverNameFilter.value) params.append("serverName", serverNameFilter.value);
        if (environmentFilter.value) params.append("environment", environmentFilter.value);
        if (metricTypeFilter.value) params.append("metricType", metricTypeFilter.value);
        if (startDateFilter.value) params.append("startDate", new Date(startDateFilter.value).toISOString());
        if (endDateFilter.value) params.append("endDate", new Date(endDateFilter.value).toISOString());
        
        try {
            const response = await fetch(`/api/Metrics?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const metrics = await response.json();
            renderMetrics(metrics);
            saveFilters(); // Save filters after successful fetch
        } catch (error) {
            console.error("Error fetching metrics:", error);
            metricsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading metrics. Check console for details.</td></tr>';
        }
    }

    function renderMetrics(metrics) {
        if (!metrics || metrics.length === 0) {
            metricsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No metrics found for the selected filters.</td></tr>';
            return;
        }

        let tableContent = "";
        metrics.forEach(metric => {
            tableContent += `
                <tr>
                    <td>${new Date(metric.timestamp).toLocaleString()}</td>
                    <td>${metric.serverName || ''}</td>
                    <td>${metric.environment || ''}</td>
                    <td>${metric.metricType || ''}</td>
                    <td>${metric.metricValue || ''}</td>
                    <td>${metric.source || ''}</td>
                </tr>
            `;
        });
        metricsTableBody.innerHTML = tableContent;
    }

    applyFiltersButton.addEventListener("click", fetchMetrics);

    clearFiltersButton.addEventListener("click", () => {
        serverNameFilter.value = "";
        environmentFilter.value = "";
        metricTypeFilter.value = "";
        startDateFilter.value = "";
        endDateFilter.value = "";
        localStorage.removeItem(filtersLocalStorageKey);
        fetchMetrics(); // Reload with no filters
    });

    // Load filters from localStorage and fetch initial data
    loadFilters();
    fetchMetrics();
});

