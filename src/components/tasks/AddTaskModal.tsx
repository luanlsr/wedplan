import React, { useState, useEffect } from "react";
import type { Task } from "../../types";
import { Card, Button, Input } from "../ui";
import { X, Calendar, CheckSquare, Tag, AlignLeft, Flag, ChevronDown } from "lucide-react";

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id'>) => void;
  onUpdate?: (id: string, task: Partial<Task>) => void;
  editTask?: Task | null;
}

export const AddTaskModal = ({ onClose, onAdd, onUpdate, editTask }: AddTaskModalProps) => {
  const isEditing = !!editTask;

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    categoria: "Geral",
    dataLimite: new Date().toISOString().split("T")[0],
    status: "pendente" as Task['status'],
    ordem: 0
  });

  useEffect(() => {
    if (editTask) {
      setFormData({
        titulo: editTask.titulo,
        descricao: editTask.descricao || "",
        categoria: editTask.categoria || "Geral",
        dataLimite: editTask.dataLimite || new Date().toISOString().split("T")[0],
        status: editTask.status,
        ordem: editTask.ordem || 0
      });
    }
  }, [editTask]);

  const categories = ["Geral", "Financeiro", "Convidados", "Fornecedores", "Documentação", "Cerimônia", "Festa", "Vestuário", "Outros"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const taskData = {
      ...formData,
    };

    if (isEditing && onUpdate) {
      onUpdate(editTask!.id, taskData);
    } else {
      onAdd(taskData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg bg-card p-0 overflow-hidden shadow-2xl border-none">
        <div className="bg-primary p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</h3>
            <p className="text-sm text-white/70">{isEditing ? "Atualize os detalhes da tarefa" : "Organize mais um passo do seu casamento"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">O que precisa ser feito?</label>
              <div className="relative">
                <CheckSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  required
                  placeholder="Ex: Contratar Buffet" 
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.titulo}
                  onChange={e => setFormData({...formData, titulo: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Descrição (opcional)</label>
              <div className="relative">
                <AlignLeft className="absolute left-4 top-4 text-muted-foreground" size={18} />
                <textarea 
                  placeholder="Detalhes sobre a tarefa..." 
                  className="w-full min-h-[100px] pl-12 pr-4 py-4 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground resize-none"
                  value={formData.descricao}
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Categoria</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <select 
                      className="w-full h-12 pl-12 pr-10 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground appearance-none"
                      value={formData.categoria}
                      onChange={e => setFormData({...formData, categoria: e.target.value})}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                  </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Data Limite</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    type="date"
                    required
                    className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                    value={formData.dataLimite}
                    onChange={e => setFormData({...formData, dataLimite: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Status</label>
              <div className="relative">
                <Flag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <select 
                  className="w-full h-12 pl-12 pr-10 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as Task['status']})}
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_progresso">Em Progresso</option>
                  <option value="concluido">Concluída</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button type="button" variant="outline" className="flex-1 h-14" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-[2] h-14 text-lg shadow-lg shadow-primary/20">
              {isEditing ? "Salvar Alterações" : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
