import React, { useState } from 'react';
import { DashboardTemplate } from '../components/dashboard/templates/DashboardTemplate';

const DashboardPage: React.FC = () => {
  const [period, setPeriod] = useState<number>(0); // 0 = All Time (default)

  return (
    <DashboardTemplate 
      period={period} 
      onPeriodChange={setPeriod} 
    />
  );
};

export default DashboardPage;


