import { useState } from 'react'
import { Shield, Save, Eye, EyeOff } from 'lucide-react'

const GoogleAuth = () => {
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    clientId: '',
    clientSecret: '',
    scopes: 'openid profile email',
    redirectUrl: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Google OAuth Configuration:', formData)
    // TODO: Implement actual configuration save
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-8 w-8 themed-interactive-primary" />
          <h1 className="text-3xl font-bold text-themed-text-primary">Google OAuth Configuration</h1>
          <span className="px-3 py-1 text-sm font-medium bg-themed-alert-warning bg-opacity-20 text-themed-status-warning rounded-full">
            Work in Progress
          </span>
        </div>
        <p className="text-themed-text-secondary">
          Configure Google OAuth integration for user authentication. This page is currently under development.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-themed-text-primary mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="e.g., Google Login"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>

            {/* Client ID */}
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-themed-text-primary mb-2">
                Client ID
              </label>
              <input
                type="text"
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                placeholder="Your Google OAuth Client ID"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>

            {/* Client Secret */}
            <div>
              <label htmlFor="clientSecret" className="block text-sm font-medium text-themed-text-primary mb-2">
                Client Secret
              </label>
              <div className="relative">
                <input
                  type={showClientSecret ? 'text' : 'password'}
                  id="clientSecret"
                  name="clientSecret"
                  value={formData.clientSecret}
                  onChange={handleChange}
                  placeholder="Your Google OAuth Client Secret"
                  className="w-full px-3 py-2 pr-10 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-themed-text-muted hover:text-themed-text-primary"
                >
                  {showClientSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Scopes */}
            <div>
              <label htmlFor="scopes" className="block text-sm font-medium text-themed-text-primary mb-2">
                Scopes
              </label>
              <input
                type="text"
                id="scopes"
                name="scopes"
                value={formData.scopes}
                onChange={handleChange}
                placeholder="openid profile email"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
              <p className="mt-1 text-sm text-themed-text-secondary">
                Space-separated list of OAuth scopes to request
              </p>
            </div>

            {/* Redirect URL */}
            <div>
              <label htmlFor="redirectUrl" className="block text-sm font-medium text-themed-text-primary mb-2">
                Redirect URL
              </label>
              <input
                type="url"
                id="redirectUrl"
                name="redirectUrl"
                value={formData.redirectUrl}
                onChange={handleChange}
                placeholder="https://yourapp.com/auth/google/callback"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-themed-border-primary">
              <button
                type="button"
                className="btn-themed-secondary"
              >
                Test Connection
              </button>
              <button
                type="submit"
                className="btn-themed-primary flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-themed-alert-info bg-opacity-10 border border-themed-alert-info rounded-lg p-4">
        <h3 className="text-sm font-medium text-themed-status-info mb-2">Setup Instructions</h3>
        <ol className="text-sm text-themed-text-secondary space-y-1 list-decimal list-inside">
          <li>Go to the Google Cloud Console and create a new OAuth 2.0 Client ID</li>
          <li>Add your application's domain to the authorized domains</li>
          <li>Copy the Client ID and Client Secret from the Google Cloud Console</li>
          <li>Set the redirect URL in both Google Cloud Console and this form</li>
          <li>Configure the appropriate scopes for your application needs</li>
        </ol>
      </div>
    </div>
  )
}

export default GoogleAuth 