const STYLES = {
  HIGH:    'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  MEDIUM:  'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  LOW:     'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  UNKNOWN: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

export default function RiskBadge({ level }) {
  const style = STYLES[level] || STYLES.UNKNOWN;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style}`}>
      {level}
    </span>
  );
}