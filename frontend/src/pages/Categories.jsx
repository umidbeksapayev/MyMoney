import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CategoryModal from '../components/CategoryModal';

const Categories = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error(t('categories.failedToLoad'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('categories.deleteConfirm'))) return;

    try {
      await api.delete(`/categories/${id}`);
      toast.success(t('categories.categoryDeleted'));
      fetchCategories();
    } catch (error) {
      toast.error(t('categories.failedToDelete'));
      console.error(error);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const filteredCategories = filter === 'all' 
    ? categories 
    : categories.filter(cat => cat.type === filter);

  const incomeCount = categories.filter(cat => cat.type === 'income').length;
  const expenseCount = categories.filter(cat => cat.type === 'expense').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold dark:text-gray-100">{t('categories.title')}</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2 w-full sm:w-auto">
          <Plus size={20} />
          <span>{t('categories.addCategory')}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('categories.totalCategories')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{categories.length}</p>
        </div>
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('categories.incomeCategories')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{incomeCount}</p>
        </div>
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('categories.expenseCategories')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{expenseCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('categories.all')} ({categories.length})
        </button>
        <button
          onClick={() => setFilter('income')}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
            filter === 'income' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('categories.income')} ({incomeCount})
        </button>
        <button
          onClick={() => setFilter('expense')}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
            filter === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('categories.expense')} ({expenseCount})
        </button>
      </div>

      {/* Categories Grid */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="p-3 sm:p-4 border-2 rounded-lg hover:shadow-md transition-all"
                style={{ borderColor: category.color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-lg sm:text-xl"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-base truncate">{category.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 sm:py-1 rounded inline-block mt-1 ${
                          category.type === 'income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {category.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit category"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="mb-4">{t('categories.noCategories')}</p>
            {filter === 'all' && (
              <button onClick={handleAdd} className="btn btn-primary">
                {t('categories.addCategory')}
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Categories;

