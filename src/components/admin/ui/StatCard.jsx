import React from 'react';

export const StatCard = ({ title, value, color, highlight }) => (
    <div className={`bg-white p-4 md:p-6 rounded-xl shadow border-l-4 ${highlight ? 'ring-2 ring-emerald-500' : ''}`} style={{ borderLeftColor: color }}>
        <p className="text-gray-500 text-xs md:text-sm mb-1 uppercase tracking-wide font-bold">{title}</p>
        <p className={`text-xl md:text-2xl font-bold text-gray-900`}>{value}</p>
    </div>
);