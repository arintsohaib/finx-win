
/**
 * QR Code Generation Utility
 * Generates QR codes for crypto wallet addresses
 */

export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    // Use a free QR code API service
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
    
    // Fetch the QR code image
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error('Failed to generate QR code');
    }
    
    // Convert to base64 data URL
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataURL = `data:image/png;base64,${base64}`;
    
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Return a fallback QR code or throw
    throw new Error('QR code generation failed');
  }
}

/**
 * Generate QR code URL from API (no storage needed)
 */
export function getQRCodeURL(text: string, size: number = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}
