import { useState } from 'react'
import { User, Mail, MapPin, Briefcase, Save, Camera, Clock, Shield, Key } from 'lucide-react'
import PageHeader from '../components/PageHeader'

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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 1000)
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Profile"
        description="Manage your account settings and personal information"
        meta={
          <span className="badge-muted">
            <User className="h-3 w-3" />
            {formData.firstName} {formData.lastName}
          </span>
        }
        actions={
          <div className="page-actions">
            <button className="btn-themed-secondary">
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-themed-primary disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-current mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <Mail className="h-3 w-3" />
            {formData.email}
          </span>
          <span className="badge-muted">
            <MapPin className="h-3 w-3" />
            {formData.location}
          </span>
          <span className="badge-muted">
            <Clock className="h-3 w-3" />
            {formData.timezone}
          </span>
        </div>
      </PageHeader>

      {saved && (
        <div className="panel border-themed-status-success bg-green-500/5">
          <div className="flex items-center gap-2 text-themed-status-success">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Profile saved successfully!</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="panel flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold"
              style={{ backgroundColor: 'var(--interactive-primary)', color: 'var(--text-inverse)' }}>
              {formData.firstName?.[0]}{formData.lastName?.[0]}
            </div>
            <button className="absolute bottom-0 right-0 p-2 rounded-full border-2"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)'
              }}>
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-xl font-semibold text-themed-text-primary">
            {formData.firstName} {formData.lastName}
          </h3>
          <p className="text-themed-text-secondary mt-1">{formData.title}</p>
          <div className="flex items-center mt-2 text-sm text-themed-text-muted">
            <MapPin className="h-4 w-4 mr-1" />
            {formData.location}
          </div>
          <div className="w-full mt-6 pt-6 border-t border-themed-border-primary">
            <p className="text-sm text-themed-text-secondary">{formData.bio}</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Personal Information</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-themed-text-secondary mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="input-themed w-full"
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
                    className="input-themed w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-themed w-full pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Job Title
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="input-themed w-full pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
                  <input
                    type="text"
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="input-themed w-full pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="input-themed w-full resize-none"
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Preferences</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
                  <select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                    className="input-themed w-full pl-10"
                  >
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="panel-footer">
              Timezone affects how dates and times are displayed throughout the application.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
