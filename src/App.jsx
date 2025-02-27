import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import WidgetSettings from './pages/dashboard/WidgetSettings';
import AutoReply from './pages/dashboard/AutoReply';
import Analytics from './pages/dashboard/Analytics';
import ChatTab from './pages/dashboard/ChatTab';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard/widget-settings" replace />} />
          <Route path="widget-settings" element={<WidgetSettings />} />
          <Route path="auto-reply" element={<AutoReply />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="chat" element={<ChatTab />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;