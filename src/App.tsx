import { Suspense, Component, type ReactNode } from "react";
import { GuardProvider } from "./context";
import { MainLayout } from "./components/MainLayout";
import { HashRouter, Routes, Route } from "react-router-dom";

// Simple Error Boundary
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', backgroundColor: '#0f111a', height: '100vh' }}>
          <h2>Algo salió mal al cargar la aplicación.</h2>
          <pre style={{ color: 'red' }}>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fallback loader
const AppLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', backgroundColor: '#0f111a' }}>
    <h2>Cargando aplicación...</h2>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoader />}>
        <HashRouter>
          <GuardProvider>
            <Routes>
              <Route path="/*" element={<MainLayout />} />
            </Routes>
          </GuardProvider>
        </HashRouter>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
