import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge, useConfirm, type ConfirmOptions } from '../ui';
import {
  ChevronLeft, CheckCircle2, Circle, Calendar, Printer,
  Download, Heart, DollarSign, FileText, Edit2, Info,
  ArrowUp, ArrowDown, ArrowUpDown,
  Share2, Phone, Mail, MapPin, Building, Trash2, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { maskCurrency, unmaskCurrency } from '../../utils/masks';
import {
  clearSupplierContractFields,
  createSupplierContractUrl,
  deleteSupplierContract,
  formatFileSize,
  getContractFileKind,
  hasSupplierContract
} from '../../services/contractStorage';
import type { Supplier, Installment } from '../../types';

type ContractPreviewState = {
  url: string;
  mode: 'preview' | 'download';
};

interface SupplierDetailsProps {
  suppliers: Supplier[];
  updateInstallment: (supplierId: string, installmentId: string, updates: Partial<Installment>) => void;
  updateSupplier: (id: string, supplier: Supplier) => void | Promise<void>;
  deleteSupplier: (id: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  onToggleStatus: (supplierId: string, installment: Installment) => void;
  onEdit: (supplier: Supplier) => void;
}

const SortButton = ({ active, onClick, label, direction }: { active: boolean, onClick: () => void, label: string, direction?: 'asc' | 'desc' | null }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
      active ? "bg-primary text-white" : "bg-card text-muted-foreground border border-white/5 hover:bg-secondary"
    )}
  >
    {label}
    {!direction ? <ArrowUpDown size={10} className="opacity-30" /> :
      direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
  </button>
);

export const SupplierDetails = ({
  suppliers,
  updateInstallment,
  updateSupplier,
  deleteSupplier,
  confirm,
  onToggleStatus,
  onEdit
}: SupplierDetailsProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alert: customAlert, toast } = useConfirm();
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [openingContract, setOpeningContract] = useState(false);
  const [removingContract, setRemovingContract] = useState(false);
  const [contractPreview, setContractPreview] = useState<ContractPreviewState | null>(null);

  // Força o scroll para o topo ao trocar de fornecedor
  useState(() => {
    window.scrollTo(0, 0);
  });

  const [instSort, setInstSort] = useState<{ key: keyof Installment; direction: 'asc' | 'desc' }>({
    key: 'numero',
    direction: 'asc'
  });

  const currentSupplier = suppliers.find(s => s.id === id);

  const toggleInstSort = (key: keyof Installment) => {
    setInstSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedInstallments = useMemo(() => {
    if (!currentSupplier) return [];
    return [...currentSupplier.parcelas].sort((a, b) => {
      const valA = a[instSort.key];
      const valB = b[instSort.key];
      if (valA! < valB!) return instSort.direction === 'asc' ? -1 : 1;
      if (valA! > valB!) return instSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentSupplier, instSort]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = (supplier: Supplier) => {
    const headers = ["Número", "Vencimento", "Valor", "Status", "Data Pagamento"];
    const rows = supplier.parcelas.map(p => [
      p.numero,
      p.dataVencimento,
      p.valor,
      p.status,
      p.dataPagamento || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `parcelas_${supplier.fornecedor.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenContract = async () => {
    if (!currentSupplier || !hasSupplierContract(currentSupplier)) return;
    setOpeningContract(true);
    try {
      const url = await createSupplierContractUrl(currentSupplier);
      if (!url) throw new Error('Contrato indisponível.');
      const fileKind = getContractFileKind(currentSupplier);
      setContractPreview({ url, mode: fileKind === 'pdf' ? 'preview' : 'download' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir o contrato.';
      await customAlert({
        title: 'Não foi possível abrir',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    } finally {
      setOpeningContract(false);
    }
  };

  const getShareText = (supplier: Supplier) => {
    const paidTotal = supplier.parcelas.reduce((acc, installment) => installment.status === 'pago' ? acc + installment.valor : acc, 0);
    const pendingTotal = supplier.parcelas.reduce((acc, installment) => installment.status !== 'pago' ? acc + installment.valor : acc, 0);
    const nextInstallment = [...supplier.parcelas]
      .filter((installment) => installment.status !== 'pago')
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))[0];

    return [
      `Fornecedor: ${supplier.fornecedor}`,
      `Serviço: ${supplier.servico}`,
      `Categoria: ${supplier.categoria}`,
      supplier.phone ? `Telefone: ${supplier.phone}` : null,
      supplier.email ? `E-mail: ${supplier.email}` : null,
      supplier.cnpj_cpf ? `CPF/CNPJ: ${supplier.cnpj_cpf}` : null,
      supplier.address ? `Endereço: ${supplier.address}` : null,
      `Valor contratado: ${formatCurrency(supplier.valorTotal)}`,
      `Total pago: ${formatCurrency(paidTotal)}`,
      `Pendente: ${formatCurrency(pendingTotal)}`,
      nextInstallment ? `Próximo vencimento: ${formatDate(nextInstallment.dataVencimento)} - ${formatCurrency(nextInstallment.valor)}` : null,
      supplier.contract_file_name ? `Contrato: ${supplier.contract_file_name}` : null,
      supplier.observacoes ? `Observações: ${supplier.observacoes}` : null,
    ].filter(Boolean).join('\n');
  };

  const handleShareSupplier = async () => {
    if (!currentSupplier) return;

    const shareData = {
      title: `Dados de ${currentSupplier.fornecedor}`,
      text: getShareText(currentSupplier),
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(shareData.text);
      toast({
        title: 'Dados copiados',
        description: 'As informações do fornecedor foram copiadas para compartilhar.',
        type: 'success',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      const message = error instanceof Error ? error.message : 'Não foi possível compartilhar os dados.';
      await customAlert({
        title: 'Não foi possível compartilhar',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    }
  };

  const handleRemoveContract = async () => {
    if (!currentSupplier || !hasSupplierContract(currentSupplier)) return;

    const isConfirmed = await confirm({
      title: 'Remover contrato?',
      description: `Isso removerá o documento anexado ao fornecedor "${currentSupplier.fornecedor}". O cadastro e as parcelas serão mantidos.`,
      type: 'danger',
      confirmLabel: 'Sim, remover',
      cancelLabel: 'Cancelar',
    });

    if (!isConfirmed) return;

    setRemovingContract(true);
    try {
      await deleteSupplierContract(currentSupplier);
      await updateSupplier(currentSupplier.id, clearSupplierContractFields(currentSupplier));
      toast({
        title: 'Contrato removido',
        description: `O contrato de ${currentSupplier.fornecedor} foi excluído.`,
        type: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível remover o contrato.';
      await customAlert({
        title: 'Não foi possível remover',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    } finally {
      setRemovingContract(false);
    }
  };

  if (!currentSupplier) {
    return (
      <div className="py-20 text-center space-y-4">
        <Heart size={48} className="mx-auto text-muted-foreground opacity-20" />
        <h3 className="text-xl font-black uppercase text-muted-foreground tracking-tighter italic">Fornecedor não encontrado</h3>
        <Button onClick={() => navigate('/fornecedores')} variant="outline" className="rounded-full">
          Voltar para Lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div className="space-y-4 w-full">
          <button
            onClick={() => navigate('/fornecedores')}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary font-black uppercase text-[10px] tracking-widest transition-all group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Voltar
          </button>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground uppercase tracking-tight leading-none break-words max-w-full">{currentSupplier.fornecedor}</h2>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Badge className="bg-primary/10 text-primary border-none text-[10px] sm:text-sm px-3 sm:px-4 py-1">
                {currentSupplier.categoria}
              </Badge>
              <button 
                onClick={() => onEdit(currentSupplier)}
                className="p-2 text-muted-foreground hover:bg-secondary hover:text-primary rounded-xl transition-colors"
              >
                <Edit2 size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
          <p className="text-muted-foreground font-semibold text-sm sm:text-base tracking-tight uppercase opacity-70">{currentSupplier.servico}</p>
        </div>
      </div>


      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          {(currentSupplier.regraPagamento || currentSupplier.observacoes || currentSupplier.phone || currentSupplier.email || currentSupplier.cnpj_cpf || currentSupplier.address) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
              {(currentSupplier.phone || currentSupplier.email || currentSupplier.cnpj_cpf || currentSupplier.address) && (
                <Card className="border-none shadow-lg bg-card p-6 border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-4 text-blue-500">
                    <Building size={18} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wider">Dados do Fornecedor</h4>
                  </div>
                  <div className="space-y-3">
                    {currentSupplier.cnpj_cpf && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText size={14} className="text-muted-foreground" />
                        <span className="text-foreground font-medium">{currentSupplier.cnpj_cpf}</span>
                      </div>
                    )}
                    {currentSupplier.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-muted-foreground" />
                        <span className="text-foreground font-medium">{currentSupplier.phone}</span>
                      </div>
                    )}
                    {currentSupplier.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={14} className="text-muted-foreground" />
                        <span className="text-foreground font-medium">{currentSupplier.email}</span>
                      </div>
                    )}
                    {currentSupplier.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-muted-foreground" />
                        <span className="text-foreground font-medium">{currentSupplier.address}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {currentSupplier.regraPagamento && (
                <Card className="border-none shadow-lg bg-card p-6 border-l-4 border-primary">
                  <div className="flex items-center gap-2 mb-3 text-primary">
                    <DollarSign size={18} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wider">Acordo de Pagamento</h4>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                    {currentSupplier.regraPagamento}
                  </p>
                </Card>
              )}
              {currentSupplier.observacoes && (
                <Card className="border-none shadow-lg bg-card p-6 border-l-4 border-amber-500">
                  <div className="flex items-center gap-2 mb-3 text-amber-500">
                    <Info size={18} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wider">Observações</h4>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                    {currentSupplier.observacoes}
                  </p>
                </Card>
              )}
            </div>
          )}

          <Card className="border-none shadow-xl bg-card p-4 sm:p-8 print:shadow-none print:border print:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div className="flex flex-col gap-4">
                <h3 className="text-xl sm:text-2xl font-black text-foreground print:text-xl uppercase italic tracking-tighter">Cronograma</h3>
                <div className="flex flex-wrap gap-1 p-1 bg-secondary/20 rounded-xl border border-white/5 print:hidden">
                  <SortButton active={instSort.key === 'numero'} onClick={() => toggleInstSort('numero')} label="#" direction={instSort.key === 'numero' ? instSort.direction : null} />
                  <SortButton active={instSort.key === 'dataVencimento'} onClick={() => toggleInstSort('dataVencimento')} label="Data" direction={instSort.key === 'dataVencimento' ? instSort.direction : null} />
                  <SortButton active={instSort.key === 'valor'} onClick={() => toggleInstSort('valor')} label="Valor" direction={instSort.key === 'valor' ? instSort.direction : null} />
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" className="flex-1 sm:flex-none h-10 text-[10px] sm:text-sm font-black uppercase" onClick={handlePrint}><Printer size={16} /> Imprimir</Button>
                <Button variant="outline" className="flex-1 sm:flex-none h-10 text-[10px] sm:text-sm font-black uppercase" onClick={() => handleExportCSV(currentSupplier)}><Download size={16} /> Exportar</Button>
              </div>
            </div>
 
            <div className="space-y-3 sm:space-y-4">
              {sortedInstallments.map((p) => {
                const isEditing = editingInstallmentId === p.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex flex-col p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300",
                      p.status === 'pago' ? "bg-green-500/10 border-green-500/20" : "bg-card border-border hover:border-primary/5"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 sm:gap-5">
                        <button
                          onClick={() => onToggleStatus(currentSupplier.id, p)}
                          className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0",
                            p.status === 'pago' ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          {p.status === 'pago' ? <CheckCircle2 size={20} className="sm:w-6 sm:h-6" /> : <Circle size={20} className="sm:w-6 sm:h-6" />}
                        </button>
                        <div className="min-w-0">
                          <p className="font-black text-base sm:text-lg text-foreground leading-tight">Parcela {p.numero}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-sm font-medium">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar size={12} /> {formatDate(p.dataVencimento)}
                            </span>
                            {p.dataPagamento && (
                              <span className="text-green-600 flex items-center gap-1">
                                <DollarSign size={12} /> Pago: {formatDate(p.dataPagamento)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
 
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                        <div className="text-left sm:text-right">
                          <p className={cn("text-lg sm:text-xl font-black font-mono", p.status === 'pago' ? "text-green-600" : "text-foreground")}>
                            {formatCurrency(p.valor)}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingInstallmentId(isEditing ? null : p.id)}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>


                    {isEditing && (
                      <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Valor da Parcela</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <Input
                              type="text"
                              className="pl-8 h-10 text-sm font-bold"
                              value={maskCurrency(p.valor)}
                              onChange={(e) => updateInstallment(currentSupplier.id, p.id, { valor: unmaskCurrency(e.target.value) })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Vencimento</label>
                          <Input
                            type="date"
                            className="h-10 text-sm"
                            value={p.dataVencimento}
                            onChange={(e) => updateInstallment(currentSupplier.id, p.id, { dataVencimento: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Data do Pagamento</label>
                          <Input
                            type="date"
                            className="h-10 text-sm border-primary/20 bg-primary/5"
                            value={p.dataPagamento || ""}
                            onChange={(e) => updateInstallment(currentSupplier.id, p.id, {
                              dataPagamento: e.target.value,
                              status: e.target.value ? "pago" : "pendente"
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="w-full lg:w-96 space-y-6">
          <Card className="bg-primary text-white border-none shadow-2xl p-6 sm:p-8 overflow-hidden relative">
            <Heart className="absolute -right-4 -bottom-4 text-white/10" size={160} />
            <h3 className="text-lg sm:text-xl font-bold mb-6 relative z-10 uppercase italic tracking-tighter">Resumo Financeiro</h3>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-white/20 gap-4">
                <span className="text-white/80 font-medium text-sm sm:text-base">Contratado</span>
                <span className="font-black text-base sm:text-lg font-mono whitespace-nowrap">{formatCurrency(currentSupplier.valorTotal)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/20 gap-4">
                <span className="text-white/80 font-medium text-sm sm:text-base">Total Pago</span>
                <span className="font-black text-base sm:text-lg font-mono text-green-300 whitespace-nowrap">
                   {formatCurrency(currentSupplier.parcelas.reduce((acc, p) => p.status === 'pago' ? acc + p.valor : acc, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-white/80 font-medium text-sm sm:text-base">Pendente</span>
                <span className="font-black text-lg sm:text-xl font-mono whitespace-nowrap">
                   {formatCurrency(currentSupplier.parcelas.reduce((acc, p) => p.status === 'pendente' ? acc + p.valor : acc, 0))}
                </span>
              </div>
            </div>
          </Card>


          <Card className="border-none shadow-xl bg-card p-6">
            <h4 className="font-bold mb-4">Ações do Fornecedor</h4>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start font-bold h-12"
                onClick={() => onEdit(currentSupplier)}
              >
                <Edit2 size={18} /> Editar Fornecedor
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start font-bold h-12"
                disabled={!hasSupplierContract(currentSupplier) || openingContract || removingContract}
                onClick={handleOpenContract}
              >
                <FileText size={18} /> {openingContract ? 'Abrindo...' : 'Ver Contrato'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start font-bold h-12 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={!hasSupplierContract(currentSupplier) || openingContract || removingContract}
                onClick={handleRemoveContract}
              >
                <Trash2 size={18} /> {removingContract ? 'Removendo...' : 'Remover Contrato'}
              </Button>
              {hasSupplierContract(currentSupplier) && (
                <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs font-bold text-muted-foreground">
                  <p className="truncate text-foreground">{currentSupplier.contract_file_name || 'Contrato PDF'}</p>
                  <p className="mt-1">
                    Tamanho salvo: {formatFileSize(currentSupplier.contract_compressed_size_bytes || currentSupplier.contract_file_size_bytes)}
                  </p>
                </div>
              )}
              <Button variant="outline" className="w-full justify-start font-bold h-12" onClick={handleShareSupplier}>
                <Share2 size={18} /> Compartilhar Dados
              </Button>
              <Button variant="destructive" className="w-full justify-start font-bold h-12" onClick={async () => {
                const isConfirmed = await confirm({
                  title: "Excluir Fornecedor?",
                  description: `Tem certeza que deseja excluir "${currentSupplier.fornecedor}"? Isso removerá todos os dados e parcelas associadas permanentemente.`,
                  type: "danger",
                  confirmLabel: "Sim, Excluir",
                  cancelLabel: "Cancelar",
                });
                if (isConfirmed) {
                  deleteSupplier(currentSupplier.id);
                  toast({
                    title: 'Fornecedor removido',
                    description: `${currentSupplier.fornecedor} foi excluído do planejamento.`,
                    type: 'success',
                  });
                  navigate('/fornecedores');
                }
              }}>
                Remover Fornecedor
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {contractPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm print:hidden">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Visualização do contrato</p>
                <h3 className="truncate text-lg font-black text-foreground">{currentSupplier.fornecedor}</h3>
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {currentSupplier.contract_file_name || 'Contrato anexado'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => window.open(contractPreview.url, '_blank', 'noopener,noreferrer')}
                >
                  <Download size={16} /> Abrir em nova aba
                </Button>
                <button
                  type="button"
                  onClick={() => setContractPreview(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Fechar visualização"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {contractPreview.mode === 'preview' ? (
              <iframe title={`Contrato de ${currentSupplier.fornecedor}`} src={contractPreview.url} className="min-h-0 flex-1 bg-white" />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <FileText className="text-primary" size={44} />
                <div>
                  <h4 className="text-xl font-black text-foreground">Visualização indisponível para Word</h4>
                  <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
                    Arquivos DOC/DOCX precisam ser abertos em uma nova aba ou baixados para visualização.
                  </p>
                </div>
                <Button className="h-11 rounded-xl" onClick={() => window.open(contractPreview.url, '_blank', 'noopener,noreferrer')}>
                  <Download size={16} /> Abrir documento
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
