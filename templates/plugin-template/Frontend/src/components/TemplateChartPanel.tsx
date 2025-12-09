/**
 * Template Chart Panel Component
 * 
 * A sample dashboard panel that displays chart data.
 */

import React from 'react';
import type { PanelProps } from '@metricsapp/plugin-sdk';

export function TemplateChartPanel({
  options,
  data,
  width,
  height,
  isEditing,
}: PanelProps) {
  const chartType = (options.chartType as string) || 'line';
  const showLegend = options.showLegend !== false;

  if (data.state === 'loading') {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <div className="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full" />
      </div>
    );
  }

  if (data.state === 'error') {
    return (
      <div 
        className="flex items-center justify-center text-red-500"
        style={{ width, height }}
      >
        <div className="text-center">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm opacity-70">{data.error}</p>
        </div>
      </div>
    );
  }

  if (!data.series.length) {
    return (
      <div 
        className="flex items-center justify-center text-gray-500"
        style={{ width, height }}
      >
        <p>No data available</p>
      </div>
    );
  }

  // Simple visualization - in a real plugin you'd use a charting library
  const series = data.series[0];
  const values = series.values;
  const maxValue = Math.max(...values.map(v => v.value));
  const minValue = Math.min(...values.map(v => v.value));
  const range = maxValue - minValue || 1;

  return (
    <div 
      className="flex flex-col h-full p-4"
      style={{ width, height }}
    >
      {/* Chart area */}
      <div className="flex-1 flex items-end gap-px">
        {chartType === 'bar' ? (
          // Bar chart
          values.map((point, i) => {
            const normalizedValue = (point.value - minValue) / range;
            return (
              <div
                key={i}
                className="flex-1 bg-blue-500 hover:bg-blue-400 transition-colors rounded-t"
                style={{ height: `${normalizedValue * 100}%` }}
                title={`${new Date(point.timestamp).toLocaleString()}: ${point.value.toFixed(2)}`}
              />
            );
          })
        ) : (
          // Line/Area chart (simplified SVG)
          <svg 
            className="w-full h-full" 
            preserveAspectRatio="none"
            viewBox={`0 0 ${values.length - 1} 100`}
          >
            {chartType === 'area' && (
              <path
                d={`
                  M 0 100
                  ${values.map((v, i) => {
                    const x = i;
                    const y = 100 - ((v.value - minValue) / range) * 100;
                    return `L ${x} ${y}`;
                  }).join(' ')}
                  L ${values.length - 1} 100
                  Z
                `}
                fill="rgba(59, 130, 246, 0.3)"
              />
            )}
            <path
              d={values.map((v, i) => {
                const x = i;
                const y = 100 - ((v.value - minValue) / range) * 100;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>{series.name || 'Series 1'}</span>
          </div>
        </div>
      )}

      {/* Edit mode indicator */}
      {isEditing && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-yellow-900 text-xs rounded">
          Editing
        </div>
      )}
    </div>
  );
}

