'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, MoreVertical } from 'lucide-react';

interface MessageActionsProps {
  messageId: string;
  isOwnMessage: boolean;
  onEdit: (messageId: string) => void;
  onDelete: (messageId: string) => void;
}

export function MessageActions({ messageId, isOwnMessage, onEdit, onDelete }: MessageActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (!isOwnMessage) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        style={styles.triggerBtn}
        title="Message options"
      >
        <MoreVertical size={14} color="#8A94A6" />
      </button>

      {showMenu && (
        <>
          <div style={styles.backdrop} onClick={() => setShowMenu(false)} />
          <div style={styles.menu}>
            <button
              onClick={() => {
                onEdit(messageId);
                setShowMenu(false);
              }}
              style={styles.menuItem}
            >
              <Edit2 size={14} />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                onDelete(messageId);
                setShowMenu(false);
              }}
              style={{ ...styles.menuItem, color: '#EF4444' }}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  triggerBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    opacity: 0,
    transition: 'opacity 0.15s, background-color 0.15s',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    borderRadius: '10px',
    padding: '6px',
    minWidth: '140px',
    zIndex: 20,
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#1C2024',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
};
