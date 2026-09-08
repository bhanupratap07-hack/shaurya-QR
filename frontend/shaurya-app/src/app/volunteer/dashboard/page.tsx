"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/lib/supabase';

// Helper to get a cookie value by name
function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

export default function VolunteerDashboard() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userResult, setUserResult] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  
  const [isAssigning, setIsAssigning] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);
  const [assignError, setAssignError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setUserResult(null);
    setAssignmentSuccess(false);
    setSearchError('');
    setAssignError('');
    
    try {
      const q = searchQuery.trim();
      const { data, error } = await supabase
        .from('users')
        .select('*, qr_codes(unique_token)')
        .or(`mobile.eq.${q},email.eq.${q},name.ilike.%${q}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSearchError('No participant found with that detail.');
      } else {
        const assignedQr = data.qr_codes && data.qr_codes.length > 0 ? data.qr_codes[0].unique_token : null;
        setUserResult({
          ...data,
          qr_id: assignedQr
        });
      }
    } catch (err) {
      console.error(err);
      setSearchError('Error searching database.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssignQR = () => {
    setIsAssigning(true);
    setAssignError('');
  };

  const handleConfirmAssignment = async () => {
    const token = qrToken.trim().toUpperCase();
    if (token.length < 8) {
      setAssignError("Invalid QR Token Format");
      return;
    }
    
    setAssignError('');
    
    try {
      // 1. Check if QR exists and is available
      const { data: qrData, error: qrFetchErr } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('unique_token', token)
        .single();
        
      if (qrFetchErr || !qrData) {
        setAssignError("Invalid QR Code (Not found in database).");
        return;
      }
      
      if (qrData.status !== 'AVAILABLE') {
        setAssignError(`This QR code is already ${qrData.status}!`);
        return;
      }

      // 2. Assign to user atomically - ensure user is still UNASSIGNED
      const { data: userUpdateData, error: userUpdateErr } = await supabase
        .from('users')
        .update({ status: 'ASSIGNED' })
        .eq('id', userResult.id)
        .eq('status', 'UNASSIGNED')
        .select();
        
      if (userUpdateErr) throw userUpdateErr;
      
      if (!userUpdateData || userUpdateData.length === 0) {
        setAssignError("Error: This participant was just assigned a QR by another volunteer!");
        return;
      }

      // 3. Mark QR as ASSIGNED atomically - ensure it's still AVAILABLE
      const { data: qrUpdateData, error: qrUpdateErr } = await supabase
        .from('qr_codes')
      
      
        .update({ status: 'ASSIGNED', assigned_user_id: userResult.id })
        .eq('unique_token', token)
        .eq('status', 'AVAILABLE')
        .select();

      if (qrUpdateErr) throw qrUpdateErr;
      
      if (!qrUpdateData || qrUpdateData.length === 0) {
        // Rollback user status if QR was snatched by someone else at the exact millisecond
        await supabase.from('users').update({ status: 'UNASSIGNED' }).eq('id', userResult.id);
        setAssignError("Error: This QR code was just scanned by another volunteer! Try a different one.");
        return;
      }

      // 4. Log the assignment for audit trail
      const volName = getCookie('vol_name') || 'Unknown';
      const { error: logErr } = await supabase.from('activity_logs').insert([{
        action: 'QR_ASSIGNED',
        volunteer_name: volName,
        user_name: userResult.name,
        user_id: userResult.id,
        qr_token: token,
        details: `${volName} assigned ${token} to ${userResult.name}`
      }]);
      if (logErr) {
        console.error("Activity log error:", logErr);
      }

      setUserResult({ ...userResult, status: 'ASSIGNED', qr_id: token });
      setAssignmentSuccess(true);
      setIsAssigning(false);
      setQrToken('');
    } catch (err) {
      console.error(err);
      setAssignError("Failed to assign QR code. Try again.");
    }
  };

  const handleLogout = () => {
    document.cookie = "vol_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "vol_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "vol_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/volunteer/login');
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', padding: '24px', background: '#fafafa', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(249,115,22,0.1)' }}>
            <img src="/shaurya-logo.png" alt="Logo" style={{ width: '24px' }} />
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, margin: 0, color: '#1f2937', fontSize: '18px' }}>VOLUNTEER DASHBOARD</h2>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #e5e7eb', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
          Logout
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Search Box */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '16px', fontWeight: 600 }}>Search Participant</h3>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Enter Mobile or Email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #f3f4f6', background: '#fcfcfc', fontSize: '14px', outline: 'none' }}
              required
            />
            <button 
              type="submit" 
              style={{ background: 'linear-gradient(to right, #f97316, #d946ef)', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {searchError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
            {searchError}
          </div>
        )}

        {/* Search Result Card */}
        {userResult && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', animation: 'fadeIn 0.3s ease' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#1f2937', fontSize: '20px', fontWeight: 700 }}>{userResult.name}</h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{userResult.college}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                  display: 'inline-block',
                  background: userResult.status === 'ASSIGNED' ? '#dcfce7' : '#fef9c3', 
                  color: userResult.status === 'ASSIGNED' ? '#166534' : '#854d0e',
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 
                }}>
                  {userResult.status}
                </span>
                {userResult.status === 'ASSIGNED' && userResult.qr_id && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280', fontWeight: 600, background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                    ID: {userResult.qr_id}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                +91 {userResult.mobile}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                {userResult.email}
              </div>
            </div>

            {/* Assignment Flow */}
            {userResult.status === 'UNASSIGNED' && !isAssigning && !assignmentSuccess && (
              <button 
                onClick={handleAssignQR}
                style={{ width: '100%', padding: '14px', background: '#1f2937', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}
              >
                Approve & Scan QR Pass
              </button>
            )}

            {isAssigning && (
              <div style={{ background: '#fafafa', padding: '16px', borderRadius: '12px', border: '1px dashed #d1d5db', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* QR Scanner View */}
                {!qrToken && (
                  <div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1f2937', fontWeight: 600, textAlign: 'center' }}>Hold QR Code in front of Camera</p>
                    <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', overflow: 'hidden', borderRadius: '12px', border: '2px solid #f97316' }}>
                      <Scanner 
                        onScan={(result) => {
                          if (result && result.length > 0) {
                            const decodedText = result[0].rawValue;
                            let token = decodedText;
                            if (decodedText.includes('/ticket/')) {
                              token = decodedText.split('/ticket/')[1];
                            }
                            if (token && token.startsWith('SH26-')) {
                              setQrToken(token);
                            }
                          }
                        }}
                        components={{
                          audio: true,
                          onOff: false,
                          torch: true,
                          zoom: false,
                          finder: true,
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }}></div>

                {/* Manual Entry Fallback / Success Scanned Token */}
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                    {qrToken ? "Scanned Successfully! Verify Token:" : "Or enter token manually (SH26-XXX):"}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="SH26-XXXXXXXX"
                      value={qrToken}
                      onChange={(e) => setQrToken(e.target.value.toUpperCase())}
                      style={{ flex: 1, padding: '12px 14px', borderRadius: '8px', border: '1px solid #d1d5db', textTransform: 'uppercase', fontSize: '15px', fontWeight: 600, outline: 'none' }}
                      autoFocus={!!qrToken}
                    />
                    <button 
                      onClick={() => { setQrToken(''); setAssignError(''); }}
                      style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
                    >
                      Rescan
                    </button>
                    <button 
                      onClick={handleConfirmAssignment}
                      style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Confirm
                    </button>
                  </div>
                  
                  {assignError && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', fontWeight: 600 }}>
                      {assignError}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setIsAssigning(false)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {assignmentSuccess && (
              <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: '#065f46' }}>
                <div style={{ background: '#34d399', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>QR Successfully Assigned!</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', opacity: 0.8 }}>Token: {userResult.qr_id}</p>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
