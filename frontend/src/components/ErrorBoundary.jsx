import React from 'react';

/**
 * Barrera de errores de React.
 *
 * Sin ella, cualquier excepción durante el renderizado (por ejemplo el
 * `user.rol.toUpperCase()` sobre un rol nulo que había en la lista de usuarios)
 * desmontaba todo el árbol y el usuario se quedaba mirando una página en blanco
 * sin ningún mensaje.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Error no controlado en la interfaz:', error, info);
    }

    render() {
        const { error } = this.state;
        const { children } = this.props;

        if (!error) return children;

        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2 style={{ marginBottom: '0.5rem' }}>Algo salió mal</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--paso-3)' }}>
                        Ocurrió un error inesperado en la aplicación. Puedes recargar la página
                        para continuar.
                    </p>
                    <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
                        Recargar
                    </button>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
