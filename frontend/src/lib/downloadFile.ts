import api from './api';
import { toast } from 'sonner';

export async function downloadExcelFile(url: string, filename: string) {
  try {
    const response = await api.get(url, {
      responseType: 'blob', // Important for downloading files
    });

    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    toast.success(`${filename} exported successfully!`);
  } catch (error) {
    console.error('Download error:', error);
    toast.error(`Failed to export ${filename}`);
  }
}

export async function downloadPdfFile(url: string, filename: string) {
  try {
    const response = await api.get(url, {
      responseType: 'blob', // Important for downloading files
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    toast.success(`${filename} exported successfully!`);
  } catch (error) {
    console.error('Download error:', error);
    toast.error(`Failed to export ${filename}`);
  }
}
