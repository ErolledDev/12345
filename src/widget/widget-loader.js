/**
 * BusinessChatPlugin Widget Loader
 * 
 * This script is responsible for loading the chat widget on the client's website.
 * It's designed to be as lightweight as possible for the initial load.
 */

(function() {
  // Configuration
  const WIDGET_URL = 'https://your-domain.com/chat.js';
  
  // Get the script element
  const scriptElement = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  
  // Get widget ID from data attribute
  const widgetId = scriptElement.getAttribute('data-uid');
  
  if (!widgetId) {
    console.error('BusinessChatPlugin: Missing data-uid attribute on script tag');
    return;
  }
  
  // Create a new script element to load the full widget
  const widgetScript = document.createElement('script');
  widgetScript.id = 'business-chat-widget';
  widgetScript.setAttribute('data-uid', widgetId);
  widgetScript.src = WIDGET_URL;
  widgetScript.async = true;
  
  // Append the script to the document
  document.body.appendChild(widgetScript);
})();