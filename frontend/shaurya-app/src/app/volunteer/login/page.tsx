"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function VolunteerLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .eq('password', password)
        .single();

      if (error || !data) {
        setErrorMsg('Invalid Volunteer ID or Password!');
        setIsSubmitting(false);
        return;
      }

      if (!data.active) {
        setErrorMsg('Your account has been disabled. Contact Admin.');
        setIsSubmitting(false);
        return;
      }

      // Set auth cookies (name + role for middleware & audit logging)
      document.cookie = `vol_auth=authenticated; path=/; max-age=86400; SameSite=Strict`;
      document.cookie = `vol_name=${encodeURIComponent(data.name)}; path=/; max-age=86400; SameSite=Strict`;
      document.cookie = `vol_role=${data.role}; path=/; max-age=86400; SameSite=Strict`;

      // Redirect based on role
      const destination = data.role === 'ADMIN' ? '/admin' : '/volunteer/dashboard';
      setTimeout(() => {
        router.push(destination);
      }, 400);
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <div id="formSection" style={{ width: '100%' }}>
        <div className="logo-wrapper">
          <div className="brand-logo">
            <img src="/shaurya-logo.png" alt="Shaurya Logo" />
          </div>
        </div>
        <h1 className="brand-title">VOLUNTEER LOGIN</h1>

        <form id="loginForm" onSubmit={handleLogin}>
          
          <div className="form-group">
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Volunteer ID (e.g. vol1)" 
                value={username}
                onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }}
                required 
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '8px' }}>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Password" 
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                required 
              />
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: '24px', fontSize: '12px' }}>
            <a href="#" style={{ color: '#1f2937', fontWeight: 600, textDecoration: 'none' }}>Forgot password?</a>
          </div>

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
          
          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '16px', textAlign: 'center', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}
        </form>

        <div className="help-text">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Need help? Contact Admin
        </div>
      </div>
    </div>
  );
}
