import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { SITE_NAME } from '../site'

/**
 * Собирает видимый блок отчёта (#parent-report-root) в многостраничный PDF (A4).
 */
export async function downloadParentReportPdf(root: HTMLElement, fileBaseName: string) {
  const canvas = await html2canvas(root, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#f8fafc',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const usableWidth = pageWidth - margin * 2
  const usablePageHeight = pageHeight - margin * 2
  const imgHeight = (canvas.height * usableWidth) / canvas.width

  let heightLeft = imgHeight
  let y = margin

  pdf.addImage(imgData, 'PNG', margin, y, usableWidth, imgHeight)
  heightLeft -= usablePageHeight

  while (heightLeft >= 0) {
    y = margin - (imgHeight - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, y, usableWidth, imgHeight)
    heightLeft -= usablePageHeight
  }

  const safe = fileBaseName.replace(/[^\wа-яА-ЯёЁ-]+/gi, '_').slice(0, 80)
  pdf.save(`${SITE_NAME}_roditeli_${safe}.pdf`)
}
