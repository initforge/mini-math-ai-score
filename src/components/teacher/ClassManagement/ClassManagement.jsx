import { useState, useEffect } from 'react';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import Modal from '../../common/Modal';
import { databaseService } from '../../../services/database';
import { excelService } from '../../../services/excel';
import { useAuth } from '../../../contexts/AuthContext';
import { useApiKey } from '../../../contexts/ApiKeyContext';
import ClassList from './ClassList';
import ExcelImport from './ExcelImport';
import './ClassManagement.css';

export default function ClassManagement() {
  const { user } = useAuth();
  const { apiKey } = useApiKey();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadClasses();
    
    const unsubscribe = databaseService.subscribe('classes', (classesData) => {
      // Handle cả trường hợp null/undefined (khi xóa hết classes)
      if (classesData && user) {
        const teacherClasses = Object.entries(classesData)
          .map(([id, cls]) => ({ id, ...cls }))
          .filter(cls => cls.teacherId === user.id);
        setClasses(teacherClasses);
        
        // Nếu lớp đang chọn đã bị xóa, clear selection
        setSelectedClass(prev => {
          if (prev && !teacherClasses.find(c => c.id === prev.id)) {
            return null;
          }
          return prev;
        });
      } else {
        // Nếu không còn classes nào, set empty array
        setClasses([]);
        setSelectedClass(null);
      }
    });

    return unsubscribe;
  }, [user]); // Bỏ selectedClass khỏi dependency để tránh resubscribe không cần thiết

  const loadClasses = async () => {
    setLoading(true);
    try {
      const classesData = await databaseService.read('classes');
      if (classesData && user) {
        const teacherClasses = Object.entries(classesData)
          .map(([id, cls]) => ({ id, ...cls }))
          .filter(cls => cls.teacherId === user.id);
        setClasses(teacherClasses);
        
        // Nếu lớp đang chọn đã bị xóa, clear selection
        if (selectedClass && !teacherClasses.find(c => c.id === selectedClass.id)) {
          setSelectedClass(null);
        }
      } else {
        setClasses([]);
        setSelectedClass(null);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    loadClasses();
  };

  return (
    <Layout>
      <div className="class-management">
        <div className="page-header-wrapper">
          <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
              <div style={{ flex: 1 }}>
                <PageHeader 
                  title="Quản lý Lớp & Học sinh"
                  subtitle="Quản lý danh sách lớp và học sinh"
                />
              </div>
              <Button 
                variant="action" 
                onClick={() => setShowImportModal(true)}
                className="import-excel-btn"
              >
                <span className="btn-icon">📊</span>
                Import Excel
              </Button>
            </div>
          </div>
        </div>
        <div className="page-container">

        {loading ? (
          <Loading />
        ) : (
          <ClassList
            classes={classes}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
            onClassDeleted={loadClasses}
          />
        )}

        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import Excel danh sách lớp"
        >
          <ExcelImport
            teacherId={user?.id}
            apiKey={apiKey}
            onSuccess={handleImportSuccess}
          />
        </Modal>
        </div>
      </div>
    </Layout>
  );
}
