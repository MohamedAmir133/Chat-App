'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  LogOut,
  Save,
  Phone,
  MapPin,
  FileText,
  Loader2,
  Camera,
  User as UserIcon,
  Lock,
  Trash2,
  KeyRound,
  Building,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { apiRequest } from '@/lib/api';
import { CountryCombobox } from '@/components/common/CountryCombobox';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Cloudinary config — uses a free unsigned upload preset
const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'chat-app-avatars');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!response.ok) {
    throw new Error('Image upload failed');
  }

  const data = await response.json();
  return data.secure_url.replace('/upload/', '/upload/w_200,h_200,c_fill,g_face/');
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, signOut, updateProfile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit states
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Change Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setPhoneNumber(user.phone_number || '');
      setCountry(user.country || '');
      setState(user.state || '');
      setPreviewUrl(null);
      setIsChangingPassword(false);
      setPwdError(null);
      setPwdSuccess(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const avatarSrc =
    previewUrl ||
    user.profile_picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF5A36&color=fff&size=150`;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setPhotoError('');
    setUploadingPhoto(true);

    try {
      const cloudUrl = await uploadToCloudinary(file);
      await updateProfile({ profile_picture: cloudUrl });
      setPreviewUrl(cloudUrl);
    } catch (err: any) {
      setPhotoError('Upload failed. Please try again.');
      setPreviewUrl(null);
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        phone_number: phoneNumber.trim(),
        country,
        state: state.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword, confirmNewPassword }),
      });
      setPwdSuccess('Password updated successfully!');
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setIsChangingPassword(false), 1200);
    } catch (err: any) {
      setPwdError(err?.message || 'Failed to update password');
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: 'Delete Account',
      message:
        'Are you sure you want to permanently delete your account? All your messages, contacts, and data will be lost permanently. This action cannot be undone.',
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await apiRequest('/user/me', { method: 'DELETE' });
      toast.success('Account successfully deleted');
      await signOut();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const confirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your account?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!confirmed) return;

    await signOut();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={styles.modalCard}
      >
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>My Profile</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close modal">
            <X size={20} color="#737D8C" />
          </button>
        </div>

        {/* Avatar Section with upload */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarWrap}>
            <img src={avatarSrc} alt={user.name} style={styles.avatarImg} />

            {/* Online indicator */}
            <span style={styles.onlineDot} />

            {/* Camera overlay button */}
            <button
              style={{
                ...styles.cameraOverlay,
                opacity: uploadingPhoto ? 0.7 : 1,
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Change profile photo"
              aria-label="Upload profile photo"
            >
              {uploadingPhoto ? (
                <Loader2 size={16} color="#FFFFFF" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Camera size={16} color="#FFFFFF" />
              )}
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />
          </div>

          <h4 style={styles.userName}>{user.name}</h4>
          <p style={styles.userEmail}>{user.email}</p>
          {user.role && <span style={styles.roleBadge}>{user.role}</span>}

          {/* Upload error / hint */}
          {photoError ? (
            <p style={styles.photoError}>{photoError}</p>
          ) : (
            <p style={styles.photoHint}>Tap the camera icon to update your photo</p>
          )}
        </div>

        {/* Form or Info Display */}
        {isChangingPassword ? (
          <form onSubmit={handleChangePassword} style={styles.editForm}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: '#1C2024' }}>
              Change Password
            </h4>

            {pwdSuccess && (
              <p style={{ fontSize: '12.5px', color: '#16A34A', backgroundColor: '#F0FDF4', padding: '8px 12px', borderRadius: '10px', margin: 0 }}>
                {pwdSuccess}
              </p>
            )}

            {pwdError && (
              <p style={{ fontSize: '12.5px', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '10px', margin: 0 }}>
                {pwdError}
              </p>
            )}

            <div style={styles.inputGroup}>
              <Lock size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="password"
                placeholder="Current Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <KeyRound size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <KeyRound size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPwdError(null);
                  setPwdSuccess(null);
                }}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} style={styles.saveBtn}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={16} />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        ) : isEditing ? (
          <form onSubmit={handleSave} style={styles.editForm}>
            {/* Full Name */}
            <div>
              <label style={styles.fieldLabel}>Display Name</label>
              <div style={styles.inputGroup}>
                <UserIcon size={18} color="#8A94A6" style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            {/* Country Combobox */}
            <div>
              <label style={styles.fieldLabel}>Country</label>
              <CountryCombobox
                value={country}
                onChange={(val) => setCountry(val)}
                placeholder="Select your country..."
              />
            </div>

            {/* City / State */}
            <div>
              <label style={styles.fieldLabel}>City / State (Optional)</label>
              <div style={styles.inputGroup}>
                <Building size={18} color="#8A94A6" style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="e.g. California / Cairo"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label style={styles.fieldLabel}>Phone Number (Optional)</label>
              <div style={styles.inputGroup}>
                <Phone size={18} color="#8A94A6" style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Bio / Headline */}
            <div>
              <label style={styles.fieldLabel}>Bio / Headline</label>
              <div style={styles.inputGroup}>
                <FileText size={18} color="#8A94A6" style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="Short bio or status"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} style={styles.saveBtn}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.detailsList}>
            <div style={styles.detailRow}>
              <UserIcon size={17} color="#8A94A6" />
              <div style={styles.detailText}>
                <span style={styles.detailLabel}>Full Name</span>
                <p style={styles.detailVal}>{user.name || 'Not set'}</p>
              </div>
            </div>

            <div style={styles.detailRow}>
              <MapPin size={17} color="#8A94A6" />
              <div style={styles.detailText}>
                <span style={styles.detailLabel}>Country & Location</span>
                <p style={styles.detailVal}>
                  {user.country ? `${user.state ? `${user.state}, ` : ''}${user.country}` : 'Not set'}
                </p>
              </div>
            </div>

            <div style={styles.detailRow}>
              <FileText size={17} color="#8A94A6" />
              <div style={styles.detailText}>
                <span style={styles.detailLabel}>Bio</span>
                <p style={styles.detailVal}>{user.bio || 'No bio provided'}</p>
              </div>
            </div>

            <div style={styles.detailRow}>
              <Phone size={17} color="#8A94A6" />
              <div style={styles.detailText}>
                <span style={styles.detailLabel}>Phone</span>
                <p style={styles.detailVal}>{user.phone_number || 'Not added'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div style={styles.actionsFooter}>
                <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
                  Edit Profile
                </button>
                <button
                  onClick={() => setIsChangingPassword(true)}
                  style={{ ...styles.editBtn, backgroundColor: '#FFF0EB', color: '#FF5A36' }}
                >
                  Change Password
                </button>
              </div>

              <div style={styles.actionsFooter}>
                <button onClick={handleSignOut} style={styles.signOutBtn}>
                  <LogOut size={16} color="#EF4444" />
                  <span>Sign Out</span>
                </button>
                <button onClick={handleDeleteAccount} style={{ ...styles.signOutBtn, backgroundColor: '#FFF1F2' }}>
                  <Trash2 size={16} color="#E11D48" />
                  <span style={{ color: '#E11D48' }}>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalCard: {
    maxWidth: '460px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1C2024',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
    cursor: 'pointer',
    border: 'none',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: '20px',
    borderBottom: '1px solid #F0F2F5',
    marginBottom: '18px',
  },
  avatarWrap: {
    position: 'relative',
    width: '80px',
    height: '80px',
    marginBottom: '12px',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #FFF0EB',
  },
  onlineDot: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: '#22C55E',
    border: '2px solid #FFFFFF',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: '-4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: '#FF5A36',
    border: '2px solid #FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(255, 90, 54, 0.35)',
    transition: 'transform 0.15s, opacity 0.15s',
    zIndex: 1,
  },
  userName: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#1C2024',
    marginBottom: '2px',
  },
  userEmail: {
    fontSize: '13px',
    color: '#8A94A6',
    marginBottom: '8px',
  },
  roleBadge: {
    padding: '3px 10px',
    backgroundColor: '#FFF0EB',
    color: '#FF5A36',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: '9999px',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  photoHint: {
    fontSize: '11.5px',
    color: '#B0B8C4',
    marginTop: '6px',
  },
  photoError: {
    fontSize: '12px',
    color: '#EF4444',
    marginTop: '6px',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '10px 14px',
    backgroundColor: '#F8F9FB',
    borderRadius: '12px',
  },
  detailText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9BA3AF',
    textTransform: 'uppercase',
  },
  detailVal: {
    fontSize: '13.5px',
    color: '#1C2024',
    fontWeight: 500,
  },
  actionsFooter: {
    display: 'flex',
    gap: '12px',
    marginTop: '6px',
  },
  editBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#F4F5F8',
    color: '#1C2024',
    fontWeight: 600,
    fontSize: '14px',
    textAlign: 'center',
    cursor: 'pointer',
    border: 'none',
  },
  signOutBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 18px',
    borderRadius: '12px',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '6px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    borderRadius: '12px',
    padding: '0 14px',
    border: '1.5px solid transparent',
    transition: 'border-color 0.15s ease',
  },
  inputIcon: {
    marginRight: '10px',
  },
  input: {
    flex: 1,
    padding: '12px 0',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#1C2024',
    border: 'none',
    outline: 'none',
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#F4F5F8',
    color: '#737D8C',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF7244 0%, #FF4D29 100%)',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(255, 90, 54, 0.25)',
    cursor: 'pointer',
    border: 'none',
  },
};
