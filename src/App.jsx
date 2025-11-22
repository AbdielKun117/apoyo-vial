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

function App() {
  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
