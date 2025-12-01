import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Reading, MoistureStatus } from '../types';

interface HistoryChartProps {
  data: Reading[];
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data }) => {
  
  // Prepare data for display
  const chartData = data.map(r => {
    let moistureVal = 0;
    if (r.moisture === MoistureStatus.WET) moistureVal = 1;
    else if (r.moisture === MoistureStatus.MIXED) moistureVal = 0.5;
    
    return {
      time: r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temp: r.temperature,
      moistureLevel: moistureVal
    };
  }).slice(-10); // Show last 10 readings

  if (chartData.length === 0) return null;

  return (
    <div className="h-64 w-full bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-500 mb-4">Reading History</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            tick={{fontSize: 10, fill: '#94a3b8'}} 
            axisLine={false} 
            tickLine={false}
          />
          <YAxis 
            yAxisId="left" 
            domain={[30, 45]} 
            hide 
          />
          <YAxis 
            yAxisId="right" 
            domain={[0, 1]} 
            hide 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ color: '#64748b', fontSize: '12px' }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="temp" 
            stroke="#f59e0b" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
            name="Temp (°C)"
          />
          <Line 
            yAxisId="right"
            type="step" 
            dataKey="moistureLevel" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            strokeDasharray="5 5"
            dot={false}
            name="Moisture (1=Wet, 0.5=Mixed)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;