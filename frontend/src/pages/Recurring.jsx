import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import { Repeat, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Calendar, AlertCircle, X } from 'lucide-react';

const Recurring = () => {
  const { t } = useTranslation();
  const { currency, formatAmount } = useCurrency();
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [filterActive, setFilterActive] = useState('all'); // 'all', 'active', 'inactive'

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    currency: currency,
    category_id: '',
    description: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  useEffect(() => {
    fetchRecurring();
    fetchCategories();
  }, [currency]); // Add currency dependency

  const fetchRecurring = async () => {
    try {
      const response = await api.get('/recurring');
      setRecurring(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('❌ Error fetching recurring:', error);
      setRecurring([]);
      // Don't show error toast if backend not ready yet
      if (error.response?.status !== 404 && error.response?.status !== 502) {
        toast.error(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!formData.type || !formData.amount || !formData.frequency || !formData.start_date) {
        toast.error('Please fill all required fields');
        return;
      }

      const submitData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: formData.currency || 'USD',
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        description: formData.description || '',
      };

      console.log('📤 Submitting recurring data:', submitData);

      if (editingRecurring) {
        const response = await api.put(`/recurring/${editingRecurring.id}`, submitData);
        console.log('✅ Update response:', response.data);
        toast.success(t('recurring.recurringUpdated'));
      } else {
        const response = await api.post('/recurring', submitData);
        console.log('✅ Create response:', response.data);
        toast.success(t('recurring.recurringCreated'));
      }

      setModalOpen(false);
      resetForm();
      fetchRecurring();
    } catch (error) {
      console.error('❌ Recurring error FULL:', error);
      console.error('❌ Response data:', error.response?.data);
      console.error('❌ Status:', error.response?.status);
      
      const errorMsg = error.response?.data?.errors 
        ? error.response.data.errors.map(e => `${e.param}: ${e.msg}`).join(', ')
        : error.response?.data?.error || t('common.error');
      
      toast.error(errorMsg);
      
      // Show detailed error in console
      if (error.response?.data?.errors) {
        console.table(error.response.data.errors);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('recurring.recurringDeleted'))) return;

    try {
      await api.delete(`/recurring/${id}`);
      toast.success(t('recurring.recurringDeleted'));
      fetchRecurring();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleToggle = async (id) => {
    try {
      console.log('🔄 Toggling recurring:', id);
      const response = await api.patch(`/recurring/${id}/toggle`);
      console.log('✅ Toggle response:', response.data);
      toast.success(t('common.success'));
      fetchRecurring();
    } catch (error) {
      console.error('❌ Toggle error:', error);
      toast.error(error.response?.data?.error || t('common.error'));
    }
  };

  const openModal = (rec = null) => {
    if (rec) {
      setEditingRecurring(rec);
      setFormData({
        type: rec.type,
        amount: rec.amount,
        currency: rec.currency,
        category_id: rec.category_id || '',
        description: rec.description || '',
        frequency: rec.frequency,
        start_date: rec.start_date,
        end_date: rec.end_date || '',
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      currency: currency,
      category_id: '',
      description: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
    setEditingRecurring(null);
  };

  const filteredRecurring = Array.isArray(recurring) ? recurring.filter(rec => {
    if (filterActive === 'active') return rec.is_active;
    if (filterActive === 'inactive') return !rec.is_active;
    return true;
  }) : [];

  const filteredCategories = Array.isArray(categories) ? categories.filter(cat => cat.type === formData.type) : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Repeat className="text-blue-600 dark:text-blue-400" size={28} />
            {t('recurring.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('recurring.willCreateOn')} {t('recurring.nextOccurrence').toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn btn-primary flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus size={20} />
          {t('recurring.addRecurring')}
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="card">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterActive('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterActive === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('common.all')}
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterActive === 'active' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('recurring.active')}
          </button>
          <button
            onClick={() => setFilterActive('inactive')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterActive === 'inactive' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('recurring.inactive')}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : filteredRecurring.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('transactions.noTransactions')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecurring.map((rec) => (
            <div
              key={rec.id}
              className={`card transition-all duration-200 ${
                !rec.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      rec.type === 'income'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                    }`}>
                      {t(`transactions.${rec.type}`)}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                      {t(`recurring.${rec.frequency}`)}
                    </span>
                    {rec.is_active ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        ✓ {t('recurring.active')}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400">
                        ○ {t('recurring.inactive')}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1">
                    {/* Recurring amounts are stored in original currency, need conversion */}
                    {formatAmount(rec.amount, rec.currency)}
                  </h3>
                  
                  {rec.category_name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      📁 {rec.category_name}
                    </p>
                  )}
                  
                  {rec.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {rec.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{t('recurring.nextOccurrence')}: <span className="font-medium">{new Date(rec.next_occurrence).toLocaleDateString()}</span></span>
                    </div>
                    {rec.end_date && (
                      <span>• {t('recurring.endDate').split(' (')[0]}: {new Date(rec.end_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2">
                  <button
                    onClick={() => handleToggle(rec.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={rec.is_active ? t('recurring.inactive') : t('recurring.active')}
                  >
                    {rec.is_active ? (
                      <ToggleRight size={22} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <ToggleLeft size={22} className="text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => openModal(rec)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit2 size={18} className="text-blue-600 dark:text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                {editingRecurring ? t('recurring.editRecurring') : t('recurring.addRecurring')}
              </h2>
              <button 
                onClick={() => setModalOpen(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('common.close')}
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Type - Toggle Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('transactions.type')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income', category_id: '' })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      formData.type === 'income'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-green-900/50'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    💰 {t('transactions.income')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense', category_id: '' })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      formData.type === 'expense'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/50'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    💸 {t('transactions.expense')}
                  </button>
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('transactions.amount')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999999999.99"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input text-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('transactions.transactionCurrency')}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input"
                  >
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="VND">₫ VND</option>
                    <option value="JPY">¥ JPY</option>
                    <option value="GBP">£ GBP</option>
                    <option value="CNY">¥ CNY</option>
                    <option value="KRW">₩ KRW</option>
                    <option value="THB">฿ THB</option>
                    <option value="SGD">S$ SGD</option>
                    <option value="MYR">RM MYR</option>
                    <option value="IDR">Rp IDR</option>
                    <option value="PHP">₱ PHP</option>
                    <option value="INR">₹ INR</option>
                    <option value="AUD">A$ AUD</option>
                    <option value="CAD">C$ CAD</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                {t('transactions.maxAmount')} • {t('transactions.willConvert')}
              </p>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('recurring.frequency')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFormData({ ...formData, frequency: freq })}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        formData.frequency === freq
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {freq === 'daily' && '📅'} {freq === 'weekly' && '📆'} {freq === 'monthly' && '📊'} {freq === 'yearly' && '🗓️'}
                      <div className="text-xs mt-0.5">{t(`recurring.${freq}`)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('transactions.category')}
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="input"
                >
                  <option value="">{t('transactions.uncategorized')}</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('recurring.startDate')}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('recurring.endDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('transactions.description')} <span className="text-gray-400">({t('transactions.optional')})</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input resize-none"
                  rows="3"
                  placeholder={t('transactions.addNote')}
                ></textarea>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary flex-1 py-3"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary flex-1 py-3"
                >
                  {editingRecurring ? t('common.save') : t('transactions.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recurring;

