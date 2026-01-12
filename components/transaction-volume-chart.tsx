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

interface ChartDataset {
  label: string
  data: number[]
  backgroundColor: string
  borderColor?: string
}

interface TransactionVolumeChartProps {
  labels: string[]
  datasets: ChartDataset[]
}

export function TransactionVolumeChart({ labels, datasets }: TransactionVolumeChartProps) {
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
        ticks: { precision: 0 },
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
    labels,
    datasets: datasets.map((ds) => ({
      ...ds,
      hoverBackgroundColor: ds.backgroundColor,
      borderRadius: 4,
      barPercentage: 0.6,
    })),
  }

  return (
    <div className="h-87.5 w-full">
      <Bar options={options} data={data} />
    </div>
  )
}
