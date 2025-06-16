import { LucideIcon } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: LucideIcon
  children?: React.ReactNode
  features?: string[]
}

const PlaceholderPage = ({ title, description, icon: Icon, children, features }: PlaceholderPageProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Icon className="h-8 w-8 text-themed-text-accent mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-themed-text-primary">{title}</h1>
        {description && (
          <div className="mt-4 max-w-2xl mx-auto">
            <p className="text-themed-text-secondary">
              {description}
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary">
        <div className="text-center py-12 px-6">
          <Icon className="h-16 w-16 text-themed-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-themed-text-primary mb-2">
            Coming Soon
          </h3>
          <p className="text-themed-text-secondary mb-6">
            This feature is currently under development. Check back soon for updates!
          </p>
          
          {features && features.length > 0 && (
            <div className="max-w-md mx-auto">
              <h4 className="text-sm font-medium text-themed-text-primary mb-3">Planned Features:</h4>
              <ul className="text-sm text-themed-text-secondary space-y-1">
                {features.map((feature, index) => (
                  <li key={index}>• {feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-themed-alert-info border border-themed-alert-info rounded-lg p-4">
        <div className="text-center">
          <p className="text-sm text-themed-alert-info">
            💡 This page is a placeholder and will be implemented in a future release.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PlaceholderPage 