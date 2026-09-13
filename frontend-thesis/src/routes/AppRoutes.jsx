import { 
    BrowserRouter, 
    Routes, 
    Route, 
    Navigate 
} from 'react-router-dom';

// Layouts
import AuthLayout from '../layouts/AuthLayout/AuthLayout.jsx';
import MainLayout from '../layouts/MainLayout/MainLayout.jsx';


// Pages
import Login from '../pages/Login/Login.jsx';
import Dashboard from '../pages/Dashboard/Dashboard.jsx';
import Users from '../pages/Users/Users.jsx';
import Events from '../pages/Events/Events.jsx';
import AttendanceReports from '../pages/AttendanceReports/AttendanceReports.jsx';
import SystemSettings from '../pages/SystemSettings/SystemSettings.jsx';
import Certificates from '../pages/Certificates/Certificate.jsx';



function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Authentication */}
                <Route element={<AuthLayout />}>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />
                </Route>

                {/* Main Event Management System */}
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/attendance-reports" element={<AttendanceReports />} />
                    <Route path="/system-settings" element={<SystemSettings />} />
                    <Route path="/settings" element={<Navigate to="/system-settings" replace />} />
                    <Route path="/certificate" element={<Certificates />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;