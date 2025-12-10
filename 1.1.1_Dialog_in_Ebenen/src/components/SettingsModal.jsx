import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey, customInstructions, setCustomInstructions }) => {
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localInstructions, setLocalInstructions] = useState(customInstructions);

  useEffect(() => {
    setLocalApiKey(apiKey);
    setLocalInstructions(customInstructions);
  }, [apiKey, customInstructions, isOpen]);

  const handleSave = () => {
    setApiKey(localApiKey);
    setCustomInstructions(localInstructions);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{margin: 0, fontSize: 'var(--font-size-subheading)'}}>Einstellungen</h2>
          <button onClick={onClose} style={{color: 'var(--color-text-secondary)'}}><X size={24} /></button>
        </div>
        
        <div style={bodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Google Gemini API Key</label>
            <input 
              type="password" 
              value={localApiKey} 
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="Füge hier deinen API Key ein"
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Custom Instructions</label>
            <textarea 
              value={localInstructions} 
              onChange={(e) => setLocalInstructions(e.target.value)}
              placeholder="Zusätzliche Anweisungen für die KI..."
              style={{...inputStyle, minHeight: '100px', resize: 'vertical'}}
            />
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={handleSave} style={primaryButtonStyle}>Speichern</button>
        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyle = {
  position: 'fixed',
  top: 0, 
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  width: '100%',
  maxWidth: '500px',
  borderRadius: 'var(--radius-card)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  padding: 'var(--spacing-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-md)'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--color-border)',
  paddingBottom: 'var(--spacing-sm)'
};

const bodyStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-md)'
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const labelStyle = {
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--color-text-primary)'
};

const inputStyle = {
  padding: '12px',
  borderRadius: 'var(--radius-button)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--font-size-body)',
  outline: 'none',
  width: '100%'
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: 'var(--spacing-sm)'
};

const primaryButtonStyle = {
  backgroundColor: 'var(--color-text-primary)',
  color: '#FFFFFF',
  padding: '10px 20px',
  borderRadius: 'var(--radius-button)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)'
};

export default SettingsModal;
