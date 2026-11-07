import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout/MainLayout.jsx';
import FingerprintRegistration from '../pages/FingerprintRegistration/FingerprintRegistration.jsx';
import Home from '../pages/Home/Home.jsx';
import Registration from '../pages/Registration/Registration.jsx';
import EventLayout from '../layouts/EventLayout/EventLayout.jsx';
import WelcomePage from '../pages/Events/WelcomePage/WelcomePage.jsx';
import Information from '../pages/Events/Information/Infrmation.jsx';
import Photobooth from '../pages/Events/Photobooth/Photobooth.jsx';
import Highlights from '../pages/Events/Highlights/Highlights.jsx';
import Attendance from '../pages/Attendance/Attendance.jsx';
import EventPageTheme from '../pages/SystemSettings/EventPageTheme.jsx';

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Home />} />
                    <Route path="/registration" element={<Registration />} />
                    <Route
                        path="/fingerprint-registration"
                        element={<FingerprintRegistration />}
                    />
                    <Route
                        path="/settings/event-theme"
                        element={<EventPageTheme />}
                    />
                </Route>
                <Route path="/event" element={<EventLayout />}>
                    <Route index element={<WelcomePage />} />
                    <Route
                        path="information"
                        element={<Information />}
                    />
                    <Route
                        path="photobooth"
                        element={<Photobooth />}
                    />
                    <Route
                        path="highlights"
                        element={<Highlights />}
                    />
                    <Route
                        path="attendance"
                        element={<Attendance />}
                    />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
