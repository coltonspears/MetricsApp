import React, { createContext, useContext, useEffect, useState } from 'react'
import { Theme, themes, getThemeById, getThemeVars, professionalTheme } from './themes'

interface ThemeContextType {
  currentTheme: Theme
  availableThemes: Theme[]
  setTheme: (themeId: string) => void
  toggleTheme: () => void // For quick dark/light toggle
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    // Get theme from localStorage or default to professional theme
    const savedThemeId = localStorage.getItem('metricsapp-theme')
    return savedThemeId ? getThemeById(savedThemeId) : getThemeById('professional')
  })

  const setTheme = (themeId: string) => {
    const theme = getThemeById(themeId)
    setCurrentTheme(theme)
    localStorage.setItem('metricsapp-theme', themeId)
  }

  const toggleTheme = () => {
    // Smart toggle: if current is dark, go to light; if light, go to dark
    if (currentTheme.type === 'dark') {
      const lightTheme = themes.find(t => t.type === 'light')
      if (lightTheme) {
        setTheme(lightTheme.id)
      }
    } else {
      const darkTheme = themes.find(t => t.type === 'dark')
      if (darkTheme) {
        setTheme(darkTheme.id)
      }
    }
  }

  useEffect(() => {
    // Apply theme variables to CSS
    const root = document.documentElement
    const themeVars = getThemeVars(currentTheme)
    
    Object.entries(themeVars).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Apply theme class for Tailwind compatibility
    document.documentElement.className = currentTheme.type === 'dark' ? 'dark' : 'light'
    
    // Add theme-specific class for custom styling
    document.body.className = `theme-${currentTheme.id}`
    
    // Add font loading
    if (currentTheme.layout.typography.fontFamily.sans.includes('Roboto')) {
      const link = document.createElement('link')
      link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap'
      link.rel = 'stylesheet'
      if (!document.querySelector('link[href*="Roboto"]')) {
        document.head.appendChild(link)
      }
    }

  }, [currentTheme])

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        availableThemes: themes,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Backward compatibility
export const theme = 'dark' // For any components still using this 