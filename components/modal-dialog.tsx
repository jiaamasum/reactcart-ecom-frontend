"use client"

import type React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ModalProps {
  isOpen: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  confirmDisabled?: boolean
  confirmLoading?: boolean
}

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  confirmDisabled = false,
  confirmLoading = false,
}: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        <div className="flex gap-3 p-6 border-t justify-end">
          <Button variant="outline" type="button" onClick={onClose} disabled={confirmLoading}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled || confirmLoading}
              aria-busy={confirmLoading}
              className={isDangerous ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {confirmLoading ? 'Working…' : confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

