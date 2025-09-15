import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export const createTestPDF = async (): Promise<Blob> => {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()

  // Add a page
  const page = pdfDoc.addPage([600, 400])

  // Embed a font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Draw some text
  page.drawText('Test PDF Document', {
    x: 50,
    y: 350,
    size: 30,
    font,
    color: rgb(0, 0, 0)
  })

  page.drawText('This is a test PDF created by pdf-lib', {
    x: 50,
    y: 300,
    size: 14,
    font,
    color: rgb(0.3, 0.3, 0.3)
  })

  page.drawText('If you can see this, PDF generation is working!', {
    x: 50,
    y: 250,
    size: 12,
    font,
    color: rgb(0.5, 0.5, 0.5)
  })

  // Add page numbers
  page.drawText('Page 1 of 1', {
    x: 500,
    y: 50,
    size: 10,
    font,
    color: rgb(0.7, 0.7, 0.7)
  })

  // Save the PDF
  const pdfBytes = await pdfDoc.save()

  // Create blob
  return new Blob([Array.from(pdfBytes)], { type: 'application/pdf' })
}

export const downloadTestPDF = async () => {
  try {
    const pdfBlob = await createTestPDF()
    const url = URL.createObjectURL(pdfBlob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'test-document.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    console.log('Test PDF downloaded successfully')
    return true
  } catch (error) {
    console.error('Error creating test PDF:', error)
    return false
  }
}