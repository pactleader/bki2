import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import { isLoggedIn, getUser } from './auth.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ArticleList from './pages/articles/ArticleList.jsx';
import ArticleEdit from './pages/articles/ArticleEdit.jsx';
import CategoryList from './pages/categories/CategoryList.jsx';
import UserList from './pages/users/UserList.jsx';
import UserEdit from './pages/users/UserEdit.jsx';
import ContactList from './pages/contacts/ContactList.jsx';
import AdList from './pages/ads/AdList.jsx';
import AdEdit from './pages/ads/AdEdit.jsx';
import MenuManager from './pages/menu/MenuManager.jsx';
import HomepageConfig from './pages/homepage/HomepageConfig.jsx';
import EventList from './pages/events/EventList.jsx';
import EventEdit from './pages/events/EventEdit.jsx';
import SiteSettings from './pages/settings/SiteSettings.jsx';
import MediaLibrary from './pages/media/MediaLibrary.jsx';
import SubscriberList from './pages/subscribers/SubscriberList.jsx';
import ImportTool from './pages/import/ImportTool.jsx';
import RedirectList from './pages/redirects/RedirectList.jsx';
import PageList from './pages/pages/PageList.jsx';
import PageEdit from './pages/pages/PageEdit.jsx';

function ProtectedRoute({ children, adminOnly = false }) {
  if (!isLoggedIn()) return <Navigate to="/admin/login" replace />;
  if (adminOnly && getUser()?.role !== 'admin') return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="articles" element={<ArticleList />} />
          <Route path="articles/new" element={<ArticleEdit />} />
          <Route path="articles/:id/edit" element={<ArticleEdit />} />
          <Route path="categories" element={<CategoryList />} />
          <Route path="users" element={<ProtectedRoute adminOnly><UserList /></ProtectedRoute>} />
          <Route path="users/new" element={<ProtectedRoute adminOnly><UserEdit /></ProtectedRoute>} />
          <Route path="users/:id/edit" element={<ProtectedRoute adminOnly><UserEdit /></ProtectedRoute>} />
          <Route path="contacts" element={<ContactList />} />
          <Route path="ads" element={<ProtectedRoute adminOnly><AdList /></ProtectedRoute>} />
          <Route path="ads/new" element={<ProtectedRoute adminOnly><AdEdit /></ProtectedRoute>} />
          <Route path="ads/:id/edit" element={<ProtectedRoute adminOnly><AdEdit /></ProtectedRoute>} />
          <Route path="menu" element={<ProtectedRoute adminOnly><MenuManager /></ProtectedRoute>} />
          <Route path="homepage" element={<ProtectedRoute adminOnly><HomepageConfig /></ProtectedRoute>} />
          <Route path="events" element={<EventList />} />
          <Route path="events/new" element={<EventEdit />} />
          <Route path="events/:id/edit" element={<EventEdit />} />
          <Route path="media" element={<ProtectedRoute adminOnly><MediaLibrary /></ProtectedRoute>} />
          <Route path="subscribers" element={<ProtectedRoute adminOnly><SubscriberList /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute adminOnly><SiteSettings /></ProtectedRoute>} />
          <Route path="import" element={<ProtectedRoute adminOnly><ImportTool /></ProtectedRoute>} />
          <Route path="redirects" element={<ProtectedRoute adminOnly><RedirectList /></ProtectedRoute>} />
          <Route path="pages" element={<ProtectedRoute adminOnly><PageList /></ProtectedRoute>} />
          <Route path="pages/new" element={<ProtectedRoute adminOnly><PageEdit /></ProtectedRoute>} />
          <Route path="pages/:id/edit" element={<ProtectedRoute adminOnly><PageEdit /></ProtectedRoute>} />
        </Route>
        <Route path="/admin/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}
