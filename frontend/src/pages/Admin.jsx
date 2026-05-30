import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  Users, UserCheck, UserPlus, TrendingUp, Database, Shield, Search, Lock, Trash2, RefreshCw,
  DollarSign, Target, Repeat, FolderOpen, Calendar, Eye, X, Crown, UserCircle
} from 'lucide-react';

const Admin = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [pagination.page, search]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search
        }
      });
      setUsers(response.data.users);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      toast.error(t('admin.failedToLoadUsers') || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (userId, newRole) => {
    if (!confirm(t('admin.confirmRoleChange') || `Change role to ${newRole}?`)) {
      return;
    }

    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(t('admin.roleUpdated') || 'Role updated successfully');
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.error || t('admin.failedToUpdateRole') || 'Failed to update role';
      toast.error(message);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error(t('admin.passwordTooShort') || 'Password must be at least 6 characters');
      return;
    }

    try {
      await api.post(`/admin/users/${selectedUser.id}/reset-password`, { newPassword });
      toast.success(t('admin.passwordReset') || 'Password reset successfully');
      setShowResetModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      const message = error.response?.data?.error || t('admin.failedToResetPassword') || 'Failed to reset password';
      toast.error(message);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(t('admin.confirmDelete') || `Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success(t('admin.userDeleted') || 'User deleted successfully');
      fetchUsers();
      fetchStats();
    } catch (error) {
      const message = error.response?.data?.error || t('admin.failedToDeleteUser') || 'Failed to delete user';
      toast.error(message);
    }
  };

  const fetchUserDetails = async (userId) => {
    setLoadingDetails(true);
    setShowDetailsModal(true);
    try {
      const response = await api.get(`/admin/users/${userId}/details`);
      setUserDetails(response.data);
    } catch (error) {
      toast.error(t('admin.failedToLoadDetails') || 'Failed to load user details');
      setShowDetailsModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'head': return <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'manager': return <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'contributor': return <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'observer': return <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
      default: return null;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'head': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
      case 'manager': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700';
      case 'contributor': return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'observer': return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700';
      default: return '';
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'mod') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="mx-auto text-red-500 dark:text-red-400 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('admin.accessDenied') || 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('admin.adminOnly') || 'This page is only accessible to administrators and moderators.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Shield className="text-blue-600 dark:text-blue-400" size={32} />
            {t('admin.title') || 'Admin Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('admin.subtitle') || 'Manage users and system settings'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Users Stats */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalUsers') || 'Total Users'}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total_users}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.admin_users} admin · {stats.mod_users || 0} mod
                </p>
              </div>
              <Users className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.newUsers30d') || 'New Users (30d)'}</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.new_users_30d}</p>
              </div>
              <TrendingUp className="text-green-600 dark:text-green-400" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalTransactions') || 'Transactions'}</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.total_transactions}</p>
              </div>
              <Database className="text-purple-600 dark:text-purple-400" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalCategories') || 'Categories'}</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.total_categories}</p>
              </div>
              <FolderOpen className="text-orange-600 dark:text-orange-400" size={32} />
            </div>
          </div>

          {/* Financial Stats */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalBudgets') || 'Budgets'}</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.total_budgets}</p>
              </div>
              <DollarSign className="text-indigo-600 dark:text-indigo-400" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalGoals') || 'Saving Goals'}</p>
                <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">{stats.total_goals || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.active_goals || 0} active · {stats.completed_goals || 0} completed
                </p>
              </div>
              <Target className="text-cyan-600 dark:text-cyan-400" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalRecurring') || 'Recurring'}</p>
                <p className="text-3xl font-bold text-teal-600 dark:text-teal-400 mt-1">{stats.total_recurring || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.active_recurring || 0} active
                </p>
              </div>
              <Repeat className="text-teal-600 dark:text-teal-400" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">System Status</p>
                <p className="text-2xl font-bold mt-1">All Systems</p>
                <p className="text-sm text-blue-100 mt-1">Operational</p>
              </div>
              <Shield size={32} className="text-blue-100" />
            </div>
          </div>
        </div>
      )}

      {/* User Management */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('admin.userManagement') || 'User Management'}
            </h2>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                placeholder={t('admin.searchUsers') || 'Search by email or name...'}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('admin.user') || 'User'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('admin.role') || 'Role'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('admin.joined') || 'Joined'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('admin.actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {t('common.loading') || 'Loading...'}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {t('admin.noUsers') || 'No users found'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{u.full_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleRoleToggle(u.id, e.target.value)}
                        disabled={u.id === user.id || user?.role !== 'admin'}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                          u.role === 'admin'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700'
                            : u.role === 'mod'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
                        } ${(u.id === user.id || user?.role !== 'admin') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                      >
                        <option value="user">User</option>
                        <option value="mod">Mod</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details Button */}
                        <button
                          onClick={() => fetchUserDetails(u.id)}
                          className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                          title={t('admin.viewDetails') || 'View Details'}
                        >
                          <Eye size={18} />
                        </button>
                        {/* Admin can reset anyone, Mod can only reset regular users */}
                        {(user?.role === 'admin' || (user?.role === 'mod' && u.role === 'user')) && (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowResetModal(true);
                            }}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title={t('admin.resetPassword') || 'Reset Password'}
                          >
                            <Lock size={18} />
                          </button>
                        )}
                        {/* Only Admin can delete users */}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                            disabled={u.id === user.id}
                            className={`p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors ${
                              u.id === user.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={t('admin.deleteUser') || 'Delete User'}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.showing') || 'Showing'} {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t('admin.of') || 'of'} {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {t('admin.previous') || 'Previous'}
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {t('admin.next') || 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <UserCircle className="text-blue-600 dark:text-blue-400" size={32} />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {t('admin.userDetails') || 'User Details'}
                  </h3>
                  {userDetails && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {userDetails.user.full_name}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setUserDetails(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : userDetails ? (
                <div className="space-y-6">
                  {/* User Info */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      {t('admin.accountInfo') || 'Account Information'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.email') || 'Email'}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{userDetails.user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.fullName') || 'Full Name'}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{userDetails.user.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.systemRole') || 'System Role'}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{userDetails.user.role}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.currency') || 'Currency'}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{userDetails.user.currency}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.registrationMethod') || 'Registration'}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {userDetails.user.oauth_provider && userDetails.user.oauth_provider !== 'null'
                            ? t(`admin.oauth.${userDetails.user.oauth_provider}`) || userDetails.user.oauth_provider
                            : t('admin.oauth.local') || 'Email/Password'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.joinedDate') || 'Joined'}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(userDetails.user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      {t('admin.statistics') || 'Statistics'}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {userDetails.user.transaction_count}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t('admin.transactions') || 'Transactions'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {userDetails.user.category_count}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t('admin.categories') || 'Categories'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {userDetails.user.budget_count}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t('admin.budgets') || 'Budgets'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                          {userDetails.user.goal_count}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t('admin.goals') || 'Goals'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                          {userDetails.user.recurring_count}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t('admin.recurring') || 'Recurring'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Family Info */}
                  {userDetails.families && userDetails.families.length > 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        {t('admin.familyMemberships') || 'Family Memberships'}
                      </h4>
                      <div className="space-y-4">
                        {userDetails.families.map((family) => {
                          const familyMembers = userDetails.familyMembers.find(
                            fm => fm.family_id === family.family_id
                          );
                          return (
                            <div key={family.family_id} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                                      {family.family_name}
                                    </h5>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getRoleBadgeColor(family.family_role)}`}>
                                      {getRoleIcon(family.family_role)}
                                      {t(`family.roles.${family.family_role}`) || family.family_role}
                                    </span>
                                  </div>
                                  {family.family_description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                      {family.family_description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{t('admin.createdBy') || 'Created by'}: {family.created_by}</span>
                                    <span>•</span>
                                    <span>{family.member_count} {t('admin.members') || 'members'}</span>
                                    <span>•</span>
                                    <span>{t('admin.joined') || 'Joined'}: {new Date(family.joined_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Family Members */}
                              {familyMembers && familyMembers.members.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('admin.familyMembers') || 'Members'}:
                                  </p>
                                  <div className="space-y-2">
                                    {familyMembers.members.map((member) => (
                                      <div key={member.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium border flex items-center gap-1 ${getRoleBadgeColor(member.role)}`}>
                                            {getRoleIcon(member.role)}
                                            {t(`family.roles.${member.role}`) || member.role}
                                          </span>
                                          <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {member.full_name}
                                          </span>
                                          {member.id === userDetails.user.id && (
                                            <span className="text-blue-600 dark:text-blue-400 text-xs">
                                              ({t('admin.thisUser') || 'This user'})
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                                          {member.email}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
                      <Users className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">
                        {t('admin.noFamilyMemberships') || 'This user is not a member of any family'}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setUserDetails(null);
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
              >
                {t('common.close') || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('admin.resetPasswordFor') || 'Reset Password for'} {selectedUser?.full_name}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.newPassword') || 'New Password'}
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('admin.enterNewPassword') || 'Enter new password (min 6 characters)'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                minLength={6}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {t('admin.resetPassword') || 'Reset Password'}
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setNewPassword('');
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
