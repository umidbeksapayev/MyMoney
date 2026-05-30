import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import { Plus, Pencil, Trash2, Filter, Download, Repeat, Calendar, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, vi, es, fr, de, zhCN, ja, ko, pt, ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import TransactionModal from '../components/TransactionModal';
import { TableSkeleton, ListSkeleton } from '../components/LoadingSkeleton';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const Transactions = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { formatAmount, formatCurrency, currency } = useCurrency();
  
  const getDateLocale = () => {
    const locales = { en: enUS, vi: vi, es: es, fr: fr, de: de, zh: zhCN, ja: ja, ko: ko, pt: pt, ru: ru };
    return locales[i18n.language] || enUS;
  };
  const [viewMode, setViewMode] = useState('transactions'); // 'transactions' or 'recurring'
  const [transactions, setTransactions] = useState([]);
  const [recurringList, setRecurringList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
    fetchTransactions();
    fetchCategories();
    if (viewMode === 'recurring') {
      fetchRecurring();
    }
  }, [filters, currency, viewMode]); // Add viewMode dependency

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNew: () => viewMode === 'transactions' && handleAdd(),
    onRecurring: () => window.location.href = '/recurring',
    onClose: () => setShowModal(false),
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      // Add display_currency parameter for conversion
      params.append('display_currency', currency);
      
      const response = await api.get(`/transactions?${params}`);
      const data = response.data;
      setTransactions(data.transactions || data || []);
    } catch (error) {
      toast.error(t('transactions.failedToLoad'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRecurring = async () => {
    try {
      setLoading(true);
      const response = await api.get('/recurring');
      setRecurringList(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching recurring:', error);
      setRecurringList([]);
      if (error.response?.status !== 404 && error.response?.status !== 502) {
        toast.error('Failed to load recurring transactions');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('transactions.deleteConfirm'))) return;

    try {
      await api.delete(`/transactions/${id}`);
      toast.success(t('transactions.transactionDeleted'));
      fetchTransactions();
    } catch (error) {
      toast.error(t('transactions.failedToDelete'));
      console.error(error);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingTransaction(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTransaction(null);
    fetchTransactions();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/reports/export?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(t('transactions.exportedSuccess') || 'Transactions exported');
    } catch (error) {
      toast.error(t('transactions.failedToExport') || 'Failed to export');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Tab Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('transactions.title')}</h1>
          {/* Tab Toggle */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setViewMode('transactions')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'transactions'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📊 {t('transactions.title')}
            </button>
            <button
              onClick={() => setViewMode('recurring')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'recurring'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🔁 {t('recurring.title')}
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {viewMode === 'transactions' && (
          <button onClick={handleExport} className="btn btn-secondary flex items-center justify-center gap-2">
            <Download size={20} />
            <span className="hidden sm:inline">{t('transactions.exportCSV')}</span>
            <span className="sm:hidden">Export</span>
          </button>
          )}
          <button 
            onClick={() => {
              if (viewMode === 'transactions') {
                handleAdd();
              } else {
                navigate('/recurring');
              }
            }} 
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span>{viewMode === 'transactions' ? t('transactions.addTransaction') : t('recurring.addRecurring')}</span>
          </button>
        </div>
      </div>

      {/* Filters - Only show for transactions view */}
      {viewMode === 'transactions' && (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600 dark:text-gray-400" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">{t('transactions.filters')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="input"
          >
            <option value="">{t('transactions.allTypes')}</option>
            <option value="income">{t('transactions.income')}</option>
            <option value="expense">{t('transactions.expense')}</option>
          </select>

          <select
            value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            className="input"
          >
            <option value="">{t('transactions.allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="input"
            placeholder={t('transactions.startDate')}
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="input"
            placeholder={t('transactions.endDate')}
          />
        </div>
        {(filters.type || filters.category_id || filters.start_date || filters.end_date) && (
          <button
            onClick={() => setFilters({ type: '', category_id: '', start_date: '', end_date: '' })}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('transactions.clearFilters')}
          </button>
        )}
      </div>
      )}

      {/* Transactions List - Only show for transactions view */}
      {viewMode === 'transactions' && (
      <div className="card">
        {loading ? (
            <TableSkeleton rows={10} />
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm sm:text-base text-gray-800 dark:text-gray-200">{t('transactions.date')}</th>
                    <th className="text-left py-3 px-4 text-sm sm:text-base text-gray-800 dark:text-gray-200">{t('transactions.category')}</th>
                    <th className="text-left py-3 px-4 text-sm sm:text-base hidden sm:table-cell text-gray-800 dark:text-gray-200">{t('transactions.description')}</th>
                    <th className="text-left py-3 px-4 text-sm sm:text-base text-gray-800 dark:text-gray-200">{t('transactions.type')}</th>
                    <th className="text-right py-3 px-4 text-sm sm:text-base text-gray-800 dark:text-gray-200">{t('transactions.amount')}</th>
                    <th className="text-right py-3 px-4 text-sm sm:text-base text-gray-800 dark:text-gray-200">{t('transactions.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((transaction) => (
                  <tr key={transaction.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">
                      {format(new Date(transaction.transaction_date), 'MMM dd, yyyy', { locale: getDateLocale() })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: transaction.category_color }}
                        ></div>
                        <span className="text-gray-800 dark:text-gray-200">{transaction.category_name || t('transactions.uncategorized')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      {transaction.description || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.type === 'income'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold ${
                          transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {/* Backend already converted to display_currency, just format */}
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            {transactions.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('common.showing')} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, transactions.length)} {t('common.of')} {transactions.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {t('common.previous')}
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-gray-500">/</span>
                    <span className="text-sm text-gray-500">{Math.ceil(transactions.length / itemsPerPage)}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(transactions.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(transactions.length / itemsPerPage)}
                    className="px-4 py-2 border dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {t('common.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
            <div className="text-center py-12">
              <Wallet className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('transactions.noTransactions')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                💡 Start tracking your finances by adding your first transaction. Track income, expenses, and see where your money goes!
              </p>
              <button onClick={handleAdd} className="btn btn-primary">
                <Plus size={18} className="inline mr-2" />
                {t('transactions.addTransaction')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recurring List - Only show for recurring view */}
      {viewMode === 'recurring' && (
        <div className="space-y-4">
          {/* Recurring List */}
          {loading ? (
            <ListSkeleton items={5} />
          ) : recurringList.length === 0 ? (
            <div className="card text-center py-12">
              <Repeat className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-3">{t('recurring.noRecurring')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                💡 Tick "Make Recurring" checkbox when adding transactions
              </p>
              <button
                onClick={() => navigate('/recurring')}
                className="btn btn-primary"
              >
                <Plus size={18} className="inline mr-2" />
                {t('recurring.addRecurring')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringList.map((rec) => (
                <div key={rec.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rec.type === 'income'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}>
                          {t(`transactions.${rec.type}`)}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                          {t(`recurring.${rec.frequency}`)}
                        </span>
                        {rec.is_active ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                            ✓ {t('recurring.active')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400">
                            ○ {t('recurring.inactive')}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-1">{formatAmount(rec.amount, rec.currency)}</h3>
                      {rec.category_name && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">📁 {rec.category_name}</p>
                      )}
                      {rec.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{rec.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{t('recurring.next')}: <span className="font-medium">{new Date(rec.next_occurrence).toLocaleDateString()}</span></span>
                        </div>
                        {rec.end_date && <span>• {t('recurring.ends')}: {new Date(rec.end_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/recurring?edit=${rec.id}`)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title={t('common.edit')}
                      >
                        <Pencil size={18} className="text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await api.patch(`/recurring/${rec.id}/toggle`);
                            toast.success(t('common.success'));
                            fetchRecurring();
                          } catch (error) {
                            toast.error(t('common.error'));
                          }
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title={rec.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {rec.is_active ? '🟢' : '⚪'}
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(t('recurring.recurringDeleted'))) {
                            try {
                              await api.delete(`/recurring/${rec.id}`);
                              toast.success(t('recurring.recurringDeleted'));
                              fetchRecurring();
                            } catch (error) {
                              toast.error(t('common.error'));
                            }
                          }
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title={t('common.delete')}
                      >
                        <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
      )}

      {showModal && (
        <TransactionModal
          transaction={editingTransaction}
          categories={categories}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Transactions;

