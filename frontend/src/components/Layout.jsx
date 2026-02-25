import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AsistenteIA from './AsistenteIA';
import ChatFlotante from './ChatFlotante';
import GlobalSearch from './GlobalSearch';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Overlay para móviles */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Asistente IA flotante */}
      <AsistenteIA />
      
      {/* Chat Interno flotante */}
      <ChatFlotante />
      
      {/* Buscador Global (Ctrl+K) */}
      <GlobalSearch />
    </div>
  );
};

export default Layout;
