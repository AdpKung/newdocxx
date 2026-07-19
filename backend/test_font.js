const { DOMParser } = require('@xmldom/xmldom');

const xmlString = `
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- Case 1: Run with explicit size -->
    <w:p>
      <w:r>
        <w:rPr>
          <w:sz w:val="56"/>
          <w:szCs w:val="56"/>
        </w:rPr>
        <w:t>Hello 28pt</w:t>
      </w:r>
    </w:p>
    
    <!-- Case 2: Paragraph with rPr size -->
    <w:p>
      <w:pPr>
        <w:rPr>
          <w:sz w:val="28"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:t>Hello 14pt</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>
`;

const docDom = new DOMParser().parseFromString(xmlString, 'text/xml');
let foundSizes = new Set();
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

console.log("Found sizes:", Array.from(foundSizes));
