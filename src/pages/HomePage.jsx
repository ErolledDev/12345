import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <svg className="h-8 w-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path>
          </svg>
          <span className="ml-2 text-xl font-bold text-gray-800">BusinessChat</span>
        </div>
        <nav>
          {user ? (
            <Link to="/dashboard" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Dashboard
            </Link>
          ) : (
            <div className="space-x-4">
              <Link to="/login" className="text-primary-600 hover:text-primary-800 transition-colors">
                Login
              </Link>
              <Link to="/signup" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Easy Website Chat Widget
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Add a powerful chat widget to your website in minutes. Engage with your visitors, provide instant support, and boost conversions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup" className="bg-primary-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors">
              Start Free Trial
            </Link>
            <a href="#demo" className="bg-white text-primary-600 border border-primary-600 px-6 py-3 rounded-lg text-lg font-medium hover:bg-primary-50 transition-colors">
              Request Demo
            </a>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Installation</h3>
              <p className="text-gray-600">Add our chat widget to your website with a single line of code. No technical expertise required.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Auto Replies</h3>
              <p className="text-gray-600">Set up automatic responses to common questions. Keep your customers engaged even when you're away.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600">Track conversations, measure engagement, and gain insights to improve your customer support.</p>
            </div>
          </div>
        </div>

        <div className="mt-20" id="pricing">
          <h2 className="text-2xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-center mb-4">Pro Plan</h3>
              <p className="text-4xl font-bold text-center mb-6">$19<span className="text-lg text-gray-500">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited chats
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Auto-replies
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Analytics dashboard
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Widget customization
                </li>
              </ul>
              <Link to="/signup" className="block w-full bg-primary-600 text-white text-center px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <svg className="h-8 w-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path>
              </svg>
              <span className="ml-2 text-xl font-bold text-gray-800">BusinessChat</span>
            </div>
            <div className="text-gray-500 text-sm">
              © 2025 BusinessChat. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;