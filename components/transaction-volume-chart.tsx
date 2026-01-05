'use client'

import { Bar } from 'react-chartjs-2'

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface TransactionVolumeChartProps {
  chartData: {
    labels: string[]
    requests: number[]
    procurements: number[]
  }
}

export function TransactionVolumeChart({ chartData }: TransactionVolumeChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          precision: 0,
        },
      },
      x: {
        grid: { display: false },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Permintaan (Requests)',
        data: chartData.requests,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        hoverBackgroundColor: 'rgba(59, 130, 246, 1)',
        borderRadius: 4,
        barPercentage: 0.6,
      },
      {
        label: 'Pengadaan (Procurements)',
        data: chartData.procurements,
        backgroundColor: 'rgba(234, 179, 8, 0.8)',
        hoverBackgroundColor: 'rgba(234, 179, 8, 1)',
        borderRadius: 4,
        barPercentage: 0.6,
      },
    ],
  }

  return (
    <div className="h-87.5 w-full">
      <Bar options={options} data={data} />
    </div>
  )
}
