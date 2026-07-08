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
        
        // 1. Text Extraction & Chapter check (Paragraph level)
        const paragraphs = docDom.getElementsByTagName('w:p');
        let fullText = '';
        
        let subtopicsData = {
            bg: { found: false, isBold: false, label: 'ความเป็นมาของโครงงาน' },
            obj: { found: false, isBold: false, label: 'วัตถุประสงค์ของโครงงาน' },
            scope: { found: false, isBold: false, label: 'ขอบเขตของโครงงาน' },
            benefit: { found: false, isBold: false, label: 'ประโยชน์ที่ได้รับ' },
            method: { found: false, isBold: false, label: 'วิธีการดำเนินการ' },
            vocab: { found: false, isBold: false, label: 'นิยามศัพท์' }
        };

        const topicsToFind = [
            { id: 'bg', match: ['ความเป็นมาของโครงงาน', 'ความเป็นมาและความสำคัญ'] },
            { id: 'obj', match: ['วัตถุประสงค์ของโครงงาน', 'วัตถุประสงค์'] },
            { id: 'scope', match: ['ขอบเขตของโครงงาน', 'ขอบเขต'] },
            { id: 'benefit', match: ['ประโยชน์ที่ได้รับ', 'ประโยชน์ที่คาดว่าจะได้รับ'] },
            { id: 'method', match: ['วิธีการดำเนินการ', 'วิธีดำเนินการ'] },
            { id: 'vocab', match: ['นิยามศัพท์'] }
        ];

        for (let p = 0; p < paragraphs.length; p++) {
            const pNode = paragraphs[p];
            const runs = pNode.getElementsByTagName('w:r');
            let pText = '';
            let pBold = false;
            
            // Check if paragraph style makes it bold
            const pPr = pNode.getElementsByTagName('w:pPr')[0];
            if (pPr) {
                const pRPr = pPr.getElementsByTagName('w:rPr')[0];
                if (pRPr && pRPr.getElementsByTagName('w:b').length > 0) {
                    pBold = true;
                }
            }

            for (let r = 0; r < runs.length; r++) {
                const rNode = runs[r];
                const tNodes = rNode.getElementsByTagName('w:t');
                for(let t=0; t<tNodes.length; t++) {
                    if (tNodes[t] && tNodes[t].textContent) {
                        pText += tNodes[t].textContent;
                    }
                }
            }
            
            const cleanPText = pText.replace(/\s+/g, '');
            fullText += pText + ' ';

            for (let topic of topicsToFind) {
                let isMatch = false;
                for (let keyword of topic.match) {
                    if (cleanPText.includes(keyword)) {
                        isMatch = true;
                        break;
                    }
                }

                if (isMatch) {
                    subtopicsData[topic.id].found = true;
                    let runBold = false;
                    for (let r = 0; r < runs.length; r++) {
                        const rNode = runs[r];
                        const tNodes = rNode.getElementsByTagName('w:t');
                        let hasText = false;
                        for(let t=0; t<tNodes.length; t++) {
                            if (tNodes[t] && tNodes[t].textContent.trim().length > 0) hasText = true;
                        }
                        if (hasText) {
                            const rPr = rNode.getElementsByTagName('w:rPr')[0];
                            if (rPr && rPr.getElementsByTagName('w:b').length > 0) {
                                runBold = true;
                            }
                        }
                    }
                    if (pBold || runBold) {
                        subtopicsData[topic.id].isBold = true;
                    }
                }
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
            const rNode = runs[i];
            
            // Check if this run actually has visible text
            let hasVisibleText = false;
            const tNodes = rNode.getElementsByTagName('w:t');
            for(let t=0; t<tNodes.length; t++) {
                if (tNodes[t] && tNodes[t].textContent && tNodes[t].textContent.trim().length > 0) {
                    hasVisibleText = true;
                    break;
                }
            }

            // Only check fonts and sizes if there's actual text
            if (hasVisibleText) {
                let rPr = rNode.getElementsByTagName('w:rPr')[0];
                
                // If run doesn't have rPr (or specific font/size), check parent paragraph's pPr
                let pPr_rPr = null;
                const parentP = rNode.parentNode;
                if (parentP && parentP.tagName === 'w:p') {
                    const pPr = parentP.getElementsByTagName('w:pPr')[0];
                    if (pPr) {
                        pPr_rPr = pPr.getElementsByTagName('w:rPr')[0];
                    }
                }

                // Check Font
                let rFonts = rPr ? rPr.getElementsByTagName('w:rFonts')[0] : null;
                if (!rFonts && pPr_rPr) rFonts = pPr_rPr.getElementsByTagName('w:rFonts')[0];
                
                if (rFonts) {
                    const ascii = rFonts.getAttribute('w:ascii');
                    const hAnsi = rFonts.getAttribute('w:hAnsi');
                    const fontName = ascii || hAnsi;
                    if (fontName && !fontName.includes('TH Sarabun')) {
                        foundFonts.add(fontName);
                    }
                }
                
                // Check Size
                let sz = rPr ? rPr.getElementsByTagName('w:sz')[0] : null;
                let szCs = rPr ? rPr.getElementsByTagName('w:szCs')[0] : null;
                
                if (!sz && pPr_rPr) sz = pPr_rPr.getElementsByTagName('w:sz')[0];
                if (!szCs && pPr_rPr) szCs = pPr_rPr.getElementsByTagName('w:szCs')[0];
                
                if (sz) {
                    const val = parseInt(sz.getAttribute('w:val') || '0', 10);
                    if (val > 0) foundSizes.add(val / 2);
                }
                if (szCs) {
                    const val = parseInt(szCs.getAttribute('w:val') || '0', 10);
                    if (val > 0) foundSizes.add(val / 2);
                }
            }
        }

        if (foundFonts.size > 0) {
            fontPass = false;
            fontDetails.push(`พบการใช้งานฟอนต์อื่น: ${Array.from(foundFonts).join(', ')}`);
        }

        // We check if they use totally wrong sizes
        let abnormalSizes = [];
        const allowedSizes = [16, 18, 20, 22, 24]; // Standard Thai thesis sizes
        
        foundSizes.forEach(size => {
            // Check if size is not in allowed list. Ignore very large sizes (like 40+) as they might be cover pages
            if (!allowedSizes.includes(size) && size < 36) {
                abnormalSizes.push(`${size}pt`);
            }
        });

        if (abnormalSizes.length > 0) {
            fontSizePass = false;
            sizeDetails.push(`พบขนาดตัวอักษรผิดปกติ: ${abnormalSizes.join(', ')} (ควรใช้ 16pt, 18pt, หรือ 20pt)`);
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
            },
            subtopics: subtopicsData
        };

    } catch (e) {
        console.error("Parse Error:", e);
        return { error: e.message, isBlank: true };
    }
}

module.exports = { checkDocx };
