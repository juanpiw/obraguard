export type DocCategory = 'all' | 'legal' | 'plans' | 'security' | 'certs';
export type DocStatus = 'valid' | 'expiring' | 'expired' | 'processing';

export interface DocumentFile {
  id: string;
  name: string;
  size: string;
  type: string; // e.g. pdf, img, dwg, xls
  uploadDate: Date;
  category: DocCategory;
  status: DocStatus;
  uploadedBy: string;
  expiryDate?: Date;
  tags: string[];
}

