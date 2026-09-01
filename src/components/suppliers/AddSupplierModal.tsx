import React, { useState, useMemo, useEffect } from "react";
import type { Supplier, PaymentType } from "../../types";
import { Card, Button, Input, useConfirm } from "../ui";
import { X, Calendar, DollarSign, Briefcase, Percent, Layers, Info, Clock, ChevronDown, Users, Phone, Mail, FileText, MapPin, Upload, FileCheck } from "lucide-react";
import { generateInstallments, formatCurrency } from "../../utils/calculations";
import { maskCurrency, unmaskCurrency, maskPhone, maskCPFOrCNPJ } from "../../utils/masks";
import { formatFileSize, uploadSupplierContract, type UploadedContract } from "../../services/contractStorage";

interface SupplierModalProps {
  onClose: () => void;
  onAdd: (supplier: Supplier) => void | Promise<void>;
  onUpdate?: (id: string, supplier: Supplier) => void | Promise<void>;
  weddingDate: string;
  weddingId?: string;
  editSupplier?: Supplier | null;
}

type InstallmentConfig = {
  startDate: string;
  finalPaymentDaysBeforeWedding: number;
  numInstallments?: number;
  entryValue?: number;
  entryPercentage?: number;
  entryInInstallments?: number;
};

const ACCEPTED_CONTRACT_EXTENSIONS = [".pdf", ".doc", ".docx"];
const CONTRACT_ACCEPT_ATTRIBUTE = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx";
const MAX_CONTRACT_ORIGINAL_BYTES = 25 * 1024 * 1024;
const MAX_CONTRACT_DIRECT_UPLOAD_BYTES = 10 * 1024 * 1024;

const isAcceptedContractFile = (file: File) => {
  const fileName = file.name.toLowerCase();
  return ACCEPTED_CONTRACT_EXTENSIONS.some((extension) => fileName.endsWith(extension));
};

const getContractFileValidationError = (file: File) => {
  if (!isAcceptedContractFile(file)) return `Envie um arquivo PDF, DOC ou DOCX válido. Arquivo selecionado: ${formatFileSize(file.size)}.`;
  if (file.size > MAX_CONTRACT_ORIGINAL_BYTES) {
    return `Arquivo selecionado: ${formatFileSize(file.size)}. Limite permitido: ${formatFileSize(MAX_CONTRACT_ORIGINAL_BYTES)}. Excedeu em ${formatFileSize(Math.max(file.size - MAX_CONTRACT_ORIGINAL_BYTES, 0))}.`;
  }
  return null;
};

export const SupplierModal = ({ onClose, onAdd, onUpdate, weddingDate, weddingId, editSupplier }: SupplierModalProps) => {
  const { alert: customAlert } = useConfirm();
  const isEditing = !!editSupplier;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractUploadInfo, setContractUploadInfo] = useState<UploadedContract | null>(null);

  const [formData, setFormData] = useState({
    fornecedor: "",
    servico: "",
    categoria: "Outros",
    valorTotal: "",
    tipoPagamento: "parcelado_fixo" as PaymentType,
    numParcelas: "1",
    entryPercentage: "30",
    entryValue: "",
    entryInInstallments: "1",
    dataContrato: new Date().toISOString().split("T")[0],
    finalPaymentDaysBeforeWedding: "15",
    observacoes: "",
    regraPagamento: "",
    staff_names: "",
    phone: "",
    email: "",
    cnpj_cpf: "",
    address: "",
    contract_url: "",
    contract_storage_path: "",
    contract_file_name: "",
    contract_file_size_bytes: 0,
    contract_compressed_size_bytes: 0,
    contract_mime_type: "application/pdf",
    contract_uploaded_at: ""
  });

  useEffect(() => {
    if (editSupplier) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        fornecedor: editSupplier.fornecedor,
        servico: editSupplier.servico,
        categoria: editSupplier.categoria,
        valorTotal: maskCurrency(editSupplier.valorTotal),
        tipoPagamento: editSupplier.tipoPagamento,
        numParcelas: editSupplier.parcelas.length.toString(),
        entryPercentage: editSupplier.porcentagemEntrada?.toString() || "30",
        entryValue: editSupplier.valorEntrada ? maskCurrency(editSupplier.valorEntrada) : "",
        entryInInstallments: editSupplier.entradaEmParcelas?.toString() || "1",
        dataContrato: editSupplier.dataContrato,
        finalPaymentDaysBeforeWedding: editSupplier.diasPagamentoFinalAntesCasamento?.toString() || "15",
        observacoes: editSupplier.observacoes || "",
        regraPagamento: editSupplier.regraPagamento || "",
        staff_names: editSupplier.staff_names || "",
        phone: editSupplier.phone || "",
        email: editSupplier.email || "",
        cnpj_cpf: editSupplier.cnpj_cpf || "",
        address: editSupplier.address || "",
        contract_url: editSupplier.contract_url || "",
        contract_storage_path: editSupplier.contract_storage_path || "",
        contract_file_name: editSupplier.contract_file_name || "",
        contract_file_size_bytes: editSupplier.contract_file_size_bytes || 0,
        contract_compressed_size_bytes: editSupplier.contract_compressed_size_bytes || 0,
        contract_mime_type: editSupplier.contract_mime_type || "application/pdf",
        contract_uploaded_at: editSupplier.contract_uploaded_at || "",
      });
    }
  }, [editSupplier]);

  const categories = [
    "Assessoria", "Bolo e Doces", "Buffet", "Decoração", "Dia da Noiva", "Dia do Noivo", "Documentação",
    "Espaço / Sítio", "Foto & Filmagem", "Iluminação", "Música / DJ",
    "Vestuário", "Viagem", "Outros"
  ].sort((a, b) => a === "Outros" ? 1 : b === "Outros" ? -1 : a.localeCompare(b));

  // Helper to sync % and Value
  const handleEntryPercentageChange = (value: string) => {
    const total = unmaskCurrency(formData.valorTotal) || 0;
    const percentage = parseFloat(value) || 0;

    // Calculate entry value but don't force too many decimals if not needed
    const entryVal = (total * percentage) / 100;

    setFormData(prev => ({
      ...prev,
      entryPercentage: value,
      entryValue: value === "" ? "" : maskCurrency(entryVal)
    }));
  };

  const handleEntryValueChange = (value: string) => {
    const total = unmaskCurrency(formData.valorTotal) || 0;
    const maskedValue = maskCurrency(value);
    const entryVal = unmaskCurrency(maskedValue) || 0;

    // Calculate percentage with higher precision (2 decimals)
    const percentage = total > 0 ? (entryVal / total) * 100 : 0;

    setFormData(prev => ({
      ...prev,
      entryValue: maskedValue,
      entryPercentage: value === "" ? "" : (Math.round(percentage * 100) / 100).toString()
    }));
  };

  const preview = useMemo(() => {
    const total = unmaskCurrency(formData.valorTotal) || 0;
    if (total <= 0) return null;

    if (formData.tipoPagamento === "parcelado_fixo") {
      const num = parseInt(formData.numParcelas) || 1;
      return {
        installments: `${num}x de ${formatCurrency(total / num)}`
      };
    }

    if (formData.tipoPagamento === "entrada_parcelas" || formData.tipoPagamento === "entrada_quitacao") {
      const entryTotal = unmaskCurrency(formData.entryValue) || (total * (parseFloat(formData.entryPercentage) || 0)) / 100;
      const entryNum = parseInt(formData.entryInInstallments) || 1;
      const remainingTotal = total - entryTotal;
      const remainingNum = formData.tipoPagamento === "entrada_parcelas" ? (parseInt(formData.numParcelas) || 1) : 1;

      return {
        entryTotal: formatCurrency(entryTotal),
        entryDetails: entryNum > 1 ? `${entryNum}x de ${formatCurrency(entryTotal / entryNum)}` : "À vista",
        remainingTotal: formatCurrency(remainingTotal),
        remainingDetails: remainingNum > 1 ? `${remainingNum}x de ${formatCurrency(remainingTotal / remainingNum)}` : "Quitação Final",
        isMixed: true
      };
    }

    return {
      installments: `Pagamento único de ${formatCurrency(total)}`
    };
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const total = unmaskCurrency(formData.valorTotal);

    const config: InstallmentConfig = {
      startDate: formData.dataContrato,
      finalPaymentDaysBeforeWedding: parseInt(formData.finalPaymentDaysBeforeWedding)
    };

    if (formData.tipoPagamento === "parcelado_fixo") {
      config.numInstallments = parseInt(formData.numParcelas);
    } else if (formData.tipoPagamento === "entrada_parcelas" || formData.tipoPagamento === "entrada_quitacao") {
      config.entryValue = unmaskCurrency(formData.entryValue);
      config.entryPercentage = parseFloat(formData.entryPercentage);
      config.entryInInstallments = parseInt(formData.entryInInstallments);
      config.numInstallments = parseInt(formData.numParcelas);
    }

    const installments = generateInstallments(weddingDate, total, formData.tipoPagamento, config);

    let contractUrl = formData.contract_url;
    let contractStoragePath = formData.contract_storage_path || null;
    let contractFileName = formData.contract_file_name || null;
    let contractFileSizeBytes = formData.contract_file_size_bytes || null;
    let contractCompressedSizeBytes = formData.contract_compressed_size_bytes || null;
    let contractMimeType = formData.contract_mime_type || "application/pdf";
    let contractUploadedAt = formData.contract_uploaded_at || null;

    if (contractFile) {
      if (!weddingId) {
        await customAlert({
          title: "Casamento não salvo",
          description: "Salve os dados do casamento antes de anexar contratos.",
          type: "warning",
          confirmLabel: "Entendi",
        });
        setIsSubmitting(false);
        return;
      }

      const validationError = getContractFileValidationError(contractFile);
      if (validationError) {
        await customAlert({
          title: "Arquivo inválido",
          description: validationError,
          type: "warning",
          confirmLabel: "Entendi",
        });
        setIsSubmitting(false);
        return;
      }

      try {
        const uploaded = await uploadSupplierContract({
          file: contractFile,
          weddingId,
          previousPath: formData.contract_storage_path || null,
        });

        setContractUploadInfo(uploaded);
        contractUrl = "";
        contractStoragePath = uploaded.path;
        contractFileName = uploaded.fileName;
        contractFileSizeBytes = uploaded.originalSize;
        contractCompressedSizeBytes = uploaded.compressedSize;
        contractMimeType = uploaded.mimeType;
        contractUploadedAt = uploaded.uploadedAt;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao fazer upload do contrato. Tente novamente.";
        console.error("Error uploading contract:", error);
        await customAlert({
          title: "Erro no upload",
          description: message,
          type: "danger",
          confirmLabel: "Entendi",
        });
        setIsSubmitting(false);
        return;
      }
    }

    const supplierData: Supplier = {
      id: editSupplier?.id || Math.random().toString(36).substr(2, 9),
      fornecedor: formData.fornecedor,
      servico: formData.servico,
      categoria: formData.categoria,
      valorTotal: total,
      tipoPagamento: formData.tipoPagamento,
      dataContrato: formData.dataContrato,
      parcelas: installments,
      status: editSupplier?.status || "pendente",
      observacoes: formData.observacoes,
      regraPagamento: formData.regraPagamento,
      numeroParcelas: parseInt(formData.numParcelas),
      valorEntrada: unmaskCurrency(formData.entryValue) || 0,
      porcentagemEntrada: parseFloat(formData.entryPercentage) || 0,
      entradaEmParcelas: parseInt(formData.entryInInstallments) || 1,
      diasPagamentoFinalAntesCasamento: parseInt(formData.finalPaymentDaysBeforeWedding) || 15,
      staff_names: formData.staff_names,
      phone: formData.phone,
      email: formData.email,
      cnpj_cpf: formData.cnpj_cpf,
      address: formData.address,
      contract_url: contractUrl,
      contract_storage_path: contractStoragePath,
      contract_file_name: contractFileName,
      contract_file_size_bytes: contractFileSizeBytes,
      contract_compressed_size_bytes: contractCompressedSizeBytes,
      contract_mime_type: contractMimeType,
      contract_uploaded_at: contractUploadedAt
    };

    if (isEditing && onUpdate) {
      await onUpdate(editSupplier!.id, supplierData);
    } else {
      await onAdd(supplierData);
    }
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl bg-card p-0 overflow-hidden shadow-2xl border-none">
        <div className="bg-primary p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
            <p className="text-sm text-white/70">{isEditing ? "Atualize os dados do contrato" : "Adicione um novo contrato ao seu casamento"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Fornecedor</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  required
                  placeholder="Ex: Fernando Lima"
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.fornecedor}
                  onChange={e => setFormData({ ...formData, fornecedor: (e.target as HTMLInputElement).value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Serviço</label>
              <Input
                required
                placeholder="Ex: Fotografia"
                className="bg-secondary/50 border-none focus:bg-card transition-all"
                value={formData.servico}
                onChange={e => setFormData({ ...formData, servico: (e.target as HTMLInputElement).value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="email"
                  placeholder="contato@fornecedor.com"
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: (e.target as HTMLInputElement).value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="text"
                  placeholder="(00) 00000-0000"
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: maskPhone((e.target as HTMLInputElement).value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">CNPJ ou CPF</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.cnpj_cpf}
                  onChange={e => setFormData({ ...formData, cnpj_cpf: maskCPFOrCNPJ((e.target as HTMLInputElement).value) })}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-muted-foreground">Endereço Completo</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade - Estado"
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: (e.target as HTMLInputElement).value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Categoria</label>
              <div className="relative">
                <select
                  className="w-full h-12 px-4 pr-10 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground appearance-none"
                  value={formData.categoria}
                  onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Data do Contrato</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="date"
                  required
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.dataContrato}
                  onChange={e => setFormData({ ...formData, dataContrato: (e.target as HTMLInputElement).value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Valor Total (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="text"
                  required
                  placeholder="0,00"
                  className="pl-12 font-bold bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.valorTotal}
                  onChange={e => {
                    const maskedValue = maskCurrency(e.target.value);
                    const total = unmaskCurrency(maskedValue) || 0;
                    const percentage = parseFloat(formData.entryPercentage) || 0;
                    const newEntryVal = (total * percentage) / 100;

                    setFormData(prev => ({
                      ...prev,
                      valorTotal: maskedValue,
                      entryValue: total > 0 && percentage > 0 ? maskCurrency(newEntryVal) : prev.entryValue
                    }));
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Tipo de Pagamento</label>
              <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <select
                  className="w-full h-12 pl-12 pr-10 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground appearance-none"
                  value={formData.tipoPagamento}
                  onChange={e => setFormData({ ...formData, tipoPagamento: e.target.value as PaymentType })}
                >
                  <option value="parcelado_fixo">Parcelado Fixo</option>
                  <option value="pagamento_unico">Pagamento Único</option>
                  <option value="entrada_parcelas">Entrada + Parcelas</option>
                  <option value="entrada_quitacao">Entrada + Saldo na Quitação</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            </div>

            {formData.tipoPagamento === "entrada_quitacao" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-bold text-muted-foreground">Quitação (dias antes do casamento)</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    type="number"
                    min="0"
                    max="365"
                    className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                    value={formData.finalPaymentDaysBeforeWedding}
                    onChange={e => setFormData({ ...formData, finalPaymentDaysBeforeWedding: (e.target as HTMLInputElement).value })}
                  />
                </div>
              </div>
            )}

            {formData.tipoPagamento === "parcelado_fixo" && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Número de Parcelas</label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  className="bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.numParcelas}
                  onChange={e => setFormData({ ...formData, numParcelas: (e.target as HTMLInputElement).value })}
                />
              </div>
            )}

            {(formData.tipoPagamento === "entrada_parcelas" || formData.tipoPagamento === "entrada_quitacao") && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Valor da Entrada (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      type="text"
                      placeholder="Valor fixo"
                      className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                      value={formData.entryValue}
                      onChange={e => handleEntryValueChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Entrada em %</label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      step="0.01"
                      className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                      value={formData.entryPercentage}
                      onChange={e => handleEntryPercentageChange((e.target as HTMLInputElement).value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Parcelar Entrada em:</label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="Parcelas da entrada"
                      className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                      value={formData.entryInInstallments}
                      onChange={e => setFormData({ ...formData, entryInInstallments: (e.target as HTMLInputElement).value })}
                    />
                  </div>
                </div>

                {formData.tipoPagamento === "entrada_parcelas" && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground">Parcelas Restantes:</label>
                    <Input
                      type="number"
                      min="1"
                      max="48"
                      className="bg-secondary/50 border-none focus:bg-card transition-all"
                      value={formData.numParcelas}
                      onChange={e => setFormData({ ...formData, numParcelas: (e.target as HTMLInputElement).value })}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground">Regra de Pagamento / Negociação</label>
            <Input
              placeholder="Ex: 30% entrada, restante 15 dias antes"
              className="bg-secondary/50 border-none focus:bg-card transition-all"
              value={formData.regraPagamento}
              onChange={e => setFormData({ ...formData, regraPagamento: (e.target as HTMLInputElement).value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground">Observações Adicionais</label>
            <textarea
              placeholder="Notas importantes sobre o contrato..."
              className="w-full min-h-[100px] p-4 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground resize-none"
              value={formData.observacoes}
              onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" /> Equipe / Staff do Fornecedor
            </label>
            <textarea
              placeholder="Ex: João (Maitre), Maria (Garçom)..."
              className="w-full min-h-[100px] p-4 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground resize-none"
              value={formData.staff_names}
              onChange={e => setFormData({ ...formData, staff_names: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">Liste os nomes dos funcionários que estarão presentes no dia do evento.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Upload size={16} className="text-primary" /> Contrato ou documento
            </label>
            <div className="mt-2 flex justify-center rounded-xl border border-dashed border-border px-6 py-8 hover:bg-secondary/30 transition-colors">
              <div className="text-center">
                {contractFile || formData.contract_storage_path || formData.contract_url ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileCheck className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
                    <div className="text-sm font-medium text-foreground">
                      {contractFile ? contractFile.name : formData.contract_file_name || 'Contrato anexado'}
                    </div>
                    {contractFile && (
                      <p className="text-xs font-bold text-muted-foreground">
                        Original: {formatFileSize(contractFile.size)}. PDFs serão compactados antes de salvar.
                      </p>
                    )}
                    {contractFile && contractFile.size > MAX_CONTRACT_DIRECT_UPLOAD_BYTES && (
                      <p className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Acima de {formatFileSize(MAX_CONTRACT_DIRECT_UPLOAD_BYTES)} depende da compactação
                      </p>
                    )}
                    {!contractFile && formData.contract_compressed_size_bytes > 0 && (
                      <p className="text-xs font-bold text-muted-foreground">
                        Salvo com {formatFileSize(formData.contract_compressed_size_bytes)}
                      </p>
                    )}
                    {contractUploadInfo && (
                      <p className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                        {contractUploadInfo.uploadMode === 'direct'
                          ? `Arquivo salvo: ${formatFileSize(contractUploadInfo.compressedSize)}`
                          : contractUploadInfo.mimeType === 'application/pdf'
                          ? `Compactado: ${formatFileSize(contractUploadInfo.originalSize)} para ${formatFileSize(contractUploadInfo.compressedSize)}`
                          : `Arquivo salvo: ${formatFileSize(contractUploadInfo.compressedSize)}`}
                      </p>
                    )}
                    {contractFile && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setContractFile(null);
                          setContractUploadInfo(null);
                        }}
                        className="text-xs text-red-500 hover:text-red-400 font-bold"
                      >
                        Remover
                      </button>
                    )}
                    {!contractFile && (
                      <label
                        htmlFor="contract-file-upload"
                        className="cursor-pointer rounded-full bg-secondary px-3 py-1.5 text-xs font-black text-foreground transition-colors hover:bg-accent"
                      >
                        Trocar arquivo
                        <input
                          id="contract-file-upload"
                          name="contract-file-upload"
                          type="file"
                          className="sr-only"
                          accept={CONTRACT_ACCEPT_ATTRIBUTE}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const validationError = getContractFileValidationError(file);
                              if (validationError) {
                                void customAlert({
                                  title: "Arquivo inválido",
                                  description: validationError,
                                  type: "warning",
                                  confirmLabel: "Entendi",
                                });
                                e.currentTarget.value = "";
                                return;
                              }
                              setContractFile(file);
                              setContractUploadInfo(null);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 justify-center">
                      <label
                        htmlFor="contract-file-upload"
                        className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary/80"
                      >
                        <span>Selecione PDF ou Word</span>
                        <input 
                          id="contract-file-upload" 
                          name="contract-file-upload" 
                          type="file" 
                          className="sr-only" 
                          accept={CONTRACT_ACCEPT_ATTRIBUTE}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const validationError = getContractFileValidationError(file);
                              if (validationError) {
                                void customAlert({
                                  title: "Arquivo inválido",
                                  description: validationError,
                                  type: "warning",
                                  confirmLabel: "Entendi",
                                });
                                e.currentTarget.value = "";
                                return;
                              }
                              setContractFile(file);
                              setContractUploadInfo(null);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">PDF, DOC ou DOCX. Até 25MB no envio e até 10MB salvo.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Preview Section */}
          {preview && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-4 text-primary">
                <Info size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Resumo das Parcelas</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(formData.tipoPagamento === "entrada_parcelas" || formData.tipoPagamento === "entrada_quitacao") ? (
                  <>
                    <div className="p-3 bg-card rounded-xl border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Entrada Total</p>
                      <p className="text-lg font-black text-foreground">{preview.entryTotal}</p>
                      <p className="text-xs font-semibold text-primary">{preview.entryDetails}</p>
                    </div>
                    <div className="p-3 bg-card rounded-xl border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Saldo Restante</p>
                      <p className="text-lg font-black text-foreground">{preview.remainingTotal}</p>
                      <p className="text-xs font-semibold text-primary">{preview.remainingDetails}</p>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 p-3 bg-card rounded-xl border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Plano de Pagamento</p>
                    <p className="text-xl font-black text-foreground">{preview.installments}</p>
                  </div>
                )}
              </div>
              {isEditing && (
                <p className="text-[10px] text-amber-500 font-bold mt-4 uppercase">* Editar o plano de pagamento irá regenerar as parcelas e resetar os status de pagamento deste fornecedor.</p>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button type="button" variant="outline" className="flex-1 h-14" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-[2] h-14 text-lg shadow-lg shadow-primary/20" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Fornecedor"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
