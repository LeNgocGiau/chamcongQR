"use client"

import React from 'react'
import { Trash2, X, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteConfirmProps {
  isOpen: boolean
  title?: string
  description?: string
  entityName?: string
  deleteBtnText?: string
  cancelBtnText?: string
  onDelete: () => void
  onCancel: () => void
}

export function DeleteConfirm({
  isOpen,
  title = "Xác nhận xóa",
  description = "Bạn có chắc chắn muốn xóa? Thao tác này không thể hoàn tác.",
  entityName,
  deleteBtnText = "Xóa",
  cancelBtnText = "Hủy bỏ",
  onDelete,
  onCancel,
}: DeleteConfirmProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-base">
            {entityName ? `Bạn đang chuẩn bị xóa "${entityName}".` : ''} {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 sm:justify-end">
          <Button 
            variant="outline" 
            className="mt-0 flex-1 sm:flex-initial sm:mt-0" 
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2" />
            {cancelBtnText}
          </Button>
          <Button 
            variant="destructive" 
            className="mt-0 flex-1 sm:flex-initial sm:mt-0" 
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteBtnText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Example usage:
/*
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

const handleDeleteClick = (item: Item) => {
  setItemToDelete(item);
  setShowDeleteConfirm(true);
};

const handleConfirmDelete = () => {
  if (itemToDelete) {
    // Delete logic here
    deleteItem(itemToDelete.id);
  }
  setShowDeleteConfirm(false);
  setItemToDelete(null);
};

// In your JSX:
{showDeleteConfirm && (
  <DeleteConfirm
    isOpen={showDeleteConfirm}
    entityName={itemToDelete?.name}
    onDelete={handleConfirmDelete}
    onCancel={() => setShowDeleteConfirm(false)}
  />
)}
*/ 