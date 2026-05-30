import { Edit2, Trash2, Plus, TrendingDown, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { differenceInDays } from 'date-fns';

const GoalCard = ({ goal, onEdit, onDelete, onContribute, formatCurrency, convertAmount, currentCurrency }) => {
  const { t } = useTranslation();
  
  // Convert amounts to display currency
  const targetAmount = convertAmount(goal.target_amount, goal.currency);
  const currentAmount = convertAmount(goal.current_amount, goal.currency);
  
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const remaining = targetAmount - currentAmount;
  
  const daysUntilDeadline = goal.deadline 
    ? differenceInDays(new Date(goal.deadline), new Date())
    : null;

  const getProgressColor = () => {
    if (goal.is_completed) return 'bg-green-600';
    if (progress >= 75) return 'bg-blue-600';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getPriorityColor = () => {
    if (goal.priority === 'high') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (goal.priority === 'medium') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div className={`p-4 border rounded-lg transition-all hover:shadow-lg ${
      goal.is_completed ? 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{goal.icon || '🎯'}</span>
            <h3 className="font-bold text-lg dark:text-gray-100">{goal.name}</h3>
          </div>
          {goal.category && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{goal.category}</span>
          )}
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor()}`}>
          {t(`goals.priority.${goal.priority}`)}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">
            {formatCurrency(currentAmount, currentCurrency)} / {formatCurrency(targetAmount, currentCurrency)}
          </span>
          <span className="font-medium dark:text-gray-100">{Math.min(progress, 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">{t('goals.remaining')}:</span>
          <span className={`font-medium ${remaining > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
            {remaining > 0 ? formatCurrency(remaining, currentCurrency) : t('goals.achieved')}
          </span>
        </div>
        {goal.deadline && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Calendar size={14} />
              {t('goals.deadline')}:
            </span>
            <span className={`font-medium ${
              daysUntilDeadline < 0 ? 'text-red-600 dark:text-red-400' :
              daysUntilDeadline < 30 ? 'text-orange-600 dark:text-orange-400' :
              'text-gray-700 dark:text-gray-300'
            }`}>
              {daysUntilDeadline < 0 ? t('goals.overdue') :
               daysUntilDeadline === 0 ? t('goals.today') :
               `${daysUntilDeadline} ${t('goals.daysLeft')}`}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!goal.is_completed && (
          <button
            onClick={() => onContribute(goal)}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
          >
            <Plus size={16} />
            {t('goals.addFunds')}
          </button>
        )}
        <button
          onClick={() => onEdit(goal)}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          title={t('common.edit')}
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onDelete(goal.id)}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
          title={t('common.delete')}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Completed Badge */}
      {goal.is_completed && (
        <div className="mt-3 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-medium">
          <CheckCircle size={20} />
          <span>{t('goals.goalCompleted')}</span>
        </div>
      )}
    </div>
  );
};

export default GoalCard;
