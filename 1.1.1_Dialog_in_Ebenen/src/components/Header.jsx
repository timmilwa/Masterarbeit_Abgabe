import React from 'react';
import { Settings } from 'lucide-react';

const Header = ({ onOpenSettings }) => {
    return (
        <header style={headerContainerStyle}>
            <h1 style={titleStyle}>Reflektiver Dialog Prototyp</h1>
            <button onClick={onOpenSettings} style={iconButtonStyle} aria-label="Einstellungen">
                <Settings size={24} color="var(--color-text-primary)" />
            </button>
        </header>
    );
};

const headerContainerStyle = {
    height: '60px',
    padding: '0 var(--spacing-lg)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-primary)',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 100
};

const titleStyle = {
    fontSize: '18px',
    fontWeight: 'var(--font-weight-semibold)',
    margin: 0,
    color: 'var(--color-text-primary)'
};

const iconButtonStyle = {
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    cursor: 'pointer'
};

export default Header;
