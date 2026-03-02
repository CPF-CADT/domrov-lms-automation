import React from 'react';
import Sidebar from '../dashboard/Sidebar';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="flex h-screen bg-neutral-50 font-sans overflow-hidden">
            {/* Sidebar - Fixed height, doesn't scroll */}
            <Sidebar />
            {/* Main content area - Responsive padding, fills width */}
            <main className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Content container with responsive padding and gap from sidebar */}
                <div className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 md:py-10 lg:py-12 flex flex-col h-full overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
