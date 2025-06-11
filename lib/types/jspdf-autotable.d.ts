// Type definitions for jspdf-autotable
declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  function autoTable(doc: jsPDF, options: any): jsPDF;
  export default autoTable;
}

// Mở rộng jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable(options: any): jsPDF;
  }
} 