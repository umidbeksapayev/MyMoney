import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import { Plus, Trash2, TrendingDown, AlertTriangle, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import BudgetModal from '../components/BudgetModal';

const Budgets = () => {
  const { t } = useTranslation();
  const { formatCurrency, currency: currentCurrency } = useCurrency();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/budgets?month=${selectedMonth}&year=${selectedYear}&currency=${currentCurrency}`);
      setBudgets(response.data);
    } catch (error) {
      toast.error(t('budgets.failedToLoad'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, currentCurrency, t]);

  // Re-fetch when month/year changes OR when currency changes
  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets, currentCurrency]);

  const handleDelete = async (id) => {
    if (!window.confirm(t('budgets.deleteConfirm'))) return;

    try {
      await api.delete(`/budgets/${id}`);
      toast.success(t('budgets.budgetDeleted'));
      fetchBudgets();
    } catch (error) {
      toast.error(t('budgets.failedToDelete'));
      console.error(error);
    }
  };

  const handleAdd = () => {
    setEditingBudget(null);
    setShowModal(true);
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingBudget(null);
    fetchBudgets();
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage) => {
    if (percentage >= 100) {
      return <AlertTriangle className="text-red-500" size={20} />;
    }
    if (percentage >= 80) {
      return <TrendingDown className="text-yellow-500" size={20} />;
    }
    return null;
  };

  // Calculate totals (backend already converted to display currency)
  const totalBudget = budgets.reduce((sum, b) => {
    return sum + parseFloat(b.amount || 0);
  }, 0);
  
  const totalSpent = budgets.reduce((sum, b) => {
    return sum + parseFloat(b.spent || 0);
  }, 0);
  
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Month/Year Selector */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-gray-100">{t('budgets.title')}</h1>
          <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2 w-full sm:w-auto">
            <Plus size={20} />
            <span>{t('budgets.setBudget')}</span>
          </button>
        </div>
        
        {/* Month/Year Selector - Calendar Picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            📅 {t('budgets.monthYear') || 'Month & Year'}
          </label>
          <input
            type="month"
            value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
            onChange={(e) => {
              if (e.target.value) {
                const [year, month] = e.target.value.split('-');
                setSelectedYear(parseInt(year));
                setSelectedMonth(parseInt(month));
              }
            }}
            className="input text-sm w-full cursor-pointer"
          />
        </div>
      </div>

      {/* Overall Progress */}
      {budgets.length > 0 && (
        <div className="card bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <h2 className="text-lg font-bold mb-4 dark:text-gray-100">{t('budgets.overallBudget')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('budgets.totalBudget')}</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 break-all">{formatCurrency(totalBudget)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('budgets.totalSpent')}</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 break-all">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('budgets.remaining')}</p>
              <p className={`text-xl sm:text-2xl font-bold break-all ${totalBudget - totalSpent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {totalBudget - totalSpent >= 0 ? formatCurrency(totalBudget - totalSpent) : '-' + formatCurrency(Math.abs(totalBudget - totalSpent))}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${getProgressColor(overallPercentage)}`}
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
            {overallPercentage.toFixed(1)}% {t('budgets.used')}
          </p>
        </div>
      )}

      {/* Budgets List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : budgets.length > 0 ? (
          <div className="space-y-4">
            {budgets.map((budget) => {
              // Backend already converted to display currency
              const amount = parseFloat(budget.amount || 0);
              const spent = parseFloat(budget.spent || 0);
              const remaining = amount - spent;
              const percentage = amount > 0 ? (spent / amount * 100) : 0;

              return (
                <div key={budget.id} className="p-3 sm:p-4 border dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 w-full">
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: budget.category_color }}
                      >
                        {budget.category_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg truncate dark:text-gray-100">{budget.category_name}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="truncate">{t('budgets.totalBudget')}: {formatCurrency(amount)}</span>
                          <span className="truncate">{t('budgets.totalSpent')}: {formatCurrency(spent)}</span>
                          <span className={`truncate ${remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {t('budgets.remaining')}: {remaining >= 0 ? formatCurrency(remaining) : '-' + formatCurrency(Math.abs(remaining))}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-start">
                      {getStatusIcon(percentage)}
                      <button
                        onClick={() => handleEdit(budget)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="Edit budget"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete budget"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
                      <div
                        className={`h-2 sm:h-3 rounded-full transition-all ${getProgressColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{percentage.toFixed(1)}% {t('budgets.used')}</span>
                      {percentage >= 100 && (
                        <span className="text-red-600 dark:text-red-400 font-medium truncate">
                          {t('budgets.overBudgetBy')} {formatCurrency(spent - amount)}
                        </span>
                      )}
                      {percentage >= 80 && percentage < 100 && (
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                          {t('budgets.approachingLimit')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="mb-4">{t('budgets.noBudgets')}</p>
            <button onClick={handleAdd} className="btn btn-primary">
              {t('budgets.setFirstBudget')}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <BudgetModal
          month={selectedMonth}
          year={selectedYear}
          budget={editingBudget}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Budgets;

