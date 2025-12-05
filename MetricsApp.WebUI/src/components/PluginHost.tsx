import { useEffect, useRef } from 'react';

interface PluginHostProps {
  pluginId: string;
  bundleUrl: string;
}

export default function PluginHost({ pluginId, bundleUrl }: PluginHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = bundleUrl;

    console.log('script', script);
    console.log('pluginId', pluginId);
    console.log('bundleUrl', bundleUrl);
    script.onload = () => {
      // We assume each plugin registers itself under window[pluginId]
      const initializer = (window as any)[pluginId]?.init;
      if (typeof initializer === 'function' && containerRef.current) {
        initializer(containerRef.current);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [pluginId, bundleUrl]);

  return <div ref={containerRef} id={`plugin-${pluginId}`} />;
}