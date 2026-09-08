"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RegistrationPage() {
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    mobile: '',
    email: '',
  });

  const [errors, setErrors] = useState({
    name: false,
    college: false,
    mobile: false,
    email: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setServerError(''); // clear server error on typing
    
    if (id === 'mobileInput') {
      // Allow only numbers
      setFormData({ ...formData, mobile: value.replace(/[^0-9]/g, '') });
    } else {
      setFormData({ ...formData, [id.replace('Input', '')]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let isValid = true;
    const newErrors = { ...errors };

    // Validate Name
    if (formData.name.trim().length < 3) {
      newErrors.name = true;
      isValid = false;
    } else {
      newErrors.name = false;
    }

    // Validate College
    if (formData.college.trim().length < 2) {
      newErrors.college = true;
      isValid = false;
    } else {
      newErrors.college = false;
    }

    // Validate Mobile
    if (!validatePhone(formData.mobile.trim())) {
      newErrors.mobile = true;
      isValid = false;
    } else {
      newErrors.mobile = false;
    }

    // Validate Email
    if (!validateEmail(formData.email.trim())) {
      newErrors.email = true;
      isValid = false;
    } else {
      newErrors.email = false;
    }

    setErrors(newErrors);

    if (isValid) {
      setIsSubmitting(true);
      setServerError('');
      
      try {
        const { error } = await supabase.from('users').insert([
          {
            name: formData.name.trim(),
            college: formData.college.trim(),
            mobile: formData.mobile.trim(),
            email: formData.email.trim(),
            status: 'UNASSIGNED'
          }
        ]);

        if (error) {
          if (error.code === '23505') { // Unique violation
            setServerError("Mobile number or Email is already registered!");
          } else {
            setServerError("An error occurred during registration. Please try again.");
          }
          setIsSubmitting(false);
          return;
        }

        setIsSuccess(true);
      } catch (err) {
        setServerError("A network error occurred. Please try again.");
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="register-container">
      {!isSuccess ? (
        <div id="formSection" style={{ width: '100%' }}>
          <div className="logo-wrapper">
            <div className="brand-logo">
              <img src="/shaurya-logo.png" alt="Shaurya Logo" />
            </div>
          </div>
          <h1 className="brand-title">SHAURYA 2026<br />REGISTRATION</h1>

          <form id="regForm" noValidate onSubmit={handleSubmit}>
            
            {/* Name */}
            <div className={`form-group ${errors.name ? 'error' : ''}`} id="nameGroup">
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input 
                  type="text" 
                  className="form-input" 
                  id="nameInput" 
                  placeholder="Full Name" 
                  value={formData.name}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div className="error-text">Please enter a valid name</div>
            </div>

            {/* College */}
            <div className={`form-group ${errors.college ? 'error' : ''}`} id="collegeGroup">
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <input 
                  type="text" 
                  className="form-input" 
                  id="collegeInput" 
                  placeholder="College Name" 
                  value={formData.college}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div className="error-text">Please enter your college name</div>
            </div>

            {/* Mobile */}
            <div className={`form-group ${errors.mobile ? 'error' : ''}`} id="mobileGroup">
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
                <span className="phone-prefix">+91 |</span>
                <input 
                  type="tel" 
                  className="form-input phone-input" 
                  id="mobileInput" 
                  placeholder="98765 43210" 
                  maxLength={10} 
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div className="error-text">Please enter a valid 10-digit number</div>
            </div>

            {/* Email */}
            <div className={`form-group ${errors.email ? 'error' : ''}`} id="emailGroup">
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input 
                  type="email" 
                  className="form-input" 
                  id="emailInput" 
                  placeholder="Email Address" 
                  value={formData.email}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div className="error-text">Please enter a valid email</div>
            </div>

            {serverError && (
              <div style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginBottom: '16px', fontWeight: 600 }}>
                {serverError}
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Register Now'}
            </button>
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
      ) : (
        <div id="successSection" className="success-container">
          <div className="success-circle">
            <svg className="tick-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className="success-title">Registration Successful!</h2>
          <p className="success-msg">
            Thanks for registering. Please visit the Shaurya counter with your College ID to collect your QR pass.
          </p>
        </div>
      )}
    </div>
  );
}
