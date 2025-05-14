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

    // KPI Elements
    const kpiTotalMetricsElem = document.getElementById("kpiTotalMetrics");
    const kpiUniqueServersElem = document.getElementById("kpiUniqueServers");
    const kpiUniqueMetricTypesElem = document.getElementById("kpiUniqueMetricTypes");
    const kpiLastMetricTimeElem = document.getElementById("kpiLastMetricTime");

    const filtersLocalStorageKey = "metricsAppFilters";

    // Chart instances (to be initialized)
    let metricTimelineChart = null;
    let environmentDistributionChart = null;
    let metricsByTypeChart = null;
    let metricsByServerChart = null;

    // --- Chart Default Options ---
    const defaultChartOptions = {
        chart: {
            height: 350,
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: "smooth",
            width: 2
        },
        fill: {
            opacity: 1
        },
        tooltip: {
            theme: "dark"
        }
    };

    // --- KPI Update Function ---
    async function updateKPIs() {
        try {
            const response = await fetch("/api/Metrics/summary");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const summary = await response.json();

            if (kpiTotalMetricsElem) kpiTotalMetricsElem.textContent = summary.totalMetrics?.toLocaleString() || "0";
            if (kpiUniqueServersElem) kpiUniqueServersElem.textContent = summary.uniqueServers?.toLocaleString() || "0";
            if (kpiUniqueMetricTypesElem) kpiUniqueMetricTypesElem.textContent = summary.uniqueMetricTypes?.toLocaleString() || "0";
            if (kpiLastMetricTimeElem) kpiLastMetricTimeElem.textContent = summary.lastMetricTime ? new Date(summary.lastMetricTime).toLocaleString() : "N/A";

        } catch (error) {
            console.error("Error fetching KPIs:", error);
            if (kpiTotalMetricsElem) kpiTotalMetricsElem.textContent = "Error";
            if (kpiUniqueServersElem) kpiUniqueServersElem.textContent = "Error";
            if (kpiUniqueMetricTypesElem) kpiUniqueMetricTypesElem.textContent = "Error";
            if (kpiLastMetricTimeElem) kpiLastMetricTimeElem.textContent = "Error";
        }
    }

    // --- Chart Rendering Functions ---
    async function renderMetricTimelineChart(metricsData) {
        const chartElement = document.querySelector("#chartMetricTimeline");
        if (!chartElement) return;

        // For timeline, we expect metricsData to be an array of MetricItem objects
        // We'll group by metricType and then plot. For simplicity, let's assume we plot the first encountered numeric metric type or a specific one if filtered.
        let seriesData = [];
        let categories = [];
        let chartTitle = "Metric Timeline";

        if (metricsData && metricsData.length > 0) {
            // Attempt to find a numeric metric to plot, or use a default like 'CPUUsage'
            const targetMetricType = metricTypeFilter.value || metricsData.find(m => !isNaN(parseFloat(m.metricValue)))?.metricType || "CPUUsage";
            chartTitle = `${targetMetricType} Timeline`;

            const filteredMetrics = metricsData
                .filter(m => m.metricType === targetMetricType && !isNaN(parseFloat(m.metricValue)))
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            seriesData = filteredMetrics.map(m => parseFloat(m.metricValue));
            categories = filteredMetrics.map(m => new Date(m.timestamp).toLocaleTimeString()); // Or .toLocaleString() for more detail
        }

        const options = {
            ...defaultChartOptions,
            series: [{
                name: chartTitle,
                data: seriesData
            }],
            chart: {
                ...defaultChartOptions.chart,
                type: 'line',
            },
            xaxis: {
                categories: categories,
                title: { text: 'Time' }
            },
            yaxis: {
                title: { text: 'Value' }
            },
            title: {
                text: chartTitle,
                align: 'left'
            }
        };

        if (metricTimelineChart) {
            metricTimelineChart.updateOptions(options);
        } else {
            metricTimelineChart = new ApexCharts(chartElement, options);
            metricTimelineChart.render();
        }
    }

    async function renderEnvironmentDistributionChart() {
        const chartElement = document.querySelector("#chartEnvironmentDistribution");
        if (!chartElement) return;
        try {
            const response = await fetch("/api/Metrics/distribution/environment");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json(); // Expected: [{ name: "Env1", count: 10 }, ...]

            const options = {
                ...defaultChartOptions,
                series: data.map(d => d.count),
                labels: data.map(d => d.name),
                chart: {
                    ...defaultChartOptions.chart,
                    type: 'donut',
                },
                title: {
                    text: 'Metrics by Environment',
                    align: 'left'
                },
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }]
            };
            if (environmentDistributionChart) {
                environmentDistributionChart.updateOptions(options);
            } else {
                environmentDistributionChart = new ApexCharts(chartElement, options);
                environmentDistributionChart.render();
            }
        } catch (error) {
            console.error("Error fetching environment distribution data:", error);
            chartElement.innerHTML = "<p class=\"text-danger\">Error loading chart.</p>";
        }
    }

    async function renderMetricsByTypeChart() {
        const chartElement = document.querySelector("#chartMetricsByType");
        if (!chartElement) return;
        try {
            const response = await fetch("/api/Metrics/distribution/type");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json(); // Expected: [{ name: "Type1", count: 20 }, ...]

            const options = {
                ...defaultChartOptions,
                series: [{
                    name: 'Count',
                    data: data.map(d => d.count)
                }],
                chart: {
                    ...defaultChartOptions.chart,
                    type: 'bar',
                },
                xaxis: {
                    categories: data.map(d => d.name),
                },
                title: {
                    text: 'Top Metric Types by Count',
                    align: 'left'
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '55%',
                        endingShape: 'rounded'
                    },
                },
            };
            if (metricsByTypeChart) {
                metricsByTypeChart.updateOptions(options);
            } else {
                metricsByTypeChart = new ApexCharts(chartElement, options);
                metricsByTypeChart.render();
            }
        } catch (error) {
            console.error("Error fetching metrics by type data:", error);
            chartElement.innerHTML = "<p class=\"text-danger\">Error loading chart.</p>";
        }
    }

    async function renderMetricsByServerChart() {
        const chartElement = document.querySelector("#chartMetricsByServer");
        if (!chartElement) return;
        try {
            const response = await fetch("/api/Metrics/distribution/server");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json(); // Expected: [{ name: "Server1", count: 15 }, ...]

            const options = {
                ...defaultChartOptions,
                series: [{
                    name: 'Count',
                    data: data.map(d => d.count)
                }],
                chart: {
                    ...defaultChartOptions.chart,
                    type: 'bar',
                },
                xaxis: {
                    categories: data.map(d => d.name),
                },
                title: {
                    text: 'Top Servers by Metric Count',
                    align: 'left'
                },
                plotOptions: {
                    bar: {
                        horizontal: true,
                        barHeight: '70%',
                    },
                },
            };
            if (metricsByServerChart) {
                metricsByServerChart.updateOptions(options);
            } else {
                metricsByServerChart = new ApexCharts(chartElement, options);
                metricsByServerChart.render();
            }
        } catch (error) {
            console.error("Error fetching metrics by server data:", error);
            chartElement.innerHTML = "<p class=\"text-danger\">Error loading chart.</p>";
        }
    }

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

    async function fetchAndRenderAllData() {
        metricsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading metrics...</td></tr>';

        // Update KPIs and static distribution charts (not affected by main filters for now, could be enhanced)
        updateKPIs();
        renderEnvironmentDistributionChart();
        renderMetricsByTypeChart();
        renderMetricsByServerChart();

        // Fetch data for the main table and timeline chart based on filters
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
            renderMetricsTable(metrics);
            renderMetricTimelineChart(metrics); // Pass all fetched metrics to timeline chart function
            saveFilters();
        } catch (error) {
            console.error("Error fetching metrics:", error);
            metricsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading metrics. Check console for details.</td></tr>';
            // Potentially clear or show error on timeline chart too
            renderMetricTimelineChart([]);
        }
    }

    function renderMetricsTable(metrics) {
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

    applyFiltersButton.addEventListener("click", fetchAndRenderAllData);

    clearFiltersButton.addEventListener("click", () => {
        serverNameFilter.value = "";
        environmentFilter.value = "";
        metricTypeFilter.value = "";
        startDateFilter.value = "";
        endDateFilter.value = "";
        localStorage.removeItem(filtersLocalStorageKey);
        fetchAndRenderAllData();
    });

    // Initial Load
    loadFilters();
    fetchAndRenderAllData();
});

