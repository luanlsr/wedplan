import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge } from '../ui';
import {
  ChevronLeft, CheckCircle2, Circle, Calendar, Printer,
  Download, Heart, DollarSign, FileText, Edit2, Info,
  ArrowUp, ArrowDown, ArrowUpDown,
  Share2, Phone, Mail, MapPin, Building
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { maskCurrency, unmaskCurrency } from '../../utils/masks';
import type { Supplier, Installment } from '../../types';

interface SupplierDetailsProps {
  suppliers: Supplier[];
  updateInstallment: (supplierId: string, installmentId: string, updates: Partial<Installment>) => void;
  deleteSupplier: (id: string) => void;
  confirm: (options: any) => Promise<boolean>;
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
  deleteSupplier,
  confirm,
  onToggleStatus,
  onEdit
}: SupplierDetailsProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
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
        <div className="space-y-4">
          <button
            onClick={() => navigate('/fornecedores')}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary font-black uppercase text-[10px] tracking-widest transition-all group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Voltar
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl sm:text-6xl font-black text-foreground uppercase tracking-tighter leading-none italic">{currentSupplier.fornecedor}</h2>
            <Badge className="bg-primary/10 text-primary border-none text-xs sm:text-sm px-4 py-1 self-start mt-2">
              {currentSupplier.categoria}
            </Badge>
            <button 
              onClick={() => onEdit(currentSupplier)}
              className="p-2 ml-auto text-muted-foreground hover:bg-secondary hover:text-primary rounded-xl transition-colors"
            >
              <Edit2 size={24} />
            </button>
          </div>
          <p className="text-muted-foreground font-medium text-lg italic tracking-tight">{currentSupplier.servico}</p>
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

          <Card className="border-none shadow-xl bg-card p-8 print:shadow-none print:border print:p-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <h3 className="text-2xl font-black text-foreground print:text-xl">Cronograma</h3>
                <div className="flex gap-1 p-1 bg-secondary/20 rounded-xl border border-white/5 print:hidden">
                  <SortButton active={instSort.key === 'numero'} onClick={() => toggleInstSort('numero')} label="#" direction={instSort.key === 'numero' ? instSort.direction : null} />
                  <SortButton active={instSort.key === 'dataVencimento'} onClick={() => toggleInstSort('dataVencimento')} label="Data" direction={instSort.key === 'dataVencimento' ? instSort.direction : null} />
                  <SortButton active={instSort.key === 'valor'} onClick={() => toggleInstSort('valor')} label="Valor" direction={instSort.key === 'valor' ? instSort.direction : null} />
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" className="h-10 text-sm" onClick={handlePrint}><Printer size={16} /> Imprimir</Button>
                <Button variant="outline" className="h-10 text-sm" onClick={() => handleExportCSV(currentSupplier)}><Download size={16} /> Exportar</Button>
              </div>
            </div>

            <div className="space-y-4">
              {sortedInstallments.map((p) => {
                const isEditing = editingInstallmentId === p.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex flex-col p-5 rounded-2xl border-2 transition-all duration-300",
                      p.status === 'pago' ? "bg-green-500/10 border-green-500/20" : "bg-card border-border hover:border-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <button
                          onClick={() => onToggleStatus(currentSupplier.id, p)}
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm",
                            p.status === 'pago' ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          {p.status === 'pago' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        <div>
                          <p className="font-black text-lg text-foreground">Parcela {p.numero}</p>
                          <div className="flex items-center gap-4 text-sm font-medium">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar size={14} /> Venc: {formatDate(p.dataVencimento)}
                            </span>
                            {p.dataPagamento && (
                              <span className="text-green-600 flex items-center gap-1">
                                <DollarSign size={14} /> Pago em: {formatDate(p.dataPagamento)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={cn("text-xl font-black font-mono", p.status === 'pago' ? "text-green-600" : "text-foreground")}>
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
          <Card className="bg-primary text-white border-none shadow-2xl p-8 overflow-hidden relative">
            <Heart className="absolute -right-4 -bottom-4 text-white/10" size={160} />
            <h3 className="text-xl font-bold mb-6 relative z-10">Resumo Financeiro</h3>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-white/20">
                <span className="text-white/80 font-medium">Contratado</span>
                <span className="font-black text-lg font-mono">{formatCurrency(currentSupplier.valorTotal)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/20">
                <span className="text-white/80 font-medium">Total Pago</span>
                <span className="font-black text-lg font-mono text-green-300">
                  {formatCurrency(currentSupplier.parcelas.reduce((acc, p) => p.status === 'pago' ? acc + p.valor : acc, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80 font-medium">Pendente</span>
                <span className="font-black text-xl font-mono">
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
                disabled={!currentSupplier.contract_url}
                onClick={() => currentSupplier.contract_url && window.open(currentSupplier.contract_url, '_blank')}
              >
                <FileText size={18} /> Ver Contrato
              </Button>
              <Button variant="outline" className="w-full justify-start font-bold h-12">
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
                  navigate('/fornecedores');
                }
              }}>
                Remover Fornecedor
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
