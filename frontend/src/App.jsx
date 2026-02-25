import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/ui-amigable.css';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Layouts
import Layout from './components/Layout';
import Login from './pages/Login';
import RestablecerPassword from './pages/RestablecerPassword';
import VerificarEmail from './pages/VerificarEmail';

// Páginas
import Dashboard from './pages/Dashboard';
import Alumnos from './pages/Alumnos';
import Maestros from './pages/Maestros';
import Grupos from './pages/Grupos';
import Horarios from './pages/Horarios';
import IADashboard from './pages/IADashboard';
import Chat from './pages/Chat';

import Periodos from './pages/Periodos';
import Pagos from './pages/Pagos';
import Calificaciones from './pages/Calificaciones';
import Asistencias from './pages/Asistencias';
import Reportes from './pages/Reportes';
import TendenciasAvanzadas from './pages/TendenciasAvanzadas';
import Estadisticas from './pages/Estadisticas';
import MaestroCalificaciones from './pages/MaestroCalificaciones';
import MaestroAsistencias from './pages/MaestroAsistencias';
import Asignaciones from './pages/Asignaciones';
import InscripcionesRapidas from './pages/InscripcionesRapidas';
import AuditLogs from './pages/AuditLogs';
import Security from './pages/Security';

// Componente de ruta protegida
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-tescha-blue"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <SocketProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/restablecer-contrasena/:token" element={<RestablecerPassword />} />
          <Route path="/verificar-email/:token" element={<VerificarEmail />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />

          <Route path="alumnos" element={
            <ProtectedRoute roles={['coordinador', 'administrativo', 'maestro']}>
              <Alumnos />
            </ProtectedRoute>
          } />

          <Route path="maestros" element={
            <ProtectedRoute roles={['coordinador']}>
              <Maestros />
            </ProtectedRoute>
          } />

          <Route path="grupos" element={
            <ProtectedRoute roles={['coordinador', 'maestro']}>
              <Grupos />
            </ProtectedRoute>
          } />

          <Route path="horarios" element={
            <ProtectedRoute roles={['coordinador']}>
              <Horarios />
            </ProtectedRoute>
          } />

          <Route path="ia-dashboard" element={
            <ProtectedRoute roles={['coordinador']}>
              <IADashboard />
            </ProtectedRoute>
          } />

          <Route path="periodos" element={
            <ProtectedRoute roles={['coordinador']}>
              <Periodos />
            </ProtectedRoute>
          } />

          <Route path="pagos" element={
            <ProtectedRoute roles={['coordinador', 'administrativo']}>
              <Pagos />
            </ProtectedRoute>
          } />

          <Route path="calificaciones" element={
            <ProtectedRoute roles={['coordinador', 'maestro']}>
              <Calificaciones />
            </ProtectedRoute>
          } />

          <Route path="asistencias" element={
            <ProtectedRoute roles={['coordinador', 'maestro']}>
              <Asistencias />
            </ProtectedRoute>
          } />

          <Route path="asignaciones" element={
            <ProtectedRoute roles={['coordinador']}>
              <Asignaciones />
            </ProtectedRoute>
          } />

          <Route path="inscripciones" element={
            <ProtectedRoute roles={['coordinador', 'administrativo']}>
              <InscripcionesRapidas />
            </ProtectedRoute>
          } />

          <Route path="auditoria" element={
            <ProtectedRoute roles={['coordinador']}>
              <AuditLogs />
            </ProtectedRoute>
          } />

          <Route path="seguridad" element={
            <ProtectedRoute roles={['coordinador', 'maestro', 'administrativo', 'alumno']}>
              <Security />
            </ProtectedRoute>
          } />

          <Route path="chat" element={
            <ProtectedRoute roles={['coordinador', 'maestro', 'administrativo']}>
              <Chat />
            </ProtectedRoute>
          } />



          <Route path="reportes" element={
            <ProtectedRoute roles={['coordinador', 'administrativo']}>
              <Reportes />
            </ProtectedRoute>
          } />

          <Route path="tendencias" element={
            <ProtectedRoute roles={['coordinador', 'administrativo']}>
              <TendenciasAvanzadas />
            </ProtectedRoute>
          } />

          <Route path="estadisticas" element={
            <ProtectedRoute roles={['coordinador', 'administrativo']}>
              <Estadisticas />
            </ProtectedRoute>
          } />

          <Route path="maestro-calificaciones" element={
            <ProtectedRoute roles={['maestro', 'coordinador']}>
              <MaestroCalificaciones />
            </ProtectedRoute>
          } />

          <Route path="maestro-asistencias" element={
            <ProtectedRoute roles={['maestro', 'coordinador']}>
              <MaestroAsistencias />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
      </SocketProvider>
    </Router>
  );
}

export default App;
