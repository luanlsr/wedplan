import { supabase } from '../lib/supabase';
import type { Supplier } from '../types';

export type UploadedContract = {
  path: string;
  signedUrl?: string | null;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  mimeType: string;
  uploadedAt: string;
};

export const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export const hasSupplierContract = (supplier: Supplier) =>
  Boolean(supplier.contract_storage_path || supplier.contract_url);

export const getContractFileKind = (supplier: Supplier): 'pdf' | 'word' => {
  const mimeType = (supplier.contract_mime_type || '').toLowerCase();
  const fileName = (
    supplier.contract_file_name ||
    supplier.contract_storage_path ||
    supplier.contract_url ||
    ''
  ).toLowerCase();

  if (
    mimeType.includes('word') ||
    mimeType.includes('msword') ||
    /\.(doc|docx)(\?|$)/i.test(fileName)
  ) {
    return 'word';
  }

  return 'pdf';
};

const getStoragePathFromLegacyUrl = (url?: string | null) => {
  if (!url) return null;
  const marker = '/storage/v1/object/public/contracts/';
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  const pathWithQuery = url.slice(markerIndex + marker.length);
  const path = pathWithQuery.split('?')[0];
  return path ? decodeURIComponent(path) : null;
};

export const uploadSupplierContract = async ({
  file,
  weddingId,
  previousPath,
}: {
  file: File;
  weddingId: string;
  previousPath?: string | null;
}): Promise<UploadedContract> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('weddingId', weddingId);
  if (previousPath) formData.append('previousPath', previousPath);

  const { data, error } = await supabase.functions.invoke<UploadedContract>('upload-supplier-contract', {
    body: formData,
  });

  if (error) throw error;
  if (!data?.path) throw new Error('Não foi possível salvar o contrato.');
  return data;
};

export const clearSupplierContractFields = (supplier: Supplier): Supplier => ({
  ...supplier,
  contract_url: '',
  contract_storage_path: null,
  contract_file_name: null,
  contract_file_size_bytes: null,
  contract_compressed_size_bytes: null,
  contract_mime_type: null,
  contract_uploaded_at: null,
});

export const createSupplierContractUrl = async (supplier: Supplier): Promise<string | null> => {
  const storagePath = supplier.contract_storage_path || getStoragePathFromLegacyUrl(supplier.contract_url);

  if (storagePath) {
    const { data, error } = await supabase.functions.invoke<{ signedUrl?: string | null }>('create-supplier-contract-url', {
      body: { path: storagePath, supplierId: supplier.id },
    });

    if (error) throw error;
    return data?.signedUrl || null;
  }

  return supplier.contract_url || null;
};

export const deleteSupplierContract = async (supplierId: string) => {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; removedPath?: string | null }>('delete-supplier-contract', {
    body: { supplierId },
  });

  if (error) throw error;
  if (!data?.success) throw new Error('Não foi possível remover o contrato.');
  return data;
};
