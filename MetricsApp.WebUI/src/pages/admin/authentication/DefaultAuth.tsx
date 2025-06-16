import { useState } from 'react'
import { Shield, Save, Eye, EyeOff } from 'lucide-react'

const DefaultAuth = () => {
  const [showJwtSecret, setShowJwtSecret] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    jwtSecret: '',
    tokenExpiration: '24',
    refreshTokenExpiration: '168',
    requireEmailVerification: true,
    allowSelfRegistration: true,
    passwordMinLength: '8',
    passwordRequireSpecialChar: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Default Auth Configuration:', formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-8 w-8 themed-interactive-primary" />
          <h1 className="text-3xl font-bold text-themed-text-primary">Standalone Authentication Configuration</h1>
          <span className="px-3 py-1 text-sm font-medium bg-themed-alert-warning bg-opacity-20 text-themed-status-warning rounded-full">
            Work in Progress
          </span>
        </div>
        <p className="text-themed-text-secondary">
          Configure standalone authentication system with JWT tokens. This page is currently under development.
        </p>
      </div>

      <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="e.g., MetricsApp Login"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>

            <div>
              <label htmlFor="jwtSecret" className="block text-sm font-medium text-themed-text-primary mb-2">
                JWT Secret Key
              </label>
              <div className="relative">
                <input
                  type={showJwtSecret ? 'text' : 'password'}
                  id="jwtSecret"
                  name="jwtSecret"
                  value={formData.jwtSecret}
                  onChange={handleChange}
                  placeholder="Your JWT signing secret (minimum 32 characters)"
                  className="w-full px-3 py-2 pr-10 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowJwtSecret(!showJwtSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-themed-text-muted hover:text-themed-text-primary"
                >
                  {showJwtSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1 text-sm text-themed-text-secondary">
                Keep this secret secure and use a strong, random value
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tokenExpiration" className="block text-sm font-medium text-themed-text-primary mb-2">
                  Token Expiration (hours)
                </label>
                <input
                  type="number"
                  id="tokenExpiration"
                  name="tokenExpiration"
                  value={formData.tokenExpiration}
                  onChange={handleChange}
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
              </div>

              <div>
                <label htmlFor="refreshTokenExpiration" className="block text-sm font-medium text-themed-text-primary mb-2">
                  Refresh Token Expiration (hours)
                </label>
                <input
                  type="number"
                  id="refreshTokenExpiration"
                  name="refreshTokenExpiration"
                  value={formData.refreshTokenExpiration}
                  onChange={handleChange}
                  min="24"
                  max="8760"
                  className="w-full px-3 py-2 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="passwordMinLength" className="block text-sm font-medium text-themed-text-primary mb-2">
                Minimum Password Length
              </label>
              <input
                type="number"
                id="passwordMinLength"
                name="passwordMinLength"
                value={formData.passwordMinLength}
                onChange={handleChange}
                min="6"
                max="128"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-md shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="requireEmailVerification"
                  name="requireEmailVerification"
                  type="checkbox"
                  checked={formData.requireEmailVerification}
                  onChange={handleChange}
                  className="h-4 w-4 themed-interactive-primary focus:ring-themed-interactive-primary border-themed-border-primary rounded"
                />
                <label htmlFor="requireEmailVerification" className="ml-2 block text-sm text-themed-text-primary">
                  Require email verification for new accounts
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="allowSelfRegistration"
                  name="allowSelfRegistration"
                  type="checkbox"
                  checked={formData.allowSelfRegistration}
                  onChange={handleChange}
                  className="h-4 w-4 themed-interactive-primary focus:ring-themed-interactive-primary border-themed-border-primary rounded"
                />
                <label htmlFor="allowSelfRegistration" className="ml-2 block text-sm text-themed-text-primary">
                  Allow users to self-register
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="passwordRequireSpecialChar"
                  name="passwordRequireSpecialChar"
                  type="checkbox"
                  checked={formData.passwordRequireSpecialChar}
                  onChange={handleChange}
                  className="h-4 w-4 themed-interactive-primary focus:ring-themed-interactive-primary border-themed-border-primary rounded"
                />
                <label htmlFor="passwordRequireSpecialChar" className="ml-2 block text-sm text-themed-text-primary">
                  Require special characters in passwords
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-themed-border-primary">
              <button
                type="button"
                className="btn-themed-secondary"
              >
                Generate JWT Secret
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

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Security Recommendations</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Use a strong, randomly generated JWT secret key (minimum 32 characters)</li>
          <li>Enable email verification to prevent unauthorized account creation</li>
          <li>Set reasonable token expiration times to balance security and user experience</li>
          <li>Consider implementing rate limiting for authentication endpoints</li>
          <li>Use HTTPS in production to protect authentication tokens</li>
        </ul>
      </div>
    </div>
  )
}

export default DefaultAuth 