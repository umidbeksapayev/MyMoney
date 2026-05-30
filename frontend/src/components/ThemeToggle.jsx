import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 group"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="flex items-center gap-2.5">
        {isDark ? (
          <Moon size={18} className="text-blue-500 dark:text-blue-400" />
        ) : (
          <Sun size={18} className="text-amber-500" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {isDark ? 'Dark' : 'Light'}
        </span>
      </div>
      
      {/* Toggle Switch */}
      <div className={`relative w-11 h-6 rounded-full p-0.5 transition-all duration-300 ${
        isDark ? 'bg-blue-600' : 'bg-gray-300'
      }`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
          isDark ? 'translate-x-5' : 'translate-x-0'
        }`}>
          {isDark ? (
            <Moon size={12} className="text-blue-600" />
          ) : (
            <Sun size={12} className="text-amber-500" />
          )}
        </div>
      </div>
    </button>
  );
}

