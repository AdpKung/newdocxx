import React from 'react';
import { Download, BookOpen, FileText, Image as ImageIcon } from 'lucide-react';

const Guidelines = () => {
  return (
    <div className="container" style={{ padding: '3rem 0' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>คู่มือและ<span className="text-gradient">เทมเพลต</span></h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>ดาวน์โหลดไฟล์ต้นแบบและศึกษาระเบียบการจัดทำเอกสารโครงการ</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        {/* Template Cards */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={30} />
          </div>
          <h3 style={{ fontSize: '1.25rem' }}>เทมเพลตโครงการสิ่งประดิษฐ์</h3>
          <p style={{ color: 'var(--text-muted)', flex: 1 }}>ไฟล์ Word (.docx) ที่ตั้งค่าระยะขอบ ฟอนต์ TH Sarabun PSK ขนาด 16pt และรูปแบบหน้าต่างๆ ไว้เรียบร้อยแล้ว</p>
          <button className="btn btn-outline" style={{ width: '100%' }}>
            <Download size={18} /> ดาวน์โหลด .docx
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(225, 29, 72, 0.1)', color: '#E11D48', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={30} />
          </div>
          <h3 style={{ fontSize: '1.25rem' }}>เทมเพลตโครงการสื่อการเรียนรู้</h3>
          <p style={{ color: 'var(--text-muted)', flex: 1 }}>ไฟล์ Word สำหรับโครงการประเภทสื่อการเรียนรู้ พร้อมโครงสร้าง 5 บทที่ถูกต้องตามเกณฑ์</p>
          <button className="btn btn-outline" style={{ width: '100%' }}>
            <Download size={18} /> ดาวน์โหลด .docx
          </button>
        </div>
      </div>

      {/* Manual Sections */}
      <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>คลังความรู้สำหรับการจัดทำเอกสาร</h2>
      
      {/* Chapter Criteria Section */}
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', marginTop: '1rem' }}>เกณฑ์การตรวจสอบโครงสร้างบทที่ 1-5</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>ระบบจะทำการตรวจสอบว่าเอกสารของคุณมีหัวข้อบังคับครบถ้วนตามนี้หรือไม่ (หัวข้อต้องเป็นตัวหนา 16pt)</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
          <h4 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} /> บทที่ 1: บทนำ</h4>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <li>ความเป็นมาของโครงการ (หรือ ความเป็นมาและความสำคัญ)</li>
            <li>วัตถุประสงค์ของโครงการ</li>
            <li>ขอบเขตของโครงการ</li>
            <li>ประโยชน์ที่ได้รับ (หรือ ประโยชน์ที่คาดว่าจะได้รับ)</li>
            <li>วิธีการดำเนินการ</li>
            <li>นิยามศัพท์</li>
          </ul>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
          <h4 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} /> บทที่ 2: ทฤษฎีที่เกี่ยวข้อง</h4>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.8' }}>ระบบจะตรวจสอบรูปแบบฟอนต์และการจัดหน้าทั่วไป (ไม่มีการบังคับหัวข้อย่อยเจาะจง เนื่องจากแต่ละโครงงานใช้ทฤษฎีต่างกัน)</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
          <h4 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} /> บทที่ 3: วิธีดำเนินการ</h4>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <li>ประชากรและกลุ่มตัวอย่าง</li>
            <li>เครื่องมือที่ใช้ในการวิจัย (หรือ เครื่องมือที่ใช้ในการดำเนินงาน)</li>
            <li>การเก็บรวบรวมข้อมูล</li>
            <li>การวิเคราะห์ข้อมูล</li>
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
          <h4 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} /> บทที่ 4: ผลการดำเนินงาน</h4>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <li>วิธีการทดลอง (หรือ วิธีการ/ขั้นตอนทดสอบ)</li>
            <li>ผลการทดลอง (หรือ ผลการวิเคราะห์)</li>
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
          <h4 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} /> บทที่ 5: สรุปผลและข้อเสนอแนะ</h4>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <li>สรุปผลการทดลอง (หรือ สรุปผลการวิจัย/ดำเนินงาน)</li>
            <li>ปัญหาและอุปสรรค</li>
            <li>ข้อเสนอแนะและแนวทางในการพัฒนา</li>
          </ul>
        </div>
      </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
          <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '50%' }}>
            <BookOpen size={24} color="var(--primary)" />
          </div>
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>รูปแบบการเขียนบรรณานุกรม</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>ตัวอย่างการเขียนอ้างอิงจากหนังสือ เว็บไซต์ บทความ รูปแบบ: ผู้แต่ง.//ปีที่พิมพ์.//ชื่อหนังสือ./เมืองที่พิมพ์/://สำนักพิมพ์.</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
          <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '50%' }}>
            <ImageIcon size={24} color="var(--primary)" />
          </div>
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>การแทรกรูปภาพและตาราง</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>ข้อกำหนดในการวางภาพประกอบ การเขียนคำบรรยายใต้ภาพ (ภาพที่ 1.1 ...) และการจัดตาราง (ตารางที่ 1.1 ...)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guidelines;
