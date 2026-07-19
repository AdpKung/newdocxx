const { DOMParser } = require('@xmldom/xmldom');
const doc = new DOMParser().parseFromString('<w:p xmlns:w="w"><w:r><w:t>hello</w:t></w:r></w:p>', 'text/xml');
const node = doc.getElementsByTagName('w:p')[0];
const stringifyNode = (n) => {
    if (!n) return '';
    if (n.nodeType === 3) return n.nodeValue;
    if (!n.tagName) return '';
    let s = '<' + n.tagName;
    if (n.attributes) {
        for (let i=0; i<n.attributes.length; i++) {
            s += ' ' + n.attributes[i].name + '="' + n.attributes[i].value + '"';
        }
    }
    s += '>';
    if (n.childNodes) {
        for (let i=0; i<n.childNodes.length; i++) {
            s += stringifyNode(n.childNodes[i]);
        }
    }
    return s + '</' + n.tagName + '>';
};
console.log(stringifyNode(node));
