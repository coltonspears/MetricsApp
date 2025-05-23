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

    // Chart instances
    let metricTimelineChart = null;
    let environmentDistributionChart = null;
    let metricsByTypeChart = null;
    let metricsByServerChart = null;

    // Chart colors that respond to theme
    const getChartColors = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        return {
            primary: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
            success: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
            warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
            danger: ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
            info: ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'],
            background: isDark ? '#1e293b' : '#ffffff',
            text: isDark ? '#e2e8f0' : '#334155',
            grid: isDark ? '#334155' : '#f1f5f9',
            tooltipBg: isDark ? '#f8fafc' : '#1e293b',
            tooltipText: isDark ? '#0f172a' : '#f8fafc'
        };
    };

    // Enhanced chart default options with theme support
    const getDefaultChartOptions = () => {
        const colors = getChartColors();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        return {
            chart: {
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                height: 350,
                background: colors.background,
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
                    },
                    theme: isDark ? 'dark' : 'light'
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
            theme: {
                mode: isDark ? 'dark' : 'light'
            },
            colors: colors.primary,
            dataLabels: {
                enabled: false,
                style: {
                    colors: [colors.text]
                }
            },
            stroke: {
                curve: "smooth",
                width: 2
            },
            fill: {
                opacity: 0.8
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                style: {
                    fontSize: '12px',
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                },
                x: {
                    show: true
                },
                y: {
                    formatter: function(val) {
                        return typeof val === 'number' ? val.toLocaleString() : val;
                    }
                }
            },
            grid: {
                borderColor: colors.grid,
                strokeDashArray: 2,
                xaxis: {
                    lines: { show: true }
                },
                yaxis: {
                    lines: { show: true }
                }
            },
            xaxis: {
                labels: {
                    style: {
                        colors: colors.text,
                        fontSize: '12px'
                    }
                },
                axisBorder: {
                    color: colors.grid
                },
                axisTicks: {
                    color: colors.grid
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: colors.text,
                        fontSize: '12px'
                    },
                    formatter: function(val) {
                        return typeof val === 'number' ? val.toLocaleString() : val;
                    }
                }
            },
            title: {
                style: {
                    fontSize: '16px',
                    fontWeight: '600',
                    color: colors.text
                }
            },
            legend: {
                labels: {
                    colors: colors.text
                }
            }
        };
    };

    document.addEventListener('DOMContentLoaded', () => {

        // Toast notification function
        function showToast(message, type = "info", duration = 3000) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;

            let toastContainer = document.querySelector('.toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.className = 'toast-container';
                toastContainer.style.cssText = `
                position: fixed;
                top: 1rem;
                right: 1rem;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            `;
                document.body.appendChild(toastContainer);
            }

            toast.style.cssText = `
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            min-width: 250px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            background-color: var(--app-${type === 'error' ? 'danger' : type});
        `;

            toastContainer.appendChild(toast);

            setTimeout(() => toast.style.transform = 'translateX(0)', 100);

            setTimeout(() => {
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    });

    // Loading state management
    const showChartLoading = (elementId) => {
        const element = document.querySelector(elementId);
        if (element) {
            element.innerHTML = `
                <div class="chart-loading">
                    <div class="loading-spinner"></div>
                    <span style="margin-left: 0.5rem;">Loading chart...</span>
                </div>
            `;
        }
    };

    const showChartError = (elementId, message = "Error loading chart") => {
        const element = document.querySelector(elementId);
        if (element) {
            element.innerHTML = `
                <div class="chart-loading" style="color: var(--app-danger);">
                    <i class="fas fa-exclamation-circle"></i>
                    <span style="margin-left: 0.5rem;">${message}</span>
                </div>
            `;
        }
    };

    // KPI Update Function with better error handling
    async function updateKPIs() {
        try {
            // Show loading state
            if (kpiTotalMetricsElem) kpiTotalMetricsElem.innerHTML = '<div class="loading-skeleton" style="height: 1.5rem; width: 60px;"></div>';
            if (kpiUniqueServersElem) kpiUniqueServersElem.innerHTML = '<div class="loading-skeleton" style="height: 1.5rem; width: 40px;"></div>';
            if (kpiUniqueMetricTypesElem) kpiUniqueMetricTypesElem.innerHTML = '<div class="loading-skeleton" style="height: 1.5rem; width: 40px;"></div>';
            if (kpiLastMetricTimeElem) kpiLastMetricTimeElem.innerHTML = '<div class="loading-skeleton" style="height: 1.5rem; width: 120px;"></div>';

            const response = await fetch("/api/Metrics/summary");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const summary = await response.json();

            // Animate the KPI updates
            setTimeout(() => {
                if (kpiTotalMetricsElem) kpiTotalMetricsElem.textContent = summary.totalMetrics?.toLocaleString() || "0";
                if (kpiUniqueServersElem) kpiUniqueServersElem.textContent = summary.uniqueServers?.toLocaleString() || "0";
                if (kpiUniqueMetricTypesElem) kpiUniqueMetricTypesElem.textContent = summary.uniqueMetricTypes?.toLocaleString() || "0";
                if (kpiLastMetricTimeElem) kpiLastMetricTimeElem.textContent = summary.lastMetricTime ? new Date(summary.lastMetricTime).toLocaleString() : "N/A";
            }, 300);

        } catch (error) {
            console.error("Error fetching KPIs:", error);
            if (kpiTotalMetricsElem) kpiTotalMetricsElem.textContent = "Error";
            if (kpiUniqueServersElem) kpiUniqueServersElem.textContent = "Error";
            if (kpiUniqueMetricTypesElem) kpiUniqueMetricTypesElem.textContent = "Error";
            if (kpiLastMetricTimeElem) kpiLastMetricTimeElem.textContent = "Error";
            
            if (window.metricsApp) {
                //this.showToast("Failed to load KPIs", "error");
            }
        }
    }

    // Enhanced chart rendering functions
    async function renderMetricTimelineChart(metricsData) {
        const chartElement = document.querySelector("#chartMetricTimeline");
        if (!chartElement) return;

        try {
            let seriesData = [];
            let categories = [];
            let chartTitle = "Metric Timeline";

            if (metricsData && metricsData.length > 0) {
                const targetMetricType = metricTypeFilter.value || metricsData.find(m => !isNaN(parseFloat(m.metricValue)))?.metricType || "CPUUsage";
                chartTitle = `${targetMetricType} Timeline`;

                const filteredMetrics = metricsData
                    .filter(m => m.metricType === targetMetricType && !isNaN(parseFloat(m.metricValue)))
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                seriesData = filteredMetrics.map(m => parseFloat(m.metricValue));
                categories = filteredMetrics.map(m => new Date(m.timestamp).toLocaleDateString() + ' ' + new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
            }

            const options = {
                ...getDefaultChartOptions(),
                series: [{
                    name: chartTitle,
                    data: seriesData
                }],
                chart: {
                    ...getDefaultChartOptions().chart,
                    type: 'line',
                },
                xaxis: {
                    ...getDefaultChartOptions().xaxis,
                    categories: categories,
                    title: { 
                        text: 'Time',
                        style: getDefaultChartOptions().title.style
                    },
                    labels: {
                        ...getDefaultChartOptions().xaxis.labels,
                        rotate: -45,
                        maxHeight: 120
                    }
                },
                yaxis: {
                    ...getDefaultChartOptions().yaxis,
                    title: { 
                        text: 'Value',
                        style: getDefaultChartOptions().title.style
                    }
                },
                title: {
                    ...getDefaultChartOptions().title,
                    text: chartTitle,
                    align: 'left'
                }
            };

            if (metricTimelineChart) {
                metricTimelineChart.updateOptions(options, true, true);
            } else {
                metricTimelineChart = new ApexCharts(chartElement, options);
                await metricTimelineChart.render();
            }
        } catch (error) {
            console.error("Error rendering metric timeline chart:", error);
            showChartError("#chartMetricTimeline");
        }
    }

    async function renderEnvironmentDistributionChart() {
        const chartElement = document.querySelector("#chartEnvironmentDistribution");
        if (!chartElement) return;
        
        showChartLoading("#chartEnvironmentDistribution");
        
        try {
            const response = await fetch("/api/Metrics/distribution/environment");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            const colors = getChartColors();
            const options = {
                ...getDefaultChartOptions(),
                series: data.map(d => d.count),
                labels: data.map(d => d.name),
                chart: {
                    ...getDefaultChartOptions().chart,
                    type: 'donut',
                    height: 300
                },
                colors: colors.primary,
                title: {
                    ...getDefaultChartOptions().title,
                    text: 'Metrics by Environment',
                    align: 'left'
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '65%',
                            labels: {
                                show: true,
                                name: {
                                    show: true,
                                    fontSize: '16px',
                                    fontFamily: 'Segoe UI',
                                    color: colors.text
                                },
                                value: {
                                    show: true,
                                    fontSize: '14px',
                                    fontFamily: 'Segoe UI',
                                    color: colors.text,
                                    formatter: function (val) {
                                        return parseInt(val).toLocaleString()
                                    }
                                },
                                total: {
                                    show: true,
                                    showAlways: false,
                                    label: 'Total',
                                    fontSize: '16px',
                                    fontFamily: 'Segoe UI',
                                    color: colors.text,
                                    formatter: function (w) {
                                        return w.globals.seriesTotals.reduce((a, b) => {
                                            return a + b
                                        }, 0).toLocaleString()
                                    }
                                }
                            }
                        }
                    }
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
                environmentDistributionChart.updateOptions(options, true, true);
            } else {
                environmentDistributionChart = new ApexCharts(chartElement, options);
                await environmentDistributionChart.render();
            }
        } catch (error) {
            console.error("Error fetching environment distribution data:", error);
            showChartError("#chartEnvironmentDistribution");
        }
    }

    async function renderMetricsByTypeChart() {
        const chartElement = document.querySelector("#chartMetricsByType");
        if (!chartElement) return;
        
        showChartLoading("#chartMetricsByType");
        
        try {
            const response = await fetch("/api/Metrics/distribution/type");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            const colors = getChartColors();
            const options = {
                ...getDefaultChartOptions(),
                series: [{
                    name: 'Count',
                    data: data.map(d => d.count)
                }],
                chart: {
                    ...getDefaultChartOptions().chart,
                    type: 'bar',
                },
                colors: [colors.info[0]],
                xaxis: {
                    ...getDefaultChartOptions().xaxis,
                    categories: data.map(d => d.name),
                    labels: {
                        ...getDefaultChartOptions().xaxis.labels,
                        rotate: -45
                    }
                },
                title: {
                    ...getDefaultChartOptions().title,
                    text: 'Top Metric Types by Count',
                    align: 'left'
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '55%',
                        endingShape: 'rounded',
                        borderRadius: 4
                    },
                },
            };

            if (metricsByTypeChart) {
                metricsByTypeChart.updateOptions(options, true, true);
            } else {
                metricsByTypeChart = new ApexCharts(chartElement, options);
                await metricsByTypeChart.render();
            }
        } catch (error) {
            console.error("Error fetching metrics by type data:", error);
            showChartError("#chartMetricsByType");
        }
    }

    async function renderMetricsByServerChart() {
        const chartElement = document.querySelector("#chartMetricsByServer");
        if (!chartElement) return;
        
        showChartLoading("#chartMetricsByServer");
        
        try {
            const response = await fetch("/api/Metrics/distribution/server");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            const colors = getChartColors();
            const options = {
                ...getDefaultChartOptions(),
                series: [{
                    name: 'Count',
                    data: data.map(d => d.count)
                }],
                chart: {
                    ...getDefaultChartOptions().chart,
                    type: 'bar',
                },
                colors: [colors.success[0]],
                xaxis: {
                    ...getDefaultChartOptions().xaxis,
                    categories: data.map(d => d.name),
                },
                title: {
                    ...getDefaultChartOptions().title,
                    text: 'Top Servers by Metric Count',
                    align: 'left'
                },
                plotOptions: {
                    bar: {
                        horizontal: true,
                        barHeight: '70%',
                        borderRadius: 4
                    },
                },
            };

            if (metricsByServerChart) {
                metricsByServerChart.updateOptions(options, true, true);
            } else {
                metricsByServerChart = new ApexCharts(chartElement, options);
                await metricsByServerChart.render();
            }
        } catch (error) {
            console.error("Error fetching metrics by server data:", error);
            showChartError("#chartMetricsByServer");
        }
    }

    // Global function to update all chart themes
    window.updateAllChartThemes = function(theme) {
        try {
            if (metricTimelineChart) {
                metricTimelineChart.updateOptions(getDefaultChartOptions(), false, true);
            }
            if (environmentDistributionChart) {
                const colors = getChartColors();
                environmentDistributionChart.updateOptions({
                    ...getDefaultChartOptions(),
                    colors: colors.primary
                }, false, true);
            }
            if (metricsByTypeChart) {
                const colors = getChartColors();
                metricsByTypeChart.updateOptions({
                    ...getDefaultChartOptions(),
                    colors: [colors.info[0]]
                }, false, true);
            }
            if (metricsByServerChart) {
                const colors = getChartColors();
                metricsByServerChart.updateOptions({
                    ...getDefaultChartOptions(),
                    colors: [colors.success[0]]
                }, false, true);
            }
        } catch (error) {
            console.error("Error updating chart themes:", error);
        }
    };

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
        // Show loading state for table
        metricsTableBody.innerHTML = '<tr><td colspan="6" class="has-text-centered"><div class="loading-spinner"></div> Loading metrics...</td></tr>';

        // Disable buttons during loading
        applyFiltersButton.disabled = true;
        clearFiltersButton.disabled = true;

        try {
            // Update KPIs and static distribution charts
            await Promise.all([
                updateKPIs(),
                renderEnvironmentDistributionChart(),
                renderMetricsByTypeChart(),
                renderMetricsByServerChart()
            ]);

            // Fetch data for the main table and timeline chart based on filters
            const params = new URLSearchParams();
            if (serverNameFilter.value) params.append("serverName", serverNameFilter.value);
            if (environmentFilter.value) params.append("environment", environmentFilter.value);
            if (metricTypeFilter.value) params.append("metricType", metricTypeFilter.value);
            if (startDateFilter.value) params.append("startDate", new Date(startDateFilter.value).toISOString());
            if (endDateFilter.value) params.append("endDate", new Date(endDateFilter.value).toISOString());

            const response = await fetch(`/api/Metrics?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const metrics = await response.json();
            renderMetricsTable(metrics);
            await renderMetricTimelineChart(metrics);
            saveFilters();

            if (window.metricsApp) {
                //this.showToast("Data refreshed successfully", "success", 2000);
            }
        } catch (error) {
            console.error("Error fetching metrics:", error);
            metricsTableBody.innerHTML = '<tr><td colspan="6" class="has-text-centered has-text-danger">Error loading metrics. Check console for details.</td></tr>';
            showChartError("#chartMetricTimeline", "Error loading timeline data");
            
            if (window.metricsApp) {
                //this.showToast("Failed to load data", "error");
            }
        } finally {
            // Re-enable buttons
            applyFiltersButton.disabled = false;
            clearFiltersButton.disabled = false;
        }
    }

    function renderMetricsTable(metrics) {
        if (!metrics || metrics.length === 0) {
            metricsTableBody.innerHTML = '<tr><td colspan="6" class="has-text-centered">No metrics found for the selected filters.</td></tr>';
            return;
        }

        let tableContent = "";
        metrics.forEach((metric, index) => {
            tableContent += `
                <tr style="animation-delay: ${index * 0.05}s;">
                    <td>${new Date(metric.timestamp).toLocaleString()}</td>
                    <td>${metric.serverName || ''}</td>
                    <td><span class="tag is-light">${metric.environment || ''}</span></td>
                    <td><code>${metric.metricType || ''}</code></td>
                    <td><strong>${metric.metricValue || ''}</strong></td>
                    <td>${metric.source || ''}</td>
                </tr>
            `;
        });
        metricsTableBody.innerHTML = tableContent;
    }

    // Event Listeners with improved UX
    applyFiltersButton.addEventListener("click", () => {
        applyFiltersButton.innerHTML = '<div class="loading-spinner"></div> Applying...';
        fetchAndRenderAllData().finally(() => {
            applyFiltersButton.innerHTML = '<span class="icon"><i class="fas fa-filter"></i></span><span>Apply Filters</span>';
        });
    });

    clearFiltersButton.addEventListener("click", () => {
        serverNameFilter.value = "";
        environmentFilter.value = "";
        metricTypeFilter.value = "";
        startDateFilter.value = "";
        endDateFilter.value = "";
        localStorage.removeItem(filtersLocalStorageKey);
        
        clearFiltersButton.innerHTML = '<div class="loading-spinner"></div> Clearing...';
        fetchAndRenderAllData().finally(() => {
            clearFiltersButton.innerHTML = '<span class="icon"><i class="fas fa-times"></i></span><span>Clear Filters</span>';
        });
    });

    // Add keyboard support for filters
    [serverNameFilter, environmentFilter, metricTypeFilter, startDateFilter, endDateFilter].forEach(filter => {
        filter.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchAndRenderAllData();
            }
        });
    });

    // Initial Load
    loadFilters();
    fetchAndRenderAllData();
});

// Export for global access
window.metricsChartsLoaded = true;

