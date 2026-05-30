import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';

const ContributionModal = ({ goal, onClose }) => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const [isWithdraw, setIsWithdraw] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: goal.currency || currency || 'USD',
    contribution_date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const endpoint = isWithdraw ? 'withdraw' : 'contribute';
      await api.post(`/goals/${goal.id}/${endpoint}`, formData);
      toast.success(t(isWithdraw ? 'goals.withdrawSuccess' : 'goals.contributeSuccess'));
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || t('common.error'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-gray-100">
            {goal.icon} {goal.name}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsWithdraw(false)}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                !isWithdraw
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Plus size={20} />
              {t('goals.add')}
            </button>
            <button
              type="button"
              onClick={() => setIsWithdraw(true)}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                isWithdraw
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Minus size={20} />
              {t('goals.withdraw')}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              {t('common.amount')} *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={isWithdraw ? goal.current_amount : undefined}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input"
              required
              placeholder={isWithdraw ? `Max: ${goal.current_amount}` : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              {t('common.date')}
            </label>
            <input
              type="date"
              value={formData.contribution_date}
              onChange={(e) => setFormData({ ...formData, contribution_date: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              {t('common.note')}
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="input"
              rows="3"
              placeholder={t('goals.notePlaceholder')}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={`flex-1 btn ${isWithdraw ? 'bg-red-600 hover:bg-red-700' : 'btn-primary'} text-white`}
            >
              {t(isWithdraw ? 'goals.confirmWithdraw' : 'goals.confirmAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributionModal;
