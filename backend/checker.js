const AdmZip = require('adm-zip');
const { DOMParser } = require('@xmldom/xmldom');

function checkDocx(buffer) {
    try {
        const zip = new AdmZip(buffer);
        let documentXml;
        try {
            documentXml = zip.readAsText('word/document.xml');
        } catch (e) {
            return { error: 'Not a valid word document', isBlank: true };
        }
        
        if (!documentXml) {
            return { error: 'Empty document.xml', isBlank: true };
        }

        const parser = new DOMParser();
        const docDom = parser.parseFromString(documentXml, 'text/xml');
        
        // 1. Text Extraction & Chapter check
        const texts = docDom.getElementsByTagName('w:t');
        let fullText = '';
        for (let i = 0; i < texts.length; i++) {
            if (texts[i].textContent) {
                fullText += texts[i].textContent;
            }
        }
        
        const isBlank = fullText.trim().length < 50;
        
        const hasChap1 = fullText.includes('บทที่1') || fullText.includes('บทนำ') || fullText.includes('บทที่ 1');
        const hasChap2 = fullText.includes('บทที่2') || fullText.includes('ทฤษฎี') || fullText.includes('บทที่ 2');
        const hasChap3 = fullText.includes('บทที่3') || fullText.includes('วิธี') || fullText.includes('บทที่ 3');
        const hasChap4 = fullText.includes('บทที่4') || fullText.includes('ผลการ') || fullText.includes('บทที่ 4');
        const hasChap5 = fullText.includes('บทที่5') || fullText.includes('สรุป') || fullText.includes('บทที่ 5');

        // 2. Margins Check
        let marginPass = true;
        let marginDetails = [];
        const pgMars = docDom.getElementsByTagName('w:pgMar');
        if (pgMars.length > 0) {
            // Check the last section properties which usually define the main document margins
            const mar = pgMars[pgMars.length - 1];
            const top = parseInt(mar.getAttribute('w:top') || '0', 10);
            const left = parseInt(mar.getAttribute('w:left') || '0', 10);
            const bottom = parseInt(mar.getAttribute('w:bottom') || '0', 10);
            const right = parseInt(mar.getAttribute('w:right') || '0', 10);
            
            // Expected: Top 1.5" (2160) or 2" (2880), Left 1.5" (2160), Bottom 1" (1440), Right 1" (1440)
            if (left < 2100) { marginPass = false; marginDetails.push(`ระยะขอบซ้ายน้อยกว่า 1.5 นิ้ว (${Math.round(left/1440 * 100)/100} นิ้ว)`); }
            if (right < 1400) { marginPass = false; marginDetails.push(`ระยะขอบขวาน้อยกว่า 1 นิ้ว (${Math.round(right/1440 * 100)/100} นิ้ว)`); }
            if (bottom < 1400) { marginPass = false; marginDetails.push(`ระยะขอบล่างน้อยกว่า 1 นิ้ว (${Math.round(bottom/1440 * 100)/100} นิ้ว)`); }
            if (top < 2100) { marginPass = false; marginDetails.push(`ระยะขอบบนน้อยกว่า 1.5 นิ้ว (${Math.round(top/1440 * 100)/100} นิ้ว)`); }
        }

        // 3. Fonts and Sizes Check
        let fontPass = true;
        let fontSizePass = true;
        let fontDetails = [];
        let sizeDetails = [];
        let foundFonts = new Set();
        let foundSizes = new Set();

        const runs = docDom.getElementsByTagName('w:r');
        for (let i = 0; i < runs.length; i++) {
            const rPr = runs[i].getElementsByTagName('w:rPr')[0];
            if (rPr) {
                // Check Font
                const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
                if (rFonts) {
                    const ascii = rFonts.getAttribute('w:ascii');
                    const hAnsi = rFonts.getAttribute('w:hAnsi');
                    const fontName = ascii || hAnsi;
                    if (fontName && !fontName.includes('TH Sarabun')) {
                        foundFonts.add(fontName);
                    }
                }
                
                // Check Size
                const sz = rPr.getElementsByTagName('w:sz')[0];
                if (sz) {
                    const val = parseInt(sz.getAttribute('w:val') || '0', 10);
                    if (val > 0) {
                        foundSizes.add(val / 2); // val is in half-points
                    }
                }
            }
        }

        if (foundFonts.size > 0) {
            fontPass = false;
            fontDetails.push(`พบการใช้งานฟอนต์อื่น: ${Array.from(foundFonts).join(', ')}`);
        }

        // We check if they use totally wrong sizes
        let abnormalSizes = [];
        foundSizes.forEach(size => {
            if (size !== 16 && size !== 18 && size !== 20 && size !== 22 && size !== 24 && size < 40) {
                if (size < 16 || (size > 20 && size !== 24)) {
                   abnormalSizes.push(`${size}pt`);
                }
            }
        });

        if (abnormalSizes.length > 0) {
            fontSizePass = false;
            sizeDetails.push(`พบขนาดตัวอักษรผิดปกติ: ${abnormalSizes.join(', ')} (ควรใช้ 16pt หรือ 20pt)`);
        }
        
        return {
            chapters: { chap1: hasChap1, chap2: hasChap2, chap3: hasChap3, chap4: hasChap4, chap5: hasChap5 },
            isBlank: isBlank,
            formatting: {
                marginPass,
                marginDetails,
                fontPass,
                fontDetails,
                fontSizePass,
                sizeDetails
            }
        };

    } catch (e) {
        console.error("Parse Error:", e);
        return { error: e.message, isBlank: true };
    }
}

module.exports = { checkDocx };
