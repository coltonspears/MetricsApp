import React from 'react'
import { Palette, Monitor, Smartphone, Database, Bell, Settings, Search, BarChart3, Activity, Layers, User, Star, HelpCircle } from 'lucide-react'
import { useTheme } from '../lib/theme'
import ThemeSelector from '../components/ThemeSelector'

export default function ThemeShowcase() {
  const { currentTheme, availableThemes } = useTheme()

  const mockData = [
    { label: 'CPU Usage', value: 78, color: 'var(--status-warning)' },
    { label: 'Memory', value: 65, color: 'var(--status-info)' },
    { label: 'Disk I/O', value: 43, color: 'var(--status-success)' },
    { label: 'Network', value: 89, color: 'var(--status-error)' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-bold"
            style={{ 
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Theme Showcase
          </h1>
          <p 
            className="mt-2"
            style={{ 
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-lg)'
            }}
          >
            Explore and compare different themes for MetricsApp
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSelector variant="dropdown" showLabel={true} />
        </div>
      </div>

      {/* Current Theme Info */}
      <div 
        className="p-6 border"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--border-primary)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: 'var(--interactive-primary)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <Palette className="h-8 w-8" style={{ color: 'var(--text-inverse)' }} />
          </div>
          <div>
            <h2 
              className="text-2xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {currentTheme.name}
            </h2>
            <p 
              className="mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {currentTheme.description}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span 
                className="px-2 py-1 text-xs rounded"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Type: {currentTheme.type}
              </span>
              <span 
                className="px-2 py-1 text-xs rounded"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Font: {currentTheme.layout.typography.fontFamily.sans.split(',')[0]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Grid */}
      <div>
        <h2 
          className="text-xl font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Available Themes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableThemes.map((theme) => (
            <div
              key={theme.id}
              className="border p-4"
              style={{
                backgroundColor: theme.colors.background.tertiary,
                borderColor: theme.colors.border.primary,
                borderRadius: theme.layout.borderRadius.lg,
                fontFamily: theme.layout.typography.fontFamily.sans
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 
                    className="font-semibold"
                    style={{ color: theme.colors.text.primary }}
                  >
                    {theme.name}
                  </h3>
                  <div
                    className="w-4 h-4 rounded border"
                    style={{
                      backgroundColor: theme.colors.interactive.primary,
                      borderColor: theme.colors.border.primary,
                      borderRadius: theme.layout.borderRadius.sm
                    }}
                  />
                </div>
                <p 
                  className="text-sm"
                  style={{ color: theme.colors.text.secondary }}
                >
                  {theme.description}
                </p>
                
                {/* Mini color palette */}
                <div className="flex gap-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ 
                      backgroundColor: theme.colors.interactive.primary,
                      borderRadius: theme.layout.borderRadius.sm
                    }}
                    title="Primary"
                  />
                  <div
                    className="w-3 h-3 rounded"
                    style={{ 
                      backgroundColor: theme.colors.status.success,
                      borderRadius: theme.layout.borderRadius.sm
                    }}
                    title="Success"
                  />
                  <div
                    className="w-3 h-3 rounded"
                    style={{ 
                      backgroundColor: theme.colors.status.warning,
                      borderRadius: theme.layout.borderRadius.sm
                    }}
                    title="Warning"
                  />
                  <div
                    className="w-3 h-3 rounded"
                    style={{ 
                      backgroundColor: theme.colors.status.error,
                      borderRadius: theme.layout.borderRadius.sm
                    }}
                    title="Error"
                  />
                  <div
                    className="w-3 h-3 rounded"
                    style={{ 
                      backgroundColor: theme.colors.status.info,
                      borderRadius: theme.layout.borderRadius.sm
                    }}
                    title="Info"
                  />
                </div>

                {/* Preview metrics */}
                <div className="space-y-1">
                  {[65, 78, 43, 89].map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="text-xs"
                        style={{ 
                          color: theme.colors.text.secondary,
                          fontSize: theme.layout.typography.fontSize.xs
                        }}
                      >
                        Metric {index + 1}
                      </div>
                      <div 
                        className="flex-1 h-1 rounded overflow-hidden"
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
                        className="text-xs font-medium"
                        style={{ 
                          color: theme.colors.text.primary,
                          fontSize: theme.layout.typography.fontSize.xs
                        }}
                      >
                        {value}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UI Components Demo */}
      <div>
        <h2 
          className="text-xl font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          UI Components Preview
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Navigation Preview */}
          <div 
            className="p-4 border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <h3 
              className="font-semibold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Navigation Components
            </h3>
            <div className="space-y-2">
              {[
                { icon: Database, label: 'Dashboard', active: true },
                { icon: BarChart3, label: 'Analytics', active: false },
                { icon: Activity, label: 'Monitoring', active: false },
                { icon: Bell, label: 'Alerts', active: false },
                { icon: Settings, label: 'Settings', active: false },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-3 py-2 transition-colors"
                  style={{
                    backgroundColor: item.active ? 'var(--interactive-primary)' : 'transparent',
                    color: item.active ? 'var(--text-inverse)' : 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.active && (
                    <div
                      className="w-2 h-2 rounded-full ml-auto"
                      style={{ 
                        backgroundColor: 'var(--text-inverse)',
                        borderRadius: 'var(--radius-full)'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Buttons & Controls */}
          <div 
            className="p-4 border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <h3 
              className="font-semibold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Buttons & Controls
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--interactive-primary)',
                    color: 'var(--text-inverse)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  Primary
                </button>
                <button
                  className="px-4 py-2 font-medium border transition-colors"
                  style={{
                    backgroundColor: 'var(--interactive-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  Secondary
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--status-success)',
                    color: 'var(--text-inverse)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  Success
                </button>
                <button
                  className="px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--status-warning)',
                    color: 'var(--text-inverse)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  Warning
                </button>
                <button
                  className="px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--status-error)',
                    color: 'var(--text-inverse)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  Error
                </button>
              </div>

              <div className="border-t pt-3" style={{ borderColor: 'var(--border-primary)' }}>
                <input
                  type="text"
                  placeholder="Search components..."
                  className="w-full px-3 py-2 border transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Data Visualization */}
          <div 
            className="p-4 border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <h3 
              className="font-semibold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Data Visualization
            </h3>
            <div className="space-y-4">
              {mockData.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span 
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.label}
                    </span>
                    <span 
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {item.value}%
                    </span>
                  </div>
                  <div 
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-full)'
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

          {/* Cards & Panels */}
          <div 
            className="p-4 border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <h3 
              className="font-semibold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Cards & Panels
            </h3>
            <div className="space-y-3">
              {[
                { title: 'Active Users', value: '1,234', change: '+12%', positive: true },
                { title: 'Response Time', value: '145ms', change: '-5%', positive: true },
                { title: 'Error Rate', value: '0.02%', change: '+0.01%', positive: false },
              ].map((metric, index) => (
                <div
                  key={index}
                  className="p-3 border"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-secondary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div 
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {metric.title}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span 
                      className="text-lg font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {metric.value}
                    </span>
                    <span
                      className="text-sm font-medium"
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
      </div>

      {/* Color Palette */}
      <div>
        <h2 
          className="text-xl font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Color Palette
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div
              key={index}
              className="p-4 border"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div
                className="w-full h-12 mb-2"
                style={{
                  backgroundColor: color.color,
                  borderRadius: 'var(--radius-sm)'
                }}
              />
              <div 
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {color.name}
              </div>
              <div 
                className="text-xs font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                {color.color}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div>
        <h2 
          className="text-xl font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Typography
        </h2>
        <div 
          className="p-6 border space-y-4"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div>
            <h1 
              className="font-bold"
              style={{ 
                color: 'var(--text-primary)',
                fontSize: 'var(--text-3xl)'
              }}
            >
              Heading 1 - {currentTheme.layout.typography.fontFamily.sans.split(',')[0]}
            </h1>
          </div>
          <div>
            <h2 
              className="font-semibold"
              style={{ 
                color: 'var(--text-primary)',
                fontSize: 'var(--text-2xl)'
              }}
            >
              Heading 2 - Large headings and titles
            </h2>
          </div>
          <div>
            <h3 
              className="font-medium"
              style={{ 
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xl)'
              }}
            >
              Heading 3 - Section headings
            </h3>
          </div>
          <div>
            <p 
              style={{ 
                color: 'var(--text-primary)',
                fontSize: 'var(--text-base)'
              }}
            >
              Body text - This is the primary text used throughout the application for content, descriptions, and general information.
            </p>
          </div>
          <div>
            <p 
              style={{ 
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)'
              }}
            >
              Secondary text - Used for supporting information, labels, and less prominent content.
            </p>
          </div>
          <div>
            <code 
              className="px-2 py-1 rounded"
              style={{ 
                color: 'var(--text-accent)',
                backgroundColor: 'var(--bg-elevated)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              Monospace font - {currentTheme.layout.typography.fontFamily.mono.split(',')[0]}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
} 