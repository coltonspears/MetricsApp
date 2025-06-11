import React, { useState } from 'react'
import { Palette, Check, Sun, Moon } from 'lucide-react'
import { useTheme } from '../lib/theme'

interface ThemeSelectorProps {
  showLabel?: boolean
  variant?: 'dropdown' | 'grid' | 'compact'
}

export default function ThemeSelector({ showLabel = true, variant = 'dropdown' }: ThemeSelectorProps) {
  const { currentTheme, availableThemes, setTheme, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId)
    setIsOpen(false)
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-8 h-8 rounded transition-colors"
        style={{
          backgroundColor: 'var(--interactive-secondary)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        title={`Switch to ${currentTheme.type === 'dark' ? 'light' : 'dark'} theme`}
      >
        {currentTheme.type === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    )
  }

  if (variant === 'grid') {
    return (
      <div className="space-y-3">
        {showLabel && (
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            Theme
          </h3>
        )}
        <div className="grid grid-cols-1 gap-2">
          {availableThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className="flex items-center justify-between p-3 rounded text-left transition-colors"
              style={{
                backgroundColor: currentTheme.id === theme.id ? 'var(--interactive-primary)' : 'var(--bg-tertiary)',
                color: currentTheme.id === theme.id ? 'var(--text-inverse)' : 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
              }}
              onMouseEnter={(e) => {
                if (currentTheme.id !== theme.id) {
                  e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (currentTheme.id !== theme.id) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }
              }}
            >
              <div>
                <div className="font-medium">{theme.name}</div>
                <div 
                  className="text-sm opacity-75"
                  style={{ 
                    color: currentTheme.id === theme.id ? 'var(--text-inverse)' : 'var(--text-secondary)'
                  }}
                >
                  {theme.description}
                </div>
              </div>
              {currentTheme.id === theme.id && (
                <Check className="h-4 w-4 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Default dropdown variant
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded transition-colors"
        style={{
          backgroundColor: 'var(--interactive-secondary)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius-md)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary)'
        }}
      >
        <Palette className="h-4 w-4" />
        {showLabel && currentTheme.name}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div
            className="absolute right-0 mt-2 w-80 rounded shadow-lg border z-50"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              bottom: 'auto',
              top: '100%',
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            <div className="p-4">
              <h3 
                className="text-sm font-medium mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                Choose Theme
              </h3>
              <div className="space-y-2">
                {availableThemes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className="w-full flex items-center justify-between p-3 rounded text-left transition-colors"
                    style={{
                      backgroundColor: currentTheme.id === theme.id ? 'var(--interactive-primary)' : 'var(--bg-tertiary)',
                      color: currentTheme.id === theme.id ? 'var(--text-inverse)' : 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    onMouseEnter={(e) => {
                      if (currentTheme.id !== theme.id) {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentTheme.id !== theme.id) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded border-2"
                        style={{
                          backgroundColor: theme.colors.interactive.primary,
                          borderColor: theme.colors.border.primary,
                          borderRadius: theme.layout.borderRadius.sm,
                        }}
                      />
                      <div>
                        <div className="font-medium">{theme.name}</div>
                        <div 
                          className="text-xs opacity-75"
                          style={{ 
                            color: currentTheme.id === theme.id ? 'var(--text-inverse)' : 'var(--text-secondary)'
                          }}
                        >
                          {theme.description}
                        </div>
                      </div>
                    </div>
                    {currentTheme.id === theme.id && (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 