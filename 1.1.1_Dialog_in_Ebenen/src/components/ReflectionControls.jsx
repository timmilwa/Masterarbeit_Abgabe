import React from 'react';

const ReflectionControls = ({ currentLevel, onSelectLevel, disabled }) => {
    const levels = ['Funktion', 'Emotion', 'Werte'];

    return (
        <div style={containerStyle}>
            <span style={labelStyle}>Wähle eine Ebene:</span>
            <div style={buttonGroupStyle}>
                {levels.map((level) => (
                    <button
                        key={level}
                        onClick={() => onSelectLevel(level)}
                        disabled={disabled}
                        style={{
                            ...buttonStyle,
                            ...(currentLevel === level ? activeButtonStyle : {}),
                            opacity: disabled ? 0.5 : 1,
                            cursor: disabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {level}
                    </button>
                ))}
            </div>
        </div>
    );
};

const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--color-bg-primary)',
    borderBottom: '1px solid var(--color-border)',
    gap: 'var(--spacing-sm)'
};

const labelStyle = {
    fontSize: 'var(--font-size-small)',
    color: 'var(--color-text-secondary)',
    fontWeight: '600'
};

const buttonGroupStyle = {
    display: 'flex',
    gap: 'var(--spacing-sm)'
};

const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-small)',
    fontWeight: '500',
    transition: 'all 0.2s ease',
};

const activeButtonStyle = {
    backgroundColor: 'var(--color-accent)',
    color: '#FFFFFF',
    borderColor: 'var(--color-accent)'
};

export default ReflectionControls;
