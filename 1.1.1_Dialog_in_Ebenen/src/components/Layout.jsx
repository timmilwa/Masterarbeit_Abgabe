import React from 'react';

const Layout = ({ children, sidebar }) => {
    return (
        <div style={layoutStyle}>
            <div style={{ ...containerStyle, maxWidth: sidebar ? '1100px' : '800px' }}>
                <div style={mainContentStyle}>
                    {children}
                </div>
                {sidebar && sidebar}
            </div>
        </div>
    );
};

const layoutStyle = {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-secondary)',
    display: 'flex',
    justifyContent: 'center'
};

const containerStyle = {
    width: '100%',
    backgroundColor: 'var(--color-bg-primary)',
    boxShadow: '0 0 20px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'row', // changed to row to put sidebar next to content
    height: '100vh', // Full viewport height
    position: 'relative',
    overflow: 'hidden' // Ensure no double scrollbars
};

const mainContentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative'
};

export default Layout;
