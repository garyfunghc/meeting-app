import { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    getFontList(): Record<string, string[]>;
    loadFont(fontName: string): any;
    internal: {
      events: any;
      scaleFactor: number;
      pageSize: {
        width: number;
        getWidth(): number;
        height: number;
        getHeight(): number;
      };
      pages: number[];
      getEncryptor(objectId: number): (data: string) => string;
      getFont(fontName: string, style: string): any;
      getFontList(): Record<string, string[]>;
    };
  }
}
