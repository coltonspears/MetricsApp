import React from 'react';
import JaegerTraceViewer from '../components/JaegerTraceViewer';

const Tracing: React.FC = () => {
  return (
    <div className="h-full">
      <JaegerTraceViewer />
    </div>
  );
};

export default Tracing;
