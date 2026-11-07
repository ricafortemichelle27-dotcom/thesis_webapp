import { Outlet } from 'react-router-dom';
import Header from '../../components/Header/Header.jsx';
import Footer from '../../components/Footer/Footer.jsx';
import './MainLayout.css';

function MainLayout() {
    return (
        <div className="main-layout">
            <Header />
            <main className="page-content">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

export default MainLayout;