import { SupplierModal } from '../suppliers/AddSupplierModal';
import { AddGuestModal } from '../guests/AddGuestModal';
import { AddTaskModal } from '../tasks/AddTaskModal';
import type { Supplier, Guest, Task } from '../../types';

interface GlobalModalsProps {
  isModalOpen: boolean;
  supplierToEdit: Supplier | null;
  weddingDate: string;
  weddingId?: string;
  addSupplier: (s: Supplier) => void | Promise<void>;
  updateSupplier: (id: string, s: Supplier) => void | Promise<void>;
  
  isGuestModalOpen: boolean;
  guestToEdit: Guest | null;
  addGuest: (g: Omit<Guest, 'id'>) => void | Promise<void>;
  updateGuest: (id: string, g: Partial<Guest>) => void | Promise<void>;
  
  isTaskModalOpen: boolean;
  taskToEdit: Task | null;
  addTask: (t: Omit<Task, 'id'>) => void | Promise<void>;
  updateTask: (id: string, t: Partial<Task>) => void | Promise<void>;
  
  onClose: () => void;
}

export const GlobalModals = ({
  isModalOpen,
  supplierToEdit,
  weddingDate,
  weddingId,
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
          weddingId={weddingId}
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
