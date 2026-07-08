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
        
        let foundFonts = new Set();
        let foundSizes = new Set();

        // 0. Parse Styles.xml for default sizes
        let stylesXml;
        try {
            stylesXml = zip.readAsText('word/styles.xml');
        } catch (e) {
            stylesXml = null;
        }
        
        if (stylesXml) {
            const stylesDom = parser.parseFromString(stylesXml, 'text/xml');
            
            // Check docDefaults
            const docDefaults = stylesDom.getElementsByTagName('w:docDefaults')[0];
            if (docDefaults) {
                const szNodes = docDefaults.getElementsByTagName('w:sz');
                for (let i = 0; i < szNodes.length; i++) {
                    const val = parseInt(szNodes[i].getAttribute('w:val') || '0', 10);
                    if (val > 0) foundSizes.add(val / 2);
                }
                const szCsNodes = docDefaults.getElementsByTagName('w:szCs');
                for (let i = 0; i < szCsNodes.length; i++) {
                    const val = parseInt(szCsNodes[i].getAttribute('w:val') || '0', 10);
                    if (val > 0) foundSizes.add(val / 2);
                }
            }

            // Check Normal style or default paragraph style
            const styles = stylesDom.getElementsByTagName('w:style');
            for (let i = 0; i < styles.length; i++) {
                const style = styles[i];
                if (style.getAttribute('w:type') === 'paragraph' && style.getAttribute('w:default') === '1') {
                    const szNodes = style.getElementsByTagName('w:sz');
                    for (let j = 0; j < szNodes.length; j++) {
                        const val = parseInt(szNodes[j].getAttribute('w:val') || '0', 10);
                        if (val > 0) foundSizes.add(val / 2);
                    }
                    const szCsNodes = style.getElementsByTagName('w:szCs');
                    for (let j = 0; j < szCsNodes.length; j++) {
                        const val = parseInt(szCsNodes[j].getAttribute('w:val') || '0', 10);
                        if (val > 0) foundSizes.add(val / 2);
                    }
                }
            }
        }

        // Helper function to extract paragraph formatting
        function getFormat(node, defaultDocSize) {
            let b = false;
            let sz = defaultDocSize;
            let center = false;
         
            const pPr = node.getElementsByTagName('w:pPr')[0];
            let pPr_rPr = null;
            if (pPr) {
                const jc = pPr.getElementsByTagName('w:jc')[0];
                if (jc && (jc.getAttribute('w:val') === 'center' || jc.getAttribute('w:val') === 'both')) {
                    if (jc.getAttribute('w:val') === 'center') center = true;
                }
                pPr_rPr = pPr.getElementsByTagName('w:rPr')[0];
            }
         
            const runs = node.getElementsByTagName('w:r');
            let totalTextLength = 0;
            let boldTextLength = 0;

            for(let r=0; r<runs.length; r++) {
                let runText = '';
                const tNodes = runs[r].getElementsByTagName('w:t');
                for(let t=0; t<tNodes.length; t++) {
                    if (tNodes[t] && tNodes[t].textContent.trim().length > 0) {
                        runText += tNodes[t].textContent;
                    }
                }
                
                if (runText.trim().length > 0) {
                    let rPr = runs[r].getElementsByTagName('w:rPr')[0];
                    
                    if (sz === defaultDocSize) {
                        let szNode = rPr ? rPr.getElementsByTagName('w:sz')[0] : null;
                        let szCsNode = rPr ? rPr.getElementsByTagName('w:szCs')[0] : null;
                        if (!szNode && pPr_rPr) szNode = pPr_rPr.getElementsByTagName('w:sz')[0];
                        if (!szCsNode && pPr_rPr) szCsNode = pPr_rPr.getElementsByTagName('w:szCs')[0];
             
                        if (szCsNode) sz = parseInt(szCsNode.getAttribute('w:val')||'0', 10)/2 || sz;
                        else if (szNode) sz = parseInt(szNode.getAttribute('w:val')||'0', 10)/2 || sz;
                    }
         
                    let runIsBold = false;
                    let bNode = rPr ? rPr.getElementsByTagName('w:b')[0] : null;
                    if (!bNode && pPr_rPr) bNode = pPr_rPr.getElementsByTagName('w:b')[0];
                    
                    let bCsNode = rPr ? rPr.getElementsByTagName('w:bCs')[0] : null;
                    if (!bCsNode && pPr_rPr) bCsNode = pPr_rPr.getElementsByTagName('w:bCs')[0];

                    const checkOnOff = (val) => {
                        if (val === null || val === undefined) return true;
                        val = val.toLowerCase();
                        if (val === '0' || val === 'false' || val === 'off') return false;
                        return true;
                    };

                    if (bNode) {
                        if (checkOnOff(bNode.getAttribute('w:val'))) runIsBold = true;
                    }
                    if (bCsNode) {
                        if (checkOnOff(bCsNode.getAttribute('w:val'))) runIsBold = true;
                    }

                    totalTextLength += runText.trim().length;
                    if (runIsBold) boldTextLength += runText.trim().length;
                }
            }
            
            // If more than 80% of the text is bold, we consider the paragraph as a whole to be bold
            if (totalTextLength > 0 && (boldTextLength / totalTextLength) > 0.8) {
                b = true;
            }

            return { size: sz, isBold: b, isCenter: center };
         }

        // 1. Text Extraction & Structural check (Paragraph level)
        const paragraphs = docDom.getElementsByTagName('w:p');
        let fullText = '';
        
        let subtopicsData = {
            bg: { found: false, isBold: false, label: 'ความเป็นมาของโครงการ' },
            obj: { found: false, isBold: false, label: 'วัตถุประสงค์ของโครงการ' },
            scope: { found: false, isBold: false, label: 'ขอบเขตของโครงการ' },
            benefit: { found: false, isBold: false, label: 'ประโยชน์ที่ได้รับ' },
            method: { found: false, isBold: false, label: 'วิธีการดำเนินการ' },
            vocab: { found: false, isBold: false, label: 'นิยามศัพท์' }
        };

        const topicsToFind = [
            { id: 'bg', match: ['ความเป็นมาของโครงการ', 'ความเป็นมาของโครงงาน', 'ความเป็นมาและความสำคัญ'] },
            { id: 'obj', match: ['วัตถุประสงค์ของโครงการ', 'วัตถุประสงค์ของโครงงาน', 'วัตถุประสงค์'] },
            { id: 'scope', match: ['ขอบเขตของโครงการ', 'ขอบเขตของโครงงาน', 'ขอบเขต'] },
            { id: 'benefit', match: ['ประโยชน์ที่ได้รับ', 'ประโยชน์ที่คาดว่าจะได้รับ'] },
            { id: 'method', match: ['วิธีการดำเนินการ', 'วิธีดำเนินการ'] },
            { id: 'vocab', match: ['นิยามศัพท์'] }
        ];

        let formatDetails = [];
        let fontSizePass = true;
        let defaultDocSize = foundSizes.size > 0 ? Array.from(foundSizes)[0] : 16;

        for (let p = 0; p < paragraphs.length; p++) {
            const pNode = paragraphs[p];
            const runs = pNode.getElementsByTagName('w:r');
            let pText = '';
            
            for (let r = 0; r < runs.length; r++) {
                const tNodes = runs[r].getElementsByTagName('w:t');
                for(let t=0; t<tNodes.length; t++) {
                    if (tNodes[t] && tNodes[t].textContent) {
                        pText += tNodes[t].textContent;
                    }
                }
            }
            
            if (pText.trim().length === 0) continue;
            
            const cleanPText = pText.replace(/\s+/g, '');
            fullText += pText + ' ';

            let fmt = getFormat(pNode, defaultDocSize);

            // Role identification
            const isChapter = cleanPText.includes('บทที่') || (cleanPText.includes('บทนำ') && cleanPText.length < 20) || (cleanPText.includes('สรุปผล') && cleanPText.length < 30);
            
            let isSubtopic = false;
            let matchedTopicLabel = '';
            for (let topic of topicsToFind) {
                for (let keyword of topic.match) {
                    if (cleanPText.includes(keyword)) {
                        isSubtopic = true;
                        matchedTopicLabel = topic.label || keyword;
                        subtopicsData[topic.id].found = true;
                        if (fmt.isBold) subtopicsData[topic.id].isBold = true;
                        break;
                    }
                }
                if (isSubtopic) break;
            }

            let errs = [];
            if (isChapter) {
                if (fmt.size !== 18) errs.push(`ขนาด ${fmt.size}pt (กรุณาแก้ไขเป็น 18pt)`);
                if (!fmt.isBold) errs.push(`ไม่ใช่ตัวหนา (กรุณาทำเป็นตัวหนา)`);
                if (!fmt.isCenter) errs.push(`ไม่ได้จัดกึ่งกลาง (กรุณาจัดหน้าแบบกึ่งกลาง)`);
                if (errs.length > 0) {
                    if (formatDetails.length < 15) formatDetails.push(`ชื่อบท "${pText.trim().substring(0,30)}...": ${errs.join(', ')}`);
                    fontSizePass = false;
                }
            } else if (isSubtopic) {
                if (fmt.size !== 16) errs.push(`ขนาด ${fmt.size}pt (กรุณาแก้ไขเป็น 16pt)`);
                if (!fmt.isBold) errs.push(`ไม่ใช่ตัวหนา (กรุณาทำเป็นตัวหนา)`);
                if (errs.length > 0) {
                    if (formatDetails.length < 15) formatDetails.push(`หัวข้อรอง "${matchedTopicLabel}": ${errs.join(', ')}`);
                    fontSizePass = false;
                }
            } else {
                // General content
                if (cleanPText.length > 10) { // skip very short lines like page numbers
                    if (fmt.size !== 16 && fmt.size < 40) errs.push(`ขนาด ${fmt.size}pt (กรุณาแก้ไขเป็น 16pt)`);
                    if (fmt.isBold && cleanPText.length > 20) errs.push(`เป็นตัวหนาทั้งย่อหน้า (กรุณาแก้ไขเป็นตัวอักษรธรรมดา ตัวไม่หนา)`);
                    if (errs.length > 0) {
                        if (formatDetails.length < 15) formatDetails.push(`เนื้อหาทั่วไปขึ้นต้นด้วย "${pText.trim().substring(0,25)}...": ${errs.join(', ')}`);
                        fontSizePass = false;
                    }
                }
            }
            if (!fontSizePass && formatDetails.length === 15) {
                formatDetails.push(`...และข้อผิดพลาดอื่นๆ อีก (ระบบแสดงผลสูงสุด 15 จุด)`);
                formatDetails.push(`PLACEHOLDER_TO_PREVENT_MORE`);
            }
        }
        // Remove placeholder
        if (formatDetails[formatDetails.length-1] === `PLACEHOLDER_TO_PREVENT_MORE`) formatDetails.pop();
        
        const isBlank = fullText.trim().length < 50;
        
        const hasChap1 = fullText.includes('บทที่1') || fullText.includes('บทที่ 1');
        const hasChap2 = fullText.includes('บทที่2') || fullText.includes('บทที่ 2');
        const hasChap3 = fullText.includes('บทที่3') || fullText.includes('บทที่ 3');
        const hasChap4 = fullText.includes('บทที่4') || fullText.includes('บทที่ 4');
        const hasChap5 = fullText.includes('บทที่5') || fullText.includes('บทที่ 5');

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

        // 3. Font Family Check Only
        let fontPass = true;
        let fontDetails = [];
        let sizeDetails = formatDetails; // reuse the structural details variable

        const runs = docDom.getElementsByTagName('w:r');
        for (let i = 0; i < runs.length; i++) {
            const rNode = runs[i];
            
            let hasVisibleText = false;
            const tNodes = rNode.getElementsByTagName('w:t');
            for(let t=0; t<tNodes.length; t++) {
                if (tNodes[t] && tNodes[t].textContent && tNodes[t].textContent.trim().length > 0) {
                    hasVisibleText = true;
                    break;
                }
            }

            if (hasVisibleText) {
                let rPr = rNode.getElementsByTagName('w:rPr')[0];
                let pPr_rPr = null;
                const parentP = rNode.parentNode;
                if (parentP && parentP.tagName === 'w:p') {
                    const pPr = parentP.getElementsByTagName('w:pPr')[0];
                    if (pPr) {
                        pPr_rPr = pPr.getElementsByTagName('w:rPr')[0];
                    }
                }

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
            }
        }

        if (foundFonts.size > 0) {
            fontPass = false;
            fontDetails.push(`พบการใช้งานฟอนต์อื่น: ${Array.from(foundFonts).join(', ')}`);
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
