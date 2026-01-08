import { useState } from 'react';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import UserTabsRefactored from './UserTabsRefactored';
import './UserManagement.css';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState('teacher');

  return (
    <Layout>
      <div className="user-management">
        <div className="page-header-wrapper">
          <div className="page-container">
            <PageHeader 
              title="Quản lý Người dùng"
              subtitle="Quản lý tài khoản giáo viên và học sinh"
            />
          </div>
        </div>
        <div className="page-container">
          <UserTabsRefactored activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </Layout>
  );
}
