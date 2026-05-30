import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import api from '../lib/api';
import {
  TrendingUp, TrendingDown, AlertTriangle, Calendar,
  Activity, Zap, PieChart, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';

export default function Analytics() {
  const { t } = useTranslation();
  const { currency, formatAmount, formatCurrency } = useCurrency();
  
  const [anomalies, setAnomalies] = useState(null);
  const [yoyData, setYoyData] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('anomalies');

  useEffect(() => {
    fetchAllAnalytics();
  }, [currency]);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [anomaliesRes, yoyRes, velocityRes, patternsRes] = await Promise.all([
        api.get(`/trends/anomalies?currency=${currency}&period=3`),
        api.get(`/trends/yoy-comparison?currency=${currency}`),
        api.get(`/trends/velocity?currency=${currency}&period=30`),
        api.get(`/trends/patterns?currency=${currency}&period=6`)
      ]);

      setAnomalies(anomaliesRes.data);
      setYoyData(yoyRes.data);
      setVelocity(velocityRes.data);
      setPatterns(patternsRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'anomalies', name: t('analytics.anomalies'), icon: AlertTriangle },
    { id: 'yoy', name: t('analytics.yearOverYear'), icon: Calendar },
    { id: 'velocity', name: t('analytics.velocity'), icon: Zap },
    { id: 'patterns', name: t('analytics.patterns'), icon: Activity }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('analytics.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('analytics.subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'anomalies' && anomalies && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('analytics.spendingAnomalies')}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {anomalies.period}
                </span>
              </div>
              
              {anomalies.anomalies.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">
                  {t('analytics.noAnomaliesDetected')}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.totalAnomalies')}</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {anomalies.anomaliesFound}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.totalTransactions')}</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {anomalies.totalTransactions}
                      </p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.anomalyRate')}</p>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {((anomalies.anomaliesFound / anomalies.totalTransactions) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Anomaly List */}
                  <div className="space-y-3">
                    {anomalies.anomalies.map((anomaly) => (
                      <div
                        key={anomaly.id}
                        className={`p-4 rounded-lg border-2 ${
                          anomaly.severity === 'high'
                            ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                            : 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={`h-5 w-5 ${
                                anomaly.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                              }`} />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {anomaly.description || 'Transaction'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {anomaly.category} • {new Date(anomaly.date).toLocaleDateString()}
                            </p>
                            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">
                                {/* Backend already converted */}
                                {formatCurrency(anomaly.amount)}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {anomaly.deviationPercent}% {t('analytics.aboveAverage')}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {t('analytics.avg')}: {formatCurrency(anomaly.averageForCategory)}
                              </span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            anomaly.severity === 'high'
                              ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                              : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                          }`}>
                            {t(`analytics.${anomaly.severity}`)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty state for anomalies */}
        {activeTab === 'anomalies' && !anomalies && (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('analytics.noData')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('analytics.noAnomaliesData')}
            </p>
          </div>
        )}

        {activeTab === 'yoy' && yoyData && (
          <div className="space-y-6">
            {/* Yearly Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {yoyData.totals.currentYear.year} {t('analytics.yearlyTotal')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('analytics.income')}:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {/* Backend already converted */}
                      {formatCurrency(yoyData.totals.currentYear.income)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('analytics.expense')}:</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(yoyData.totals.currentYear.expense)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t dark:border-gray-700">
                    <span className="font-semibold text-gray-900 dark:text-white">{t('analytics.net')}:</span>
                    <span className={`font-bold ${
                      yoyData.totals.currentYear.net >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(yoyData.totals.currentYear.net)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {yoyData.totals.lastYear.year} {t('analytics.yearlyTotal')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('analytics.income')}:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(yoyData.totals.lastYear.income)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('analytics.expense')}:</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(yoyData.totals.lastYear.expense)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t dark:border-gray-700">
                    <span className="font-semibold text-gray-900 dark:text-white">{t('analytics.net')}:</span>
                    <span className={`font-bold ${
                      yoyData.totals.lastYear.net >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(yoyData.totals.lastYear.net)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* YoY Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('analytics.monthlyComparison')}
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={yoyData.comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border dark:border-gray-700">
                            <p className="font-semibold mb-2">{data.month}</p>
                            <div className="space-y-1 text-sm">
                              <p className="text-green-600">
                                {yoyData.totals.currentYear.year}: {formatCurrency(data.currentYear.expense)}
                              </p>
                              <p className="text-blue-600">
                                {yoyData.totals.lastYear.year}: {formatCurrency(data.lastYear.expense)}
                              </p>
                              {data.change.expense && (
                                <p className={data.change.expense > 0 ? 'text-red-600' : 'text-green-600'}>
                                  Change: {data.change.expense}%
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="currentYear.expense" 
                    fill="#10b981" 
                    name={`${yoyData.totals.currentYear.year} Expense`}
                  />
                  <Bar 
                    dataKey="lastYear.expense" 
                    fill="#3b82f6" 
                    name={`${yoyData.totals.lastYear.year} Expense`}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Empty state for YoY */}
        {activeTab === 'yoy' && !yoyData && (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('analytics.noData')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('analytics.noYoyData')}
            </p>
          </div>
        )}

        {activeTab === 'velocity' && velocity && (
          <div className="space-y-6">
            {/* Velocity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.dailyAverage')}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(velocity.averageDaily)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.monthlyProjection')}</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(velocity.projectedMonthly)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.velocityTrend')}</p>
                <div className="flex items-center gap-2">
                  {velocity.velocity.trend === 'increasing' ? (
                    <TrendingUp className="h-6 w-6 text-red-500" />
                  ) : velocity.velocity.trend === 'decreasing' ? (
                    <TrendingDown className="h-6 w-6 text-green-500" />
                  ) : (
                    <Activity className="h-6 w-6 text-gray-500" />
                  )}
                  <span className="text-lg font-semibold capitalize text-gray-900 dark:text-white">
                    {t(`analytics.${velocity.velocity.trend}`)}
                  </span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.change7d')}</p>
                <p className={`text-2xl font-bold ${
                  parseFloat(velocity.velocity.change) > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {velocity.velocity.change}%
                </p>
              </div>
            </div>

            {/* Daily Spending Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('analytics.dailySpendingTrend')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={velocity.dailySpending.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border dark:border-gray-700">
                            <p className="text-sm font-semibold">
                              {new Date(payload[0].payload.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-blue-600">
                              {formatCurrency(payload[0].value)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    fill="#93c5fd" 
                    name={t('analytics.spending')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Empty state for Velocity */}
        {activeTab === 'velocity' && !velocity && (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow text-center">
            <Zap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('analytics.noData')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('analytics.noVelocityData')}
            </p>
          </div>
        )}

        {activeTab === 'patterns' && patterns && (
          <div className="space-y-6">
            {/* Weekday vs Weekend */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('analytics.weekdayVsWeekend')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('analytics.weekdayAverage')}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(patterns.weekdayVsWeekend.weekday.average)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {patterns.weekdayVsWeekend.weekday.count} {t('analytics.transactions')}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('analytics.weekendAverage')}</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(patterns.weekdayVsWeekend.weekend.average)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {patterns.weekdayVsWeekend.weekend.count} {t('analytics.transactions')}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('analytics.pattern')}: <span className="capitalize">{patterns.weekdayVsWeekend.pattern.replace('_', ' ')}</span>
                </p>
                {patterns.weekdayVsWeekend.difference && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('analytics.weekendHigher')} {patterns.weekdayVsWeekend.difference}% {
                      parseFloat(patterns.weekdayVsWeekend.difference) > 0 ? t('analytics.higher') : t('analytics.lower')
                    } {t('analytics.thanWeekday')}
                  </p>
                )}
              </div>
            </div>

            {/* Monthly Period Patterns */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('analytics.spendingByPeriod')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('analytics.earlyMonth')}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(patterns.monthlyPeriods.earlyMonth.average)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {patterns.monthlyPeriods.earlyMonth.count} {t('analytics.transactions')}
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('analytics.midMonth')}
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(patterns.monthlyPeriods.midMonth.average)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {patterns.monthlyPeriods.midMonth.count} {t('analytics.transactions')}
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('analytics.lateMonth')}
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(patterns.monthlyPeriods.lateMonth.average)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {patterns.monthlyPeriods.lateMonth.count} {t('analytics.transactions')}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('analytics.pattern')}: <span className="capitalize">{patterns.monthlyPeriods.pattern.replace('_', ' ')}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty state for Patterns */}
        {activeTab === 'patterns' && !patterns && (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('analytics.noData')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('analytics.noPatternsData')}
            </p>
          </div>
        )}
      </div>
  );
}
