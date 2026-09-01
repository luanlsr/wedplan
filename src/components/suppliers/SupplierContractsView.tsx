import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Download, Eye, FileText, Filter, Search, Trash2, Upload, X } from 'lucide-react';
import { Badge, Button, Card, Input, cn, useConfirm } from '../ui';
import { formatCurrency, formatDate } from '../../utils/calculations';
import {
  clearSupplierContractFields,
  createSupplierContractUrl,
  deleteSupplierContract,
  formatFileSize,
  getContractFileKind,
  hasSupplierContract,
  uploadSupplierContract,
} from '../../services/contractStorage';
import { sortByLabelPtBr } from '../../utils/sorting';
import type { Supplier } from '../../types';

type SupplierContractsViewProps = {
  suppliers: Supplier[];
  weddingId?: string;
  onUpdateSupplier: (id: string, supplier: Supplier) => void | Promise<void>;
};

type PreviewState = {
  supplier: Supplier;
  url: string;
};

type TypeFilter = 'todos' | 'pdf' | 'word';

const ACCEPT_ATTRIBUTE = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx';
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
const MAX_DIRECT_UPLOAD_BYTES = 10 * 1024 * 1024;

const getFileSizeLimitMessage = (file: File, limit: number) =>
  `Arquivo selecionado: ${formatFileSize(file.size)}. Limite permitido: ${formatFileSize(limit)}. Excedeu em ${formatFileSize(Math.max(file.size - limit, 0))}.`;

const getUploadValidationError = (file: File) => {
  const fileName = file.name.toLowerCase();
  const isAccepted = ACCEPTED_EXTENSIONS.some((extension) => fileName.endsWith(extension));

  if (!isAccepted) return `Envie um arquivo PDF, DOC ou DOCX válido. Arquivo selecionado: ${formatFileSize(file.size)}.`;
  if (file.size > MAX_ORIGINAL_BYTES) return getFileSizeLimitMessage(file, MAX_ORIGINAL_BYTES);
  return null;
};

export const SupplierContractsView = ({ suppliers, weddingId, onUpdateSupplier }: SupplierContractsViewProps) => {
  const navigate = useNavigate();
  const { confirm, alert: customAlert, toast } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const suppliersWithContracts = useMemo(
    () => suppliers.filter(hasSupplierContract),
    [suppliers]
  );

  const sortedSuppliers = useMemo(
    () => sortByLabelPtBr(suppliers, (supplier) => `${supplier.fornecedor} ${supplier.servico}`),
    [suppliers]
  );

  const categoriesCount = useMemo(
    () => new Set(suppliersWithContracts.map((supplier) => supplier.categoria)).size,
    [suppliersWithContracts]
  );

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return sortByLabelPtBr(suppliersWithContracts.filter((supplier) => {
      const fileKind = getContractFileKind(supplier);
      const matchesType = typeFilter === 'todos' || fileKind === typeFilter;
      const matchesSearch = !term || (
        supplier.fornecedor.toLowerCase().includes(term) ||
        supplier.servico.toLowerCase().includes(term) ||
        supplier.categoria.toLowerCase().includes(term) ||
        (supplier.contract_file_name || '').toLowerCase().includes(term)
      );

      return matchesType && matchesSearch;
    }), (supplier) => `${supplier.fornecedor} ${supplier.contract_file_name || supplier.servico}`);
  }, [searchTerm, suppliersWithContracts, typeFilter]);

  const totalStoredBytes = suppliersWithContracts.reduce(
    (total, supplier) => total + Number(supplier.contract_compressed_size_bytes || supplier.contract_file_size_bytes || 0),
    0
  );

  const openContract = async (supplier: Supplier, mode: 'preview' | 'download') => {
    const fileKind = getContractFileKind(supplier);

    setLoadingId(supplier.id);
    try {
      const url = await createSupplierContractUrl(supplier);
      if (!url) throw new Error('Documento indisponível.');

      if (mode === 'preview' && fileKind === 'pdf') {
        setPreview({ supplier, url });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir o documento.';
      await customAlert({
        title: 'Não foi possível abrir',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpload = async () => {
    const supplier = suppliers.find((item) => item.id === selectedSupplierId);
    if (!supplier || !selectedFile || !weddingId) return;

    const validationError = getUploadValidationError(selectedFile);
    if (validationError) {
      await customAlert({
        title: 'Arquivo inválido',
        description: validationError,
        type: 'warning',
        confirmLabel: 'Entendi',
      });
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadSupplierContract({
        file: selectedFile,
        weddingId,
        previousPath: supplier.contract_storage_path || null,
      });

      await onUpdateSupplier(supplier.id, {
        ...supplier,
        contract_url: '',
        contract_storage_path: uploaded.path,
        contract_file_name: uploaded.fileName,
        contract_file_size_bytes: uploaded.originalSize,
        contract_compressed_size_bytes: uploaded.compressedSize,
        contract_mime_type: uploaded.mimeType,
        contract_uploaded_at: uploaded.uploadedAt,
      });

      setSelectedFile(null);
      setSelectedSupplierId('');
      setUploadOpen(false);
      toast({
        title: 'Documento anexado',
        description: uploaded.uploadMode === 'direct'
          ? 'Salvo pelo Storage direto. Publique a Edge Function para compactar PDFs acima de 10MB.'
          : 'O contrato foi salvo no fornecedor selecionado.',
        type: uploaded.uploadMode === 'direct' ? 'warning' : 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar o documento.';
      await customAlert({
        title: 'Não foi possível enviar',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    const confirmed = await confirm({
      title: 'Remover documento?',
      description: `Deseja remover o documento de ${supplier.fornecedor}?`,
      type: 'danger',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    setDeletingId(supplier.id);
    try {
      await deleteSupplierContract(supplier);
      await onUpdateSupplier(supplier.id, clearSupplierContractFields(supplier));

      if (preview?.supplier.id === supplier.id) {
        setPreview(null);
      }
      toast({
        title: 'Documento removido',
        description: `O contrato de ${supplier.fornecedor} foi excluído.`,
        type: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível remover o documento.';
      await customAlert({
        title: 'Não foi possível remover',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">Contratos e documentos</h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Armazene, organize e acesse contratos em PDF ou Word de forma segura.
              </p>
            </div>
          </div>

          <Button
            type="button"
            className="h-11 rounded-xl font-black"
            onClick={() => setUploadOpen(true)}
            disabled={!weddingId || suppliers.length === 0}
          >
            <Upload size={17} />
            Anexar documento
          </Button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <MetricCard label="Total de documentos" value={String(suppliersWithContracts.length)} />
          <MetricCard label="Categorias" value={String(categoriesCount)} />
          <MetricCard label="Armazenamento" value={formatFileSize(totalStoredBytes)} helper="limite de 10MB por arquivo salvo" />
        </div>

        <div className="grid gap-3 border-t border-border p-5 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar documento..."
              className="h-11 rounded-xl border-border bg-secondary/40 pl-11 pr-11"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="h-11 w-full appearance-none rounded-xl border border-border bg-secondary/40 px-11 text-sm font-bold text-foreground outline-none transition focus:border-primary/40"
            >
              <option value="todos">Todos os tipos</option>
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
            </select>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-border bg-card p-0 shadow-sm">
        <div className="hidden grid-cols-[minmax(260px,1fr)_150px_130px_120px_180px] gap-4 border-b border-border px-5 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground lg:grid">
          <span>Documento</span>
          <span>Categoria</span>
          <span>Data</span>
          <span>Tamanho</span>
          <span className="text-right">Ações</span>
        </div>

        {filteredSuppliers.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredSuppliers.map((supplier) => (
              <DocumentRow
                key={supplier.id}
                supplier={supplier}
                loading={loadingId === supplier.id || deletingId === supplier.id}
                onOpen={openContract}
                onDelete={handleDelete}
                onGoToSupplier={() => navigate(`/fornecedores/${supplier.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <FileText size={30} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-foreground">
              {suppliersWithContracts.length === 0 ? 'Nenhum documento anexado' : 'Nenhum documento encontrado'}
            </h3>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
              {suppliersWithContracts.length === 0
                ? 'Anexe um PDF ou Word a um fornecedor. Ele aparecerá aqui com acesso direto ao cadastro.'
                : 'Tente buscar por fornecedor, serviço, categoria, nome do arquivo ou tipo.'}
            </p>
          </div>
        )}
      </Card>

      {uploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Novo documento</p>
                <h3 className="text-xl font-black text-foreground">Anexar ao fornecedor</h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-black text-muted-foreground">Fornecedor</span>
                <select
                  value={selectedSupplierId}
                  onChange={(event) => setSelectedSupplierId(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-secondary/40 px-4 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                >
                  <option value="">Selecione...</option>
                  {sortedSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.fornecedor} - {supplier.servico}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center transition hover:bg-secondary/50">
                <Upload className="mb-3 text-primary" size={28} />
                <span className="text-sm font-black text-foreground">
                  {selectedFile ? selectedFile.name : 'Selecionar PDF ou Word'}
                </span>
                <span className="mt-1 text-xs font-semibold text-muted-foreground">
                  {selectedFile
                    ? `Tamanho selecionado: ${formatFileSize(selectedFile.size)}`
                    : 'Até 25MB no envio e até 10MB salvo'}
                </span>
                {selectedFile && selectedFile.size > MAX_DIRECT_UPLOAD_BYTES && (
                  <span className="mt-2 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Acima de {formatFileSize(MAX_DIRECT_UPLOAD_BYTES)} depende da compactação
                  </span>
                )}
                <input
                  type="file"
                  className="sr-only"
                  accept={ACCEPT_ATTRIBUTE}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file) {
                      const validationError = getUploadValidationError(file);
                      if (validationError) {
                        void customAlert({
                          title: 'Arquivo inválido',
                          description: validationError,
                          type: 'warning',
                          confirmLabel: 'Entendi',
                        });
                        event.currentTarget.value = '';
                        return;
                      }
                    }
                    setSelectedFile(file);
                  }}
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="h-11 flex-[2] rounded-xl font-black"
                disabled={!selectedSupplierId || !selectedFile || uploading}
                onClick={handleUpload}
              >
                {uploading ? 'Enviando...' : 'Salvar documento'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Visualização do documento</p>
                <h3 className="truncate text-lg font-black text-foreground">{preview.supplier.fornecedor}</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => navigate(`/fornecedores/${preview.supplier.id}`)}>
                  <ArrowRight size={16} /> Fornecedor
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}>
                  <Download size={16} /> Abrir
                </Button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Fechar visualização"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe title={`Documento de ${preview.supplier.fornecedor}`} src={preview.url} className="min-h-0 flex-1 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, helper }: { label: string; value: string; helper?: string }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-5">
    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="mt-3 text-2xl font-black text-foreground">{value}</p>
    {helper && <p className="mt-1 text-xs font-semibold text-muted-foreground">{helper}</p>}
  </div>
);

const DocumentRow = ({
  supplier,
  loading,
  onOpen,
  onDelete,
  onGoToSupplier,
}: {
  supplier: Supplier;
  loading: boolean;
  onOpen: (supplier: Supplier, mode: 'preview' | 'download') => void;
  onDelete: (supplier: Supplier) => void;
  onGoToSupplier: () => void;
}) => {
  const kind = getContractFileKind(supplier);
  const storedSize = supplier.contract_compressed_size_bytes || supplier.contract_file_size_bytes || 0;
  const canPreview = kind === 'pdf';

  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(260px,1fr)_150px_130px_120px_220px] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white',
          kind === 'pdf' ? 'bg-red-500' : 'bg-blue-500'
        )}>
          <FileText size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">{supplier.contract_file_name || `Contrato de ${supplier.fornecedor}`}</p>
          <p className="truncate text-xs font-semibold text-muted-foreground">{supplier.fornecedor}</p>
        </div>
      </div>

      <Badge className="w-fit border-none bg-primary/10 text-primary">{supplier.categoria}</Badge>

      <div className="text-sm font-bold text-muted-foreground">
        {supplier.contract_uploaded_at ? formatDate(supplier.contract_uploaded_at) : formatDate(supplier.dataContrato)}
      </div>

      <div className="text-sm font-black text-foreground">{formatFileSize(storedSize)}</div>

      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-xl text-xs font-black"
          disabled={loading}
          onClick={() => onOpen(supplier, canPreview ? 'preview' : 'download')}
        >
          <Eye size={15} />
          {loading ? 'Abrindo...' : canPreview ? 'Ver' : 'Abrir'}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-9 rounded-xl text-xs font-black" onClick={onGoToSupplier}>
          <ArrowRight size={15} />
          Fornecedor
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-xl px-3"
          disabled={loading}
          onClick={() => onOpen(supplier, 'download')}
          aria-label="Abrir documento em nova aba"
        >
          <Download size={15} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-xl px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={loading}
          onClick={() => onDelete(supplier)}
          aria-label="Remover documento"
        >
          <Trash2 size={15} />
        </Button>
      </div>

      <div className="text-xs font-semibold text-muted-foreground lg:col-span-5 lg:hidden">
        {formatCurrency(supplier.valorTotal)} · {kind === 'pdf' ? 'PDF' : 'Word'}
      </div>
    </div>
  );
};
