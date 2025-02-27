import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { CSVLink } from 'react-csv';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [widgetId, setWidgetId] = useState('');
  const [totalChats, setTotalChats] = useState(0);
  const [totalAutoReplies, setTotalAutoReplies] = useState(0);
  const [dailyChats, setDailyChats] = useState([]);
  const [autoReplyStats, setAutoReplyStats] = useState([]);
  const [dateRange, setDateRange] = useState('7days'); // '7days', '30days', 'all'
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchWidgetId();
    }
  }, [user]);

  useEffect(() => {
    if (widgetId) {
      fetchAnalytics();
    }
  }, [widgetId, dateRange]);

  const fetchWidgetId = async () => {
    try {
      const { data, error } = await supabase
        .from('widgets')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      setWidgetId(data.id);
    } catch (error) {
      console.error('Error fetching widget ID:', error);
      setError('Failed to load widget data.');
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      if (dateRange === '7days') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
      } else {
        // 'all' - no date filtering
        startDate = null;
      }
      
      // Format date for Supabase query
      const formattedStartDate = startDate ? startDate.toISOString() : null;
      
      // Fetch total chats
      let chatQuery = supabase
        .from('chats')
        .select('*', { count: 'exact' })
        .eq('widget_id', widgetId);
      
      if (formattedStartDate) {
        chatQuery = chatQuery.gte('created_at', formattedStartDate);
      }
      
      const { count: chatCount, error: chatError } = await chatQuery;
      
      if (chatError) throw chatError;
      
      setTotalChats(chatCount || 0);
      
      // Fetch total auto-replies
      let autoReplyQuery = supabase
        .from('chat_messages')
        .select('*', { count: 'exact' })
        .eq('widget_id', widgetId)
        .eq('is_auto_reply', true);
      
      if (formattedStartDate) {
        autoReplyQuery = autoReplyQuery.gte('created_at', formattedStartDate);
      }
      
      const { count: autoReplyCount, error: autoReplyError } = await autoReplyQuery;
      
      if (autoReplyError) throw autoReplyError;
      
      setTotalAutoReplies(autoReplyCount || 0);
      
      // Fetch daily chat data
      const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90; // Limit 'all' to 90 days
      const dailyData = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();
        
        let dailyChatQuery = supabase
          .from('chats')
          .select('*', { count: 'exact' })
          .eq('widget_id', widgetId)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);
        
        const { count: dailyChatCount, error: dailyChatError } = await dailyChatQuery;
        
        if (dailyChatError) throw dailyChatError;
        
        dailyData.unshift({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: dailyChatCount || 0
        });
      }
      
      setDailyChats(dailyData);
      
      // Fetch auto-reply stats (top 5 triggered keywords)
      let keywordStatsQuery = supabase
        .from('chat_messages')
        .select('auto_reply_keyword, count')
        .eq('widget_id', widgetId)
        .eq('is_auto_reply', true)
        .not('auto_reply_keyword', 'is', null);
      
      if (formattedStartDate) {
        keywordStatsQuery = keywordStatsQuery.gte('created_at', formattedStartDate);
      }
      
      const { data: keywordData, error: keywordError } = await keywordStatsQuery
        .group('auto_reply_keyword')
        .order('count', { ascending: false })
        .limit(5);
      
      if (keywordError) throw keywordError;
      
      setAutoReplyStats(keywordData || []);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chatChartData = {
    labels: dailyChats.map(item => item.date),
    datasets: [
      {
        label: 'Number of Chats',
        data: dailyChats.map(item => item.count),
        fill: false,
        backgroundColor: 'rgba(2, 132, 199, 0.2)',
        borderColor: 'rgba(2, 132, 199, 1)',
        tension: 0.1
      }
    ]
  };

  const autoReplyChartData = {
    labels: autoReplyStats.map(item => item.auto_reply_keyword),
    datasets: [
      {
        label: 'Times Triggered',
        data: autoReplyStats.map(item => item.count),
        backgroundColor: 'rgba(2, 132, 199, 0.6)',
        borderColor: 'rgba(2, 132, 199, 1)',
        borderWidth: 1
      }
    ]
  };

  // Prepare CSV export data
  const csvData = [
    { metric: 'Total Chats', value: totalChats },
    { metric: 'Total Auto-Replies', value: totalAutoReplies },
    { metric: 'Auto-Reply Rate', value: totalChats > 0 ? `${((totalAutoReplies / totalChats) * 100).toFixed(2)}%` : '0%' }
  ];

  const dailyChatsCsvData = dailyChats.map(item => ({
    date: item.date,
    chats: item.count
  }));

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Analytics Dashboard</h2>
          <div className="flex space-x-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            <CSVLink
              data={[...csvData, ...dailyChatsCsvData]}
              filename={`chat-analytics-${new Date().toISOString().split('T')[0]}.csv`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Export
            </CSVLink>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Chats
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {totalChats}
                  </dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Auto-Replies Triggered
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {totalAutoReplies}
                  </dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Auto-Reply Rate
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {totalChats > 0 ? `${((totalAutoReplies / totalChats) * 100).toFixed(1)}%` : '0%'}
                  </dd>
                </div>
              </div>
            </div>
            
            {/* Charts */}
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Chat Volume Over Time</h3>
                <div className="h-80">
                  <Line 
                    data={chatChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            precision: 0
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              
              {autoReplyStats.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Top Auto-Reply Keywords</h3>
                  <div className="h-80">
                    <Bar 
                      data={autoReplyChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;