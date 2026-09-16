'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onClose();
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter them.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await signUp({
          signUpDTO: {
            name,
            email,
            password,
            confirmPassword,
          },
          userProfileDto: {
            bio,
            phone_number: phoneNumber,
            profile_picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`,
          },
        });
        onClose();
      } else if (mode === 'forgot') {
        const res = await apiRequest('/auth/forget-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setOtp('');
        setSuccessMsg(res.message || '✅ OTP sent! Check your inbox (or Spam folder) and enter the code below.');
        setMode('reset');
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter them.');
        }
        if (!otp.trim()) {
          throw new Error('Please enter the OTP code from your email.');
        }
        await apiRequest(`/auth/reset-password/${otp.trim()}`, {
          method: 'POST',
          body: JSON.stringify({ password, confirmPassword }),
        });
        setSuccessMsg('✅ Password reset successfully! Please sign in with your new password.');
        setMode('signin');
      }
    } catch (err: any) {
      const raw: string = err?.message || '';
      // Map backend messages to friendly copy
      let friendly = raw;
      if (/invalid credential|invalid email|wrong password|unauthorized/i.test(raw)) {
        friendly = 'Wrong email or password. Please double-check and try again.';
      } else if (/user not found|no account|does not exist/i.test(raw)) {
        friendly = 'No account found with this email. Did you mean to sign up?';
      } else if (/email.*already.*exist|already registered|duplicate/i.test(raw)) {
        friendly = 'An account with this email already exists. Try signing in instead.';
      } else if (/network|fetch|econnrefused|failed to fetch/i.test(raw)) {
        friendly = 'Cannot reach the server. Check your internet connection and try again.';
      } else if (/otp.*invalid|invalid.*otp|expired/i.test(raw)) {
        friendly = 'The OTP code is invalid or has expired. Request a new one.';
      } else if (!raw) {
        friendly = 'Something went wrong. Please try again.';
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={styles.modalCard}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <span>S</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} color="#737D8C" />
          </button>
        </div>

        {/* Tab switch (Sign In / Create Account) */}
        {(mode === 'signin' || mode === 'signup') && (
          <div style={styles.tabSwitch}>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              style={{
                ...styles.tabSwitchBtn,
                backgroundColor: mode === 'signin' ? '#FFFFFF' : 'transparent',
                color: mode === 'signin' ? '#1C2024' : '#737D8C',
                boxShadow: mode === 'signin' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              style={{
                ...styles.tabSwitchBtn,
                backgroundColor: mode === 'signup' ? '#FFFFFF' : 'transparent',
                color: mode === 'signup' ? '#1C2024' : '#737D8C',
                boxShadow: mode === 'signup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0', color: '#1C2024' }}>
              Forgot Password
            </h3>
            <p style={{ fontSize: '13px', color: '#737D8C', margin: 0 }}>
              Enter your account email to receive an OTP verification code.
            </p>
          </div>
        )}

        {mode === 'reset' && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0', color: '#1C2024' }}>
              Reset Password
            </h3>
            <p style={{ fontSize: '13px', color: '#737D8C', margin: 0 }}>
              Enter the OTP sent to your email and your new password.
            </p>
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div style={styles.successNotice}>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div style={styles.errorNotice}>
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <div style={styles.inputGroup}>
              <User size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          {(mode === 'signin' || mode === 'signup' || mode === 'forgot') && (
            <div style={styles.inputGroup}>
              <Mail size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          {mode === 'reset' && (
            <div style={styles.inputGroup}>
              <FileText size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Enter 6-digit OTP Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
            <div style={styles.inputGroup}>
              <Lock size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="password"
                placeholder={mode === 'reset' ? 'New Password' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          {(mode === 'signup' || mode === 'reset') && (
            <div style={styles.inputGroup}>
              <Lock size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="password"
                placeholder={mode === 'reset' ? 'Confirm New Password' : 'Confirm Password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div style={styles.inputGroup}>
                <Phone size={18} color="#8A94A6" style={styles.inputIcon} />
                <input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <FileText size={18} color="#8A94A6" style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="Bio / Headline (optional)"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={styles.input}
                />
              </div>
            </>
          )}

          {mode === 'signin' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF5A36',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '-4px' }}>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#737D8C',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ← Back to Sign In
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? (
              <Loader2 size={18} color="#FFFFFF" className="animate-spin" />
            ) : mode === 'signin' ? (
              'Sign In to Sunday'
            ) : mode === 'signup' ? (
              'Create Free Account'
            ) : mode === 'forgot' ? (
              'Send OTP Reset Code'
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalCard: {
    maxWidth: '440px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  logoBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#FFF0EB',
    color: '#FF5A36',
    fontWeight: 800,
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
  },
  tabSwitch: {
    display: 'flex',
    backgroundColor: '#F4F5F8',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '20px',
  },
  tabSwitchBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  successNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
    borderRadius: '12px',
    fontSize: '13px',
    marginBottom: '16px',
    border: '1px solid #BBF7D0',
  },
  errorNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    borderRadius: '12px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    borderRadius: '14px',
    padding: '0 16px',
    transition: 'box-shadow 0.2s',
  },
  inputIcon: {
    marginRight: '12px',
  },
  input: {
    flex: 1,
    padding: '14px 0',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#1C2024',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '14px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #FF7244 0%, #FF4D29 100%)',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '14.5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(255, 90, 54, 0.3)',
  },
};
