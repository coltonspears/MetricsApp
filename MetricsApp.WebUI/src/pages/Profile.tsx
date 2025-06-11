import { useState } from 'react'
import { User, Save, Mail, Calendar, MapPin } from 'lucide-react'

const Profile = () => {
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    title: 'Senior Developer',
    location: 'San Francisco, CA',
    bio: 'Passionate about building great software and working with amazing teams.',
    phone: '',
    timezone: 'America/Los_Angeles'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Profile Update:', formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <div className="flex items-center space-x-4">
          <User className="h-8 w-8 text-themed-interactive-primary" />
          <h1 className="text-3xl font-bold text-themed-text-primary">Profile</h1>
        </div>
        <div className="mt-2">
          <p className="text-themed-text-secondary">
            Manage your account settings and personal information
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary p-6">
          <div className="text-center">
            <div className="w-32 h-32 bg-themed-interactive-primary rounded-full flex items-center justify-center text-themed-text-inverse text-4xl font-bold mx-auto mb-4">
              {formData.firstName?.[0]}{formData.lastName?.[0]}
            </div>
            <h3 className="text-lg font-medium text-themed-text-primary">
              {formData.firstName} {formData.lastName}
            </h3>
            <p className="text-themed-text-secondary">{formData.title}</p>
            <button className="mt-4 px-4 py-2 text-sm font-medium text-themed-interactive-primary border border-themed-interactive-primary rounded-sm hover:bg-themed-interactive-primary hover:text-themed-text-inverse">
              Change Avatar
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary">
            <div className="px-6 py-4 border-b border-themed-border-primary">
              <h3 className="text-lg font-medium text-themed-text-primary">Personal Information</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-themed-text-secondary mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-themed-text-secondary mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-themed-text-primary bg-themed-bg-surface border border-themed-border-primary rounded-sm hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-themed-text-inverse bg-themed-interactive-primary border border-transparent rounded-sm hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile 