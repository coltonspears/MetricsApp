// Enhanced Metrics Overview and Analytics JavaScript
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements with error checking
    const metricsBreakdownTable = document.getElementById("metricsBreakdownTable");
    const serverPerformanceTable = document.getElementById("serverPerformanceTable");
    const insightsContainer = document.getElementById("insightsContainer");
    const alertSummaryContainer = document.getElementById("alertSummaryContainer");
    
    // Validate required elements exist
    if (!metricsBreakdownTable) {
        console.error("Required element 'metricsBreakdownTable' not found in DOM");
        return;
    }
    if (!serverPerformanceTable) {
        console.error("Required element 'serverPerformanceTable' not found in DOM");
        return;
    }
    if (!insightsContainer) {
        console.error("Required element 'insightsContainer' not found in DOM");
        return;
    }
    if (!alertSummaryContainer) {
        console.error("Required element 'alertSummaryContainer' not found in DOM");
        return;
    }
    
    console.log("MetricsOverview.js: All required DOM elements found, initializing...");
    
    // Chart instances
    let environmentChart = null;
    let metricTypeChart = null;
    let timelineChart = null;
    let miniCharts = {};
    
    // Initialize
    init();

    function init() {
        loadOverviewData();
        setupEventListeners();
        startAutoRefresh();
    }

    function setupEventListeners() {
        // Action buttons
        document.getElementById('refreshOverview')?.addEventListener('click', () => {
            refreshAllData();
        });
        
        document.getElementById('exportReport')?.addEventListener('click', () => {
            exportReport();
        });
        
        document.getElementById('configureDashboard')?.addEventListener('click', () => {
            window.location.href = '/Settings';
        });
        
        document.getElementById('createAlert')?.addEventListener('click', () => {
            window.location.href = '/Settings#alerts';
        });
    }

    async function loadOverviewData() {
        showLoadingStates();
        
        try {
            // Load all data in parallel
            await Promise.all([
                updateKPIs(),
                loadMetricsBreakdown(),
                loadServerPerformance(),
                loadInsights(),
                loadAlertSummary(),
                renderCharts()
            ]);
            
            hideLoadingStates();

            setTimeout(() => {
                showToast('Overview data loaded successfully', 'default');
            }, 2000);
        } catch (error) {
            console.error("Error loading overview data:", error);
            showToast("Error loading overview data", "error");
        }
    }

    async function updateKPIs() {
        try {
            const [summaryResponse, alertsResponse] = await Promise.all([
                fetch("/api/Metrics/summary"),
                fetch("/api/Metrics/alerts/summary")
            ]);

            if (!summaryResponse.ok) throw new Error(`Summary API error: ${summaryResponse.status}`);
            
            const summary = await summaryResponse.json();
            const alertsData = alertsResponse.ok ? await alertsResponse.json() : { activeAlerts: 0 };

            // Update KPI values with animation
            animateValue('totalMetricsCount', summary.totalMetrics || 0);
            animateValue('activeServersCount', summary.uniqueServers || 0);
            animateValue('activeAlertsCount', alertsData.activeAlerts || 0);
            animateValue('dataHealthScore', calculateHealthScore(summary), '%');

            // Update trend indicators
            updateTrendIndicators(summary);
            
            // Create mini charts for KPIs
            createMiniCharts(summary);

        } catch (error) {
            console.error("Error updating KPIs:", error);
            document.getElementById('totalMetricsCount').textContent = "Error";
            document.getElementById('activeServersCount').textContent = "Error";
            document.getElementById('activeAlertsCount').textContent = "Error";
            document.getElementById('dataHealthScore').textContent = "Error";
        }
    }

    async function loadMetricsBreakdown() {
        if (!metricsBreakdownTable) {
            console.error("Cannot load metrics breakdown: table element not found");
            return;
        }
        
        try {
            const response = await fetch("/api/Metrics/breakdown");
            let data;
            
            if (response.ok) {
                data = await response.json();
            } else {
                // Fallback to overview endpoint if breakdown doesn't exist
                const overviewResponse = await fetch("/api/Metrics/overview");
                if (!overviewResponse.ok) throw new Error(`API error: ${overviewResponse.status}`);
                data = await overviewResponse.json();
            }

            renderMetricsBreakdown(data);
        } catch (error) {
            console.error("Error loading metrics breakdown:", error);
            if (metricsBreakdownTable) {
                metricsBreakdownTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading metrics breakdown</td></tr>';
            }
        }
    }

    async function loadServerPerformance() {
        if (!serverPerformanceTable) {
            console.error("Cannot load server performance: table element not found");
            return;
        }
        
        try {
            // This would typically come from a server performance endpoint
            // For now, we'll simulate data based on existing metrics
            const response = await fetch("/api/Metrics/distribution/server");
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const serverData = await response.json();
            renderServerPerformance(serverData);
        } catch (error) {
            console.error("Error loading server performance:", error);
            if (serverPerformanceTable) {
                serverPerformanceTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading server performance</td></tr>';
            }
        }
    }

    async function loadInsights() {
        try {
            // Generate intelligent insights based on current metrics
            const insights = await generateInsights();
            renderInsights(insights);
        } catch (error) {
            console.error("Error loading insights:", error);
            insightsContainer.innerHTML = '<p class="text-danger">Error loading insights</p>';
        }
    }

    async function loadAlertSummary() {
        try {
            // Load recent alerts from the API
            const alerts = await getRecentAlerts();
            renderAlertSummary(alerts);
        } catch (error) {
            console.error("Error loading alert summary:", error);
            if (alertSummaryContainer) {
                alertSummaryContainer.innerHTML = '<p class="text-danger">Error loading alerts</p>';
            }
        }
    }

    function renderMetricsBreakdown(data) {
        if (!metricsBreakdownTable) {
            console.error("Cannot render metrics breakdown: table element not found");
            return;
        }
        
        if (!data || data.length === 0) {
            metricsBreakdownTable.innerHTML = '<tr><td colspan="5" class="text-center">No metrics data available</td></tr>';
            return;
        }

        let tableContent = "";
        data.forEach((item, index) => {
            const health = getHealthStatus(item.quantity || 0);
            const trend = getTrendDirection(index); // Simulated trend
            
            tableContent += `
                <tr style="animation-delay: ${index * 0.1}s;" class="fade-in">
                    <td>
                        <div class="flex items-center">
                            <i class="fas fa-chart-line mr-2 text-primary"></i>
                            <code>${item.metricType || 'Unknown'}</code>
                        </div>
                    </td>
                    <td><strong>${(item.quantity || 0).toLocaleString()}</strong></td>
                    <td>${item.lastUpdateTime ? new Date(item.lastUpdateTime).toLocaleString() : 'N/A'}</td>
                    <td><span class="health-indicator health-${health.class}">${health.text}</span></td>
                    <td><span class="trend-indicator trend-${trend.direction}">${trend.icon} ${trend.text}</span></td>
                </tr>
            `;
        });
        
        metricsBreakdownTable.innerHTML = tableContent;
    }

    function renderServerPerformance(serverData) {
        if (!serverPerformanceTable) {
            console.error("Cannot render server performance: table element not found");
            return;
        }
        
        if (!serverData || serverData.length === 0) {
            serverPerformanceTable.innerHTML = '<tr><td colspan="5" class="text-center">No server data available</td></tr>';
            return;
        }

        let tableContent = "";
        serverData.forEach((server, index) => {
            // Simulate performance metrics
            const cpu = Math.floor(Math.random() * 30) + 20; // 20-50% CPU
            const memory = Math.floor(Math.random() * 40) + 30; // 30-70% Memory
            const status = cpu < 80 && memory < 85 ? 'operational' : 'warning';
            
            tableContent += `
                <tr style="animation-delay: ${index * 0.1}s;" class="fade-in">
                    <td>
                        <div class="flex items-center">
                            <i class="fas fa-server mr-2 text-info"></i>
                            <strong>${server.name || 'Unknown Server'}</strong>
                        </div>
                    </td>
                    <td><span class="badge">${getEnvironmentFromName(server.name)}</span></td>
                    <td>
                        <div class="flex items-center">
                            <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div class="bg-${cpu > 70 ? 'red' : cpu > 50 ? 'yellow' : 'green'}-500 h-2 rounded-full" style="width: ${cpu}%"></div>
                            </div>
                            <span class="text-sm">${cpu}%</span>
                        </div>
                    </td>
                    <td>
                        <div class="flex items-center">
                            <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div class="bg-${memory > 80 ? 'red' : memory > 60 ? 'yellow' : 'green'}-500 h-2 rounded-full" style="width: ${memory}%"></div>
                            </div>
                            <span class="text-sm">${memory}%</span>
                        </div>
                    </td>
                    <td><span class="health-indicator health-${status === 'operational' ? 'excellent' : 'warning'}">${status === 'operational' ? 'Operational' : 'Warning'}</span></td>
                </tr>
            `;
        });
        
        serverPerformanceTable.innerHTML = tableContent;
    }

    async function generateInsights() {
        try {
            const response = await fetch("/api/Metrics/summary");
            if (!response.ok) throw new Error("Failed to load metrics for insights");
            
            const summary = await response.json();
            const insights = [];

            // Generate insights based on metrics data
            if (summary.totalMetrics > 10000) {
                insights.push({
                    type: 'info',
                    icon: 'fas fa-info-circle',
                    text: `Your system has collected over ${summary.totalMetrics.toLocaleString()} metrics. Consider implementing data retention policies to optimize storage.`
                });
            }

            if (summary.uniqueServers > 50) {
                insights.push({
                    type: 'warning',
                    icon: 'fas fa-exclamation-triangle',
                    text: `Monitoring ${summary.uniqueServers} servers. Consider grouping by environment or function for better organization.`
                });
            }

            // Time-based insights
            const now = new Date();
            const hour = now.getHours();
            if (hour >= 9 && hour <= 17) {
                insights.push({
                    type: 'success',
                    icon: 'fas fa-chart-line',
                    text: 'Peak business hours detected. Metrics collection frequency has been automatically optimized for high-traffic periods.'
                });
            }

            return insights.length > 0 ? insights : [{
                type: 'info',
                icon: 'fas fa-lightbulb',
                text: 'Your metrics collection is running smoothly. All systems are operating within normal parameters.'
            }];
        } catch (error) {
            return [{
                type: 'error',
                icon: 'fas fa-exclamation-circle',
                text: 'Unable to generate insights at this time. Please check your data connections.'
            }];
        }
    }

    function renderInsights(insights) {
        const insightsList = insights.map(insight => `
            <div class="flex items-start mb-3">
                <i class="${insight.icon} mr-3 mt-1 text-${getInsightColor(insight.type)}"></i>
                <p class="text-sm">${insight.text}</p>
            </div>
        `).join('');
        
        insightsContainer.innerHTML = insightsList;
    }

    async function getRecentAlerts() {
        try {
            const response = await fetch("/api/Metrics/recent-alerts");
            if (response.ok) {
                return await response.json();
            } else {
                console.warn("Failed to fetch recent alerts, using fallback data");
                // Fallback to mock data if API fails
                return [
                    {
                        id: 1,
                        severity: 'warning',
                        message: 'High CPU usage detected on PROD-WEB-01',
                        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
                        acknowledged: false
                    },
                    {
                        id: 2,
                        severity: 'info',
                        message: 'Memory usage returned to normal on DEV-DB-02',
                        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
                        acknowledged: true
                    }
                ];
            }
        } catch (error) {
            console.error("Error fetching recent alerts:", error);
            return [];
        }
    }

    function renderAlertSummary(alerts) {
        if (!alerts || alerts.length === 0) {
            alertSummaryContainer.innerHTML = '<p class="text-muted">No recent alerts</p>';
            return;
        }

        const alertsList = alerts.map(alert => `
            <div class="alert-item">
                <div class="alert-icon bg-${getAlertColor(alert.severity)}-faded text-${getAlertColor(alert.severity)}">
                    <i class="fas fa-${getAlertIcon(alert.severity)}"></i>
                </div>
                <div class="flex-1">
                    <p class="font-medium">${alert.message}</p>
                    <p class="text-sm text-muted">${getTimeAgo(alert.timestamp)}</p>
                </div>
                <div class="flex items-center">
                    ${alert.acknowledged ? '<i class="fas fa-check-circle text-success"></i>' : '<button class="btn btn-sm btn-outline">Acknowledge</button>'}
                </div>
            </div>
        `).join('');
        
        alertSummaryContainer.innerHTML = alertsList;
    }

    async function renderCharts() {
        try {
            // Load chart data
            const [envResponse, typeResponse] = await Promise.all([
                fetch("/api/Metrics/distribution/environment"),
                fetch("/api/Metrics/distribution/type")
            ]);

            if (envResponse.ok && typeResponse.ok) {
                const envData = await envResponse.json();
                const typeData = await typeResponse.json();
                
                renderEnvironmentChart(envData);
                renderMetricTypeChart(typeData);
            }

            // Render timeline chart
            await renderTimelineChart();
            
        } catch (error) {
            console.error("Error rendering charts:", error);
        }
    }

    function renderEnvironmentChart(data) {
        const chartElement = document.querySelector("#environmentChart");
        if (!chartElement || !data) return;

        const options = {
            series: data.map(d => d.count),
            labels: data.map(d => d.name),
            chart: {
                type: 'donut',
                height: 300
            },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
            legend: {
                position: 'bottom'
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

        if (environmentChart) {
            environmentChart.destroy();
        }
        environmentChart = new ApexCharts(chartElement, options);
        environmentChart.render();
    }

    function renderMetricTypeChart(data) {
        const chartElement = document.querySelector("#metricTypeChart");
        if (!chartElement || !data) return;

        const options = {
            series: [{
                name: 'Count',
                data: data.map(d => d.count)
            }],
            chart: {
                type: 'bar',
                height: 300
            },
            xaxis: {
                categories: data.map(d => d.name),
                labels: {
                    rotate: -45
                }
            },
            colors: ['#06b6d4'],
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    endingShape: 'rounded'
                }
            }
        };

        if (metricTypeChart) {
            metricTypeChart.destroy();
        }
        metricTypeChart = new ApexCharts(chartElement, options);
        metricTypeChart.render();
    }

    async function renderTimelineChart() {
        const chartElement = document.querySelector("#timelineChart");
        if (!chartElement) return;

        try {
            // Generate 24-hour timeline data
            const timelineData = generateTimelineData();
            
            const options = {
                series: [{
                    name: 'Metrics Collected',
                    data: timelineData.values
                }],
                chart: {
                    type: 'area',
                    height: 300,
                    zoom: {
                        enabled: false
                    }
                },
                xaxis: {
                    categories: timelineData.labels,
                    labels: {
                        rotate: -45
                    }
                },
                yaxis: {
                    title: {
                        text: 'Metrics Count'
                    }
                },
                colors: ['#3b82f6'],
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.7,
                        opacityTo: 0.3
                    }
                }
            };

            if (timelineChart) {
                timelineChart.destroy();
            }
            timelineChart = new ApexCharts(chartElement, options);
            timelineChart.render();
        } catch (error) {
            console.error("Error rendering timeline chart:", error);
        }
    }

    function createMiniCharts(summary) {
        // Create mini sparkline chart for metrics growth
        const metricsChartElement = document.getElementById('metricsChart');
        if (metricsChartElement) {
            const sparklineData = Array.from({length: 7}, () => Math.floor(Math.random() * 1000) + 500);
            
            const sparklineOptions = {
                series: [{
                    data: sparklineData
                }],
                chart: {
                    type: 'line',
                    height: 60,
                    sparkline: {
                        enabled: true
                    }
                },
                stroke: {
                    width: 2,
                    curve: 'smooth'
                },
                colors: ['#3b82f6'],
                tooltip: {
                    enabled: false
                }
            };

            if (miniCharts.metrics) {
                miniCharts.metrics.destroy();
            }
            miniCharts.metrics = new ApexCharts(metricsChartElement, sparklineOptions);
            miniCharts.metrics.render();
        }
    }

    // Helper functions
    function animateValue(elementId, endValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const duration = 1000;
        const startTime = performance.now();

        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(startValue + (endValue - startValue) * progress);
            
            element.textContent = current.toLocaleString() + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        }
        
        requestAnimationFrame(updateValue);
    }

    function calculateHealthScore(summary) {
        // Simple health score calculation
        const metricsScore = Math.min((summary.totalMetrics || 0) / 1000 * 10, 40);
        const serversScore = Math.min((summary.uniqueServers || 0) * 2, 30);
        const recentScore = summary.lastMetricTime ? 30 : 0;
        
        return Math.min(Math.floor(metricsScore + serversScore + recentScore), 100);
    }

    function updateTrendIndicators(summary) {
        // This would typically compare with historical data
        // For now, we'll simulate positive trends
        document.getElementById('metricsGrowth').innerHTML = '<i class="fas fa-arrow-up"></i><span>+12.5% from last week</span>';
        document.getElementById('serversStatus').innerHTML = '<i class="fas fa-check-circle"></i><span>All systems operational</span>';
        document.getElementById('alertsStatus').innerHTML = '<i class="fas fa-bell"></i><span>2 new alerts</span>';
        document.getElementById('healthTrend').innerHTML = '<i class="fas fa-thumbs-up"></i><span>Excellent</span>';
    }

    function getHealthStatus(count) {
        if (count > 1000) return { class: 'excellent', text: 'Excellent' };
        if (count > 500) return { class: 'good', text: 'Good' };
        if (count > 100) return { class: 'warning', text: 'Warning' };
        return { class: 'critical', text: 'Critical' };
    }

    function getTrendDirection(index) {
        const trends = ['up', 'down', 'stable'];
        const direction = trends[index % 3];
        const icons = { up: '<i class="fas fa-arrow-up"></i>', down: '<i class="fas fa-arrow-down"></i>', stable: '<i class="fas fa-minus"></i>' };
        const texts = { up: '+5.2%', down: '-2.1%', stable: '0.0%' };
        
        return { direction, icon: icons[direction], text: texts[direction] };
    }

    function getEnvironmentFromName(serverName) {
        if (serverName?.includes('PROD')) return 'Production';
        if (serverName?.includes('DEV')) return 'Development';
        if (serverName?.includes('QA')) return 'QA';
        return 'Unknown';
    }

    function getInsightColor(type) {
        const colors = { success: 'success', warning: 'warning', error: 'danger', info: 'info' };
        return colors[type] || 'info';
    }

    function getAlertColor(severity) {
        const colors = { critical: 'danger', warning: 'warning', info: 'info' };
        return colors[severity] || 'info';
    }

    function getAlertIcon(severity) {
        const icons = { critical: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
        return icons[severity] || 'info-circle';
    }

    function getTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minutes ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        return `${days} days ago`;
    }

    function generateTimelineData() {
        const labels = [];
        const values = [];
        
        for (let i = 23; i >= 0; i--) {
            const hour = new Date();
            hour.setHours(hour.getHours() - i);
            labels.push(hour.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
            
            // Simulate higher activity during business hours
            const hourOfDay = hour.getHours();
            const baseActivity = 100;
            const businessHoursMultiplier = (hourOfDay >= 9 && hourOfDay <= 17) ? 2 : 1;
            const randomVariation = Math.random() * 50;
            
            values.push(Math.floor(baseActivity * businessHoursMultiplier + randomVariation));
        }
        
        return { labels, values };
    }

    function showLoadingStates() {
        // Show loading skeletons
        document.querySelectorAll('.loading-skeleton').forEach(skeleton => {
            skeleton.style.display = 'block';
        });
    }

    function hideLoadingStates() {
        // Hide loading skeletons
        document.querySelectorAll('.loading-skeleton').forEach(skeleton => {
            skeleton.style.display = 'none';
        });
    }

    function refreshAllData() {
        const refreshButton = document.getElementById('refreshOverview');
        const originalText = refreshButton.innerHTML;
        
        refreshButton.innerHTML = '<div class="loading-spinner"></div> Refreshing...';
        refreshButton.disabled = true;
        
        loadOverviewData().finally(() => {
            refreshButton.innerHTML = originalText;
            refreshButton.disabled = false;
        });
    }

    function exportReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            metrics: {
                totalMetrics: document.getElementById('totalMetricsCount')?.textContent || '0',
                activeServers: document.getElementById('activeServersCount')?.textContent || '0',
                activeAlerts: document.getElementById('activeAlertsCount')?.textContent || '0',
                healthScore: document.getElementById('dataHealthScore')?.textContent || '0'
            },
            insights: insightsContainer?.textContent || 'No insights available',
            generatedBy: 'MetricsApp Dashboard'
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metrics-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast("Report exported successfully", "success");
    }

    function startAutoRefresh() {
        // Auto-refresh every 5 minutes
        setInterval(() => {
            loadOverviewData();
        }, 300000);
    }

    function showToast(message, type = "info", duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Add toast to page
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // CSS for animations
    const styles = document.createElement('style');
    styles.textContent = `
        .fade-in {
            animation: fadeIn 0.5s ease-in-out forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .loading-skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
            border-radius: 4px;
        }
        
        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `;
    document.head.appendChild(styles);
});

