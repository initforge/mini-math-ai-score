import { useState } from 'react';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import AIModeTabs from './AIModeTabs';
import './ExamCreation.css';

export default function ExamCreation() {
  return (
    <Layout>
      <div className="exam-creation">
        <div className="page-header-wrapper">
          <div className="page-container">
            <PageHeader 
              title="Ra đề thi (AI Mode)"
              subtitle="Tạo đề thi tự động với AI"
            />
          </div>
        </div>
        <div className="page-container">
          <AIModeTabs />
        </div>
      </div>
    </Layout>
  );
}
