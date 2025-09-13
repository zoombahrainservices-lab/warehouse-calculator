import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// Define proper types for PDF generation
export interface PDFOptions {
  filename?: string
  title?: string
  companyName?: string
  clientName?: string
  quoteNumber?: string
}

// Define types for calculations
export interface SitraCalculationResult {
  spaceType: string
  areaRequested: number
  areaChargeable: number
  leaseDurationMonths: number
  tenure: string
  totalWarehouseRent: number
  officeIncluded: boolean
  officeTotalCost: number
  ewaSetupCosts: number
  selectedServicesDetails: Array<{
    name: string
    description: string
    pricing: string
  }>
  discountAmount: number
  grandTotal: number
}

export interface CalculationResult {
  totalBaseRent: number
  ewaBreakdown: {
    termEstimate: number
    oneOffCosts: number
  }
  optionalServicesTotal: number
  discountAmount: number
  vatAmount: number
  grandTotal: number
  leaseDurationMonths: number
}

export interface CalculationInputs {
  area: number
  tenure: string
}

// Define proper types for stock items
export interface StockItem {
  id: string
  client_name: string
  product_name?: string
  product_type?: string
  status: string
  space_type: string
  area_used?: number
  quantity?: number
  unit?: string
  entry_date: string
  expected_exit_date?: string
  client_email?: string
  client_phone?: string
  description?: string
  total_received_quantity?: number
  total_delivered_quantity?: number
  current_quantity?: number
  [key: string]: any // Allow additional properties
}

// Generate PDF from HTML element
export async function generatePDFFromElement(
  elementId: string,
  options: PDFOptions = {}
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`)
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      imageTimeout: 15000,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Add additional pages if content is too long
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const filename = options.filename || `warehouse-quote-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

// Generate PDF for Sitra Calculator results
export async function generateSitraQuotePDF(
  result: SitraCalculationResult,
  options: PDFOptions = {}
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')

  // Set up fonts and colors
  pdf.setFont('helvetica', 'normal')

  // Header
  pdf.setFontSize(20)
  pdf.setTextColor(0, 0, 0)
  pdf.text(options.companyName || 'Sitra Warehouse', 20, 20)
  pdf.setFontSize(16)
  pdf.text('Warehouse Rental Quote', 20, 30)

  // Quote details
  pdf.setFontSize(10)
  pdf.text(`Quote Date: ${new Date().toLocaleDateString()}`, 20, 40)
  if (options.quoteNumber) {
    pdf.text(`Quote #: ${options.quoteNumber}`, 20, 45)
  }
  if (options.clientName) {
    pdf.text(`Client: ${options.clientName}`, 20, 50)
  }

  // Calculation results
  let yPos = 70
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Calculation Results:', 20, yPos)
  yPos += 10
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

  // Basic details
  pdf.text(`Space Type: ${result.spaceType}`, 20, yPos)
  yPos += 6
  pdf.text(`Area Requested: ${result.areaRequested} m²`, 20, yPos)
  yPos += 6
  pdf.text(`Chargeable Area: ${result.areaChargeable} m²`, 20, yPos)
  yPos += 6
  pdf.text(`Duration: ${result.leaseDurationMonths} ${result.tenure === 'Very Short' ? 'days' : 'months'}`, 20, yPos)
  yPos += 6

  // Pricing details
  pdf.text(`Warehouse Rent: ${result.totalWarehouseRent.toFixed(2)} BHD`, 20, yPos)
  yPos += 6
  if (result.officeIncluded) {
    pdf.text(`Office Space: ${result.officeTotalCost.toFixed(2)} BHD`, 20, yPos)
    yPos += 6
  }
  pdf.text(`EWA Setup: ${result.ewaSetupCosts.toFixed(2)} BHD`, 20, yPos)
  yPos += 6

  if (result.selectedServicesDetails && result.selectedServicesDetails.length > 0) {
    pdf.text('Additional Services:', 20, yPos)
    yPos += 6
    result.selectedServicesDetails.forEach((service) => {
      pdf.text(` • ${service.name}: ${service.pricing}`, 25, yPos)
      yPos += 5
    })
  }

  if (result.discountAmount > 0) {
    pdf.text(`Discount: -${result.discountAmount.toFixed(2)} BHD`, 20, yPos)
    yPos += 6
  }

  // Total
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Total: ${result.grandTotal.toFixed(2)} BHD`, 20, yPos)
  yPos += 10

  // Footer
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', 20, 275)
  pdf.text('Tel: +973 3881 6222 | Email: info@zoombahrain.com', 20, 280)

  const filename = options.filename || `sitra-quote-${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(filename)
}

// Generate PDF for Warehouse Calculator results
export async function generateWarehouseQuotePDF(
  result: CalculationResult,
  inputs: CalculationInputs,
  options: PDFOptions = {}
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')

  // Set up fonts and colors
  pdf.setFont('helvetica', 'normal')

  // Header
  pdf.setFontSize(20)
  pdf.setTextColor(0, 0, 0)
  pdf.text(options.companyName || 'Warehouse Calculator', 20, 20)
  pdf.setFontSize(16)
  pdf.text('Warehouse Quote', 20, 30)

  // Quote details
  pdf.setFontSize(10)
  pdf.text(`Quote Date: ${new Date().toLocaleDateString()}`, 20, 40)
  if (options.quoteNumber) {
    pdf.text(`Quote #: ${options.quoteNumber}`, 20, 45)
  }
  if (options.clientName) {
    pdf.text(`Client: ${options.clientName}`, 20, 50)
  }

  // Input details
  let yPos = 70
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Requirements:', 20, yPos)
  yPos += 10
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Area: ${inputs.area} m²`, 20, yPos)
  yPos += 6
  pdf.text(`Tenure: ${inputs.tenure}`, 20, yPos)
  yPos += 6
  pdf.text(`Duration: ${result.leaseDurationMonths.toFixed(2)} months`, 20, yPos)
  yPos += 6

  // Results
  yPos += 5
  pdf.setFont('helvetica', 'bold')
  pdf.text('Quote Summary:', 20, yPos)
  yPos += 10
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Base Rent: ${result.totalBaseRent.toFixed(2)} BHD`, 20, yPos)
  yPos += 6
  pdf.text(`EWA Costs: ${(result.ewaBreakdown.termEstimate + result.ewaBreakdown.oneOffCosts).toFixed(2)} BHD`, 20, yPos)
  yPos += 6

  if (result.optionalServicesTotal > 0) {
    pdf.text(`Optional Services: ${result.optionalServicesTotal.toFixed(2)} BHD`, 20, yPos)
    yPos += 6
  }

  if (result.discountAmount > 0) {
    pdf.text(`Discount: -${result.discountAmount.toFixed(2)} BHD`, 20, yPos)
    yPos += 6
  }

  if (result.vatAmount > 0) {
    pdf.text(`VAT: ${result.vatAmount.toFixed(2)} BHD`, 20, yPos)
    yPos += 6
  }

  pdf.setFont('helvetica', 'bold')
  pdf.text(`Grand Total: ${result.grandTotal.toFixed(2)} BHD`, 20, yPos)

  // Footer
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', 20, 275)
  pdf.text('Tel: +973 3881 6222 | Email: info@zoombahrain.com', 20, 280)

  const filename = options.filename || `warehouse-quote-${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(filename)
}

// Generate PDF for Stock Report
export async function generateStockReportPDF(
  stockItems: StockItem[],
  options: PDFOptions = {}
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')

  // Set up fonts and colors
  pdf.setFont('helvetica', 'normal')

  // Header
  pdf.setFontSize(20)
  pdf.setTextColor(0, 0, 0)
  pdf.text(options.title || 'Stock Report', 20, 20)
  pdf.setFontSize(10)
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30)

  let yPos = 40

  // Summary
  pdf.setFontSize(14)
  pdf.text('Summary', 20, yPos)
  yPos += 10
  pdf.setFontSize(10)
  const totalItems = stockItems.length
  const activeItems = stockItems.filter((item: StockItem) => item.status === 'active').length
  const completedItems = stockItems.filter((item: StockItem) => item.status === 'completed').length
  const pendingItems = stockItems.filter((item: StockItem) => item.status === 'pending').length
  const totalArea = stockItems.reduce((sum: number, item: StockItem) => sum + (item.area_used || 0), 0)

  // Calculate stock tracking totals
  const totalReceived = stockItems.reduce((sum: number, item: StockItem) => sum + (item.total_received_quantity || item.quantity || 0), 0)
  const totalDelivered = stockItems.reduce((sum: number, item: StockItem) => sum + (item.total_delivered_quantity || 0), 0)
  const totalCurrent = stockItems.reduce((sum: number, item: StockItem) => sum + (item.current_quantity || item.quantity || 0), 0)

  pdf.text(`Total Items: ${totalItems}`, 20, yPos)
  yPos += 5
  pdf.text(`Active: ${activeItems} | Completed: ${completedItems} | Pending: ${pendingItems}`, 20, yPos)
  yPos += 5
  pdf.text(`Total Area Used: ${totalArea.toFixed(2)} m²`, 20, yPos)
  yPos += 5

  // Stock tracking summary
  pdf.setFont('helvetica', 'bold')
  pdf.text('Stock Tracking Summary:', 20, yPos)
  yPos += 5
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Received: ${totalReceived.toLocaleString()} units`, 25, yPos)
  yPos += 4
  pdf.text(`Total Delivered: ${totalDelivered.toLocaleString()} units`, 25, yPos)
  yPos += 4
  pdf.text(`Current Stock: ${totalCurrent.toLocaleString()} units`, 25, yPos)
  yPos += 10

  // Stock Items with detailed tracking
  pdf.setFontSize(14)
  pdf.text('Detailed Stock Items', 20, yPos)
  yPos += 10
  pdf.setFontSize(8)

  stockItems.forEach((item: StockItem, index: number) => {
    // Check if we need a new page
    if (yPos > 240) {
      pdf.addPage()
      yPos = 20
    }

    // Item header
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${index + 1}. ${item.client_name}`, 20, yPos)
    pdf.setFont('helvetica', 'normal')

    // Status badge (text only)
    const statusText = `[${item.status.toUpperCase()}]`
    pdf.text(statusText, 150, yPos)
    yPos += 5

    // Product details
    pdf.text(`Product: ${item.product_name || item.product_type}`, 25, yPos)
    yPos += 4
    pdf.text(`Location: ${item.space_type} | Area: ${item.area_used || 0} m²`, 25, yPos)
    yPos += 4

    // Stock tracking details
    const receivedQty = item.total_received_quantity || item.quantity || 0
    const deliveredQty = item.total_delivered_quantity || 0
    const currentQty = item.current_quantity || item.quantity || 0

    pdf.setFont('helvetica', 'bold')
    pdf.text('Stock Tracking:', 25, yPos)
    yPos += 4
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Received: ${receivedQty.toLocaleString()} ${item.unit}`, 30, yPos)
    yPos += 3
    pdf.text(`Delivered: ${deliveredQty.toLocaleString()} ${item.unit}`, 30, yPos)
    yPos += 3
    pdf.text(`Current: ${currentQty.toLocaleString()} ${item.unit}`, 30, yPos)
    yPos += 4

    // Dates
    pdf.text(`Entry Date: ${new Date(item.entry_date).toLocaleDateString()}`, 25, yPos)
    yPos += 3
    if (item.expected_exit_date) {
      pdf.text(`Expected Exit: ${new Date(item.expected_exit_date).toLocaleDateString()}`, 25, yPos)
      yPos += 3
    }

    // Contact information
    if (item.client_email || item.client_phone) {
      pdf.text(`Contact: ${item.client_email || ''} ${item.client_phone || ''}`, 25, yPos)
      yPos += 3
    }

    // Description
    if (item.description) {
      const desc = item.description.length > 50 ? item.description.substring(0, 50) + '...' : item.description
      pdf.text(`Description: ${desc}`, 25, yPos)
      yPos += 3
    }

    yPos += 5
  })

  // Footer
  pdf.setFontSize(8)
  pdf.text(`Report generated on ${new Date().toLocaleString()}`, 20, 275)
  pdf.text('Tel: +973 3881 6222 | Email: info@zoombahrain.com', 20, 280)

  const filename = options.filename || `stock-report-${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(filename)
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  if (amount === 0) return '0.000 BHD'
  return `${amount.toFixed(3)} BHD`
}
