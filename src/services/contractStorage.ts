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
  uploadMode?: 'edge' | 'direct';
};

const MAX_DIRECT_UPLOAD_BYTES = 10 * 1024 * 1024;

const allowedDocuments = [
  {
    extension: 'pdf',
    contentTypes: ['application/pdf'],
    outputContentType: 'application/pdf',
  },
  {
    extension: 'doc',
    contentTypes: ['application/msword'],
    outputContentType: 'application/msword',
  },
  {
    extension: 'docx',
    contentTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    outputContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
];

export const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatExceededFileLimit = (fileSize: number, limit: number) =>
  `Arquivo selecionado: ${formatFileSize(fileSize)}. Limite permitido: ${formatFileSize(limit)}. Excedeu em ${formatFileSize(Math.max(fileSize - limit, 0))}.`;

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

const sanitizeFileName = (name: string) =>
  String(name || 'contrato.pdf')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'contrato.pdf';

const getFileExtension = (name: string) =>
  String(name || '').split('.').pop()?.toLowerCase() || '';

const getAllowedDocument = (file: File, fileName: string) => {
  const extension = getFileExtension(fileName);
  return allowedDocuments.find((document) => (
    document.extension === extension ||
    document.contentTypes.includes(file.type)
  ));
};

const createClientId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isFunctionFetchError = (error: unknown) => {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';

  return (
    name === 'FunctionsFetchError' ||
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('fetch')
  );
};

const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
  const maybeError = error as { message?: string; context?: Response };

  if (maybeError?.context?.clone) {
    try {
      const payload = await maybeError.context.clone().json();
      if (payload?.error) return String(payload.error);
      if (payload?.message) return String(payload.message);
    } catch {
      try {
        const text = await maybeError.context.clone().text();
        if (text) return text;
      } catch {
        return maybeError.message || fallback;
      }
    }
  }

  return maybeError?.message || fallback;
};

const uploadSupplierContractDirectly = async ({
  file,
  weddingId,
  previousPath,
}: {
  file: File;
  weddingId: string;
  previousPath?: string | null;
}): Promise<UploadedContract> => {
  const fileName = sanitizeFileName(file.name);
  const documentType = getAllowedDocument(file, fileName);

  if (!documentType) throw new Error('Envie um arquivo PDF, DOC ou DOCX válido.');
  if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
    throw new Error(
      `A função de compactação não respondeu. Para upload direto temporário, envie um arquivo de até ${formatFileSize(MAX_DIRECT_UPLOAD_BYTES)}. ${formatExceededFileLimit(file.size, MAX_DIRECT_UPLOAD_BYTES)}`
    );
  }

  const path = `${weddingId}/${createClientId()}.${documentType.extension}`;
  const uploadBody = new File([file], fileName, { type: documentType.outputContentType });

  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(path, uploadBody, {
      contentType: documentType.outputContentType,
      cacheControl: 'private, max-age=0',
      upsert: false,
    });

  if (uploadError) throw new Error(`Falha no Storage: ${uploadError.message}`);

  if (previousPath && !previousPath.includes('..') && (previousPath.startsWith(`${weddingId}/`) || !previousPath.includes('/'))) {
    await supabase.storage.from('contracts').remove([previousPath]);
  }

  return {
    path,
    signedUrl: null,
    fileName,
    originalSize: file.size,
    compressedSize: file.size,
    compressionRatio: 0,
    mimeType: documentType.outputContentType,
    uploadedAt: new Date().toISOString(),
    uploadMode: 'direct',
  };
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

  if (error) {
    if (isFunctionFetchError(error)) {
      return uploadSupplierContractDirectly({ file, weddingId, previousPath });
    }

    throw new Error(await getFunctionErrorMessage(error, 'Não foi possível enviar o contrato.'));
  }
  if (!data?.path) throw new Error('Não foi possível salvar o contrato.');
  return {
    ...data,
    uploadMode: 'edge',
  };
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

    if (error) {
      if (isFunctionFetchError(error)) {
        const { data: directSigned, error: storageError } = await supabase.storage
          .from('contracts')
          .createSignedUrl(storagePath, 60 * 60);

        if (storageError) throw new Error(`Falha ao criar URL assinada no Storage: ${storageError.message}`);
        return directSigned?.signedUrl || null;
      }

      throw new Error(await getFunctionErrorMessage(error, 'Não foi possível abrir o contrato.'));
    }
    return data?.signedUrl || null;
  }

  return supplier.contract_url || null;
};

export const deleteSupplierContract = async (supplierOrId: Supplier | string) => {
  const supplierId = typeof supplierOrId === 'string' ? supplierOrId : supplierOrId.id;
  const fallbackStoragePath = typeof supplierOrId === 'string'
    ? null
    : supplierOrId.contract_storage_path || getStoragePathFromLegacyUrl(supplierOrId.contract_url);

  const { data, error } = await supabase.functions.invoke<{ success?: boolean; removedPath?: string | null }>('delete-supplier-contract', {
    body: { supplierId },
  });

  if (error) {
    if (!isFunctionFetchError(error)) throw error;

    if (fallbackStoragePath && !fallbackStoragePath.includes('..')) {
      const { error: storageError } = await supabase.storage
        .from('contracts')
        .remove([fallbackStoragePath]);

      if (storageError) {
        throw new Error(`A Edge Function de remoção não respondeu e o fallback pelo Storage falhou: ${storageError.message}`);
      }
    }

    return {
      success: true,
      removedPath: fallbackStoragePath,
      usedFallback: true,
    };
  }

  if (!data?.success) throw new Error('Não foi possível remover o contrato.');
  return data;
};
