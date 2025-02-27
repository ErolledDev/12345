import React, { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

function WidgetSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [widgetId, setWidgetId] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0284c7');
  const [headerText, setHeaderText] = useState('Chat with us');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can we help you today?');
  const [logoUrl, setLogoUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [scriptCode, setScriptCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchWidgetSettings();
    }
  }, [user]);

  useEffect(() => {
    if (widgetId) {
      const code = `<script src="${window.location.origin}/chat.js" id="business-chat-widget" data-uid="${widgetId}"></script>`;
      setScriptCode(code);
    }
  }, [widgetId]);

  const fetchWidgetSettings = async () => {
    try {
      setLoading(true);
      
      // First check if user already has a widget
      const { data: widgets, error: widgetsError } = await supabase
        .from('widgets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (widgetsError && widgetsError.code !== 'PGRST116') {
        throw widgetsError;
      }
      
      if (widgets) {
        // User has existing widget settings
        setWidgetId(widgets.id);
        setPrimaryColor(widgets.primary_color || '#0284c7');
        setHeaderText(widgets.header_text || 'Chat with us');
        setWelcomeMessage(widgets.welcome_message || 'Hello! How can we help you today?');
        setLogoUrl(widgets.logo_url || '');
      } else {
        // Create new widget for user
        const { data: newWidget, error: createError } = await supabase
          .from('widgets')
          .insert([
            { 
              user_id: user.id,
              primary_color: '#0284c7',
              header_text: 'Chat with us',
              welcome_message: 'Hello! How can we help you today?'
            }
          ])
          .select()
          .single();
        
        if (createError) throw createError;
        
        setWidgetId(newWidget.id);
      }
    } catch (error) {
      console.error('Error fetching widget settings:', error);
      setError('Failed to load widget settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const { error } = await supabase
        .from('widgets')
        .update({
          primary_color: primaryColor,
          header_text: headerText,
          welcome_message: welcomeMessage,
          logo_url: logoUrl
        })
        .eq('id', widgetId);
      
      if (error) throw error;
      
      setSuccess('Widget settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving widget settings:', error);
      setError('Failed to save widget settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file is too large. Maximum size is 2MB.');
      return;
    }
    
    // Check file type
    if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, or SVG image.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const fileName = `${user.id}_${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);
      
      setLogoUrl(publicUrlData.publicUrl);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError('Failed to upload logo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setSuccess('Widget code copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Widget Settings</h2>
        
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
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          {/* Widget ID */}
          <div className="sm:col-span-6">
            <label htmlFor="widget-id" className="block text-sm font-medium text-gray-700">
              Widget ID
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                name="widget-id"
                id="widget-id"
                value={widgetId}
                readOnly
                className="flex-1 focus:ring-primary-500 focus:border-primary-500 block w-full min-w-0 rounded-md sm:text-sm border-gray-300 bg-gray-100"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This is your unique widget identifier. You'll need this to install the chat widget on your website.
            </p>
          </div>
          
          {/* Color Picker */}
          <div className="sm:col-span-3">
            <label htmlFor="color" className="block text-sm font-medium text-gray-700">
              Primary Color
            </label>
            <div className="mt-1 relative">
              <div
                className="w-full h-10 rounded-md border border-gray-300 cursor-pointer flex items-center justify-between px-3"
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white text-sm font-medium">{primaryColor}</span>
                <span className="w-6 h-6 rounded-full border border-white" style={{ backgroundColor: primaryColor }}></span>
              </div>
              {showColorPicker && (
                <div className="absolute z-10 mt-2">
                  <div className="fixed inset-0" onClick={() => setShowColorPicker(false)}></div>
                  <ChromePicker
                    color={primaryColor}
                    onChange={(color) => setPrimaryColor(color.hex)}
                    disableAlpha
                  />
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Choose the primary color for your chat widget. This will be used for the header and buttons.
            </p>
          </div>
          
          {/* Header Text */}
          <div className="sm:col-span-3">
            <label htmlFor="header-text" className="block text-sm font-medium text-gray-700">
              Header Text
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="header-text"
                id="header-text"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                maxLength={30}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              The text displayed in the header of your chat widget.
            </p>
          </div>
          
          {/* Welcome Message */}
          <div className="sm:col-span-6">
            <label htmlFor="welcome-message" className="block text-sm font-medium text-gray-700">
              Welcome Message
            </label>
            <div className="mt-1">
              <textarea
                id="welcome-message"
                name="welcome-message"
                rows={3}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                maxLength={200}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              The initial message displayed when a visitor opens the chat widget.
            </p>
          </div>
          
          {/* Logo Upload */}
          <div className="sm:col-span-6">
            <label htmlFor="logo" className="block text-sm font-medium text-gray-700">
              Business Logo
            </label>
            <div className="mt-1 flex items-center">
              {logoUrl ? (
                <div className="mr-4">
                  <img src={logoUrl} alt="Business logo" className="h-12 w-auto" />
                </div>
              ) : (
                <div className="mr-4 flex-shrink-0 h-12 w-12 border border-gray-300 rounded-md bg-gray-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div>
                <input
                  id="logo"
                  name="logo"
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/svg+xml"
                  onChange={handleLogoUpload}
                />
                <label
                  htmlFor="logo"
                  className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {logoUrl ? 'Change logo' : 'Upload logo'}
                </label>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Upload your business logo to display in the chat widget header. Max size: 2MB. Formats: JPEG, PNG, SVG.
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        
        {/* Widget Installation Code */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Widget Installation</h3>
          <p className="text-sm text-gray-500 mb-4">
            Copy and paste this code snippet just before the closing <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag on your website.
          </p>
          
          <div className="bg-gray-50 rounded-md p-4 relative">
            <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-all">
              {scriptCode}
            </pre>
            <button
              type="button"
              onClick={copyScriptToClipboard}
              className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Widget Preview */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Widget Preview</h3>
          <div className="relative h-96 border border-gray-200 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="chat-widget" style={{ position: 'relative', bottom: 'auto', right: 'auto' }}>
                <div className="flex flex-col h-full">
                  <div className="p-4 text-white" style={{ backgroundColor: primaryColor }}>
                    <div className="flex items-center">
                      {logoUrl && (
                        <img src={logoUrl} alt="Business logo" className="h-6 w-auto mr-2" />
                      )}
                      <span className="font-medium">{headerText}</span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 bg-white overflow-y-auto">
                    <div className="flex flex-col space-y-3">
                      <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none max-w-xs">
                        <p className="text-sm text-gray-800">{welcomeMessage}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        readOnly
                      />
                      <button
                        className="px-4 py-2 rounded-r-md text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WidgetSettings;