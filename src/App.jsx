import { AppProvider, useApp } from './context/AppContext';
import AuthPage from './pages/AuthPage';
import TeacherView from './pages/TeacherView';
import PrincipalView from './pages/PrincipalView';
import SuperAdminView from './pages/SuperAdminView';

function Root() {
  const { session, userRole, authMode } = useApp();

  // Recovery flow bypasses role routing until the new password is set
  if (authMode === 'recovery') return <AuthPage />;
  if (!session || !userRole) return <AuthPage />;

  if (userRole === 'teacher')    return <TeacherView />;
  if (userRole === 'principal')  return <PrincipalView />;
  if (userRole === 'superAdmin') return <SuperAdminView />;

  return <AuthPage />;
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}