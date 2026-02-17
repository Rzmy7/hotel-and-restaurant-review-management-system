const ReviewSources = () => {
  const sources = [
    { name: 'Booking', percentage: 42, color: '#3b82f6' },
    { name: 'TripAdvisor', percentage: 28, color: '#8b5cf6' },
    { name: 'Google', percentage: 20, color: '#1f2937' },
    { name: 'Other', percentage: 10, color: '#9ca3af' },
  ];

  // Create SVG path for donut segments
  const createDonutPath = (percentage: number, startAngle: number) => {
    const radius = 90;
    const innerRadius = 50;
    const cx = 100;
    const cy = 100;
    
    const angle = (percentage / 100) * 360;
    const endAngle = startAngle + angle;
    
    const x1 = cx + radius * Math.cos((Math.PI * startAngle) / 180);
    const y1 = cy + radius * Math.sin((Math.PI * startAngle) / 180);
    const x2 = cx + radius * Math.cos((Math.PI * endAngle) / 180);
    const y2 = cy + radius * Math.sin((Math.PI * endAngle) / 180);
    
    const ix1 = cx + innerRadius * Math.cos((Math.PI * startAngle) / 180);
    const iy1 = cy + innerRadius * Math.sin((Math.PI * startAngle) / 180);
    const ix2 = cx + innerRadius * Math.cos((Math.PI * endAngle) / 180);
    const iy2 = cy + innerRadius * Math.sin((Math.PI * endAngle) / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${ix2} ${iy2}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}
      Z
    `;
  };

  let currentAngle = -90; // Start from top

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-5">
        <h3 className="text-base font-bold text-gray-800 m-0">Review Sources</h3>
      </div>

      <div className="flex gap-8 items-center mt-5">
        <div className="w-[180px] h-[180px] flex-shrink-0 relative">
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
            {sources.map((source, index) => {
              const path = createDonutPath(source.percentage, currentAngle);
              const segmentAngle = currentAngle;
              currentAngle += (source.percentage / 100) * 360;
              
              return (
                <path
                  key={source.name}
                  d={path}
                  fill={source.color}
                />
              );
            })}
          </svg>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          {sources.map((source) => (
            <div key={source.name} className="flex items-center gap-3">
              <span
                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: source.color }}
              ></span>
              <span className="flex-1 text-[15px] font-medium text-gray-800">{source.name}</span>
              <span className="text-[15px] font-semibold text-gray-500">{source.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewSources;
  