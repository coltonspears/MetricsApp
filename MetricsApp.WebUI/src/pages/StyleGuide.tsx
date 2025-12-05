import { useTheme } from '../lib/theme'
import ThemeSelector from '../components/ThemeSelector'
import PageHeader from '../components/PageHeader'

export default function StyleGuide() {
  const { currentTheme } = useTheme()
  const theme = currentTheme

  const colorTokens = [
    { name: 'Background Primary', var: '--bg-primary' },
    { name: 'Background Secondary', var: '--bg-secondary' },
    { name: 'Background Tertiary', var: '--bg-tertiary' },
    { name: 'Background Elevated', var: '--bg-elevated' },
    { name: 'Background Surface', var: '--bg-surface' },
    { name: 'Text Primary', var: '--text-primary' },
    { name: 'Text Secondary', var: '--text-secondary' },
    { name: 'Text Tertiary', var: '--text-tertiary' },
    { name: 'Text Accent', var: '--text-accent' },
    { name: 'Border Primary', var: '--border-primary' },
    { name: 'Border Accent', var: '--border-accent' },
    { name: 'Status Success', var: '--status-success' },
    { name: 'Status Error', var: '--status-error' },
    { name: 'Status Warning', var: '--status-warning' },
    { name: 'Status Info', var: '--status-info' },
    { name: 'Interactive Primary', var: '--interactive-primary' },
    { name: 'Interactive Secondary', var: '--interactive-secondary' },
  ]

  const fontSizes = [
    { label: 'XS', var: '--text-xs' },
    { label: 'SM', var: '--text-sm' },
    { label: 'Base', var: '--text-base' },
    { label: 'LG', var: '--text-lg' },
    { label: 'XL', var: '--text-xl' },
    { label: '2XL', var: '--text-2xl' },
    { label: '3XL', var: '--text-3xl' },
  ]

  const radii = [
    { label: 'None', var: '--radius-none' },
    { label: 'SM', var: '--radius-sm' },
    { label: 'MD', var: '--radius-md' },
    { label: 'LG', var: '--radius-lg' },
    { label: 'XL', var: '--radius-xl' },
    { label: 'Full', var: '--radius-full' },
  ]

  const spacings = [
    { label: 'XS', var: '--spacing-xs' },
    { label: 'SM', var: '--spacing-sm' },
    { label: 'MD', var: '--spacing-md' },
    { label: 'LG', var: '--spacing-lg' },
    { label: 'XL', var: '--spacing-xl' },
  ]

  const shadows = [
    { label: 'SM', var: '--shadow-sm' },
    { label: 'MD', var: '--shadow-md' },
    { label: 'LG', var: '--shadow-lg' },
    { label: 'XL', var: '--shadow-xl' },
  ]

  const alerts = [
    { type: 'Success', bg: '--alert-success-bg', text: '--alert-success-text', border: '--alert-success-border' },
    { type: 'Error', bg: '--alert-error-bg', text: '--alert-error-text', border: '--alert-error-border' },
    { type: 'Warning', bg: '--alert-warning-bg', text: '--alert-warning-text', border: '--alert-warning-border' },
    { type: 'Info', bg: '--alert-info-bg', text: '--alert-info-text', border: '--alert-info-border' },
    { type: 'Neutral', bg: '--alert-neutral-bg', text: '--alert-neutral-text', border: '--alert-neutral-border' },
  ]

  const tableData = [
    { name: 'CPU Usage', value: '78%', status: 'warning' },
    { name: 'Memory', value: '65%', status: 'info' },
    { name: 'Disk I/O', value: '43%', status: 'success' },
    { name: 'Network', value: '89%', status: 'error' },
  ]

  return (
    <div className="page-shell">
      <PageHeader 
        title="Style Guide" 
        description="Design tokens and components reference"
        actions={<ThemeSelector variant="dropdown" showLabel={true} />}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Token Reference */}
        <div className="flex-1 space-y-6">
          {/* Colors */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Color Palette</h2>
              <span className="badge-muted">{colorTokens.length} tokens</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colorTokens.map((token) => (
                <div key={token.var} className="flex items-center gap-2 p-2 surface-muted">
                  <div 
                    className="w-8 h-8 flex-shrink-0" 
                    style={{ backgroundColor: `var(${token.var})`, borderRadius: 'var(--radius-sm)' }} 
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {token.name}
                    </div>
                    <div className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                      {token.var}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Typography</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span><strong>Sans:</strong> {theme.layout.typography.fontFamily.sans.split(',')[0]}</span>
                <span><strong>Mono:</strong> {theme.layout.typography.fontFamily.mono.split(',')[0]}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {fontSizes.map((size) => (
                  <div key={size.var} className="p-2 surface-muted">
                    <div style={{ fontSize: `var(${size.var})`, color: 'var(--text-primary)' }}>
                      {size.label}
                    </div>
                    <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {size.var}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Buttons</h2>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button className="btn-themed-primary">Primary</button>
                <button className="btn-themed-secondary">Secondary</button>
                <button className="btn-themed-danger">Danger</button>
                <button className="btn-themed-outline">Outline</button>
                <button className="btn-themed-ghost">Ghost</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-themed-primary btn-themed-sm">Small</button>
                <button className="btn-themed-primary">Default</button>
                <button className="btn-themed-primary btn-themed-lg">Large</button>
              </div>
            </div>
          </section>

          {/* Inputs */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Form Controls</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" className="input-themed" placeholder="Text input" />
              <select className="input-themed">
                <option>Select option</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
              <textarea className="input-themed" placeholder="Textarea" rows={2} />
            </div>
          </section>

          {/* Alerts */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Alerts</h2>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div 
                  key={alert.type} 
                  className="p-3 text-sm"
                  style={{ 
                    backgroundColor: `var(${alert.bg})`, 
                    color: `var(${alert.text})`,
                    borderLeft: `3px solid var(${alert.border})`,
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <strong>{alert.type}:</strong> This is a {alert.type.toLowerCase()} alert message.
                </div>
              ))}
            </div>
          </section>

          {/* Spacing & Radius */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Spacing & Radius</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Spacing</div>
                <div className="flex flex-wrap gap-3">
                  {spacings.map((space) => (
                    <div key={space.var} className="text-center">
                      <div 
                        style={{ 
                          width: '32px', 
                          height: `var(${space.var})`, 
                          backgroundColor: 'var(--interactive-primary)',
                          borderRadius: 'var(--radius-sm)'
                        }} 
                      />
                      <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                        {space.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Border Radius</div>
                <div className="flex flex-wrap gap-3">
                  {radii.map((radius) => (
                    <div key={radius.var} className="text-center">
                      <div 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          backgroundColor: 'var(--interactive-secondary)',
                          borderRadius: `var(${radius.var})`
                        }} 
                      />
                      <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                        {radius.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Shadows */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Shadows</h2>
            </div>
            <div className="flex flex-wrap gap-4">
              {shadows.map((shadow) => (
                <div 
                  key={shadow.var}
                  className="w-16 h-12 flex items-end justify-center p-1"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: `var(${shadow.var})`
                  }}
                >
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {shadow.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Live Demo */}
        <div className="lg:w-96">
          <div className="panel sticky top-4">
            <div className="panel-header">
              <h2 className="panel-title">Live Demo</h2>
              <span className="badge-muted">{theme.name}</span>
            </div>

            {/* Tab nav demo */}
            <div className="tab-nav">
              <button className="tab-nav__item tab-nav__item--active">Overview</button>
              <button className="tab-nav__item">Metrics</button>
              <button className="tab-nav__item">Alerts</button>
            </div>

            {/* Info alert */}
            <div 
              className="p-3 text-xs"
              style={{ 
                backgroundColor: 'var(--alert-info-bg)', 
                color: 'var(--alert-info-text)',
                borderLeft: '3px solid var(--alert-info-border)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <strong>Info:</strong> Live preview of the current theme settings.
            </div>

            {/* Table demo */}
            <table className="table-themed">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td className="font-mono" style={{ color: 'var(--text-accent)' }}>{row.value}</td>
                    <td>
                      <span 
                        className="badge-muted"
                        style={{ 
                          borderColor: `var(--status-${row.status})`,
                          color: `var(--status-${row.status})`
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button className="btn-themed-primary flex-1">Run Report</button>
              <button className="btn-themed-secondary">Export</button>
            </div>

            <div className="panel-footer">
              MetricsApp • Theme: <span style={{ color: 'var(--text-accent)' }}>{theme.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
