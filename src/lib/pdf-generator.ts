import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { type SitraCalculationResult } from './sitra-calculator'
import { type CalculationResult, type CalculationInputs } from './calculations'

export interface PDFOptions {
  filename?: string
  title?: string
  companyName?: string
  clientName?: string
  quoteNumber?: string
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
    // Preprocess: tag subtree and capture computed RGB colors to avoid lab()/oklch() issues
    const colorProperties = [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
    ] as const
    type CapturedStyles = Partial<Record<typeof colorProperties[number], string>>
    const captured: Record<string, CapturedStyles> = {}
    const taggedNodes: HTMLElement[] = []
    let indexCounter = 0

    // Tag all elements under target with a stable data attribute and capture styles
    element.querySelectorAll<HTMLElement>('*').forEach((node) => {
      const tagId = `h2c-${indexCounter++}`
      node.setAttribute('data-h2c-index', tagId)
      taggedNodes.push(node)
      const computed = window.getComputedStyle(node)
      const styles: CapturedStyles = {}
      colorProperties.forEach((prop) => {
        styles[prop] = computed[prop as keyof CSSStyleDeclaration] || ''
      })
      captured[tagId] = styles
    })

    // Create canvas from HTML element
    const canvas = await html2canvas(element, {
      // Use foreignObject to let the browser render modern CSS (oklch/lab)
      foreignObjectRendering: true,
      // Increase resolution for sharper text
      scale: 2,
      // Ensure backgrounds render even if the target uses transparent areas
      backgroundColor: '#ffffff',
      // Relax CORS/taint to avoid failures on inline SVGs or external assets
      useCORS: true,
      allowTaint: true,
      imageTimeout: 15000,
      // Inline captured computed colors to sidestep unsupported color functions
      onclone: (clonedDoc) => {
        const cloneRoot = clonedDoc.getElementById(elementId) || clonedDoc.body
        if (!cloneRoot) return
        cloneRoot.querySelectorAll<HTMLElement>('[data-h2c-index]').forEach((cloneEl) => {
          const id = cloneEl.getAttribute('data-h2c-index') || ''
          const styles = captured[id]
          if (styles) {
            if (styles.color) cloneEl.style.color = styles.color
            if (styles.backgroundColor) cloneEl.style.backgroundColor = styles.backgroundColor
            if (styles.borderTopColor) cloneEl.style.borderTopColor = styles.borderTopColor
            if (styles.borderRightColor) cloneEl.style.borderRightColor = styles.borderRightColor
            if (styles.borderBottomColor) cloneEl.style.borderBottomColor = styles.borderBottomColor
            if (styles.borderLeftColor) cloneEl.style.borderLeftColor = styles.borderLeftColor
          }
          // Avoid parsing issues with gradients/shadows that may embed unsupported color functions
          cloneEl.style.backgroundImage = 'none'
          cloneEl.style.boxShadow = 'none'
        })
      },
    })

    // Cleanup tags on original DOM
    taggedNodes.forEach((n) => n.removeAttribute('data-h2c-index'))

    // Calculate dimensions
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    // Use actual PDF page size from jsPDF to avoid hardcoded dimensions
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

    // Download the PDF
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
  
  // Property details
  let yPos = 65
  pdf.setFontSize(14)
  pdf.text('Property Details', 20, yPos)
  yPos += 10
  
  pdf.setFontSize(10)
  pdf.text(`Space Type: ${result.spaceType}`, 20, yPos)
  yPos += 5
  pdf.text(`Area Requested: ${result.areaRequested} m²`, 20, yPos)
  yPos += 5
  pdf.text(`Chargeable Area: ${result.areaChargeable} m²`, 20, yPos)
  yPos += 5
  pdf.text(`Lease Term: ${result.tenure}`, 20, yPos)
  yPos += 5
  pdf.text(`Duration: ${result.leaseDurationMonths} ${result.tenure === 'Very Short' ? 'days' : 'months'}`, 20, yPos)
  
  // Pricing breakdown
  yPos += 15
  pdf.setFontSize(14)
  pdf.text('Pricing Breakdown', 20, yPos)
  yPos += 10
  
  pdf.setFontSize(10)
  pdf.text(`Warehouse Rent: ${formatCurrency(result.totalWarehouseRent)}`, 20, yPos)
  yPos += 5
  
  if (result.officeIncluded) {
    pdf.text(`Office Space: ${formatCurrency(result.officeTotalCost)}`, 20, yPos)
    yPos += 5
  }
  
  pdf.text(`EWA Setup: ${formatCurrency(result.ewaSetupCosts)}`, 20, yPos)
  yPos += 10
  
  // Totals
  pdf.setFontSize(12)
  pdf.text(`${result.tenure === 'Very Short' ? 'Daily' : 'Monthly'} Total: ${formatCurrency(result.monthlyTotal)}`, 20, yPos)
  yPos += 8
  
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Total Contract Value: ${formatCurrency(result.grandTotal)}`, 20, yPos)
  
  // Footer
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', 20, 280)
  
  // Download
  const filename = options.filename || `sitra-warehouse-quote-${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(filename)
}

// Generate PDF for standard quote results
export async function generateStandardQuotePDF(
  result: CalculationResult,
  inputs: CalculationInputs,
  options: PDFOptions = {}
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  
  // Set up fonts
  pdf.setFont('helvetica', 'normal')
  
  // Header
  pdf.setFontSize(20)
  pdf.text(options.companyName || 'Warehouse Rental Quote', 20, 20)
  
  pdf.setFontSize(10)
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30)
  if (options.clientName) {
    pdf.text(`Client: ${options.clientName}`, 20, 35)
  }
  
  // Property details
  let yPos = 50
  pdf.setFontSize(12)
  pdf.text('Property Details', 20, yPos)
  yPos += 10
  
  pdf.setFontSize(10)
  pdf.text(`Area Requested: ${inputs.area} m²`, 20, yPos)
  yPos += 5
  pdf.text(`Chargeable Area: ${result.chargeableArea} m²`, 20, yPos)
  yPos += 5
  pdf.text(`Area Band: ${result.areaBandName}`, 20, yPos)
  yPos += 5
  pdf.text(`Lease Duration: ${result.leaseDurationMonths.toFixed(2)} months`, 20, yPos)
  
  // Pricing
  yPos += 15
  pdf.setFontSize(12)
  pdf.text('Pricing Breakdown', 20, yPos)
  yPos += 10
  
  pdf.setFontSize(10)
  pdf.text(`Base Rent: ${formatCurrency(result.totalBaseRent)}`, 20, yPos)
  yPos += 5
  pdf.text(`EWA Costs: ${formatCurrency(result.ewaBreakdown.termEstimate + result.ewaBreakdown.oneOffCosts)}`, 20, yPos)
  yPos += 5
  pdf.text(`Optional Services: ${formatCurrency(result.optionalServicesTotal)}`, 20, yPos)
  yPos += 10
  
  // Totals
  pdf.setFontSize(12)
  pdf.text(`Subtotal: ${formatCurrency(result.subtotal)}`, 20, yPos)
  yPos += 8
  
  if (result.discountAmount > 0) {
    pdf.text(`Discount: -${formatCurrency(result.discountAmount)}`, 20, yPos)
    yPos += 5
  }
  
  if (result.vatAmount > 0) {
    pdf.text(`VAT: ${formatCurrency(result.vatAmount)}`, 20, yPos)
    yPos += 5
  }
  
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Grand Total: ${formatCurrency(result.grandTotal)}`, 20, yPos)
  
  // Download
  const filename = options.filename || `warehouse-quote-${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(filename)
}

// Generate PDF for stock report
export async function generateStockReportPDF(
  stockItems: unknown[],
  options: PDFOptions = {}
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  
  // Set up fonts
  pdf.setFont('helvetica', 'normal')
  
  // Header
  pdf.setFontSize(20)
  pdf.text(options.title || 'Stock Report', 20, 20)
  
  pdf.setFontSize(10)
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30)
  pdf.text('Sitra Warehouse - Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', 20, 35)
  
  let yPos = 50
  
  // Summary
  pdf.setFontSize(14)
  pdf.text('Summary', 20, yPos)
  yPos += 10
  
  pdf.setFontSize(10)
  const totalItems = stockItems.length
  const activeItems = stockItems.filter(item => item.status === 'active').length
  const completedItems = stockItems.filter(item => item.status === 'completed').length
  const pendingItems = stockItems.filter(item => item.status === 'pending').length
  const totalArea = stockItems.reduce((sum, item) => sum + (item.area_used || 0), 0)
  
  pdf.text(`Total Items: ${totalItems}`, 20, yPos)
  yPos += 5
  pdf.text(`Active: ${activeItems} | Completed: ${completedItems} | Pending: ${pendingItems}`, 20, yPos)
  yPos += 5
  pdf.text(`Total Area Used: ${totalArea.toFixed(2)} m²`, 20, yPos)
  yPos += 15
  
  // Stock Items
  pdf.setFontSize(14)
  pdf.text('Stock Items', 20, yPos)
  yPos += 10
  
  pdf.setFontSize(8)
  
  stockItems.forEach((item, index) => {
    // Check if we need a new page
    if (yPos > 250) {
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
    
    // Item details
    pdf.text(`Product: ${item.product_type} | Qty: ${item.quantity} ${item.unit}`, 25, yPos)
    yPos += 4
    pdf.text(`Location: ${item.space_type} | Area: ${item.area_used || 0} m²`, 25, yPos)
    yPos += 4
    pdf.text(`Entry: ${new Date(item.entry_date).toLocaleDateString()}`, 25, yPos)
    
    if (item.expected_exit_date) {
      pdf.text(`Exit: ${new Date(item.expected_exit_date).toLocaleDateString()}`, 80, yPos)
    }
    
    yPos += 4
    
    if (item.description) {
      const desc = item.description.length > 60 ? item.description.substring(0, 60) + '...' : item.description
      pdf.text(`Description: ${desc}`, 25, yPos)
      yPos += 4
    }
    
    if (item.client_email || item.client_phone) {
      pdf.text(`Contact: ${item.client_email || ''} ${item.client_phone || ''}`, 25, yPos)
      yPos += 4
    }
    
    yPos += 3 // Space between items
  })
  
  // Footer
  pdf.setFontSize(8)
  pdf.text(`Report generated on ${new Date().toLocaleString()}`, 20, 280)
  
  // Download
  const filename = options.filename || `stock-report-${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(filename)
}

// Helper function to format currency (same as in other files)
function formatCurrency(amount: number): string {
  if (amount === 0) return '0.000 BHD'
  return `${amount.toFixed(3)} BHD`
}

