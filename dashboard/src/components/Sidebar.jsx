import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiUsers, FiUserCheck, FiScissors, FiCalendar, FiMapPin, FiLogOut, FiClock, FiSettings, FiMenu, FiX } from 'react-icons/fi';
import { Avatar, Circle, Float } from "@chakra-ui/react"
import '../styles/sidebar.css';


function Sidebar({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const role = user?.user_metadata?.role || user?.app_metadata?.role;

  // Định nghĩa menu cho từng quyền
  const adminItems = [
    { path: '/', label: 'Lịch hẹn', icon: FiCalendar },
    { path: '/schedules', label: 'Lịch NV', icon: FiClock },
    { path: '/customers', label: 'Khách hàng', icon: FiUsers },
    { path: '/employees', label: 'Nhân viên', icon: FiUserCheck },
    { path: '/services', label: 'Dịch vụ', icon: FiScissors },
    { path: '/branches', label: 'Chi nhánh', icon: FiMapPin },
    { path: '/settings', label: 'Cài đặt', icon: FiSettings },
  ];

  const staffItems = [
    { path: '/', label: 'Lịch hẹn', icon: FiCalendar },
    { path: '/customers', label: 'Khách hàng', icon: FiUsers },
  ];

  // Chọn menu hiển thị dựa trên role
  const itemsToRender = role === 'admin' ? adminItems : staffItems;

  // Bottom nav: show max 4 items + More for mobile
  const bottomNavItems = role === 'admin'
    ? [
      { path: '/', label: 'Lịch hẹn', icon: FiCalendar },
      { path: '/customers', label: 'Khách', icon: FiUsers },
      { path: '/schedules', label: 'Lịch NV', icon: FiClock },
      { path: '/services', label: 'Dịch vụ', icon: FiScissors },
    ]
    : staffItems;

  // Hiển thị vai trò người dùng động
  const roleLabel = role === 'admin' ? 'Quản trị viên' : 'Nhân viên';

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="mobile-header-logo">
          Ý Ơi <span>Dashboard</span>
        </div>
      </header>

      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={closeMobile}
      />

      {/* Desktop / Tablet / Mobile Sidebar */}
      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <h1>Ý Ơi <span>Dashboard</span></h1>
        </div>

        <nav className="sidebar-nav">
          {itemsToRender.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              title={item.label}
            >
              <item.icon />
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar.Root colorPalette="grey" variant="subtle">
              <Avatar.Fallback name={user?.email?.split('@')[0] || 'Admin'} />
              <Float placement="bottom-end" offsetX="1" offsetY="1">
                <Circle
                  bg="green.500"
                  size="8px"
                  outline="0.2em solid"
                  outlineColor="bg"
                />
              </Float>
            </Avatar.Root>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.email?.split('@')[0]}</div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            <FiLogOut style={{ marginRight: 8, verticalAlign: 'middle', display: 'inline' }} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          {bottomNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            >
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {role === 'admin' && (
            <button
              className={`mobile-nav-item${mobileOpen ? ' active' : ''}`}
              onClick={toggleMobile}
            >
              <FiMenu />
              <span>Thêm</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
