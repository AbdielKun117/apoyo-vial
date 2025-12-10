import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { RoleSelection } from './pages/RoleSelection';
import { RequestHelp } from './pages/RequestHelp';
import { RequestConfirmation } from './pages/RequestConfirmation';
import { RequestStatus } from './pages/RequestStatus';
import { HelperDashboard } from './pages/HelperDashboard';
import { HelperProfile } from './pages/HelperProfile';
import { RegisterVehicle } from './pages/RegisterVehicle';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import { Suggestions } from './pages/Suggestions';
import { ResetPassword } from './pages/ResetPassword';
import { AuthListener } from './components/auth/AuthListener';

function App() {
  const { setUser, setVehicle, theme } = useStore();

  useEffect(() => {
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Restore session on app load
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUser({
            name: profile.full_name,
            phone: profile.phone,
            email: session.user.email
          });
          setVehicle({
            model: profile.vehicle_model,
            color: profile.vehicle_color,
            plates: profile.vehicle_plates,
            type: profile.vehicle_type
          });
        }
      }
    };

    restoreSession();
  }, [setUser, setVehicle]);

  return (
    <BrowserRouter>
      <AuthListener />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Login />} />
          <Route path="/register-vehicle" element={<RegisterVehicle />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/helper-profile" element={<HelperProfile />} />
          <Route path="/request-help" element={<RequestHelp />} />
          <Route path="/request-confirmation" element={<RequestConfirmation />} />
          <Route path="/request-status" element={<RequestStatus />} />
          <Route path="/helper-dashboard" element={<HelperDashboard />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
