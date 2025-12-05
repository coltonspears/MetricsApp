import React from 'react'
import JaegerTraceViewer from '../components/JaegerTraceViewer'

const Tracing: React.FC = () => {
  return (
    <div className="page-shell" style={{ padding: 0, gap: 0 }}>
      <JaegerTraceViewer />
    </div>
  )
}

export default Tracing
