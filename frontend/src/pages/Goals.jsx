import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import { Target, Plus, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import GoalModal from '../components/GoalModal';
import GoalCard from '../components/GoalCard';
import ContributionModal from '../components/ContributionModal';
import { GoalCardSkeleton } from '../components/LoadingSkeleton';

const Goals = () => {
  const { t } = useTranslation();
  const { formatCurrency, currency: currentCurrency, convertAmount } = useCurrency();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

  useEffect(() => {
    fetchGoals();
  }, [filter, currentCurrency]); // Re-fetch when currency changes

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { is_completed: filter === 'completed' } : {};
      const response = await api.get('/goals', { params });
      setGoals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('❌ Error fetching goals:', error);
      setGoals([]);
      if (error.response?.status !== 404) {
        toast.error(t('goals.failedToLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('goals.deleteConfirm'))) return;

    try {
      await api.delete(`/goals/${id}`);
      toast.success(t('goals.deleteSuccess'));
      fetchGoals();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const handleAdd = () => {
    setEditingGoal(null);
    setShowGoalModal(true);
  };

  const handleContribute = (goal) => {
    setSelectedGoal(goal);
    setShowContributionModal(true);
  };

  const handleModalClose = () => {
    setShowGoalModal(false);
    setShowContributionModal(false);
    setEditingGoal(null);
    setSelectedGoal(null);
    fetchGoals();
  };

  // Calculate overall stats with currency conversion
  const stats = goals.reduce(
    (acc, goal) => {
      const target = convertAmount(parseFloat(goal.target_amount), goal.currency);
      const current = convertAmount(parseFloat(goal.current_amount), goal.currency);
      acc.totalTarget += target;
      acc.totalSaved += current;
      if (goal.is_completed) acc.completedCount++;
      return acc;
    },
    { totalTarget: 0, totalSaved: 0, completedCount: 0 }
  );

  const overallProgress = stats.totalTarget > 0 ? (stats.totalSaved / stats.totalTarget) * 100 : 0;

  const filteredGoals = goals.filter(goal => {
    if (filter === 'all') return true;
    if (filter === 'active') return !goal.is_completed;
    if (filter === 'completed') return goal.is_completed;
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-gray-100 flex items-center gap-2">
            <Target className="text-blue-600 dark:text-blue-400" />
            {t('goals.title')}
          </h1>
          <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2 w-full sm:w-auto">
            <Plus size={20} />
            <span>{t('goals.addGoal')}</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-1">{t('goals.totalGoals')}</div>
            <div className="text-xl sm:text-2xl font-bold dark:text-gray-100">{goals.length}</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 mb-1">{t('goals.completed')}</div>
            <div className="text-xl sm:text-2xl font-bold dark:text-gray-100">{stats.completedCount}</div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mb-1">{t('goals.overallProgress')}</div>
            <div className="text-xl sm:text-2xl font-bold dark:text-gray-100">{overallProgress.toFixed(1)}%</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('common.all')}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('goals.active')}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('goals.completed')}
          </button>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="card">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <GoalCardSkeleton key={i} />)}
          </div>
        ) : filteredGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onContribute={handleContribute}
                formatCurrency={formatCurrency}
                convertAmount={convertAmount}
                currentCurrency={currentCurrency}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('goals.noGoals')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
              💡 Set savings goals to stay motivated! Track progress towards your dreams: emergency fund, vacation, new car, or house down payment.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">🏠 House</span>
              <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs">✈️ Vacation</span>
              <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs">🚗 Car</span>
              <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-xs">💼 Emergency</span>
            </div>
            <button onClick={handleAdd} className="btn btn-primary">
              <Plus size={18} className="inline mr-2" />
              {t('goals.createFirst')}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGoalModal && (
        <GoalModal
          goal={editingGoal}
          onClose={handleModalClose}
        />
      )}

      {showContributionModal && selectedGoal && (
        <ContributionModal
          goal={selectedGoal}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Goals;
