// Settings and Dashboard Configuration JavaScript
document.addEventListener("DOMContentLoaded", () => {
    // Settings storage key
    const SETTINGS_STORAGE_KEY = "metricsAppSettings";
    const DASHBOARD_CONFIG_KEY = "metricsAppDashboardConfig";
    
    // Default settings
    const defaultSettings = {
        theme: "auto",
        primaryColor: "#3b82f6",
        refreshInterval: 60,
        pageSize: 50,
        enableNotifications: true,
        enableSounds: false,
        enableAnimations: true,
        reducedMotion: false,
        chartHeight: 350,
        gridStyle: "dashed",
        showDataLabels: false,
        enableTooltips: true,
        defaultTimeRange: "24h",
        autoApplyFilters: false,
        persistFilters: true,
        dashboardName: "Main Dashboard",
        dashboardRefresh: 60,
        dashboardFullscreen: true
    };

    // Default dashboard configuration
    const defaultDashboardConfig = {
        layout: "2x1",
        widgets: [
            { id: "timeline", type: "timeline", position: 0 },
            { id: "environment", type: "donut", position: 1 }
        ]
    };

    // Default alert rules
    const defaultAlertRules = [
        {
            id: "cpu-high",
            name: "High CPU Usage",
            metricType: "CPUUsage",
            condition: "greater_than",
            threshold: 80,
            enabled: true,
            severity: "warning"
        },
        {
            id: "memory-high", 
            name: "High Memory Usage",
            metricType: "MemoryUsage",
            condition: "greater_than",
            threshold: 85,
            enabled: true,
            severity: "critical"
        }
    ];

    // DOM Elements
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const dashboardPreview = document.getElementById('dashboardPreview');
    const layoutButtons = document.querySelectorAll('.layout-btn');
    const colorOptions = document.querySelectorAll('.color-option');
    const widgetCards = document.querySelectorAll('.widget-card');

    // Initialize
    init();

    function init() {
        loadSettings();
        setupEventListeners();
        setupDragAndDrop();
        loadAlertRules();
        updateThemePreview();
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        const settings = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        
        // Apply settings to form elements
        Object.keys(settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key];
                } else {
                    element.value = settings[key];
                }
            }
        });

        // Apply primary color
        applyPrimaryColor(settings.primaryColor);
        
        // Update color palette selection
        colorOptions.forEach(option => {
            option.classList.toggle('selected', option.dataset.color === settings.primaryColor);
        });

        // Load dashboard configuration
        loadDashboardConfig();
    }

    function loadDashboardConfig() {
        const savedConfig = localStorage.getItem(DASHBOARD_CONFIG_KEY);
        const config = savedConfig ? JSON.parse(savedConfig) : defaultDashboardConfig;
        
        // Apply layout
        updateDashboardLayout(config.layout);
        
        // Update layout button selection
        layoutButtons.forEach(btn => {
            btn.classList.toggle('btn-primary', btn.dataset.layout === config.layout);
            btn.classList.toggle('btn-outline', btn.dataset.layout !== config.layout);
        });
    }

    function setupEventListeners() {
        // Tab switching
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Layout buttons
        layoutButtons.forEach(button => {
            button.addEventListener('click', () => {
                const layout = button.dataset.layout;
                updateDashboardLayout(layout);
                
                // Update button states
                layoutButtons.forEach(btn => {
                    btn.classList.toggle('btn-primary', btn === button);
                    btn.classList.toggle('btn-outline', btn !== button);
                });
                
                saveDashboardConfig();
            });
        });

        // Color palette
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                const color = option.dataset.color;
                applyPrimaryColor(color);
                
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                saveSettings();
            });
        });

        // Theme selection
        document.getElementById('themeSelection')?.addEventListener('change', (e) => {
            applyTheme(e.target.value);
            saveSettings();
        });

        // Settings form changes
        document.querySelectorAll('#general input, #general select, #themes input, #themes select')
            .forEach(element => {
                element.addEventListener('change', saveSettings);
            });

        // Dashboard buttons
        document.getElementById('previewDashboard')?.addEventListener('click', previewDashboard);
        document.getElementById('resetDashboard')?.addEventListener('click', resetDashboard);
        document.getElementById('saveDashboard')?.addEventListener('click', saveDashboardConfig);
        
        // Alert management
        document.getElementById('addAlertRule')?.addEventListener('click', addAlertRule);
        
        // Settings management
        document.getElementById('saveAllSettings')?.addEventListener('click', saveAllSettings);
        document.getElementById('exportSettings')?.addEventListener('click', exportSettings);
        document.getElementById('importSettings')?.addEventListener('click', importSettings);
        document.getElementById('clearAllData')?.addEventListener('click', clearAllData);
    }

    function setupDragAndDrop() {
        // Widget drag start
        widgetCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.widget);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        // Dashboard drop zone
        dashboardPreview.addEventListener('dragover', (e) => {
            e.preventDefault();
            dashboardPreview.classList.add('drag-over');
        });

        dashboardPreview.addEventListener('dragleave', () => {
            dashboardPreview.classList.remove('drag-over');
        });

        dashboardPreview.addEventListener('drop', (e) => {
            e.preventDefault();
            dashboardPreview.classList.remove('drag-over');
            
            const widgetType = e.dataTransfer.getData('text/plain');
            addWidgetToPreview(widgetType, e);
        });
    }

    function switchTab(tabId) {
        // Update tab buttons
        settingsTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update tab content
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }

    function updateDashboardLayout(layout) {
        dashboardPreview.className = `dashboard-grid-preview layout-${layout}`;
        
        // Clear existing widgets and add default ones based on layout
        dashboardPreview.innerHTML = '';
        
        const widgetCount = getWidgetCountForLayout(layout);
        const defaultWidgets = ['timeline', 'donut', 'bar', 'kpi'];
        
        for (let i = 0; i < widgetCount; i++) {
            const widgetType = defaultWidgets[i] || 'timeline';
            addWidgetPlaceholder(widgetType, i);
        }
    }

    function getWidgetCountForLayout(layout) {
        switch (layout) {
            case '1x1': return 1;
            case '2x1': return 2;
            case '3x1': return 3;
            case '2x2': return 4;
            default: return 2;
        }
    }

    function addWidgetPlaceholder(type, position) {
        const placeholder = document.createElement('div');
        placeholder.className = 'widget-placeholder';
        placeholder.dataset.widgetType = type;
        placeholder.dataset.position = position;
        
        const iconMap = {
            timeline: 'fas fa-chart-line',
            bar: 'fas fa-chart-bar',
            donut: 'fas fa-chart-pie',
            kpi: 'fas fa-tachometer-alt',
            table: 'fas fa-table',
            gauge: 'fas fa-gauge-high'
        };

        const nameMap = {
            timeline: 'Timeline Chart',
            bar: 'Bar Chart', 
            donut: 'Donut Chart',
            kpi: 'KPI Cards',
            table: 'Data Table',
            gauge: 'Gauge Chart'
        };

        placeholder.innerHTML = `
            <div>
                <i class="${iconMap[type] || 'fas fa-chart-line'} text-2xl mb-2"></i>
                <p>${nameMap[type] || 'Chart'}</p>
                <button class="btn btn-sm btn-outline mt-2 remove-widget" data-position="${position}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add click handler for removal
        placeholder.querySelector('.remove-widget').addEventListener('click', (e) => {
            e.stopPropagation();
            placeholder.remove();
            saveDashboardConfig();
        });

        dashboardPreview.appendChild(placeholder);
    }

    function addWidgetToPreview(widgetType, event) {
        const placeholder = event.target.closest('.widget-placeholder');
        if (placeholder) {
            placeholder.dataset.widgetType = widgetType;
            const icon = placeholder.querySelector('i');
            const text = placeholder.querySelector('p');
            
            const iconMap = {
                timeline: 'fas fa-chart-line',
                bar: 'fas fa-chart-bar',
                donut: 'fas fa-chart-pie',
                kpi: 'fas fa-tachometer-alt',
                table: 'fas fa-table',
                gauge: 'fas fa-gauge-high'
            };

            const nameMap = {
                timeline: 'Timeline Chart',
                bar: 'Bar Chart',
                donut: 'Donut Chart', 
                kpi: 'KPI Cards',
                table: 'Data Table',
                gauge: 'Gauge Chart'
            };

            icon.className = iconMap[widgetType] || 'fas fa-chart-line';
            text.textContent = nameMap[widgetType] || 'Chart';
            
            saveDashboardConfig();
            showToast(`${nameMap[widgetType]} added to dashboard`, "success");
        }
    }

    function applyPrimaryColor(color) {
        document.documentElement.style.setProperty('--app-primary', color);
        
        // Update theme color meta tag
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.content = color;
    }

    function applyTheme(theme) {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        // Update charts if they exist
        if (window.updateAllChartThemes) {
            window.updateAllChartThemes(theme);
        }
    }

    function updateThemePreview() {
        const themeSelect = document.getElementById('themeSelection');
        if (themeSelect) {
            applyTheme(themeSelect.value);
        }
    }

    function loadAlertRules() {
        const savedRules = localStorage.getItem('metricsAppAlertRules');
        const rules = savedRules ? JSON.parse(savedRules) : defaultAlertRules;
        
        renderAlertRules(rules);
    }

    function renderAlertRules(rules) {
        const container = document.getElementById('alertRulesContainer');
        if (!container) return;

        container.innerHTML = '';
        
        rules.forEach(rule => {
            const ruleElement = createAlertRuleElement(rule);
            container.appendChild(ruleElement);
        });
    }

    function createAlertRuleElement(rule) {
        const div = document.createElement('div');
        div.className = `alert-rule ${rule.enabled ? 'enabled' : 'disabled'}`;
        div.dataset.ruleId = rule.id;

        const severityColors = {
            info: 'text-info',
            warning: 'text-warning', 
            critical: 'text-danger'
        };

        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h4 class="font-semibold">${rule.name}</h4>
                    <p class="text-sm text-muted">${rule.metricType} ${rule.condition.replace('_', ' ')} ${rule.threshold}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="badge ${severityColors[rule.severity]}">${rule.severity}</span>
                    <label class="switch">
                        <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="toggleAlertRule('${rule.id}')">
                        <span class="slider"></span>
                    </label>
                    <button class="btn btn-sm btn-outline" onclick="editAlertRule('${rule.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline btn-danger" onclick="deleteAlertRule('${rule.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        return div;
    }

    function addAlertRule() {
        const newRule = {
            id: `rule-${Date.now()}`,
            name: 'New Alert Rule',
            metricType: 'CPUUsage',
            condition: 'greater_than',
            threshold: 50,
            enabled: true,
            severity: 'warning'
        };

        const savedRules = localStorage.getItem('metricsAppAlertRules');
        const rules = savedRules ? JSON.parse(savedRules) : defaultAlertRules;
        rules.push(newRule);
        
        localStorage.setItem('metricsAppAlertRules', JSON.stringify(rules));
        renderAlertRules(rules);
        showToast("New alert rule added", "success");
    }

    // Global functions for alert management
    window.toggleAlertRule = function(ruleId) {
        const savedRules = localStorage.getItem('metricsAppAlertRules');
        const rules = savedRules ? JSON.parse(savedRules) : defaultAlertRules;
        
        const rule = rules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = !rule.enabled;
            localStorage.setItem('metricsAppAlertRules', JSON.stringify(rules));
            renderAlertRules(rules);
            showToast(`Alert rule ${rule.enabled ? 'enabled' : 'disabled'}`, "info");
        }
    };

    window.editAlertRule = function(ruleId) {
        // This would open a modal for editing
        showToast("Edit functionality coming soon", "info");
    };

    window.deleteAlertRule = function(ruleId) {
        if (confirm('Are you sure you want to delete this alert rule?')) {
            const savedRules = localStorage.getItem('metricsAppAlertRules');
            const rules = savedRules ? JSON.parse(savedRules) : defaultAlertRules;
            
            const filteredRules = rules.filter(r => r.id !== ruleId);
            localStorage.setItem('metricsAppAlertRules', JSON.stringify(filteredRules));
            renderAlertRules(filteredRules);
            showToast("Alert rule deleted", "success");
        }
    };

    function previewDashboard() {
        const config = getDashboardConfig();
        window.open(`/?preview=true&config=${encodeURIComponent(JSON.stringify(config))}`, '_blank');
    }

    function resetDashboard() {
        if (confirm('Are you sure you want to reset the dashboard to default layout?')) {
            localStorage.removeItem(DASHBOARD_CONFIG_KEY);
            loadDashboardConfig();
            showToast("Dashboard reset to default", "info");
        }
    }

    function getDashboardConfig() {
        const widgets = Array.from(dashboardPreview.querySelectorAll('.widget-placeholder')).map((placeholder, index) => ({
            id: `widget-${index}`,
            type: placeholder.dataset.widgetType,
            position: index
        }));

        return {
            layout: dashboardPreview.className.split(' ').find(c => c.startsWith('layout-'))?.replace('layout-', '') || '2x1',
            widgets: widgets,
            name: document.getElementById('dashboardName')?.value || 'Main Dashboard',
            refreshInterval: parseInt(document.getElementById('dashboardRefresh')?.value || '60'),
            fullscreen: document.getElementById('dashboardFullscreen')?.checked || false
        };
    }

    async function saveDashboardConfig() {
        const config = getDashboardConfig();
        
        try {
            // Try to get existing default dashboard first
            const existingResponse = await fetch('/api/Dashboard/configs/default');
            
            if (existingResponse.ok) {
                const existingConfig = await existingResponse.json();
                
                // Check if this is a real saved config (has valid ID > 0) or just a mock default
                if (existingConfig.id && existingConfig.id > 0) {
                    // Update existing dashboard
                    const updateResponse = await fetch(`/api/Dashboard/configs/${existingConfig.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: config.name,
                            layout: config.layout,
                            widgets: JSON.stringify(config.widgets),
                            settings: JSON.stringify({
                                refreshInterval: config.refreshInterval,
                                fullscreen: config.fullscreen
                            }),
                            isDefault: true
                        })
                    });
                    
                    if (!updateResponse.ok) {
                        const errorText = await updateResponse.text();
                        throw new Error(`Failed to update dashboard: ${updateResponse.status} - ${errorText}`);
                    }
                    
                    showToast("Dashboard configuration updated successfully", "success");
                } else {
                    // No real config exists, create new one
                    await createNewDashboardConfig(config);
                }
            } else {
                // No default config endpoint available, create new one
                await createNewDashboardConfig(config);
            }
            
            // Always save to localStorage as fallback
            localStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify(config));
            
        } catch (error) {
            console.error("Error saving dashboard to server:", error);
            // Fallback to localStorage only
            localStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify(config));
            showToast("Dashboard configuration saved locally (server unavailable)", "warning");
        }
    }

    async function createNewDashboardConfig(config) {
        const createResponse = await fetch('/api/Dashboard/configs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: config.name,
                layout: config.layout,
                widgets: JSON.stringify(config.widgets),
                settings: JSON.stringify({
                    refreshInterval: config.refreshInterval,
                    fullscreen: config.fullscreen
                }),
                isDefault: true
            })
        });
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Failed to create dashboard: ${createResponse.status} - ${errorText}`);
        }
        
        showToast("Dashboard configuration created successfully", "success");
        return await createResponse.json();
    }

    function saveSettings() {
        const settings = {};
        
        // Collect all settings
        document.querySelectorAll('#general input, #general select, #themes input, #themes select')
            .forEach(element => {
                if (element.type === 'checkbox') {
                    settings[element.id] = element.checked;
                } else {
                    settings[element.id] = element.value;
                }
            });

        // Add dashboard-specific settings
        ['dashboardName', 'dashboardRefresh', 'dashboardFullscreen'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                settings[id] = element.type === 'checkbox' ? element.checked : element.value;
            }
        });

        // Add selected primary color
        const selectedColor = document.querySelector('.color-option.selected');
        if (selectedColor) {
            settings.primaryColor = selectedColor.dataset.color;
        }

        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }

    function saveAllSettings() {
        saveSettings();
        saveDashboardConfig();
        showToast("All settings saved successfully", "success");
    }

    function exportSettings() {
        const settings = localStorage.getItem(SETTINGS_STORAGE_KEY) || JSON.stringify(defaultSettings);
        const dashboardConfig = localStorage.getItem(DASHBOARD_CONFIG_KEY) || JSON.stringify(defaultDashboardConfig);
        const alertRules = localStorage.getItem('metricsAppAlertRules') || JSON.stringify(defaultAlertRules);

        const exportData = {
            settings: JSON.parse(settings),
            dashboard: JSON.parse(dashboardConfig),
            alerts: JSON.parse(alertRules),
            exportDate: new Date().toISOString(),
            version: "1.0"
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metrics-app-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast("Settings exported successfully", "success");
    }

    function importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importData = JSON.parse(e.target.result);
                        
                        if (importData.settings) {
                            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(importData.settings));
                        }
                        if (importData.dashboard) {
                            localStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify(importData.dashboard));
                        }
                        if (importData.alerts) {
                            localStorage.setItem('metricsAppAlertRules', JSON.stringify(importData.alerts));
                        }

                        // Reload the page to apply imported settings
                        if (confirm('Settings imported successfully. Reload the page to apply changes?')) {
                            window.location.reload();
                        }
                    } catch (error) {
                        showToast("Error importing settings: Invalid file format", "error");
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    function clearAllData() {
        if (confirm('Are you sure you want to clear all cached data? This action cannot be undone.')) {
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
            localStorage.removeItem(DASHBOARD_CONFIG_KEY);
            localStorage.removeItem('metricsAppAlertRules');
            localStorage.removeItem('metricsAppFilters');
            
            showToast("All data cleared successfully", "info");
            
            if (confirm('Data cleared. Reload the page to apply default settings?')) {
                window.location.reload();
            }
        }
    }

    // Toast notification function
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

    // CSS for toast notifications (inject into head)
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        
    `;
    document.head.appendChild(toastStyles);

    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const themeSelect = document.getElementById('themeSelection');
        if (themeSelect && themeSelect.value === 'auto') {
            applyTheme('auto');
        }
    });
}); 