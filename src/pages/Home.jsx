import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Upload, FileSearch, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';
import './Home.css';

const Home = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <motion.div 
            className="hero-content"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="badge">
              <span className="badge-dot"></span>
              อัปเดตเกณฑ์ใหม่ล่าสุด ปีการศึกษา 2568
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="hero-title">
              ตรวจสอบมาตรฐาน<br />
              <span className="text-gradient">เอกสารโครงการ</span>อัตโนมัติ
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="hero-desc">
              ประหยัดเวลา ลดข้อผิดพลาด ด้วยระบบ AI ช่วยตรวจรูปแบบเอกสารโครงการ สำหรับนักเรียนแผนกวิชาคอมพิวเตอร์ธุรกิจ วิทยาลัยเทคนิคประจวบคีรีขันธ์
            </motion.p>
            
            <motion.div variants={fadeInUp} className="hero-actions">
              <Link to="/check" className="btn btn-primary btn-lg">
                เริ่มตรวจสอบเอกสาร
                <ArrowRight size={18} />
              </Link>
              <Link to="/guidelines" className="btn btn-outline btn-lg">
                <BookOpen size={18} />
                ดูคู่มือและเทมเพลต
              </Link>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="hero-image-container"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="glass-panel mock-dashboard">
              <div className="mock-header">
                <div className="mock-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="mock-title">ผลการตรวจสอบ.pdf</div>
              </div>
              <div className="mock-body">
                <div className="mock-score">
                  <div className="score-circle">
                  </div>
                  <div>
                    <h3 className="text-success">ผ่านเกณฑ์ส่วนใหญ่</h3>
                    <p>พบข้อผิดพลาดเล็กน้อย 2 จุด</p>
                  </div>
                </div>
                <div className="mock-checklist">
                  <div className="mock-item success">
                    <ShieldCheck size={16} /> ฟอนต์ TH Sarabun PSK
                  </div>
                  <div className="mock-item success">
                    <ShieldCheck size={16} /> โครงสร้าง 5 บท
                  </div>
                  <div className="mock-item error">
                    <div className="error-dot"></div> ระยะขอบหน้า 2 นิ้ว (บทที่ 1)
                  </div>
                </div>
              </div>
            </div>
            
            <div className="blur-blob blob-1"></div>
            <div className="blur-blob blob-2"></div>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>ทำงานอย่างไร?</h2>
            <p>ตรวจสอบเอกสารของคุณใน 3 ขั้นตอนง่ายๆ</p>
          </div>
          
          <div className="steps-container">
            <div className="step-card">
              <div className="step-icon">
                <Upload size={32} />
              </div>
              <h3>1. อัปโหลดไฟล์</h3>
              <p>ลากและวางไฟล์ .docx หรือ .pdf ของคุณลงในระบบ รองรับทั้งโครงการสิ่งประดิษฐ์และสื่อการเรียนรู้</p>
            </div>
            
            <div className="step-card">
              <div className="step-icon">
                <FileSearch size={32} />
              </div>
              <h3>2. ระบบประมวลผล</h3>
              <p>AI จะทำการสแกนรูปแบบฟอนต์ ระยะขอบ และโครงสร้างบทต่างๆ ตามมาตรฐานของวิทยาลัย</p>
            </div>
            
            <div className="step-card">
              <div className="step-icon">
                <ShieldCheck size={32} />
              </div>
              <h3>3. รับรายงานและแก้ไข</h3>
              <p>ดูผลลัพธ์และจุดที่ต้องแก้ไข พร้อมดาวน์โหลดรายงานเพื่อนำไปปรับปรุงเอกสารให้สมบูรณ์</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
