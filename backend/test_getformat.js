const { DOMParser } = require('@xmldom/xmldom');

const xml = `
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        <w:p>
            <w:r>
                <w:rPr>
                    <w:sz w:val="32"/>
                    <w:szCs w:val="32"/>
                </w:rPr>
                <w:t>อย่างไรก็ตาม </w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:sz w:val="24"/>
                    <w:szCs w:val="24"/>
                </w:rPr>
                <w:t>ในทางปฏิบัติมักพบปัญหาด้านการจัดการเอกสาร</w:t>
            </w:r>
        </w:p>
    </w:body>
</w:document>
`;

const docDom = new DOMParser().parseFromString(xml, 'text/xml');
const pNode = docDom.getElementsByTagName('w:p')[0];

const styleBoldMap = {};
const styleSizeMap = {};
const defaultDocSize = 16;

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
            
            let runSz = defaultPSize;
            let szNode = rPr ? rPr.getElementsByTagName('w:sz')[0] : null;
            let szCsNode = rPr ? rPr.getElementsByTagName('w:szCs')[0] : null;
 
            if (szCsNode) runSz = parseInt(szCsNode.getAttribute('w:val')||'0', 10)/2 || runSz;
            else if (szNode) runSz = parseInt(szNode.getAttribute('w:val')||'0', 10)/2 || runSz;
            
            if (runSz !== defaultPSize && sz === defaultPSize) {
                sz = runSz;
            }
 
            let runIsBold = defaultPBold;
            let bNode = rPr ? rPr.getElementsByTagName('w:b')[0] : null;
            let bCsNode = rPr ? rPr.getElementsByTagName('w:bCs')[0] : null;

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
    
    if (totalTextLength > 0 && (boldTextLength / totalTextLength) > 0.5) {
        b = true;
    }

    return { size: sz, isBold: b, isCenter: center };
}

console.log(getFormat(pNode, defaultDocSize));
