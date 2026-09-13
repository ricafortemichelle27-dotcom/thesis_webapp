import { Outlet } from 'react-router-dom';
import { useState } from 'react';


import Header from '../../components/Header/Header';
import Sidebar from '../../components/Sidebar/Sidebar';
import Footer from '../../components/Footer/Footer';




import './MainLayout.css';
import { faBullseye } from '@fortawesome/free-solid-svg-icons';


function MainLayout({ children }) {
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className={`main-layout ${isSidebarOpen ? 'sidebar-is-open' : ''}`}>
            
            <Sidebar
                isOpen={isSidebarOpen}
            />

            <div className="main-area">
                
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className='page-content'>
                    <Outlet />
                </main>

                <Footer />
                
            </div>

        </div>
    );
}

export default MainLayout;