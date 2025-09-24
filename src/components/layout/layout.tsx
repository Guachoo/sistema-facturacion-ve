import { Outlet } from 'react-router-dom';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-72">
        <Navbar />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}