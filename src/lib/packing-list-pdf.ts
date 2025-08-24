import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Client, ClientStock } from './supabase'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF
  }
}

export interface PackingListData {
  client: Client
  stockItems: ClientStock[]
  packingListNumber: string
  date: string
  vehicleNo?: string
  driverName?: string
  uaeContNo?: string
  exportCont?: string
}

export function generatePackingListPDF(data: PackingListData): void {
  const pdf = new jsPDF('portrait', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // Colors (for potential future use)
  // const primaryColor = '#1f2937' // Dark gray
  // const headerBg = '#f3f4f6' // Light gray
  // const borderColor = '#d1d5db' // Gray border
  
  // Header Section
  pdf.setFillColor(240, 240, 240)
  pdf.rect(0, 0, pageWidth, 45, 'F')
  
  // Company Logo Area (placeholder)
  pdf.setFillColor(255, 255, 255)
  pdf.rect(10, 5, 35, 35, 'F')
  pdf.setDrawColor(200, 200, 200)
  pdf.rect(10, 5, 35, 35, 'S')
  
  // Add placeholder logo text
  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text('LOGO', 27.5, 20, { align: 'center' })
  pdf.text('HERE', 27.5, 25, { align: 'center' })
  
  // Company Information
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text(data.client.company_name, 50, 15)
  
  // Contact details
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  const contactInfo = []
  if (data.client.phone) contactInfo.push(`Tel: ${data.client.phone}`)
  if (data.client.fax) contactInfo.push(`Fax: ${data.client.fax}`)
  if (data.client.po_box) contactInfo.push(`${data.client.po_box}`)
  if (data.client.city) contactInfo.push(`${data.client.city}`)
  
  pdf.text(contactInfo.join(' - '), 50, 22)
  
  if (data.client.email) {
    pdf.text(`E-Mail: ${data.client.email}`, 50, 28)
  }
  if (data.client.website) {
    pdf.text(`Website: ${data.client.website}`, 50, 34)
  }
  
  // Packing List Title
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('Packing List', pageWidth / 2, 55, { align: 'center' })
  
  // Document Details Table
  const docDetailsY = 65
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  
  // Left column
  const leftDetails = [
    ['Exp Pack No', ':', data.packingListNumber],
    ['Date', ':', data.date],
    ['Cust Code', ':', data.client.id || ''],
    ['Container No', ':', ''],
    ['Seal No', ':', '']
  ]
  
  // Right column  
  const rightDetails = [
    ['Vehicle No', ':', data.vehicleNo || ''],
    ['', '', ''],
    ['Driver Name', ':', data.driverName || ''],
    ['UAE Cont. No', ':', data.uaeContNo || ''],
    ['Export Cont.', ':', data.exportCont || '']
  ]
  
  // Draw document details
  let currentY = docDetailsY
  leftDetails.forEach((detail, index) => {
    pdf.text(detail[0], 15, currentY)
    pdf.text(detail[1], 45, currentY)
    pdf.text(detail[2], 50, currentY)
    
    // Right column
    if (rightDetails[index]) {
      pdf.text(rightDetails[index][0], 120, currentY)
      pdf.text(rightDetails[index][1], 150, currentY)
      pdf.text(rightDetails[index][2], 155, currentY)
    }
    
    currentY += 6
  })
  
  // Main Table
  const tableStartY = currentY + 10
  
  // Prepare table data
  const tableData = data.stockItems.map((item, index) => [
    (index + 1).toString(), // S.No
    item.po_no || '', // P.O No
    item.section || '', // Section
    item.bundle_id || '', // Bundle ID
    item.do_no || '', // DO No
    item.temp_alloy || '', // Temp Alloy
    item.finish || '', // Finish
    item.cut_length?.toFixed(2) || '', // Cut Length
    item.est_weight?.toFixed(3) || '', // Est Weight
    item.order_length?.toFixed(2) || '', // Order Length
    item.no_of_pcs?.toString() || '0', // No of Pcs
    item.no_of_bundles?.toString() || '0', // No of Bundles
    item.total_pcs?.toString() || '0', // Total Pcs
    (item.total_weight?.toFixed(3) || '0') // Total Weight
  ])
  
  // Calculate totals
  const totalPcs = data.stockItems.reduce((sum, item) => sum + (item.total_pcs || 0), 0)
  const totalBundles = data.stockItems.reduce((sum, item) => sum + (item.no_of_bundles || 0), 0)
  const totalWeight = data.stockItems.reduce((sum, item) => sum + (item.total_weight || 0), 0)
  
  // Add totals row
  tableData.push([
    '', '', '', '', '', '', '', '', '', 'Total:', 
    totalPcs.toString(), 
    totalBundles.toString(), 
    totalPcs.toString(), 
    totalWeight.toFixed(3)
  ])
  
  // Table configuration
  pdf.autoTable({
    startY: tableStartY,
    head: [[
      'S.No', 'P.O No', 'Section', 'Bundle ID', 'DO No', 'Temp Alloy', 'Finish',
      'Cut Length', 'Est Weight', 'Order Length', 'No of Pcs', 'No of Bundles', 'Total Pcs', 'Total Weight'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [243, 244, 246], // Light gray
      textColor: [0, 0, 0],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 12 }, // S.No
      1: { cellWidth: 18 }, // P.O No
      2: { cellWidth: 15 }, // Section
      3: { cellWidth: 18 }, // Bundle ID
      4: { cellWidth: 20 }, // DO No
      5: { cellWidth: 12 }, // Temp Alloy
      6: { cellWidth: 20 }, // Finish
      7: { cellWidth: 15 }, // Cut Length
      8: { cellWidth: 15 }, // Est Weight
      9: { cellWidth: 15 }, // Order Length
      10: { cellWidth: 12 }, // No of Pcs
      11: { cellWidth: 12 }, // No of Bundles
      12: { cellWidth: 12 }, // Total Pcs
      13: { cellWidth: 15 }  // Total Weight
    },
    styles: {
      lineColor: [209, 213, 219],
      lineWidth: 0.1
    },
    // Highlight totals row
    didParseCell: function(data: { row: { index: number }, cell: { styles: { fontStyle: string, fillColor: number[] } } }) {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [249, 250, 251]
      }
    }
  })
  
  // Footer
  const finalY = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20
  if (finalY < pageHeight - 30) {
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Generated by Sitra Warehouse Management System', pageWidth / 2, finalY, { align: 'center' })
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, finalY + 6, { align: 'center' })
  }
  
  // Save the PDF
  const fileName = `Packing_List_${data.packingListNumber}_${data.date.replace(/\//g, '-')}.pdf`
  pdf.save(fileName)
}

// Helper function to generate packing list from client stock data
export function generatePackingListFromStock(
  client: Client,
  stockItems: ClientStock[],
  packingListNumber?: string
): void {
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '/')
  
  const packingListData: PackingListData = {
    client,
    stockItems,
    packingListNumber: packingListNumber || stockItems[0]?.exp_pack_no || `PL-${Date.now()}`,
    date: formattedDate,
    vehicleNo: stockItems[0]?.vehicle_no,
    driverName: stockItems[0]?.driver_name,
    uaeContNo: stockItems[0]?.uae_cont_no,
    exportCont: stockItems[0]?.export_cont
  }
  
  generatePackingListPDF(packingListData)
}
