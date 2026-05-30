import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#14B8A6', '#F97316', '#84CC16',
  '#6366F1', '#A855F7', '#F43F5E', '#64748B', '#FF69B4',
  '#FF6347', '#FFD700', '#00CED1', '#9370DB', '#20B2AA'
];

const CategoryModal = ({ category, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: COLORS[0],
    icon: 'folder'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon
      });
    }
  }, [category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (category) {
        await api.put(`/categories/${category.id}`, formData);
        toast.success(t('categories.categoryUpdated'));
      } else {
        await api.post('/categories', formData);
        toast.success(t('categories.categoryCreated'));
      }

      onClose();
    } catch (error) {
      toast.error(category ? t('categories.failedToUpdate') : t('categories.failedToCreate'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">
            {category ? t('categories.editCategory') : t('categories.addCategory')}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('categories.name')}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
              placeholder={t('categories.categoryName')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('categories.type')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income' })}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.type === 'income'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={!!category}
              >
                {t('categories.income')}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.type === 'expense'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={!!category}
              >
                {t('categories.expense')}
              </button>
            </div>
            {category && (
              <p className="text-xs text-gray-500 mt-1">{t('categories.typeCannotChange')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('categories.color')}
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all hover:scale-110 ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selected: <span className="font-mono">{formData.color}</span>
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              {t('categories.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? t('categories.saving') : (category ? t('categories.update') : t('categories.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;

