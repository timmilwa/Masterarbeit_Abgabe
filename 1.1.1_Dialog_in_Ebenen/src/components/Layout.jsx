import React from 'react';

const Layout = ({ children }) => {
    return (
        <div style={layoutStyle}>
            <div style={containerStyle}>
                {children}
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
    maxWidth: '800px', // Restrain width for better reading experience
    backgroundColor: 'var(--color-bg-primary)',
    boxShadow: '0 0 20px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh', // Full viewport height
    position: 'relative'
};

export default Layout;
