import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import Fuse from 'fuse.js';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

function AutoReply() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoReplies, setAutoReplies] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [response, setResponse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [widgetId, setWidgetId] = useState('');

  // CSV template headers
  const csvHeaders = [
    { label: 'Keyword', key: 'keyword' },
    { label: 'Response', key: 'response' }
  ];

  // CSV template data
  const csvData = [
    { keyword: 'pricing', response: 'Our pricing starts at $19/month for the Pro plan. You can find more details on our pricing page.' },
    { keyword: 'contact', response: 'You can reach our support team at support@example.com or call us at (555) 123-4567.' },
    { keyword: 'hours', response: 'Our business hours are Monday to Friday, 9 AM to 5 PM EST.' }
  ];

  useEffect(() => {
    if (user) {
      fetchWidgetId();
      fetchAutoReplies();
    }
  }, [user]);

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
    }
  };

  const fetchAutoReplies = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('auto_replies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAutoReplies(data || []);
    } catch (error) {
      console.error('Error fetching auto-replies:', error);
      setError('Failed to load auto-replies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAutoReply = async () => {
    if (!keyword.trim() || !response.trim()) {
      setError('Both keyword and response are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const { data, error } = await supabase
        .from('auto_replies')
        .insert([
          { 
            user_id: user.id,
            widget_id: widgetId,
            keyword: keyword.trim(),
            response: response.trim()
          }
        ])
        .select();
      
      if (error) throw error;
      
      setAutoReplies([...data, ...autoReplies]);
      setKeyword('');
      setResponse('');
      setSuccess('Auto-reply added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding auto-reply:', error);
      setError('Failed to add auto-reply. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAutoReply = async (id) => {
    try {
      setError('');
      
      const { error } = await supabase
        .from('auto_replies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setAutoReplies(autoReplies.filter(item => item.id !== id));
      setSuccess('Auto-reply deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting auto-reply:', error);
      setError('Failed to delete auto-reply. Please try again.');
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'text/csv') {
      setError('Invalid file type. Please upload a CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target.result;
        const rows = csvText.split('\n');
        const headers = rows[0].split(',');
        
        // Validate headers
        const keywordIndex = headers.findIndex(h => h.trim().toLowerCase() === 'keyword');
        const responseIndex = headers.findIndex(h => h.trim().toLowerCase() === 'response');
        
        if (keywordIndex === -1 || responseIndex === -1) {
          setError('Invalid CSV format. Please use the template provided.');
          return;
        }
        
        // Parse data rows
        const newAutoReplies = [];
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          
          const columns = rows[i].split(',');
          const keywordValue = columns[keywordIndex]?.trim();
          const responseValue = columns[responseIndex]?.trim();
          
          if (keywordValue && responseValue) {
            newAutoReplies.push({
              user_id: user.id,
              widget_id: widgetId,
              keyword: keywordValue,
              response: responseValue
            });
          }
        }
        
        if (newAutoReplies.length === 0) {
          setError('No valid data found in the CSV file.');
          return;
        }
        
        // Insert into database
        setSaving(true);
        const { data, error } = await supabase
          .from('auto_replies')
          .insert(newAutoReplies)
          .select();
        
        if (error) throw error;
        
        setAutoReplies([...data, ...autoReplies]);
        setSuccess(`${data.length} auto-replies imported successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error processing CSV:', error);
        setError('Failed to import auto-replies. Please check your CSV file and try again.');
      } finally {
        setSaving(false);
        // Reset file input
        e.target.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  const handleTestAutoReply = () => {
    if (!testInput.trim()) {
      setTestResult(null);
      return;
    }

    // Use Fuse.js for fuzzy matching
    const fuse = new Fuse(autoReplies, {
      keys: ['keyword'],
      includeScore: true,
      threshold: 0.4 // Lower threshold means more strict matching
    });

    const results = fuse.search(testInput);
    
    if (results.length > 0) {
      setTestResult({
        matched: true,
        keyword: results[0].item.keyword,
        response: results[0].item.response,
        score: results[0].score
      });
    } else {
      setTestResult({
        matched: false
      });
    }
  };

  // Filter auto-replies based on search term
  const filteredAutoReplies = searchTerm
    ? autoReplies.filter(item => 
        item.keyword.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.response.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : autoReplies;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Auto Reply Settings</h2>
        
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
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-700 mb-4">Add New Auto Reply</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
                Keyword
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="keyword"
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                The keyword that will trigger this auto-reply.
              </p>
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="response" className="block text-sm font-medium text-gray-700">
                Response
              </label>
              <div className="mt-1">
                <textarea
                  id="response"
                  name="response"
                  rows={3}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                The response that will be sent when the keyword is detected.
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              type="button"
              onClick={handleAddAutoReply}
              disabled={saving || !keyword.trim() || !response.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Auto Reply'}
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-8 mb-8">
          <h3 className="text-md font-medium text-gray-700 mb-4">Bulk Import/Export</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <CSVLink
                data={csvData}
                headers={csvHeaders}
                filename="auto-reply-template.csv"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV Template
              </CSVLink>
            </div>
            
            <div>
              <label
                htmlFor="csv-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer"
              >
                <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload CSV File
              </label>
              <input
                id="csv-upload"
                name="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="sr-only"
              />
            </div>
            
            {autoReplies.length > 0 && (
              <div>
                <CSVLink
                  data={autoReplies.map(({ keyword, response }) => ({ keyword, response }))}
                  headers={csvHeaders}
                  filename="auto-replies-export.csv"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Current Auto-Replies
                </CSVLink>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-8 mb-8">
          <h3 className="text-md font-medium text-gray-700 mb-4">Test Auto Replies</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex">
              <input
                type="text"
                placeholder="Type a message to test auto-replies..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="flex-1 focus:ring-primary-500 focus:border-primary-500 block w-full min-w-0 rounded-l-md sm:text-sm border-gray-300"
              />
              <button
                type="button"
                onClick={handleTestAutoReply}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Test
              </button>
            </div>
            
            {testResult && (
              <div className="mt-4 p-4 border rounded-md bg-white">
                {testResult.matched ? (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Matched keyword: <span className="text-primary-600">{testResult.keyword}</span> (Match score: {Math.round((1 - testResult.score) * 100)}%)
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <p className="text-sm text-gray-800">{testResult.response}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    No matching auto-reply found for this message.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-medium text-gray-700">Manage Auto Replies</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search auto-replies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <svg className="animate-spin h-5 w-5 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredAutoReplies.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              {searchTerm ? 'No auto-replies match your search.' : 'No auto-replies added yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keyword
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAutoReplies.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.keyword}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">{item.response}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteAutoReply(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AutoReply;