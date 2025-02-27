import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

function ChatTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [widgetId, setWidgetId] = useState('');
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatSubscriptionRef = useRef(null);
  const messageSubscriptionRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchWidgetId();
    }
    
    return () => {
      // Clean up subscriptions
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe();
      }
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
      }
    };
  }, [user]);

  useEffect(() => {
    if (widgetId) {
      fetchChats();
      subscribeToChats();
    }
  }, [widgetId]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const fetchChats = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('widget_id', widgetId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      setChats(data || []);
      
      // Set first chat as active if available and no active chat
      if (data && data.length > 0 && !activeChat) {
        setActiveChat(data[0]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError('Failed to load chats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChats = () => {
    // Unsubscribe from previous subscription if exists
    if (chatSubscriptionRef.current) {
      chatSubscriptionRef.current.unsubscribe();
    }
    
    // Subscribe to chat updates
    chatSubscriptionRef.current = supabase
      .channel('chats-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chats',
          filter: `widget_id=eq.${widgetId}`
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setChats(prevChats => [payload.new, ...prevChats]);
          } else if (payload.eventType === 'UPDATE') {
            setChats(prevChats => 
              prevChats.map(chat => 
                chat.id === payload.new.id ? payload.new : chat
              )
            );
            
            // Update active chat if it's the one that was updated
            if (activeChat && activeChat.id === payload.new.id) {
              setActiveChat(payload.new);
            }
          } else if (payload.eventType === 'DELETE') {
            setChats(prevChats => 
              prevChats.filter(chat => chat.id !== payload.old.id)
            );
            
            // Clear active chat if it was deleted
            if (activeChat && activeChat.id === payload.old.id) {
              setActiveChat(null);
              setMessages([]);
            }
          }
        }
      )
      .subscribe();
  };

  const subscribeToMessages = () => {
    // Unsubscribe from previous subscription if exists
    if (messageSubscriptionRef.current) {
      messageSubscriptionRef.current.unsubscribe();
    }
    
    // Subscribe to message updates for the active chat
    messageSubscriptionRef.current = supabase
      .channel('messages-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `chat_id=eq.${activeChat.id}`
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prevMessages => [...prevMessages, payload.new]);
            
            // Update typing status
            if (payload.new.sender_type === 'visitor') {
              setTyping(false);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prevMessages => 
              prevMessages.map(message => 
                message.id === payload.new.id ? payload.new : message
              )
            );
          }
        }
      )
      .subscribe();
      
    // Also subscribe to typing indicators
    supabase
      .channel('typing-channel')
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.chatId === activeChat.id) {
          setTyping(true);
          
          // Auto-clear typing indicator after 3 seconds
          setTimeout(() => {
            setTyping(false);
          }, 3000);
        }
      })
      .subscribe();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            chat_id: activeChat.id,
            widget_id: widgetId,
            content: newMessage.trim(),
            sender_type: 'business',
            is_auto_reply: false
          }
        ]);
      
      if (error) throw error;
      
      // Update chat's updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeChat.id);
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden h-[calc(100vh-12rem)]">
      <div className="h-full flex">
        {/* Chat list sidebar */}
        <div className="w-1/3 border-r border-gray-200 h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading && chats.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When visitors start chatting with you, their conversations will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {chats.map((chat) => (
                  <li 
                    key={chat.id}
                    className={`hover:bg-gray-50 cursor-pointer ${activeChat?.id === chat.id ? 'bg-primary-50' : ''}`}
                    onClick={() => setActiveChat(chat)}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-primary-600 truncate">
                          {chat.visitor_name || 'Anonymous Visitor'}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {chat.visitor_email ? 'Identified' : 'Anonymous'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {chat.visitor_page && (
                              <>
                                <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <span className="truncate">{chat.visitor_page}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p>
                            {formatDate(chat.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className="w-2/3 flex flex-col h-full">
          {activeChat ? (
            <>
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      {activeChat.visitor_name || 'Anonymous Visitor'}
                    </h2>
                    {activeChat.visitor_email && (
                      <p className="text-sm text-gray-500">{activeChat.visitor_email}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Started {formatDate(activeChat.created_at)}
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`flex ${message.sender_type === 'business' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_type === 'business' 
                              ? 'bg-primary-600 text-white' 
                              : 'bg-gray-100 text-gray-800'
                          } ${message.is_auto_reply ? 'border border-yellow-300' : ''}`}
                        >
                          <div className="text-sm">
                            {message.content}
                          </div>
                          <div 
                            className={`text-xs mt-1 ${
                              message.sender_type === 'business' ? 'text-primary-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTimestamp(message.created_at)}
                            {message.is_auto_reply && (
                              <span className="ml-2 text-yellow-500">(Auto-reply)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {typing && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-2 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Message input */}
              <div className="px-4 py-4 border-t border-gray-200">
                <div className="flex">
                  <textarea
                    rows={1}
                    name="message"
                    id="message"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button
                    type="button"
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={handleSendMessage}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No conversation selected</h3>
              <p className="mt-1 text-gray-500">
                Select a conversation from the sidebar to view messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatTab;