import React from 'react';

interface LayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

const SideBarLayout: React.FC<LayoutProps> = ({ sidebar, main }) => {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 fixed h-full bg-gray-800 text-white flex flex-col p-6">
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-6 bg-gray-100">
        {main}
      </main>
    </div>
  );
};

export default SideBarLayout;