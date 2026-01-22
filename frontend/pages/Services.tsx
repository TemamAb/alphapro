
import React from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { useApiData } from '../hooks/useMockData';
import { Microservice } from '../types';

const ProgressBar = ({ value }: { value: number }) => (
    <div className="w-full bg-gray-600 rounded-full h-2.5">
        <div 
            className="bg-blue-500 h-2.5 rounded-full" 
            style={{ width: `${value}%` }}
        ></div>
    </div>
);

const Services: React.FC = () => {
  const { services } = useApiData();

  const columns = [
    {
      key: 'name' as keyof Microservice,
      header: 'Service Name',
      render: (item: Microservice) => <span className="font-medium text-white">{item.name}</span>,
    },
    {
      key: 'status' as keyof Microservice,
      header: 'Status',
      render: (item: Microservice) => <Badge status={item.status} />,
    },
    {
      key: 'region' as keyof Microservice,
      header: 'Region',
    },
    {
      key: 'cpuUsage' as keyof Microservice,
      header: 'CPU Usage',
      render: (item: Microservice) => (
        <div className="flex items-center">
            <div className="w-24 mr-2">
                <ProgressBar value={item.cpuUsage} />
            </div>
            <span className="text-xs">{item.cpuUsage.toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key: 'memoryUsage' as keyof Microservice,
      header: 'Memory Usage',
      render: (item: Microservice) => (
        <div className="flex items-center">
            <div className="w-24 mr-2">
                <ProgressBar value={item.memoryUsage} />
            </div>
            <span className="text-xs">{item.memoryUsage.toFixed(1)}%</span>
        </div>
      ),
    },
  ];

  return (
    <Card title="Microservice Health Status">
      <Table<Microservice> columns={columns} data={services} />
    </Card>
  );
};

export default Services;
