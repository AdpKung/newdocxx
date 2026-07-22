import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileType, CheckCircle2, AlertCircle, RefreshCw, Download, ChevronRight, Loader2, ChevronDown } from 'lucide-react';
import './CheckDocument.css';

const CheckDocument = () => {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('full');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, processing, result
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [resultData, setResultData] = useState(null);
  const { user } = useContext(AuthContext);

  const validationSteps = [
    { id: 'meta', label: 'กำลังอ่านโครงสร้างไฟล์และ Metadata...' },
    { id: 'structure', label: docType === 'full' ? 'ตรวจสอบโครงสร้างครบ 5 บท (บทที่ 1-5)...' : `ตรวจสอบโครงสร้าง ${docType.replace('chap', 'บทที่ ')}...` },
    { id: 'font-type', label: 'วิเคราะห์ชนิดฟอนต์ทั้งเอกสาร (TH Sarabun PSK)...' },
    { id: 'font-size', label: 'วิเคราะห์ขนาดตัวอักษรและตัวหนา/ตัวเอียง...' },
    { id: 'margins', label: 'ตรวจสอบระยะขอบกระดาษทุกหน้า...' }
  ];

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
  };

  const startProcessing = async () => {
    if (!file) return;
    setStatus('processing');
    setActiveStepIndex(0);

    const stepDuration = 600;
    const totalSteps = validationSteps.length;
    let currentStep = 0;
    
    const interval = setInterval(() => {
      if (currentStep < totalSteps - 1) { 
        currentStep++;
        setActiveStepIndex(currentStep);
      }
    }, stepDuration);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      if (user) {
        formData.append('userId', user.id);
      }

      const response = await fetch('/api/check', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      clearInterval(interval);
      setActiveStepIndex(totalSteps); 
      
      setTimeout(() => {
        setResultData(data);
        setStatus('result');
      }, 500);

    } catch (error) {
      console.error(error);
      clearInterval(interval);
      alert('ไม่สามารถเชื่อมต่อระบบหลังบ้าน (Backend) ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์เปิดอยู่');
      setStatus('idle');
    }
  };

  const resetProcess = () => {
    setFile(null);
    setStatus('idle');
    setActiveStepIndex(0);
    setResultData(null);
  };

  let scorePercent = 0;
  let scoreDasharray = 0;
  let scoreColorClass = 'danger';
  let chaptersFound = 0;
  let isEmpty = false;
  let isError = false;
  let errorMessage = '';

  if (resultData) {
    if (resultData.error) {
      isError = true;
      errorMessage = resultData.error;
    } else {
      scorePercent = resultData.scorePercent || 0;
      scoreDasharray = (scorePercent / 100) * 283;
      scoreColorClass = scorePercent >= 80 ? 'success' : scorePercent >= 50 ? 'warning' : 'danger';
      if (resultData.details) {
        chaptersFound = resultData.details.chapters_found || 0;
      }
      if (scorePercent === 0 && resultData.message && resultData.message.includes('ว่างเปล่า')) {
        isEmpty = true;
      }
    }
  }

  return (
    <div className="check-page">
      <div className="container">
        <div className="page-header">
          <h1>ตรวจสอบ<span className="text-gradient">เอกสารโครงการ</span></h1>
          <p>อัปโหลดไฟล์ Word (.docx) หรือ PDF เพื่อตรวจสอบเจาะลึกแบบเป็นขั้นตอน</p>
        </div>

        <AnimatePresence mode="wait">
          {/* UPLOAD STATE */}
          {status === 'idle' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="upload-section glass-panel"
            >
              <div 
                className={`drop-zone ${file ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {!file ? (
                  <>
                    <motion.div 
                      className="doc-type-selector"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                       <p>ประเภทเอกสารที่ต้องการตรวจสอบ:</p>
                       <div className="custom-dropdown-container">
                         <div 
                           className={`custom-dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                           onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                         >
                           <span>
                             {[
                               { id: 'full', label: 'ฉบับสมบูรณ์ (บทที่ 1-5)' },
                               { id: 'chap1', label: 'บทที่ 1 บทนำ' },
                               { id: 'chap2', label: 'บทที่ 2 ทฤษฎีและเอกสารที่เกี่ยวข้อง' },
                               { id: 'chap3', label: 'บทที่ 3 วิธีการดำเนินการ' },
                               { id: 'chap4', label: 'บทที่ 4 ผลการดำเนินงาน' },
                               { id: 'chap5', label: 'บทที่ 5 สรุปผลและข้อเสนอแนะ' }
                             ].find(t => t.id === docType)?.label || 'เลือกประเภทเอกสาร'}
                           </span>
                           <motion.div
                             animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                             transition={{ duration: 0.3 }}
                           >
                             <ChevronDown size={20} />
                           </motion.div>
                         </div>

                         <AnimatePresence>
                           {isDropdownOpen && (
                             <motion.div 
                               className="custom-dropdown-menu"
                               initial={{ opacity: 0, y: -10, height: 0 }}
                               animate={{ opacity: 1, y: 0, height: 'auto' }}
                               exit={{ opacity: 0, y: -10, height: 0 }}
                               transition={{ duration: 0.2 }}
                             >
                               {[
                                 { id: 'full', label: 'ฉบับสมบูรณ์ (บทที่ 1-5)' },
                                 { id: 'chap1', label: 'บทที่ 1 บทนำ' },
                                 { id: 'chap2', label: 'บทที่ 2 ทฤษฎีและเอกสารที่เกี่ยวข้อง' },
                                 { id: 'chap3', label: 'บทที่ 3 วิธีการดำเนินการ' },
                                 { id: 'chap4', label: 'บทที่ 4 ผลการดำเนินงาน' },
                                 { id: 'chap5', label: 'บทที่ 5 สรุปผลและข้อเสนอแนะ' }
                               ].map(type => (
                                 <button
                                   key={type.id}
                                   className={`custom-dropdown-item ${docType === type.id ? 'active' : ''}`}
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setDocType(type.id);
                                     setIsDropdownOpen(false);
                                   }}
                                 >
                                   {type.label}
                                 </button>
                               ))}
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                    </motion.div>
                    <div className="drop-icon-wrapper">
                      <UploadCloud size={48} className="drop-icon" />
                    </div>
                    <h3>ลากไฟล์มาวางที่นี่</h3>
                    <p>หรือ</p>
                    <label className="btn btn-primary browse-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', borderRadius: '50px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '500', marginTop: '0.5rem' }}>
                      <UploadCloud size={20} /> เลือกไฟล์จากเครื่อง
                      <input type="file" accept=".docx,.pdf,.jpg,.jpeg,.png" onChange={handleFileInput} hidden />
                    </label>
                    <span className="file-hint">รองรับไฟล์ .docx, .pdf หรือรูปภาพ ขนาดไม่เกิน 20MB</span>
                  </>
                ) : (
                  <div className="file-selected">
                    <FileType size={48} className="file-icon" />
                    <div className="file-info">
                      <h4>{file.name}</h4>
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button className="btn btn-primary start-btn" onClick={startProcessing}>
                      เริ่มการตรวจสอบละเอียด <ChevronRight size={18} />
                    </button>
                    <button className="btn-text" onClick={() => setFile(null)}>ยกเลิก</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PROCESSING STATE (Step-by-step Scanner) */}
          {status === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="processing-section glass-panel"
            >
              <div className="processing-header">
                <div className="cool-scanner">
                  <div className="scanner-laser"></div>
                </div>
                <h3>กำลังวิเคราะห์เนื้อหาเอกสารจริง...</h3>
              </div>

              <div className="step-scanner">
                {validationSteps.map((step, index) => {
                  const isCompleted = index < activeStepIndex;
                  const isActive = index === activeStepIndex;
                  const isWaiting = index > activeStepIndex;

                  return (
                    <div key={step.id} className={`scan-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isWaiting ? 'waiting' : ''}`}>
                      <div className="step-indicator">
                        {isCompleted ? <CheckCircle2 size={20} /> : (isActive ? <Loader2 size={20} className="spin" /> : <div className="circle-dot"></div>)}
                      </div>
                      <div className="step-label">{step.label}</div>
                      {isCompleted && <div className="step-result text-success">เสร็จสิ้น</div>}
                      {isActive && <div className="step-result text-primary">กำลังตรวจสอบ...</div>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* RESULT STATE */}
          {status === 'result' && resultData && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="result-section"
            >
              <div className="result-header glass-panel">
                <div className="score-overview">
                  <div className={`final-score ${scoreColorClass}`}>
                    <svg viewBox="0 0 100 100">
                      <circle className="score-bg" cx="50" cy="50" r="45"></circle>
                      <circle className="score-path" cx="50" cy="50" r="45" strokeDasharray={`${scoreDasharray} 283`}></circle>
                    </svg>
                    <span>{scorePercent}%</span>
                  </div>
                  <div className="score-text">
                    <h2>{isError ? 'เกิดข้อผิดพลาดในการตรวจสอบ' : (resultData.message || 'ตรวจพบปัญหาบางประการ')}</h2>
                    <p>ไฟล์: {file?.name}</p>
                  </div>
                </div>
                <div className="result-actions">
                  <button className="btn btn-outline" onClick={resetProcess}>
                    <RefreshCw size={18} /> อัปโหลดไฟล์ใหม่
                  </button>
                  <button className="btn btn-primary" disabled={isEmpty || isError}>
                    <Download size={18} /> โหลดรายงาน (PDF)
                  </button>
                </div>
              </div>

              <div className="detailed-results">
                <div className="checklist-panel glass-panel full-width">
                  <div className="panel-header">
                    <h3>ผลการตรวจสอบรายละเอียด {resultData?.docType === 'full' ? 'ทั้งหมด (บทที่ 1 - 5)' : `(${resultData?.docType?.replace('chap', 'บทที่ ')})`}</h3>
                  </div>
                  
                  <div className="checklist-grid">
                    {/* หมวดหมู่: บทที่ 1 */}
                    {(resultData?.docType === 'full' || resultData?.docType === 'chap1') && (
                    <div className="checklist-group">
                      <h4><FileTextIcon /> บทที่ 1 บทนำ</h4>
                      {(isEmpty || isError) ? (
                        <div className="check-item warning">
                          <AlertCircle size={20} className="flex-shrink-0" />
                          <div><span>ไม่สามารถตรวจสอบบทที่ 1 ได้</span></div>
                        </div>
                      ) : (
                        <>
                          <div className={`check-item ${resultData?.details?.chapters_list?.chap1 ? 'success' : 'error'}`}>
                            {resultData?.details?.chapters_list?.chap1 ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                            <div>
                              <span>{resultData?.details?.chapters_list?.chap1 ? 'ตรวจพบเนื้อหา บทที่ 1' : 'ไม่พบเนื้อหา บทที่ 1'}</span>
                              {!resultData?.details?.chapters_list?.chap1 && (
                                <p className="item-detail" style={{color: '#d32f2f', fontWeight: 'bold'}}>
                                  วิธีแก้ไข: กรุณาเพิ่มหัวข้อ "บทที่ 1" หรือ "บทนำ" ลงในเอกสารของคุณ
                                </p>
                              )}
                            </div>
                          </div>
                          {resultData?.details?.chapters_list?.chap1 && resultData.subtopics_chap1 && (
                            <div className="subtopic-checks" style={{ paddingLeft: '20px', borderLeft: '2px solid #eee', marginLeft: '10px' }}>
                              <h5 style={{ margin: '10px 0', color: '#555' }}>ผลการตรวจหัวข้อย่อย บทที่ 1:</h5>
                              {Object.values(resultData.subtopics_chap1).every(topic => topic.found && topic.isBold) ? (
                                <div className="check-item success" style={{ marginBottom: '8px', padding: '10px' }}>
                                  <CheckCircle2 size={16} className="flex-shrink-0" />
                                  <div>
                                    <span style={{ fontSize: '0.95rem', color: '#2e7d32', fontWeight: 'bold' }}>พบหัวข้อย่อยครบถ้วนและถูกต้องทั้งหมด</span>
                                  </div>
                                </div>
                              ) : (
                                Object.values(resultData.subtopics_chap1)
                                  .filter(topic => !topic.found || !topic.isBold)
                                  .map((topic, idx) => (
                                    <div key={idx} className="check-item error" style={{ marginBottom: '8px', padding: '10px' }}>
                                      <AlertCircle size={16} className="flex-shrink-0" />
                                      <div>
                                        <span style={{ fontSize: '0.95rem' }}>หัวข้อ "{topic.label}"</span>
                                        <p className="item-detail" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                          {!topic.found ? (
                                            <span style={{color: '#d32f2f', fontWeight: 'bold'}}>วิธีแก้ไข: ขาดหัวข้อนี้ กรุณาพิมพ์ "{topic.label}" ลงในเอกสารและทำตัวหนา</span>
                                          ) : (
                                            <span style={{color: '#d32f2f', fontWeight: 'bold'}}>วิธีแก้ไข: พบหัวข้อแล้ว แต่ลืมทำตัวหนา กรุณาคลุมดำข้อความและกด Ctrl+B (ทำตัวหนา)</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    )}

                    {/* หมวดหมู่: บทที่ 2 */}
                    {(resultData?.docType === 'full' || resultData?.docType === 'chap2') && (
                    <div className="checklist-group">
                      <h4><FileTextIcon /> บทที่ 2 เอกสารและงานวิจัยที่เกี่ยวข้อง</h4>
                      {(isEmpty || isError) ? (
                        <div className="check-item warning">
                          <AlertCircle size={20} className="flex-shrink-0" />
                          <div><span>ไม่สามารถตรวจสอบบทที่ 2 ได้</span></div>
                        </div>
                      ) : (
                        <div className={`check-item ${resultData?.details?.chapters_list?.chap2 ? 'success' : 'error'}`}>
                          {resultData?.details?.chapters_list?.chap2 ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                          <div>
                            <span>{resultData?.details?.chapters_list?.chap2 ? 'ตรวจพบเนื้อหา บทที่ 2' : 'ไม่พบเนื้อหา บทที่ 2'}</span>
                            {!resultData?.details?.chapters_list?.chap2 && (
                              <p className="item-detail" style={{color: '#d32f2f', fontWeight: 'bold'}}>
                                วิธีแก้ไข: กรุณาเพิ่มหัวข้อ "บทที่ 2" ลงในเอกสารของคุณ
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    {/* หมวดหมู่: บทที่ 3 */}
                    {(resultData?.docType === 'full' || resultData?.docType === 'chap3') && (
                    <div className="checklist-group">
                      <h4><FileTextIcon /> บทที่ 3 วิธีดำเนินการโครงงาน</h4>
                      {(isEmpty || isError) ? (
                        <div className="check-item warning">
                          <AlertCircle size={20} className="flex-shrink-0" />
                          <div><span>ไม่สามารถตรวจสอบบทที่ 3 ได้</span></div>
                        </div>
                      ) : (
                        <>
                          <div className={`check-item ${resultData?.details?.chapters_list?.chap3 ? 'success' : 'error'}`}>
                            {resultData?.details?.chapters_list?.chap3 ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                            <div>
                              <span>{resultData?.details?.chapters_list?.chap3 ? 'ตรวจพบเนื้อหา บทที่ 3' : 'ไม่พบเนื้อหา บทที่ 3'}</span>
                              {!resultData?.details?.chapters_list?.chap3 && (
                                <p className="item-detail" style={{color: '#d32f2f', fontWeight: 'bold'}}>
                                  วิธีแก้ไข: กรุณาเพิ่มหัวข้อ "บทที่ 3" ลงในเอกสารของคุณ
                                </p>
                              )}
                            </div>
                          </div>
                          {resultData?.details?.chapters_list?.chap3 && resultData.subtopics_chap3 && (
                            <div className="subtopic-checks" style={{ paddingLeft: '20px', borderLeft: '2px solid #eee', marginLeft: '10px' }}>
                              <h5 style={{ margin: '10px 0', color: '#555' }}>ผลการตรวจหัวข้อย่อย บทที่ 3:</h5>
                              {Object.values(resultData.subtopics_chap3).every(topic => topic.found && topic.isBold) ? (
                                <div className="check-item success" style={{ marginBottom: '8px', padding: '10px' }}>
                                  <CheckCircle2 size={16} className="flex-shrink-0" />
                                  <div>
                                    <span style={{ fontSize: '0.95rem', color: '#2e7d32', fontWeight: 'bold' }}>พบหัวข้อย่อยครบถ้วนและถูกต้องทั้งหมด</span>
                                  </div>
                                </div>
                              ) : (
                                Object.values(resultData.subtopics_chap3)
                                  .filter(topic => !topic.found || !topic.isBold)
                                  .map((topic, idx) => (
                                    <div key={idx} className="check-item error" style={{ marginBottom: '8px', padding: '10px' }}>
                                      <AlertCircle size={16} className="flex-shrink-0" />
                                      <div>
                                        <span style={{ fontSize: '0.95rem' }}>หัวข้อ "{topic.label}"</span>
                                        <p className="item-detail" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                          {!topic.found ? (
                                            <span style={{color: '#d32f2f', fontWeight: 'bold'}}>วิธีแก้ไข: ขาดหัวข้อนี้ กรุณาพิมพ์ "{topic.label}" ลงในเอกสารและทำตัวหนา</span>
                                          ) : (
                                            <span style={{color: '#d32f2f', fontWeight: 'bold'}}>วิธีแก้ไข: พบหัวข้อแล้ว แต่ลืมทำตัวหนา กรุณาคลุมดำข้อความและกด Ctrl+B (ทำตัวหนา)</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                              )}
                            </div>
                          )}
                          {resultData?.details?.chapters_list?.chap3 && resultData.formulas && (
                            <div className="subtopic-checks" style={{ paddingLeft: '20px', borderLeft: '2px solid #eee', marginLeft: '10px', marginTop: '15px' }}>
                              <h5 style={{ margin: '10px 0', color: '#555' }}>ผลการตรวจสูตรสถิติและอ้างอิง:</h5>
                              
                              <div className={`check-item ${resultData.formulas.percent ? 'success' : 'error'}`} style={{ marginBottom: '8px', padding: '10px' }}>
                                {resultData.formulas.percent ? <CheckCircle2 size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
                                <div>
                                  <span style={{ fontSize: '0.95rem', color: resultData.formulas.percent ? '#2e7d32' : '#d32f2f' }}>1. สูตรร้อยละ (Percentage)</span>
                                  {!resultData.formulas.percent && (
                                    <p className="item-detail" style={{ fontSize: '0.85rem', marginTop: '4px', color: '#d32f2f', fontWeight: 'bold' }}>
                                      วิธีแก้ไข: ไม่พบสูตรร้อยละ หรือขาดการอ้างอิง กรุณาเติมประโยค "ใช้สูตรดังนี้ (ชื่อ, ปี)" เช่น "ใช้สูตรดังนี้: (บุญชม ศรีสะอาด, 2556)"
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className={`check-item ${resultData.formulas.mean ? 'success' : 'error'}`} style={{ marginBottom: '8px', padding: '10px' }}>
                                {resultData.formulas.mean ? <CheckCircle2 size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
                                <div>
                                  <span style={{ fontSize: '0.95rem', color: resultData.formulas.mean ? '#2e7d32' : '#d32f2f' }}>2. สูตรค่าเฉลี่ย (Mean)</span>
                                  {!resultData.formulas.mean && (
                                    <p className="item-detail" style={{ fontSize: '0.85rem', marginTop: '4px', color: '#d32f2f', fontWeight: 'bold' }}>
                                      วิธีแก้ไข: ไม่พบสูตรค่าเฉลี่ย หรือขาดการอ้างอิง กรุณาเติมประโยค "ใช้สูตรดังนี้ (ชื่อ, ปี)" เช่น "ใช้สูตรดังนี้: (บุญชม ศรีสะอาด, 2556)"
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className={`check-item ${resultData.formulas.sd ? 'success' : 'error'}`} style={{ marginBottom: '8px', padding: '10px' }}>
                                {resultData.formulas.sd ? <CheckCircle2 size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
                                <div>
                                  <span style={{ fontSize: '0.95rem', color: resultData.formulas.sd ? '#2e7d32' : '#d32f2f' }}>3. สูตรส่วนเบี่ยงเบนมาตรฐาน (S.D.)</span>
                                  {!resultData.formulas.sd && (
                                    <p className="item-detail" style={{ fontSize: '0.85rem', marginTop: '4px', color: '#d32f2f', fontWeight: 'bold' }}>
                                      วิธีแก้ไข: ไม่พบสูตร S.D. หรือขาดการอ้างอิง กรุณาเติมประโยค "ใช้สูตรดังนี้ (ชื่อ, ปี)" เช่น "ใช้สูตรดังนี้: (บุญชม ศรีสะอาด, 2556)"
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    )}

                    {/* หมวดหมู่: บทที่ 4 */}
                    {(resultData?.docType === 'full' || resultData?.docType === 'chap4') && (
                    <div className="checklist-group">
                      <h4><FileTextIcon /> บทที่ 4 ผลการดำเนินงาน</h4>
                      {(isEmpty || isError) ? (
                        <div className="check-item warning">
                          <AlertCircle size={20} className="flex-shrink-0" />
                          <div><span>ไม่สามารถตรวจสอบบทที่ 4 ได้</span></div>
                        </div>
                      ) : (
                        <div className={`check-item ${resultData?.details?.chapters_list?.chap4 ? 'success' : 'error'}`}>
                          {resultData?.details?.chapters_list?.chap4 ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                          <div>
                            <span>{resultData?.details?.chapters_list?.chap4 ? 'ตรวจพบเนื้อหา บทที่ 4' : 'ไม่พบเนื้อหา บทที่ 4'}</span>
                            {!resultData?.details?.chapters_list?.chap4 && (
                              <p className="item-detail" style={{color: '#d32f2f', fontWeight: 'bold'}}>
                                วิธีแก้ไข: กรุณาเพิ่มหัวข้อ "บทที่ 4" ลงในเอกสารของคุณ
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    {/* หมวดหมู่: บทที่ 5 */}
                    {(resultData?.docType === 'full' || resultData?.docType === 'chap5') && (
                    <div className="checklist-group">
                      <h4><FileTextIcon /> บทที่ 5 สรุปผลและข้อเสนอแนะ</h4>
                      {(isEmpty || isError) ? (
                        <div className="check-item warning">
                          <AlertCircle size={20} className="flex-shrink-0" />
                          <div><span>ไม่สามารถตรวจสอบบทที่ 5 ได้</span></div>
                        </div>
                      ) : (
                        <div className={`check-item ${resultData?.details?.chapters_list?.chap5 ? 'success' : 'error'}`}>
                          {resultData?.details?.chapters_list?.chap5 ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                          <div>
                            <span>{resultData?.details?.chapters_list?.chap5 ? 'ตรวจพบเนื้อหา บทที่ 5' : 'ไม่พบเนื้อหา บทที่ 5'}</span>
                            {!resultData?.details?.chapters_list?.chap5 && (
                              <p className="item-detail" style={{color: '#d32f2f', fontWeight: 'bold'}}>
                                วิธีแก้ไข: กรุณาเพิ่มหัวข้อ "บทที่ 5" ลงในเอกสารของคุณ
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    {/* หมวดหมู่: ชนิดฟอนต์ */}
                    <div className="checklist-group">
                      <h4><TypeIcon /> ชนิดและรูปแบบตัวอักษร (Font Family)</h4>
                      {(isEmpty || isError) ? (
                        <div className="check-item warning">
                          <AlertCircle size={20} className="flex-shrink-0" /> 
                          <div>
                            <span>ไม่สามารถตรวจสอบฟอนต์ได้</span>
                            <p className="item-detail">กรุณาอัปโหลดไฟล์ Word (.docx) ที่มีเนื้อหาเพื่อตรวจสอบ</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`check-item ${resultData?.details?.font_pass ? 'success' : 'error'}`}>
                          {resultData?.details?.font_pass ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                          <div>
                            <span>{resultData?.details?.font_pass ? 'ตรวจพบการใช้ฟอนต์ตระกูล TH Sarabun ถูกต้อง' : 'ตรวจพบชนิดฟอนต์ที่ไม่ถูกต้อง'}</span>
                            {!resultData?.details?.font_pass && resultData?.details?.font_details?.map((detail, idx) => (
                              <p key={idx} className="item-detail">{detail}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* หมวดหมู่: ขนาดตัวอักษร */}
                    <div className="checklist-group">
                      <h4><TextSizeIcon /> ขนาดตัวอักษร (Font Size)</h4>
                      {(isEmpty || isError) ? (
                        <div className="check-item warning">
                          <AlertCircle size={20} className="flex-shrink-0" /> 
                          <div>
                            <span>ไม่สามารถตรวจสอบขนาดอักษรได้</span>
                            <p className="item-detail">กรุณาอัปโหลดไฟล์ Word (.docx) ที่มีเนื้อหาเพื่อตรวจสอบ</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`check-item ${resultData?.details?.fontsize_pass ? 'success' : 'warning'}`}>
                          {resultData?.details?.fontsize_pass ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                          <div>
                            <span>{resultData?.details?.fontsize_pass ? 'การจัดรูปแบบขนาดตัวอักษรและตัวหนาถูกต้องตามมาตรฐาน' : 'พบการจัดรูปแบบตัวอักษรไม่ถูกต้องในบางจุด'}</span>
                            {!resultData?.details?.fontsize_pass && resultData?.details?.fontsize_details?.map((detail, idx) => (
                              <p key={idx} className="item-detail">{detail}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* หมวดหมู่: ระยะขอบและหน้ากระดาษ */}
                    <div className="checklist-group">
                      <h4><LayoutIcon /> ระยะขอบและหน้ากระดาษ (Margins)</h4>
                      {(isEmpty || isError) ? (
                        <div className="check-item warning">
                          <AlertCircle size={20} className="flex-shrink-0" /> 
                          <div>
                            <span>ไม่สามารถตรวจสอบระยะขอบได้</span>
                            <p className="item-detail">กรุณาอัปโหลดไฟล์ Word (.docx) ที่มีเนื้อหาเพื่อตรวจสอบ</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`check-item ${resultData?.details?.margin_pass ? 'success' : 'error'}`}>
                          {resultData?.details?.margin_pass ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                          <div>
                            <span>{resultData?.details?.margin_pass ? 'ตั้งค่าระยะขอบกระดาษถูกต้องตามมาตรฐาน' : 'พบการตั้งค่าระยะขอบกระดาษไม่ถูกต้อง'}</span>
                            {!resultData?.details?.margin_pass && resultData?.details?.margin_details?.map((detail, idx) => (
                              <p key={idx} className="item-detail">{detail}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Simple icon wrappers for categories
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'text-bottom'}}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>;
const TypeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'text-bottom'}}><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>;
const TextSizeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'text-bottom'}}><path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"></path><path d="M12 4v16"></path><path d="M8 20h8"></path><path d="M3 14h6"></path><path d="M6 14v6"></path></svg>;
const LayoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'text-bottom'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>;

export default CheckDocument;
