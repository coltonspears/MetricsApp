import { GitBranch } from 'lucide-react'

const GitHubAuth = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <h1 className="text-3xl font-bold text-themed-text-primary">GitHub Authentication</h1>
        <p className="mt-2 text-themed-text-secondary">
          Configure GitHub OAuth integration for secure access to your repositories and organization data.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-themed-bg-tertiary shadow rounded-lg border border-themed-border-primary">
        <div className="px-6 py-4 border-b border-themed-border-primary">
          <h3 className="text-lg leading-6 font-medium text-themed-text-primary">OAuth Configuration</h3>
          <p className="mt-1 text-sm text-themed-text-secondary">
            Set up your GitHub OAuth application credentials to enable authentication.
          </p>
        </div>
        <form className="px-6 py-4 space-y-6">
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-themed-text-primary">
              Client ID
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="clientId"
                className="shadow-sm focus:ring-themed-interactive-primary focus:border-themed-interactive-primary block w-full sm:text-sm border-themed-border-primary rounded-md bg-themed-bg-surface text-themed-text-primary"
                placeholder="Enter your GitHub OAuth app client ID"
              />
            </div>
          </div>

          <div>
            <label htmlFor="clientSecret" className="block text-sm font-medium text-themed-text-primary">
              Client Secret
            </label>
            <div className="mt-1">
              <input
                type="password"
                id="clientSecret"
                className="shadow-sm focus:ring-themed-interactive-primary focus:border-themed-interactive-primary block w-full sm:text-sm border-themed-border-primary rounded-md bg-themed-bg-surface text-themed-text-primary"
                placeholder="Enter your GitHub OAuth app client secret"
              />
            </div>
          </div>

          <div>
            <label htmlFor="redirectUri" className="block text-sm font-medium text-themed-text-primary">
              Redirect URI
            </label>
            <div className="mt-1">
              <input
                type="url"
                id="redirectUri"
                className="shadow-sm focus:ring-themed-interactive-primary focus:border-themed-interactive-primary block w-full sm:text-sm border-themed-border-primary rounded-md bg-themed-bg-surface text-themed-text-primary"
                placeholder="https://your-app.com/auth/github/callback"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-themed-text-inverse bg-themed-interactive-primary hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-themed-interactive-primary"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Instructions */}
      <div className="bg-themed-status-info bg-opacity-10 border border-themed-status-info rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <GitBranch className="h-5 w-5 text-themed-status-info" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-themed-status-info">
              Setup Instructions
            </h3>
            <div className="mt-2 text-sm text-themed-text-secondary">
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a new OAuth App in your GitHub organization settings</li>
                <li>Set the authorization callback URL to your MetricsApp redirect URI</li>
                <li>Copy the Client ID and Client Secret from your GitHub OAuth app</li>
                <li>Paste the credentials into the form above and save</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 