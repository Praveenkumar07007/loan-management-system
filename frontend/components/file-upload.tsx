"use client"

import { useState, useRef, DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { formatFileSize } from "@/lib/loanMath"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile?: File
  isUploading?: boolean
  uploadSuccess?: boolean
  accept?: string
  maxSizeMB?: number
  error?: string
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  isUploading = false,
  uploadSuccess = false,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 5,
  error,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      validateAndSelectFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      validateAndSelectFile(files[0])
    }
  }

  const validateAndSelectFile = (file: File) => {
    // Check file type
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if (!validTypes.includes(file.type)) {
      alert("Invalid file type. Please upload PDF, JPG, or PNG files only.")
      return
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      alert(`File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`)
      return
    }

    onFileSelect(file)
  }

  const handleRemove = () => {
    onFileRemove()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    if (!selectedFile && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-2">
      {/* Dropzone */}
      {!selectedFile && !isUploading && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg
            cursor-pointer transition-colors min-h-[200px]
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            ${error ? "border-destructive bg-destructive/5" : ""}
          `}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              handleClick()
            }
          }}
          aria-label="Upload file"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            aria-hidden="true"
          />
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-foreground mb-2">
            Drag and drop your file here
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Accepts PDF, JPG, PNG (max {maxSizeMB}MB)
          </p>
          {error && (
            <div className="flex items-center gap-2 mt-4 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Selected File */}
      {selectedFile && !isUploading && (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-card">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${uploadSuccess ? 'bg-green-500/10' : 'bg-primary/10'}`}>
            {uploadSuccess ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploadSuccess ? "Successfully uploaded" : formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            aria-label="Remove file"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Uploading...
            </p>
            <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-[loading_1s_ease-in-out_infinite]" style={{ width: "60%" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
