// import React from 'react';
// import { createRoot } from 'react-dom/client';
// import { App } from './App';
//
// // The host will call: window.InitialSetupPlugin.init(mountPointId)
// function init(mountPointId: string) {
//     const container = document.getElementById(mountPointId);
//     if (!container) return;
//     const root = createRoot(container);
//     root.render(<App />);
// }
//
// // Register globally under the pluginId from your manifest
// (window as any).InitialSetupPlugin = { init };