import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { History as HistoryIcon, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import './History.css';

const History = () => {
  const { user } = useContext(AuthContext);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/history?userId=${user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setHistoryData(data);
      } else {
        setError(data.error || 'ไม่สามารถโหลดประวัติการใช้งานได้');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="history-page">
      <div className="container">
        <div className="page-header">
          <h1>ประวัติ<span className="text-gradient">การตรวจสอบ</span></h1>
          <p>ประวัติการอัปโหลดและผลการตรวจสอบเอกสารของคุณทั้งหมด</p>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '2rem' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : historyData.length === 0 ? (
          <div className="empty-state glass-panel">
            <HistoryIcon size={48} className="empty-icon" />
            <h3>ยังไม่มีประวัติการใช้งาน</h3>
            <p>คุณยังไม่เคยอัปโหลดเอกสารเพื่อตรวจสอบ ลองอัปโหลดเอกสารชิ้นแรกดูสิ</p>
          </div>
        ) : (
          <div className="history-grid">
            {historyData.map((item, index) => (
              <motion.div 
                key={item.id}
                className="history-card glass-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="card-header">
                  <div className="file-info">
                    <FileText size={20} className="file-icon" />
                    <span className="file-name" title={item.file_name}>{item.file_name}</span>
                  </div>
                  <div className={`status-badge ${item.status}`}>
                    {item.status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {item.score_percent}%
                  </div>
                </div>
                
                <div className="card-body">
                  <p className="message">{item.message}</p>
                </div>
                
                <div className="card-footer">
                  <Clock size={14} />
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
