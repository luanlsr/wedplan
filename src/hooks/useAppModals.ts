import { useState } from 'react';
import type { Supplier, Guest, Task } from '../types';

export const useAppModals = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handleEditSupplier = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setIsModalOpen(true);
  };

  const handleEditGuest = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsGuestModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const clearModals = () => {
    setIsModalOpen(false);
    setSupplierToEdit(null);
    setIsGuestModalOpen(false);
    setGuestToEdit(null);
    setIsTaskModalOpen(false);
    setTaskToEdit(null);
  };

  return {
    isModalOpen,
    setIsModalOpen,
    supplierToEdit,
    handleEditSupplier,
    
    isGuestModalOpen,
    setIsGuestModalOpen,
    guestToEdit,
    handleEditGuest,
    
    isTaskModalOpen,
    setIsTaskModalOpen,
    taskToEdit,
    handleEditTask,
    
    clearModals
  };
};
