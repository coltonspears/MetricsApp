import React from 'react'
import { useTheme } from '../lib/theme'
import ThemeSelector from '../components/ThemeSelector'

export default function StyleGuide() {
  const { currentTheme } = useTheme()
  const theme = currentTheme

  // Color tokens to display
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
    { name: 'Status Neutral', var: '--status-neutral' },
    { name: 'Interactive Primary', var: '--interactive-primary' },
    { name: 'Interactive Secondary', var: '--interactive-secondary' },
  ]

  // Typography tokens
  const fontSizes = [
    { label: 'XS', var: '--text-xs' },
    { label: 'SM', var: '--text-sm' },
    { label: 'Base', var: '--text-base' },
    { label: 'LG', var: '--text-lg' },
    { label: 'XL', var: '--text-xl' },
    { label: '2XL', var: '--text-2xl' },
    { label: '3XL', var: '--text-3xl' },
  ]

  // Border radius tokens
  const radii = [
    { label: 'None', var: '--radius-none' },
    { label: 'SM', var: '--radius-sm' },
    { label: 'MD', var: '--radius-md' },
    { label: 'LG', var: '--radius-lg' },
    { label: 'XL', var: '--radius-xl' },
    { label: 'Full', var: '--radius-full' },
  ]

  // Spacing tokens
  const spacings = [
    { label: 'XS', var: '--spacing-xs' },
    { label: 'SM', var: '--spacing-sm' },
    { label: 'MD', var: '--spacing-md' },
    { label: 'LG', var: '--spacing-lg' },
    { label: 'XL', var: '--spacing-xl' },
  ]

  // Shadow tokens
  const shadows = [
    { label: 'SM', var: '--shadow-sm' },
    { label: 'MD', var: '--shadow-md' },
    { label: 'LG', var: '--shadow-lg' },
    { label: 'XL', var: '--shadow-xl' },
  ]

  // Alert tokens
  const alerts = [
    { type: 'Success', bg: '--alert-success-bg', text: '--alert-success-text', border: '--alert-success-border' },
    { type: 'Error', bg: '--alert-error-bg', text: '--alert-error-text', border: '--alert-error-border' },
    { type: 'Warning', bg: '--alert-warning-bg', text: '--alert-warning-text', border: '--alert-warning-border' },
    { type: 'Info', bg: '--alert-info-bg', text: '--alert-info-text', border: '--alert-info-border' },
    { type: 'Neutral', bg: '--alert-neutral-bg', text: '--alert-neutral-text', border: '--alert-neutral-border' },
  ]

  // Demo data for the right panel
  const tableData = [
    { name: 'CPU Usage', value: '78%', status: 'warning' },
    { name: 'Memory', value: '65%', status: 'info' },
    { name: 'Disk I/O', value: '43%', status: 'success' },
    { name: 'Network', value: '89%', status: 'error' },
  ]

  // HTML code for the demo panel
  const demoHtml = `
<div class="demo-panel">
  <div class="demo-header">
    <span>Demo Dashboard</span>
    <button class="btn-themed-secondary">Settings</button>
  </div>
  <div class="demo-nav">
    <button class="btn-themed-secondary">Overview</button>
    <button class="btn-themed-primary">Metrics</button>
    <button class="btn-themed-secondary">Alerts</button>
  </div>
  <div class="demo-content">
    <div class="demo-alert-info">
      <span class="font-semibold">Info:</span> This is a live demo of the current theme. All colors, borders, and typography are from the theme system.
    </div>
    <table class="demo-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CPU Usage</td>
          <td>78%</td>
          <td><span class="status-warning">Warning</span></td>
        </tr>
        <tr>
          <td>Memory</td>
          <td>65%</td>
          <td><span class="status-info">Info</span></td>
        </tr>
        <tr>
          <td>Disk I/O</td>
          <td>43%</td>
          <td><span class="status-success">Success</span></td>
        </tr>
        <tr>
          <td>Network</td>
          <td>89%</td>
          <td><span class="status-error">Error</span></td>
        </tr>
      </tbody>
    </table>
    <div class="demo-actions">
      <button class="btn-themed-primary">Run Report</button>
      <button class="btn-themed-secondary">Export</button>
    </div>
  </div>
  <div class="demo-footer">
    <span>MetricsApp Demo • Theme: <span class="text-accent">{theme.name}</span></span>
  </div>
</div>
`.trim()

  // For alignment: get the height of the color palette header + block and add top margin to the demo panel
  // We'll use a fixed value for now (e.g. 56px header + 80px block = 136px)
  const demoTopMargin = 'mt-20 md:mt-[136px]'

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      {/* Left: Style Guide Sections */}
      <div className="w-full md:w-1/2 flex-shrink-0 flex-grow-0 px-6 py-8 space-y-12 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>Style Guide</h1>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              Visual reference for all design tokens and components in MetricsApp
            </p>
          </div>
          <ThemeSelector variant="dropdown" showLabel={true} />
        </div>
        {/* Colors */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Color Palette</h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>All main color tokens with swatches and variable names.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {colorTokens.map((token) => (
              <div key={token.var} className="p-4 border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                <div className="w-full h-10 mb-2" style={{ backgroundColor: `var(${token.var})`, borderRadius: 'var(--radius-sm)' }} />
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{token.name}</div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{token.var}</div>
              </div>
            ))}
          </div>
        </section>
        {/* Typography */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Typography</h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Font families and sizes used in the app.</p>
          <div className="mb-6">
            <div className="mb-2" style={{ color: 'var(--text-primary)' }}>
              <span className="font-bold">Sans:</span> <span style={{ fontFamily: 'var(--font-sans)' }}>{theme.layout.typography.fontFamily.sans}</span>
            </div>
            <div style={{ color: 'var(--text-primary)' }}>
              <span className="font-bold">Mono:</span> <span style={{ fontFamily: 'var(--font-mono)' }}>{theme.layout.typography.fontFamily.mono}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {fontSizes.map((size) => (
              <div key={size.var} className="p-4 border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: `var(${size.var})`, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {size.label} Example
                </div>
                <div className="text-xs font-mono mt-2" style={{ color: 'var(--text-secondary)' }}>{size.var}</div>
              </div>
            ))}
          </div>
        </section>
        {/* Buttons */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Buttons</h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Primary, secondary, and status buttons using theme tokens.</p>
          <div className="flex flex-wrap gap-4 items-end">
            <button className="btn-themed-primary">Primary</button>
            <button className="btn-themed-secondary">Secondary</button>
            <button className="px-4 py-2 font-medium rounded" style={{ backgroundColor: 'var(--status-success)', color: 'var(--text-inverse)', borderRadius: 'var(--radius-md)' }}>Success</button>
            <button className="px-4 py-2 font-medium rounded" style={{ backgroundColor: 'var(--status-warning)', color: 'var(--text-inverse)', borderRadius: 'var(--radius-md)' }}>Warning</button>
            <button className="px-4 py-2 font-medium rounded" style={{ backgroundColor: 'var(--status-error)', color: 'var(--text-inverse)', borderRadius: 'var(--radius-md)' }}>Error</button>
          </div>
        </section>
        {/* Alerts */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Alerts</h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Alert styles for different statuses.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {alerts.map((alert) => (
              <div key={alert.type} className="p-4 border-l-4" style={{ backgroundColor: `var(${alert.bg})`, color: `var(${alert.text})`, borderColor: `var(${alert.border})`, borderRadius: 'var(--radius-md)' }}>
                <div className="font-bold mb-1">{alert.type} Alert</div>
                <div>This is a {alert.type.toLowerCase()} alert using <span className="font-mono">{alert.bg}</span>, <span className="font-mono">{alert.text}</span>, <span className="font-mono">{alert.border}</span>.</div>
              </div>
            ))}
          </div>
        </section>
        {/* Spacing & Border Radius */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Spacing & Border Radius</h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Visual examples of spacing and border radius tokens.</p>
          <div className="flex flex-wrap gap-6 mb-6">
            {spacings.map((space) => (
              <div key={space.var} className="flex flex-col items-center">
                <div style={{ width: '48px', height: `var(${space.var})`, background: 'var(--interactive-primary)', borderRadius: 'var(--radius-sm)' }} />
                <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{space.var}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-6">
            {radii.map((radius) => (
              <div key={radius.var} className="flex flex-col items-center">
                <div style={{ width: '48px', height: '48px', background: 'var(--interactive-secondary)', borderRadius: `var(${radius.var})` }} />
                <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{radius.var}</div>
              </div>
            ))}
          </div>
        </section>
        {/* Shadows */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Shadows</h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Box examples for each shadow token.</p>
          <div className="flex flex-wrap gap-6">
            {shadows.map((shadow) => (
              <div key={shadow.var} className="w-24 h-16 flex items-end justify-center p-2" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', boxShadow: `var(${shadow.var})` }}>
                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{shadow.var}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {/* Divider */}
      <div className="hidden md:block w-px bg-gray-300 dark:bg-gray-700 my-8" />
      {/* Right: Demo App Panel */}
      <div className={`w-full md:w-1/2 flex-shrink-0 flex-grow-0 flex flex-col items-stretch min-h-screen bg-transparent ${demoTopMargin}`}>
        {/* Demo App Header */}
        <div className="w-full" style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center justify-between px-8 py-4">
            <div className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>Demo Dashboard</div>
            <button className="btn-themed-secondary">Settings</button>
          </div>
        </div>
        {/* Demo App Nav */}
        <div className="flex gap-2 px-8 py-2 border-b" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-elevated)' }}>
          <button className="btn-themed-secondary" style={{ fontSize: 'var(--text-sm)' }}>Overview</button>
          <button className="btn-themed-primary" style={{ fontSize: 'var(--text-sm)' }}>Metrics</button>
          <button className="btn-themed-secondary" style={{ fontSize: 'var(--text-sm)' }}>Alerts</button>
        </div>
        {/* Demo App Content */}
        <div className="flex-1 px-8 py-6" style={{ background: 'var(--bg-surface)' }}>
          <div className="mb-4 p-4 rounded" style={{ background: 'var(--alert-info-bg)', color: 'var(--alert-info-text)', border: '1px solid var(--alert-info-border)' }}>
            <span className="font-semibold">Info:</span> This is a live demo of the current theme. All colors, borders, and typography are from the theme system.
          </div>
          <table className="w-full mb-6" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="text-left p-2" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-primary)' }}>Metric</th>
                <th className="text-left p-2" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-primary)' }}>Value</th>
                <th className="text-left p-2" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-primary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={row.name} style={{ background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'var(--bg-elevated)' }}>
                  <td className="p-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{row.name}</td>
                  <td className="p-2" style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{row.value}</td>
                  <td className="p-2">
                    <span style={{
                      color: `var(--status-${row.status})`,
                      background: `var(--status-${row.status})` + '22',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 8px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600
                    }}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mb-6">
            <button className="btn-themed-primary">Run Report</button>
            <button className="btn-themed-secondary">Export</button>
          </div>
          {/* HTML code block for the demo */}
          <div className="mt-4">
            <div className="text-xs font-mono mb-2" style={{ color: 'var(--text-tertiary)' }}>HTML for this panel:</div>
            <pre className="rounded p-4 overflow-x-auto" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', border: '1px solid var(--border-primary)' }}>
              <code>{demoHtml}</code>
            </pre>
          </div>
        </div>
        {/* Demo App Footer */}
        <div className="px-8 py-3 border-t" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-elevated)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>MetricsApp Demo • Theme: <span style={{ color: 'var(--text-accent)' }}>{theme.name}</span></span>
        </div>
      </div>
    </div>
  )
} 