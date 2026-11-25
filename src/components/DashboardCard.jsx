const COLORS = {
  blue:   'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400',
  red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400',
  green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
  gray:   'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white',
};

export default function DashboardCard({ title, value, color = 'blue', subtitle }) {
  return (
    <div className={`p-4 rounded-2xl shadow-sm border ${COLORS[color] || COLORS.blue}`}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">{title}</p>
      {subtitle && <p className="text-[10px] mt-1 opacity-60">{subtitle}</p>}
    </div>
  );
}