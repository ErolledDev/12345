/**
 * BusinessChatPlugin - Website Chat Widget
 * 
 * A lightweight chat widget that can be added to any website with a simple script tag.
 * Connects to the BusinessChat backend for real-time messaging and auto-replies.
 */

class BusinessChatPlugin {
  constructor(options) {
    this.options = options;
    this.widgetId = options.uid;
    this.apiUrl = options.apiUrl || 'https://api.businesschat.com';
    this.supabaseUrl = options.supabaseUrl || 'https://your-supabase-project.supabase.co';
    this.supabaseKey = options.supabaseKey || 'your-supabase-anon-key';
    
    this.isOpen = false;
    this.isInitialized = false;
    this.chatId = null;
    this.messages = [];
    this.userInfo = {
      name: null,
      email: null,
      chatCount: 0
    };
    
    this.init();
  }
  
  async init() {
    try {
      // Load Supabase client
      await this.loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      
      // Initialize Supabase client
      this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
      
      // Fetch widget settings
      await this.fetchWidgetSettings();
      
      // Create widget elements
      this.createWidgetElements();
      
      // Add event listeners
      this.addEventListeners();
      
      // Load chat history from local storage
      this.loadChatHistory();
      
      // Mark as initialized
      this.isInitialized = true;
      
      console.log('BusinessChatPlugin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BusinessChatPlugin:', error);
    }
  }
  
  async loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  async fetchWidgetSettings() {
    try {
      const { data, error } = await this.supabase
        .from('widgets')
        .select('*')
        .eq('id', this.widgetId)
        .single();
      
      if (error) throw error;
      
      this.settings = {
        primaryColor: data.primary_color || '#0284c7',
        headerText: data.header_text || 'Chat with us',
        welcomeMessage: data.welcome_message || 'Hello! How can we help you today?',
        logoUrl: data.logo_url || null
      };
    } catch (error) {
      console.error('Failed to fetch widget settings:', error);
      
      // Use default settings if fetch fails
      this.settings = {
        primaryColor: '#0284c7',
        headerText: 'Chat with us',
        welcomeMessage: 'Hello! How can we help you today?',
        logoUrl: null
      };
    }
  }
  
  createWidgetElements() {
    // Create widget button
    this.buttonElement = document.createElement('div');
    this.buttonElement.className = 'chat-widget-button';
    this.buttonElement.style.backgroundColor = this.settings.primaryColor;
    this.buttonElement.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
      </svg>
    `;
    
    // Create widget container
    this.widgetElement = document.createElement('div');
    this.widgetElement.className = 'chat-widget';
    this.widgetElement.style.display = 'none';
    
    // Create widget header
    const headerElement = document.createElement('div');
    headerElement.className = 'chat-widget-header';
    headerElement.style.backgroundColor = this.settings.primaryColor;
    headerElement.style.color = 'white';
    headerElement.style.padding = '12px 16px';
    headerElement.style.display = 'flex';
    headerElement.style.justifyContent = 'space-between';
    headerElement.style.alignItems = 'center';
    
    const headerTitleElement = document.createElement('div');
    headerTitleElement.className = 'chat-widget-title';
    headerTitleElement.style.display = 'flex';
    headerTitleElement.style.alignItems = 'center';
    
    if (this.settings.logoUrl) {
      const logoElement = document.createElement('img');
      logoElement.src = this.settings.logoUrl;
      logoElement.alt = 'Logo';
      logoElement.style.height = '24px';
      logoElement.style.marginRight = '8px';
      headerTitleElement.appendChild(logoElement);
    }
    
    const titleTextElement = document.createElement('span');
    titleTextElement.textContent = this.settings.headerText;
    titleTextElement.style.fontWeight = '500';
    headerTitleElement.appendChild(titleTextElement);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'chat-widget-close';
    closeButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '4px';
    
    headerElement.appendChild(headerTitleElement);
    headerElement.appendChild(closeButton);
    
    // Create messages container
    this.messagesElement = document.createElement('div');
    this.messagesElement.className = 'chat-widget-messages';
    this.messagesElement.style.flex = '1';
    this.messagesElement.style.overflowY = 'auto';
    this.messagesElement.style.padding = '16px';
    this.messagesElement.style.backgroundColor = 'white';
    
    // Create input container
    const inputContainerElement = document.createElement('div');
    inputContainerElement.className = 'chat-widget-input';
    inputContainerElement.style.borderTop = '1px solid #e5e7eb';
    inputContainerElement.style.padding = '12px 16px';
    inputContainerElement.style.backgroundColor = 'white';
    
    const inputElement = document.createElement('div');
    inputElement.className = 'chat-widget-input-container';
    inputElement.style.display = 'flex';
    
    this.textareaElement = document.createElement('textarea');
    this.textareaElement.className = 'chat-widget-textarea';
    this.textareaElement.placeholder = 'Type a message...';
    this.textareaElement.rows = 1;
    this.textareaElement.style.flex = '1';
    this.textareaElement.style.border = '1px solid #d1d5db';
    this.textareaElement.style.borderRadius = '0.375rem 0 0 0.375rem';
    this.textareaElement.style.padding = '8px 12px';
    this.textareaElement.style.resize = 'none';
    this.textareaElement.style.outline = 'none';
    
    const sendButton = document.createElement('button');
    sendButton.className = 'chat-widget-send';
    sendButton.style.backgroundColor = this.settings.primaryColor;
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '0 0.375rem 0.375rem 0';
    sendButton.style.padding = '0 16px';
    sendButton.style.cursor = 'pointer';
    sendButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 19L21 12L12 5V19Z" fill="white"/>
        <path d="M3 19V5L12 12L3 19Z" fill="white"/>
      </svg>
    `;
    
    inputElement.appendChild(this.textareaElement);
    inputElement.appendChild(sendButton);
    inputContainerElement.appendChild(inputElement);
    
    // Assemble widget
    this.widgetElement.appendChild(headerElement);
    this.widgetElement.appendChild(this.messagesElement);
    this.widgetElement.appendChild(inputContainerElement);
    
    // Add to document
    document.body.appendChild(this.buttonElement);
    document.body.appendChild(this.widgetElement);
    
    // Add CSS styles
    this.addStyles();
  }
  
  addStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .chat-widget {
        z-index: 9999;
        position: fixed;
        bottom: 20px;
        right: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-radius: 16px;
        overflow: hidden;
        max-height: 600px;
        width: 350px;
        display: flex;
        flex-direction: column;
      }
      
      .chat-widget-button {
        z-index: 9999;
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .chat-widget-messages {
        height: 350px;
      }
      
      .chat-message {
        margin-bottom: 12px;
        max-width: 80%;
        word-wrap: break-word;
      }
      
      .chat-message-visitor {
        align-self: flex-end;
        background-color: #f3f4f6;
        color: #1f2937;
        border-radius: 16px 16px 0 16px;
        padding: 8px 12px;
      }
      
      .chat-message-business {
        align-self: flex-start;
        color: white;
        border-radius: 16px 16px 16px 0;
        padding: 8px 12px;
      }
      
      .chat-message-time {
        font-size: 0.75rem;
        margin-top: 4px;
        opacity: 0.7;
      }
      
      .chat-message-container {
        display: flex;
        flex-direction: column;
      }
      
      .chat-message-container.visitor {
        align-items: flex-end;
      }
      
      .chat-message-container.business {
        align-items: flex-start;
      }
      
      .user-info-form {
        background-color: white;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 16px;
      }
      
      .user-info-form input {
        width: 100%;
        padding: 8px;
        margin-bottom: 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
      }
      
      .user-info-form button {
        width: 100%;
        padding: 8px;
        background-color: ${this.settings.primaryColor};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      @media (max-width: 480px) {
        .chat-widget {
          width: 100%;
          height: 100%;
          max-height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
        }
        
        .chat-widget-messages {
          height: calc(100vh - 120px);
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  addEventListeners() {
    // Toggle widget on button click
    this.buttonElement.addEventListener('click', () => {
      this.toggleWidget();
    });
    
    // Close widget on close button click
    const closeButton = this.widgetElement.querySelector('.chat-widget-close');
    closeButton.addEventListener('click', () => {
      this.toggleWidget(false);
    });
    
    // Send message on send button click
    const sendButton = this.widgetElement.querySelector('.chat-widget-send');
    sendButton.addEventListener('click', () => {
      this.sendMessage();
    });
    
    // Send message on Enter key press
    this.textareaElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Send typing indicator
    let typingTimeout;
    this.textareaElement.addEventListener('input', () => {
      if (this.chatId) {
        clearTimeout(typingTimeout);
        
        // Send typing indicator
        this.supabase.channel('typing-channel').send({
          type: 'broadcast',
          event: 'typing',
          payload: { chatId: this.chatId }
        });
        
        typingTimeout = setTimeout(() => {
          // Clear typing indicator after 3 seconds of inactivity
        }, 3000);
      }
    });
  }
  
  toggleWidget(forceState) {
    const newState = forceState !== undefined ? forceState : !this.isOpen;
    
    if (newState) {
      this.widgetElement.style.display = 'flex';
      this.buttonElement.style.display = 'none';
      this.isOpen = true;
      
      // If this is the first time opening, add welcome message
      if (this.messages.length === 0) {
        this.addMessage({
          content: this.settings.welcomeMessage,
          sender_type: 'business',
          is_auto_reply: false,
          created_at: new Date().toISOString()
        });
        
        // Create a new chat if none exists
        if (!this.chatId) {
          this.createChat();
        }
      }
      
      // Scroll to bottom
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    } else {
      this.widgetElement.style.display = 'none';
      this.buttonElement.style.display = 'flex';
      this.isOpen = false;
    }
  }
  
  async createChat() {
    try {
      const { data, error } = await this.supabase
        .from('chats')
        .insert([
          {
            widget_id: this.widgetId,
            visitor_page: window.location.href,
            visitor_name: this.userInfo.name,
            visitor_email: this.userInfo.email
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      this.chatId = data.id;
      
      // Save welcome message to database
      if (this.messages.length > 0) {
        await this.supabase
          .from('chat_messages')
          .insert([
            {
              chat_id: this.chatId,
              widget_id: this.widgetId,
              content: this.settings.welcomeMessage,
              sender_type: 'business',
              is_auto_reply: false
            }
          ]);
      }
      
      // Subscribe to messages for this chat
      this.subscribeToMessages();
      
      // Save chat ID to local storage
      localStorage.setItem('businessChatId', this.chatId);
      
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  }
  
  subscribeToMessages() {
    this.supabase
      .channel('messages-channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `chat_id=eq.${this.chatId}`
        }, 
        (payload) => {
          // Only add messages from business (visitor messages are added manually)
          if (payload.new.sender_type === 'business' && !this.messages.some(m => m.id === payload.new.id)) {
            this.addMessage(payload.new);
            this.scrollToBottom();
          }
        }
      )
      .subscribe();
  }
  
  async sendMessage() {
    const content = this.textareaElement.value.trim();
    if (!content) return;
    
    // Clear input
    this.textareaElement.value = '';
    
    // Create chat if it doesn't exist
    if (!this.chatId) {
      await this.createChat();
    }
    
    // Add message to UI
    const messageObj = {
      content,
      sender_type: 'visitor',
      is_auto_reply: false,
      created_at: new Date().toISOString()
    };
    
    this.addMessage(messageObj);
    this.scrollToBottom();
    
    try {
      // Send message to server
      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert([
          {
            chat_id: this.chatId,
            widget_id: this.widgetId,
            content,
            sender_type: 'visitor',
            is_auto_reply: false
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local message with server ID
      messageObj.id = data.id;
      
      // Increment chat count
      this.userInfo.chatCount++;
      localStorage.setItem('businessChatCount', this.userInfo.chatCount);
      
      // Check if we should ask for user info
      if (this.userInfo.chatCount >= 5 && !this.userInfo.name && !this.userInfo.email) {
        setTimeout(() => {
          this.showUserInfoForm();
        }, 1000);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
  
  addMessage(message) {
    // Add message to array
    this.messages.push(message);
    
    // Create message element
    const messageContainer = document.createElement('div');
    messageContainer.className = `chat-message-container ${message.sender_type}`;
    
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message chat-message-${message.sender_type}`;
    
    if (message.sender_type === 'business') {
      messageElement.style.backgroundColor = this.settings.primaryColor;
    }
    
    messageElement.textContent = message.content;
    
    const timeElement = document.createElement('div');
    timeElement.className = 'chat-message-time';
    timeElement.textContent = this.formatTime(message.created_at);
    
    if (message.is_auto_reply) {
      const autoReplyBadge = document.createElement('span');
      autoReplyBadge.textContent = ' (Auto-reply)';
      autoReplyBadge.style.fontSize = '0.7rem';
      autoReplyBadge.style.fontStyle = 'italic';
      timeElement.appendChild(autoReplyBadge);
    }
    
    messageContainer.appendChild(messageElement);
    messageContainer.appendChild(timeElement);
    
    this.messagesElement.appendChild(messageContainer);
    
    // Save to local storage
    this.saveChatHistory();
  }
  
  scrollToBottom() {
    this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
  }
  
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  showUserInfoForm() {
    const formContainer = document.createElement('div');
    formContainer.className = 'user-info-form';
    
    const formTitle = document.createElement('p');
    formTitle.textContent = 'Please share your contact information so we can better assist you:';
    formTitle.style.marginBottom = '12px';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your Name';
    
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Your Email';
    
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      
      if (name && email) {
        this.userInfo.name = name;
        this.userInfo.email = email;
        
        // Save to local storage
        localStorage.setItem('businessChatName', name);
        localStorage.setItem('businessChatEmail', email);
        
        // Update chat in database
        try {
          await this.supabase
            .from('chats')
            .update({
              visitor_name: name,
              visitor_email: email
            })
            .eq('id', this.chatId);
          
          // Add thank you message
          this.addMessage({
            content: `Thank you, ${name}! We'll use your contact information to follow up if needed.`,
            sender_type: 'business',
            is_auto_reply: false,
            created_at: new Date().toISOString()
          });
          
          // Remove form
          formContainer.remove();
          this.scrollToBottom();
          
        } catch (error) {
          console.error('Failed to update user info:', error);
        }
      }
    });
    
    formContainer.appendChild(formTitle);
    formContainer.appendChild(nameInput);
    formContainer.appendChild(emailInput);
    formContainer.appendChild(submitButton);
    
    this.messagesElement.appendChild(formContainer);
    this.scrollToBottom();
  }
  
  loadChatHistory() {
    // Load chat ID
    this.chatId = localStorage.getItem('businessChatId');
    
    // Load user info
    this.userInfo.name = localStorage.getItem('businessChatName');
    this.userInfo.email = localStorage.getItem('businessChatEmail');
    this.userInfo.chatCount = parseInt(localStorage.getItem('businessChatCount') || '0', 10);
    
    // If we have a chat ID, subscribe to messages
    if (this.chatId) {
      this.subscribeToMessages();
      
      // Load messages from server
      this.supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', this.chatId)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load chat history:', error);
            return;
          }
          
          // Clear existing messages
          this.messages = [];
          this.messagesElement.innerHTML = '';
          
          // Add messages to UI
          data.forEach(message => {
            this.addMessage(message);
          });
        });
    }
  }
  
  saveChatHistory() {
    localStorage.setItem('businessChatCount', this.userInfo.chatCount);
  }
}

// Initialize the widget when the script is loaded
(function() {
  // Get script element
  const scriptElement = document.getElementById('business-chat-widget');
  
  if (!scriptElement) {
    console.error('BusinessChatPlugin: Widget script element not found or missing id="business-chat-widget"');
    return;
  }
  
  // Get widget ID from data attribute
  const widgetId = scriptElement.getAttribute('data-uid');
  
  if (!widgetId) {
    console.error('BusinessChatPlugin: Missing data-uid attribute on script tag');
    return;
  }
  
  // Initialize widget
  window.businessChatPlugin = new BusinessChatPlugin({
    uid: widgetId,
    // Additional options can be passed here
  });
})();