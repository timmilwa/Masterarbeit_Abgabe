import React from 'react';

const Sidebar = ({ summaries }) => {
    return (
        <div style={sidebarStyle}>
            <div style={headerStyle}>
                <h3>Erkannte Ebenen</h3>
            </div>

            <div style={sectionStyle}>
                <label style={labelStyle}>Funktion</label>
                <div style={contentBoxStyle}>
                    {summaries.function ? (
                        <ul style={listStyle}>
                            {summaries.function.split('\n').map((item, i) => (
                                <li key={i}>{item.replace(/^- /, '')}</li>
                            ))}
                        </ul>
                    ) : (
                        <span style={placeholderStyle}>Noch keine Inhalte...</span>
                    )}
                </div>
            </div>

            <div style={sectionStyle}>
                <label style={labelStyle}>Emotion</label>
                <div style={contentBoxStyle}>
                    {summaries.emotion ? (
                        <ul style={listStyle}>
                            {summaries.emotion.split('\n').map((item, i) => (
                                <li key={i}>{item.replace(/^- /, '')}</li>
                            ))}
                        </ul>
                    ) : (
                        <span style={placeholderStyle}>Noch keine Inhalte...</span>
                    )}
                </div>
            </div>

            <div style={sectionStyle}>
                <label style={labelStyle}>Werte</label>
                <div style={contentBoxStyle}>
                    {summaries.values ? (
                        <ul style={listStyle}>
                            {summaries.values.split('\n').map((item, i) => (
                                <li key={i}>{item.replace(/^- /, '')}</li>
                            ))}
                        </ul>
                    ) : (
                        <span style={placeholderStyle}>Noch keine Inhalte...</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const sidebarStyle = {
    width: '250px',
    backgroundColor: 'var(--color-bg-secondary)',
    borderLeft: '1px solid var(--color-border)',
    padding: 'var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
    height: '100%',
    overflowY: 'auto'
};

const headerStyle = {
    marginBottom: 'var(--spacing-md)',
    color: 'var(--color-text-primary)'
};

const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const labelStyle = {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const contentBoxStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    padding: '12px',
    borderRadius: '8px',
    minHeight: '80px',
    fontSize: '0.9rem',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)'
};

const listStyle = {
    paddingLeft: '20px',
    margin: 0
};

const placeholderStyle = {
    color: 'var(--color-text-secondary)',
    fontStyle: 'italic',
    opacity: 0.7
};

export default Sidebar;
