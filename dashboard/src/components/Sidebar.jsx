import { NavLink, useLocation } from 'react-router-dom';
import { FiHome, FiUsers, FiUserCheck, FiScissors, FiCalendar, FiMapPin, FiLogOut, FiClock, FiZap, FiSettings } from 'react-icons/fi';
import { Avatar, Circle, Float } from "@chakra-ui/react"


const navItems = [
  { path: '/', label: 'Trang chủ', icon: FiHome },
  { path: '/bookings', label: 'Lịch hẹn', icon: FiCalendar },
  { path: '/schedules', label: 'Lịch nhân viên', icon: FiClock },
  { path: '/customers', label: 'Khách hàng', icon: FiUsers },
  { path: '/employees', label: 'Nhân viên', icon: FiUserCheck },
  { path: '/services', label: 'Dịch vụ', icon: FiScissors },
  { path: '/branches', label: 'Chi nhánh', icon: FiMapPin },
  { path: '/webhooks', label: 'Setting', icon: FiSettings },
];

function Sidebar({ user, onLogout }) {
  const location = useLocation();

  const getInitial = (email) => {
    if (!email) return 'A';
    return email.charAt(0).toUpperCase();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>YOi <span>Dashboard</span></h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <item.icon />
            {item.label}
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
            <div className="sidebar-user-name">{user?.email?.split('@')[0] || 'Admin'}</div>
            <div className="sidebar-user-role">Quản trị viên</div>
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          <FiLogOut style={{ marginRight: 8, verticalAlign: 'middle', display: 'inline' }} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
