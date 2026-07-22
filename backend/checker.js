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

        let styleBoldMap = {};
        let styleSizeMap = {};

        // 0. Parse Styles.xml for default sizes and style properties
        let stylesXml;
        try {
            stylesXml = zip.readAsText('word/styles.xml');
        } catch (e) {
            stylesXml = null;
        }
        
        if (stylesXml) {
            const stylesDom = parser.parseFromString(stylesXml, 'text/xml');
            
            const checkOnOff = (val) => {
                if (val === null || val === undefined) return true;
                val = val.toLowerCase();
                if (val === '0' || val === 'false' || val === 'off') return false;
                return true;
            };

            const styles = stylesDom.getElementsByTagName('w:style');
            for (let i = 0; i < styles.length; i++) {
                const style = styles[i];
                const styleId = style.getAttribute('w:styleId');
                
                if (styleId) {
                    const rPr = style.getElementsByTagName('w:rPr')[0];
                    if (rPr) {
                        let isBold = false;
                        let sz = null;
                        
                        let bNode = rPr.getElementsByTagName('w:b')[0];
                        if (bNode && checkOnOff(bNode.getAttribute('w:val'))) isBold = true;
                        
                        let bCsNode = rPr.getElementsByTagName('w:bCs')[0];
                        if (bCsNode && checkOnOff(bCsNode.getAttribute('w:val'))) isBold = true;
                        
                        let szNode = rPr.getElementsByTagName('w:sz')[0];
                        let szCsNode = rPr.getElementsByTagName('w:szCs')[0];
                        
                        if (szCsNode) sz = parseInt(szCsNode.getAttribute('w:val')||'0', 10)/2;
                        else if (szNode) sz = parseInt(szNode.getAttribute('w:val')||'0', 10)/2;

                        styleBoldMap[styleId] = isBold;
                        if (sz) styleSizeMap[styleId] = sz;
                    }
                }

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
        }

        // Helper function to extract paragraph formatting
        function getFormat(node, defaultDocSize) {
            let b = false;
            let center = false;
         
            const pPr = node.getElementsByTagName('w:pPr')[0];
            let pStyleId = null;

            if (pPr) {
                const jc = pPr.getElementsByTagName('w:jc')[0];
                if (jc && (jc.getAttribute('w:val') === 'center' || jc.getAttribute('w:val') === 'both')) {
                    if (jc.getAttribute('w:val') === 'center') center = true;
                }
                const pStyleNode = pPr.getElementsByTagName('w:pStyle')[0];
                if (pStyleNode) pStyleId = pStyleNode.getAttribute('w:val');
            }

            let defaultPBold = pStyleId && styleBoldMap[pStyleId] ? true : false;
            let defaultPSize = pStyleId && styleSizeMap[pStyleId] ? styleSizeMap[pStyleId] : defaultDocSize;
            let sz = defaultPSize;
         
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
                    let pPr_rPr = null;
                    const pPr = node.getElementsByTagName('w:pPr')[0];
                    if (pPr) pPr_rPr = pPr.getElementsByTagName('w:rPr')[0];
                    
                    let runSz = defaultPSize;
                    let szNode = rPr ? rPr.getElementsByTagName('w:sz')[0] : (pPr_rPr ? pPr_rPr.getElementsByTagName('w:sz')[0] : null);
                    let szCsNode = rPr ? rPr.getElementsByTagName('w:szCs')[0] : (pPr_rPr ? pPr_rPr.getElementsByTagName('w:szCs')[0] : null);
         
                    let valCs = szCsNode ? parseInt(szCsNode.getAttribute('w:val')||'0', 10)/2 : 0;
                    let valAscii = szNode ? parseInt(szNode.getAttribute('w:val')||'0', 10)/2 : 0;
                    
                    if (valCs > 0) {
                        sz = valCs; // Prioritize Thai font size (Complex Scripts)
                    } else if (valAscii > 0) {
                        sz = valAscii;
                    } else {
                        sz = defaultPSize;
                    }
         
                    let runIsBold = defaultPBold;
                    let bNode = rPr ? rPr.getElementsByTagName('w:b')[0] : (pPr_rPr ? pPr_rPr.getElementsByTagName('w:b')[0] : null);
                    let bCsNode = rPr ? rPr.getElementsByTagName('w:bCs')[0] : (pPr_rPr ? pPr_rPr.getElementsByTagName('w:bCs')[0] : null);

                    const checkOnOff = (val) => {
                        if (val === null || val === undefined) return true;
                        val = val.toLowerCase();
                        if (val === '0' || val === 'false' || val === 'off') return false;
                        return true;
                    };

                    let hasExplicitBold = false;
                    let isExplicitlyBold = false;

                    if (bNode) {
                        hasExplicitBold = true;
                        if (checkOnOff(bNode.getAttribute('w:val'))) isExplicitlyBold = true;
                    }
                    if (bCsNode) {
                        hasExplicitBold = true;
                        if (checkOnOff(bCsNode.getAttribute('w:val'))) isExplicitlyBold = true;
                    }

                    if (hasExplicitBold) {
                        runIsBold = isExplicitlyBold;
                    }

                    totalTextLength += runText.trim().length;
                    if (runIsBold) boldTextLength += runText.trim().length;
                }
            }
            
            // If more than 50% of the text is bold, we consider the paragraph as a whole to be bold
            if (totalTextLength > 0 && (boldTextLength / totalTextLength) > 0.5) {
                b = true;
            }

            return { size: sz, isBold: b, isCenter: center };
         }

        // 1. Text Extraction & Structural check (Paragraph level)
        const paragraphs = docDom.getElementsByTagName('w:p');
        let fullText = '';
        
        let subtopicsData = {
            // Chap 1
            bg: { found: false, isBold: false, label: 'ความเป็นมาของโครงการ' },
            obj: { found: false, isBold: false, label: 'วัตถุประสงค์ของโครงการ' },
            scope: { found: false, isBold: false, label: 'ขอบเขตของโครงการ' },
            benefit: { found: false, isBold: false, label: 'ประโยชน์ที่ได้รับ' },
            method: { found: false, isBold: false, label: 'วิธีการดำเนินการ' },
            vocab: { found: false, isBold: false, label: 'นิยามศัพท์' },
            // Chap 3
            population: { found: false, isBold: false, label: 'ประชากรและกลุ่มตัวอย่าง' },
            tools: { found: false, isBold: false, label: 'เครื่องมือที่ใช้ในการวิจัย' },
            collect: { found: false, isBold: false, label: 'การเก็บรวบรวมข้อมูล' },
            analyze: { found: false, isBold: false, label: 'การวิเคราะห์ข้อมูล' }
        };

        const topicsToFind = [
            { id: 'bg', match: ['ความเป็นมาของโครงการ', 'ความเป็นมาของโครงงาน', 'ความเป็นมาและความสำคัญ'] },
            { id: 'obj', match: ['วัตถุประสงค์ของโครงการ', 'วัตถุประสงค์ของโครงงาน', 'วัตถุประสงค์'] },
            { id: 'scope', match: ['ขอบเขตของโครงการ', 'ขอบเขตของโครงงาน', 'ขอบเขต'] },
            { id: 'benefit', match: ['ประโยชน์ที่ได้รับ', 'ประโยชน์ที่คาดว่าจะได้รับ'] },
            { id: 'method', match: ['วิธีการดำเนินการ', 'วิธีดำเนินการ'] },
            { id: 'vocab', match: ['นิยามศัพท์'] },
            { id: 'population', match: ['ประชากรและกลุ่มตัวอย่าง'] },
            { id: 'tools', match: ['เครื่องมือที่ใช้ในการวิจัย', 'เครื่องมือที่ใช้ในการดำเนินงาน', 'เครื่องมือที่ใช้'] },
            { id: 'collect', match: ['การเก็บรวบรวมข้อมูล'] },
            { id: 'analyze', match: ['การวิเคราะห์ข้อมูล'] }
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
            const chapterTitles = ['บทนำ', 'เอกสารและงานวิจัยที่เกี่ยวข้อง', 'ทฤษฎีและเอกสารที่เกี่ยวข้อง', 'วิธีดำเนินการ', 'วิธีการดำเนินการ', 'วิธีดำเนินโครงการ', 'วิธีการดำเนินโครงการ', 'ผลการดำเนินงาน', 'ผลการศึกษา', 'สรุปผล', 'ข้อเสนอแนะ'];
            let isChapter = cleanPText.includes('บทที่') && cleanPText.length < 60;
            
            if (!isChapter) {
                for (let title of chapterTitles) {
                    if (cleanPText.includes(title) && cleanPText.length < 50) {
                        // To avoid collision with subtopics (like 'วิธีการดำเนินการ' in Chap 1),
                        // a chapter title must be immediately preceded by a paragraph containing 'บทที่'
                        let prevPText = '';
                        for (let prev = p - 1; prev >= 0; prev--) {
                            let text = '';
                            const pRuns = paragraphs[prev].getElementsByTagName('w:r');
                            for (let r = 0; r < pRuns.length; r++) {
                                const tNodes = pRuns[r].getElementsByTagName('w:t');
                                for (let t=0; t<tNodes.length; t++) {
                                    if (tNodes[t] && tNodes[t].textContent) text += tNodes[t].textContent;
                                }
                            }
                            if (text.trim().length > 0) {
                                prevPText = text.replace(/\s+/g, '');
                                break;
                            }
                        }
                        
                        if (prevPText.includes('บทที่')) {
                            isChapter = true;
                        }
                        break;
                    }
                }
            }
            
            let isSubtopic = false;
            let matchedTopicLabel = '';
            for (let topic of topicsToFind) {
                for (let keyword of topic.match) {
                    if (cleanPText.includes(keyword) && cleanPText.length < 60) {
                        isSubtopic = true;
                        matchedTopicLabel = topic.label || keyword;
                        subtopicsData[topic.id].found = true;
                        if (fmt.isBold) subtopicsData[topic.id].isBold = true;
                        break;
                    }
                }
                if (isSubtopic) break;
            }

            if (!isSubtopic && !isChapter) {
                // Check if it's a numbered subtopic like 2.1, 2.2, 2.1.1
                const trimmed = pText.trim();
                if (/^\d+\.\d+/.test(trimmed)) {
                    // Peek at the next non-empty paragraph to see if this is an outline list
                    let nextPText = '';
                    for (let n = p + 1; n < paragraphs.length && n < p + 5; n++) {
                        let text = '';
                        const nRuns = paragraphs[n].getElementsByTagName('w:r');
                        for (let r = 0; r < nRuns.length; r++) {
                            const tNodes = nRuns[r].getElementsByTagName('w:t');
                            for (let t=0; t<tNodes.length; t++) {
                                if (tNodes[t] && tNodes[t].textContent) text += tNodes[t].textContent;
                            }
                        }
                        if (text.trim().length > 0) {
                            nextPText = text.trim();
                            break;
                        }
                    }

                    let isOutlineList = false;
                    if (nextPText && /^\d+\.\d+/.test(nextPText) && nextPText.length < 70) {
                        isOutlineList = true;
                    }

                    let isLikelyHeading = false;
                    
                    // Check how many parts the number has (e.g. 2.1 = 2 parts, 2.1.1.1 = 4 parts)
                    const numMatch = trimmed.match(/^(\d+(?:\.\d+)+)/);
                    let numParts = 2;
                    if (numMatch) {
                        numParts = numMatch[1].split('.').length;
                    }
                    
                    // Real headings are usually short, don't contain colons, and are not part of an outline list
                    if (trimmed.length < 70 && !trimmed.includes(':') && !isOutlineList) {
                        // If it is a deep numbered list (3 or more levels like 2.1.1) and NOT bold, assume it is content
                        if (numParts >= 3 && !fmt.isBold) {
                            isLikelyHeading = false;
                        } else {
                            isLikelyHeading = true;
                        }
                    } else if (fmt.isBold && trimmed.length < 120) {
                        // If they intentionally bolded it, treat it as a heading even if it's part of a list or longer
                        isLikelyHeading = true;
                    }

                    if (isLikelyHeading) {
                        isSubtopic = true;
                        matchedTopicLabel = trimmed.substring(0, 30) + (trimmed.length > 30 ? '...' : '');
                    }
                }
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
                    if (fmt.size !== 16) errs.push(`ขนาด ${fmt.size}pt (กรุณาแก้ไขเป็น 16pt)`);
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
                let isInsideMath = false;
                let parent = rNode.parentNode;
                while (parent) {
                    if (parent.nodeName && parent.nodeName.startsWith('m:')) {
                        isInsideMath = true;
                        break;
                    }
                    parent = parent.parentNode;
                }

                if (isInsideMath) continue; // Skip font checking for mathematical equations

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
                    
                    if (fontName) {
                        const isSarabun = fontName.includes('TH Sarabun');
                        const isMathOrSymbol = fontName.includes('Math') || fontName.includes('Symbol');
                        
                        if (!isSarabun && !isMathOrSymbol) {
                            foundFonts.add(fontName);
                        }
                    }
                }
            }
        }

        if (foundFonts.size > 0) {
            fontPass = false;
            fontDetails.push(`พบการใช้งานฟอนต์อื่น: ${Array.from(foundFonts).join(', ')}`);
        }
        
        // Check for 3 formulas and their citations
        // Reduced lookahead from 100 to 35 characters to prevent matching the citation of a different formula nearby
        const formula_percent = /ค่าร้อยละ.{0,35}?ใช้สูตรดังนี้\s*:?\s*\([^)]+,\s*\d{4}\)/i.test(fullText);
        const formula_mean = /ค่าเฉลี่ย.{0,35}?ใช้สูตรดังนี้\s*:?\s*\([^)]+,\s*\d{4}\)/i.test(fullText);
        const formula_sd = /ส่วนเบี่ยงเบนมาตรฐาน.{0,35}?ใช้สูตรดังนี้\s*:?\s*\([^)]+,\s*\d{4}\)/i.test(fullText);

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
            subtopics: subtopicsData,
            formulas: {
                percent: formula_percent,
                mean: formula_mean,
                sd: formula_sd
            }
        };

    } catch (e) {
        console.error("Parse Error:", e);
        return { error: e.message, isBlank: true };
    }
}

module.exports = { checkDocx };
