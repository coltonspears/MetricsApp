import { useState } from 'react'
import { Building, Plus, Edit, Trash2, Users, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

const Organizations = () => {
  const [organizations] = useState([
    {
      id: '1',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      description: 'Main enterprise organization',
      userCount: 45,
      teamCount: 8,
      createdAt: '2024-01-15T10:00:00Z',
      status: 'active'
    },
    {
      id: '2',
      name: 'Development Team',
      slug: 'dev-team',
      description: 'Development and engineering teams',
      userCount: 12,
      teamCount: 3,
      createdAt: '2024-02-01T14:30:00Z',
      status: 'active'
    },
    {
      id: '3',
      name: 'Marketing Division',
      slug: 'marketing-div',
      description: 'Marketing and sales organization',
      userCount: 8,
      teamCount: 2,
      createdAt: '2024-02-10T09:15:00Z',
      status: 'inactive'
    }
  ])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    if (status === 'active') {
      return `${baseClasses} bg-themed-status-success-bg text-themed-status-success`
    }
    return `${baseClasses} bg-themed-status-error-bg text-themed-status-error`
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building className="h-8 w-8 themed-interactive-primary" />
            <div>
              <h1 className="text-3xl font-bold text-themed-text-primary">Organizations</h1>
              <p className="text-themed-text-secondary">
                Manage organizations and their settings
              </p>
            </div>
            <span className="px-3 py-1 text-sm font-medium bg-themed-alert-warning bg-opacity-20 text-themed-status-warning rounded-full">
              Work in Progress
            </span>
          </div>
          <Link
            to="/admin/orgs/create"
            className="btn-themed-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Organization</span>
          </Link>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary">
        <div className="px-6 py-4 border-b border-themed-border-primary">
          <h2 className="text-lg font-medium text-themed-text-primary">All Organizations</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-themed-border-primary">
            <thead className="bg-themed-bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-themed-bg-surface divide-y divide-themed-border-primary">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-themed-bg-elevated transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-themed-text-primary">
                        {org.name}
                      </div>
                      <div className="text-sm text-themed-text-secondary">
                        {org.description}
                      </div>
                      <div className="text-xs text-themed-text-muted">
                        /{org.slug}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-themed-text-primary">
                      <Users className="h-4 w-4 mr-1 themed-text-muted" />
                      {org.userCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-themed-text-primary">
                      {org.teamCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(org.status)}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-text-secondary">
                    {formatDate(org.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/admin/orgs/edit/${org.id}`}
                        className="themed-text-accent hover:themed-text-primary"
                        title="Edit organization"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        className="themed-text-secondary hover:themed-text-primary"
                        title="Organization settings"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        className="themed-status-error hover:themed-text-primary"
                        title="Delete organization"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 themed-interactive-primary" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-themed-text-primary">{organizations.length}</div>
              <div className="text-sm text-themed-text-secondary">Total Organizations</div>
            </div>
          </div>
        </div>

        <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 themed-status-info" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-themed-text-primary">
                {organizations.reduce((sum, org) => sum + org.userCount, 0)}
              </div>
              <div className="text-sm text-themed-text-secondary">Total Members</div>
            </div>
          </div>
        </div>

        <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 themed-status-warning" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-themed-text-primary">
                {organizations.reduce((sum, org) => sum + org.teamCount, 0)}
              </div>
              <div className="text-sm text-themed-text-secondary">Total Teams</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Organizations 