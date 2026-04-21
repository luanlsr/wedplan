import { SupplierModal } from '../suppliers/AddSupplierModal';
import { AddGuestModal } from '../guests/AddGuestModal';
import { AddTaskModal } from '../tasks/AddTaskModal';
import type { Supplier, Guest, Task } from '../../types';

interface GlobalModalsProps {
  isModalOpen: boolean;
  supplierToEdit: Supplier | null;
  weddingDate: string;
  addSupplier: (s: any) => void;
  updateSupplier: (id: string, s: any) => void;
  
  isGuestModalOpen: boolean;
  guestToEdit: Guest | null;
  addGuest: (g: any) => void;
  updateGuest: (id: string, g: any) => void;
  
  isTaskModalOpen: boolean;
  taskToEdit: Task | null;
  addTask: (t: any) => void;
  updateTask: (id: string, t: any) => void;
  
  onClose: () => void;
}

export const GlobalModals = ({
  isModalOpen,
  supplierToEdit,
  weddingDate,
  addSupplier,
  updateSupplier,
  isGuestModalOpen,
  guestToEdit,
  addGuest,
  updateGuest,
  isTaskModalOpen,
  taskToEdit,
  addTask,
  updateTask,
  onClose
}: GlobalModalsProps) => {
  return (
    <>
      {isModalOpen && (
        <SupplierModal
          weddingDate={weddingDate}
          onClose={onClose}
          onAdd={addSupplier}
          onUpdate={updateSupplier}
          editSupplier={supplierToEdit}
        />
      )}

      {isGuestModalOpen && (
        <AddGuestModal
          onClose={onClose}
          onAdd={addGuest}
          onUpdate={updateGuest}
          editGuest={guestToEdit}
        />
      )}

      {isTaskModalOpen && (
        <AddTaskModal
          onClose={onClose}
          onAdd={addTask}
          onUpdate={updateTask}
          editTask={taskToEdit}
        />
      )}
    </>
  );
};
