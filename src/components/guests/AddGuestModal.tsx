import React, { useState, useEffect } from "react";
import type { Guest } from "../../types";
import { Card, Button, Input } from "../ui";
import { X, Users, Phone, Tag, MessageSquare, Baby, UserPlus, Plus, Trash2 } from "lucide-react";

import { maskPhone } from "../../utils/masks";

interface AddGuestModalProps {
  onClose: () => void;
  onAdd: (guest: Omit<Guest, 'id'>) => void;
  onUpdate?: (id: string, guest: Partial<Guest>) => void;
  editGuest?: Guest | null;
}

export const AddGuestModal = ({ onClose, onAdd, onUpdate, editGuest }: AddGuestModalProps) => {
  const isEditing = !!editGuest;

  const [formData, setFormData] = useState({
    nome: "",
    categoria: "Outros",
    status: "pendente" as Guest['status'],
    adultos: 1,
    criancas: 0,
    children_names: "",
    telefone: "",
    observacoes: ""
  });

  useEffect(() => {
    if (editGuest) {
      setFormData({
        nome: editGuest.nome,
        categoria: editGuest.categoria,
        status: editGuest.status,
        adultos: editGuest.adultos,
        criancas: editGuest.criancas,
        children_names: editGuest.children_names || "",
        telefone: editGuest.telefone || "",
        observacoes: editGuest.observacoes || ""
      });
    }
  }, [editGuest]);

    const [childList, setChildList] = useState<string[]>([""]);

    useEffect(() => {
        if (editGuest && editGuest.children_names) {
            setChildList(editGuest.children_names.split(", "));
        }
    }, [editGuest]);

    const handleAddChild = () => {
        const newList = [...childList, ""];
        setChildList(newList);
        setFormData({ ...formData, criancas: newList.length });
    };

    const handleRemoveChild = (index: number) => {
        const newList = childList.filter((_, i) => i !== index);
        setChildList(newList.length > 0 ? newList : [""]);
        const finalCount = newList.length;
        setFormData({ 
            ...formData, 
            criancas: finalCount,
            children_names: newList.join(", ") 
        });
    };

    const handleChildNameChange = (index: number, name: string) => {
        const newList = [...childList];
        newList[index] = name;
        setChildList(newList);
        setFormData({ ...formData, children_names: newList.join(", ") });
    };

    const categories = ["Noivos", "Família Noiva", "Família Noivo", "Amigos Noiva", "Amigos Noivo", "Trabalho", "Igreja", "Padrinhos", "Staff", "Outros"];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Limpar nomes vazios antes de salvar
        const validNames = childList.filter(name => name.trim() !== "");
        const guestData = {
            ...formData,
            children_names: validNames.join(", "),
            criancas: formData.criancas > 0 ? validNames.length : 0
        };

    if (isEditing && onUpdate) {
      onUpdate(editGuest!.id, guestData);
    } else {
      onAdd(guestData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg bg-card p-0 overflow-hidden shadow-2xl border-none">
        <div className="bg-primary p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{isEditing ? "Editar Convidado" : "Novo Convidado"}</h3>
            <p className="text-sm text-white/70">{isEditing ? "Atualize as informações do convidado" : "Adicione uma nova pessoa à sua lista"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Nome Completo</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  required
                  placeholder="Ex: Maria Oliveira" 
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <select 
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground appearance-none"
                    value={formData.categoria}
                    onChange={e => setFormData({...formData, categoria: e.target.value})}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Status</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as Guest['status']})}
                >
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="recusado">Não poderá ir</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Adultos</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    type="number"
                    min="0"
                    className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                    value={formData.adultos}
                    onChange={e => setFormData({...formData, adultos: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Crianças (até 12 anos)</label>
                <div className="relative">
                  <Baby className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    type="number"
                    min="0"
                    className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                    value={formData.criancas}
                    onChange={e => {
                      const count = parseInt(e.target.value) || 0;
                      setFormData({...formData, criancas: count});
                      if (count > 0) {
                        if (count > childList.length) {
                          setChildList([...childList, ...Array(count - childList.length).fill("")]);
                        } else if (count < childList.length) {
                          setChildList(childList.slice(0, count));
                        }
                      } else {
                        setChildList([""]);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {formData.criancas > 0 && (
              <div className="space-y-3 p-4 bg-secondary/30 rounded-2xl border border-border animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-black text-primary uppercase tracking-tight">Nomes das Crianças</label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-1 text-xs border-primary/20 text-primary hover:bg-primary/10"
                    onClick={handleAddChild}
                  >
                    <Plus size={14} /> Add Outro
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {childList.map((name, index) => (
                    <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                      <div className="relative flex-1">
                        <Baby className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" size={16} />
                        <Input 
                          placeholder={`Nome do ${index + 1}º filho`}
                          className="h-10 pl-10 bg-card border-none focus:ring-1 focus:ring-primary/30 text-sm"
                          value={name}
                          onChange={e => handleChildNameChange(index, e.target.value)}
                        />
                      </div>
                      {childList.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveChild(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  placeholder="(11) 99999-9999" 
                  className="pl-12 bg-secondary/50 border-none focus:bg-card transition-all"
                  value={formData.telefone}
                  onChange={e => setFormData({...formData, telefone: maskPhone(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Observações</label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 text-muted-foreground" size={18} />
                <textarea 
                  placeholder="Restrições alimentares, notas, etc..." 
                  className="w-full min-h-[100px] pl-12 pr-4 py-4 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary/30 focus:bg-card focus:outline-none text-sm font-medium transition-all text-foreground resize-none"
                  value={formData.observacoes}
                  onChange={e => setFormData({...formData, observacoes: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button type="button" variant="outline" className="flex-1 h-14" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-[2] h-14 text-lg shadow-lg shadow-primary/20">
              {isEditing ? "Salvar Alterações" : "Adicionar à Lista"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
