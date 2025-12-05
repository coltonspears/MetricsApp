import { Palette, Database, Bell, Settings, BarChart3, Activity } from 'lucide-react'
import { useTheme } from '../lib/theme'
import ThemeSelector from '../components/ThemeSelector'
import PageHeader from '../components/PageHeader'

export default function ThemeShowcase() {
  const { currentTheme, availableThemes } = useTheme()

  const mockData = [
    { label: 'CPU Usage', value: 78, color: 'var(--status-warning)' },
    { label: 'Memory', value: 65, color: 'var(--status-info)' },
    { label: 'Disk I/O', value: 43, color: 'var(--status-success)' },
    { label: 'Network', value: 89, color: 'var(--status-error)' },
  ]

  return (
    <div className="page-shell">
      <PageHeader 
        title="Theme Showcase" 
        description="Explore and compare different themes for MetricsApp"
        actions={<ThemeSelector variant="dropdown" showLabel={true} />}
      />

      {/* Current Theme Info */}
      <div className="panel">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{
              backgroundColor: 'var(--interactive-primary)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <Palette className="h-6 w-6" style={{ color: 'var(--text-inverse)' }} />
          </div>
          <div className="flex-1">
            <h2 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {currentTheme.name}
            </h2>
            <p 
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {currentTheme.description}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="badge-muted">
              {currentTheme.type}
            </span>
            <span className="badge-muted">
              {currentTheme.layout.typography.fontFamily.sans.split(',')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Theme Grid */}
      <section>
        <h2 
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Available Themes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableThemes.map((theme) => (
            <div
              key={theme.id}
              className="panel"
              style={{
                backgroundColor: theme.colors.background.tertiary,
                borderColor: theme.colors.border.primary,
                borderRadius: theme.layout.borderRadius.sm,
                fontFamily: theme.layout.typography.fontFamily.sans
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 
                  className="font-semibold"
                  style={{ color: theme.colors.text.primary }}
                >
                  {theme.name}
                </h3>
                <div
                  className="w-3 h-3"
                  style={{
                    backgroundColor: theme.colors.interactive.primary,
                    borderRadius: theme.layout.borderRadius.sm
                  }}
                />
              </div>
              <p 
                className="text-xs mb-3"
                style={{ color: theme.colors.text.secondary }}
              >
                {theme.description}
              </p>
              
              {/* Mini color palette */}
              <div className="flex gap-1 mb-3">
                {[
                  theme.colors.interactive.primary,
                  theme.colors.status.success,
                  theme.colors.status.warning,
                  theme.colors.status.error,
                  theme.colors.status.info,
                ].map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4"
                    style={{ 
                      backgroundColor: color,
                      borderRadius: theme.layout.borderRadius.sm
                    }}
                  />
                ))}
              </div>

              {/* Preview metrics */}
              <div className="space-y-2">
                {[65, 78, 43, 89].map((value, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="text-xs w-16"
                      style={{ color: theme.colors.text.secondary }}
                    >
                      Metric {index + 1}
                    </div>
                    <div 
                      className="flex-1 h-1 overflow-hidden"
                      style={{ 
                        backgroundColor: theme.colors.background.elevated,
                        borderRadius: theme.layout.borderRadius.full
                      }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${value}%`,
                          backgroundColor: theme.colors.chart.primary[index % theme.colors.chart.primary.length]
                        }}
                      />
                    </div>
                    <div 
                      className="text-xs font-mono w-8 text-right"
                      style={{ color: theme.colors.text.primary }}
                    >
                      {value}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* UI Components Demo */}
      <section>
        <h2 
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          UI Components Preview
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Navigation Preview */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Navigation</h3>
            </div>
            <div className="space-y-1">
              {[
                { icon: Database, label: 'Dashboard', active: true },
                { icon: BarChart3, label: 'Analytics', active: false },
                { icon: Activity, label: 'Monitoring', active: false },
                { icon: Bell, label: 'Alerts', active: false },
                { icon: Settings, label: 'Settings', active: false },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm"
                  style={{
                    backgroundColor: item.active ? 'var(--interactive-primary)' : 'transparent',
                    color: item.active ? 'var(--text-inverse)' : 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons & Controls */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Buttons & Controls</h3>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button className="btn-themed-primary">Primary</button>
                <button className="btn-themed-secondary">Secondary</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-themed-primary btn-themed-sm" style={{ backgroundColor: 'var(--status-success)' }}>
                  Success
                </button>
                <button className="btn-themed-primary btn-themed-sm" style={{ backgroundColor: 'var(--status-warning)' }}>
                  Warning
                </button>
                <button className="btn-themed-danger btn-themed-sm">
                  Danger
                </button>
              </div>
              <input
                type="text"
                placeholder="Search components..."
                className="input-themed w-full"
              />
            </div>
          </div>

          {/* Data Visualization */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Data Visualization</h3>
            </div>
            <div className="space-y-3">
              {mockData.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </span>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {item.value}%
                    </span>
                  </div>
                  <div 
                    className="w-full h-2 overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${item.value}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stat Cards */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Stat Cards</h3>
            </div>
            <div className="space-y-2">
              {[
                { title: 'Active Users', value: '1,234', change: '+12%', positive: true },
                { title: 'Response Time', value: '145ms', change: '-5%', positive: true },
                { title: 'Error Rate', value: '0.02%', change: '+0.01%', positive: false },
              ].map((metric, index) => (
                <div
                  key={index}
                  className="stat-card"
                >
                  <div className="stat-card__label">{metric.title}</div>
                  <div className="flex items-center justify-between">
                    <span className="stat-card__value">{metric.value}</span>
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: metric.positive ? 'var(--status-success)' : 'var(--status-error)'
                      }}
                    >
                      {metric.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Color Palette */}
      <section>
        <h2 
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Color Palette
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { name: 'Primary', color: 'var(--interactive-primary)' },
            { name: 'Success', color: 'var(--status-success)' },
            { name: 'Warning', color: 'var(--status-warning)' },
            { name: 'Error', color: 'var(--status-error)' },
            { name: 'Info', color: 'var(--status-info)' },
            { name: 'Neutral', color: 'var(--status-neutral)' },
            { name: 'Background', color: 'var(--bg-secondary)' },
            { name: 'Surface', color: 'var(--bg-tertiary)' },
          ].map((color, index) => (
            <div key={index} className="surface-muted text-center p-2">
              <div
                className="w-full h-8 mb-1"
                style={{
                  backgroundColor: color.color,
                  borderRadius: 'var(--radius-sm)'
                }}
              />
              <div className="text-xs" style={{ color: 'var(--text-primary)' }}>
                {color.name}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Typography</h2>
          <span className="badge-muted">{currentTheme.layout.typography.fontFamily.sans.split(',')[0]}</span>
        </div>
        <div className="space-y-3">
          <h1 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-3xl)', fontWeight: 600 }}>
            Heading 1 - Page titles
          </h1>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-2xl)', fontWeight: 600 }}>
            Heading 2 - Section titles
          </h2>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xl)', fontWeight: 500 }}>
            Heading 3 - Subsections
          </h3>
          <p style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>
            Body text - This is the primary text used throughout the application.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Secondary text - Used for supporting information and labels.
          </p>
          <code 
            className="inline-block px-2 py-1"
            style={{ 
              color: 'var(--text-accent)',
              backgroundColor: 'var(--bg-tertiary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            Monospace - {currentTheme.layout.typography.fontFamily.mono.split(',')[0]}
          </code>
        </div>
      </section>
    </div>
  )
}
