import { jsPDF } from 'jspdf';

interface PDFFont {
  normal: string;
  bold: string;
  italics: string;
  bolditalics: string;
}

declare global {
  interface Window {
    pdfFonts?: {
      [key: string]: PDFFont;
    };
  }
}

// Add NotoSansSC font definition
const getFontPath = (fontName: string) => {
  // In Electron production, fonts are in the build directory
  if (window.process && window.process.versions && window.process.versions.electron) {
    return `fonts/${fontName}`;
  }
  // In development, use the public URL
  return `${process.env.PUBLIC_URL}/fonts/${fontName}`;
};

// Fallback to Regular if other variants are missing
const NotoSansSC: PDFFont = {
  normal: getFontPath('NotoSansSC-Regular.ttf'),
  bold: getFontPath('NotoSansSC-Bold.ttf') || getFontPath('NotoSansSC-Regular.ttf'),
  italics: getFontPath('NotoSansSC-Italic.ttf') || getFontPath('NotoSansSC-Regular.ttf'),
  bolditalics: getFontPath('NotoSansSC-BoldItalic.ttf') || getFontPath('NotoSansSC-Regular.ttf')
};

// Register the font with jsPDF
if (typeof window !== 'undefined') {
  window.pdfFonts = window.pdfFonts || {};
  window.pdfFonts.NotoSansSC = NotoSansSC;
}

// Extend jsPDF prototype
(jsPDF.prototype as any).getFontList = function() {
  const standardFonts = (this as any).internal.getFontList();
  return {
    ...standardFonts,
    NotoSansSC: ['normal', 'bold', 'italics', 'bolditalics']
  };
};

(jsPDF.prototype as any).loadFont = function(fontName: string) {
  if (fontName === 'NotoSansSC') {
    return NotoSansSC;
  }
  return (this as any).internal.getFont(fontName, 'normal');
};
