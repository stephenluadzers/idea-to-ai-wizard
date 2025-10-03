import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ZoomIn, FileText, Image as ImageIcon, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import imageCompression from "browser-image-compression";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export interface UploadedFile {
  id: string;
  url: string;
  file: File;
  type: "image" | "document";
  metadata: {
    size: number;
    originalSize?: number;
    format: string;
    dimensions?: { width: number; height: number };
  };
}

interface FileUploadManagerProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export const FileUploadManager = ({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 20,
}: FileUploadManagerProps) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(
        `Compressed ${file.name} from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
      );
      return compressedFile;
    } catch (error) {
      console.error("Compression failed:", error);
      return file;
    }
  };

  const processFile = async (file: File): Promise<UploadedFile | null> => {
    const isImage = file.type.startsWith("image/");
    const isDocument = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "text/markdown",
    ].includes(file.type);

    if (!isImage && !isDocument) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload images, PDFs, Word docs, or text files.",
        variant: "destructive",
      });
      return null;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `Files must be under ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      return null;
    }

    let processedFile = file;
    let originalSize = file.size;

    if (isImage) {
      setIsCompressing(true);
      processedFile = await compressImage(file);
      setIsCompressing(false);

      if (originalSize !== processedFile.size) {
        const savedMB = ((originalSize - processedFile.size) / 1024 / 1024).toFixed(2);
        toast({
          title: "Image Optimized",
          description: `Saved ${savedMB}MB through compression`,
        });
      }
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        let metadata: UploadedFile["metadata"] = {
          size: processedFile.size,
          originalSize: originalSize,
          format: file.type,
        };

        if (isImage) {
          const img = new Image();
          img.onload = () => {
            metadata.dimensions = { width: img.width, height: img.height };
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              url,
              file: processedFile,
              type: "image",
              metadata,
            });
          };
          img.src = url;
        } else {
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            url,
            file: processedFile,
            type: "document",
            metadata,
          });
        }
      };
      reader.readAsDataURL(processedFile);
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        toast({
          title: "Too Many Files",
          description: `Maximum ${maxFiles} files allowed.`,
          variant: "destructive",
        });
        return;
      }

      const processedFiles = await Promise.all(acceptedFiles.map(processFile));
      const validFiles = processedFiles.filter(
        (f): f is UploadedFile => f !== null
      );
      onFilesChange([...files, ...validFiles]);
    },
    [files, maxFiles, onFilesChange, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxFiles,
  });

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
    } catch (error) {
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to use this feature.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!cameraStream) return;

    const video = document.querySelector("video");
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const processedFile = await processFile(file);
      if (processedFile) {
        onFilesChange([...files, processedFile]);
      }
      stopCamera();
    }, "image/jpeg");
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <Card
        {...getRootProps()}
        className={`p-6 border-2 border-dashed transition-all cursor-pointer ${
          isDragActive
            ? "border-primary bg-primary/5 scale-105"
            : "border-border/50 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center space-y-2">
          {isCompressing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Optimizing images...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-2">
                <ImageIcon className="w-6 h-6 text-primary" />
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium">
                {isDragActive
                  ? "Drop files here..."
                  : "Drag & drop files or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">
                Images, PDFs, Word docs, text files (max {maxSizeMB}MB each)
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Camera Button */}
      <Button
        variant="outline"
        onClick={startCamera}
        className="w-full"
        disabled={!!cameraStream}
      >
        <Camera className="w-4 h-4 mr-2" />
        Capture with Camera
      </Button>

      {/* Camera View */}
      {cameraStream && (
        <Card className="p-4 space-y-3">
          <video
            autoPlay
            playsInline
            className="w-full rounded-lg"
            ref={(video) => {
              if (video && cameraStream) {
                video.srcObject = cameraStream;
              }
            }}
          />
          <div className="flex gap-2">
            <Button onClick={capturePhoto} className="flex-1">
              Capture
            </Button>
            <Button onClick={stopCamera} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file) => (
            <Card key={file.id} className="relative group overflow-hidden">
              <div className="aspect-square p-2">
                {file.type === "image" ? (
                  <img
                    src={file.url}
                    alt={file.file.name}
                    className="w-full h-full object-cover rounded cursor-pointer"
                    onClick={() => setSelectedFile(file)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-secondary rounded cursor-pointer"
                    onClick={() => setSelectedFile(file)}
                  >
                    <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-center truncate w-full px-2">
                      {file.file.name}
                    </p>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <Badge variant="secondary" className="text-xs">
                  {(file.metadata.size / 1024 / 1024).toFixed(2)}MB
                </Badge>
                {file.metadata.dimensions && (
                  <Badge variant="secondary" className="text-xs">
                    {file.metadata.dimensions.width}x{file.metadata.dimensions.height}
                  </Badge>
                )}
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => setSelectedFile(file)}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-4xl">
          {selectedFile && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{selectedFile.file.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge>
                    {selectedFile.type === "image" ? "Image" : "Document"}
                  </Badge>
                  <Badge variant="outline">
                    {(selectedFile.metadata.size / 1024 / 1024).toFixed(2)}MB
                  </Badge>
                  {selectedFile.metadata.dimensions && (
                    <Badge variant="outline">
                      {selectedFile.metadata.dimensions.width}x
                      {selectedFile.metadata.dimensions.height}
                    </Badge>
                  )}
                  {selectedFile.metadata.originalSize && selectedFile.metadata.originalSize !== selectedFile.metadata.size && (
                    <Badge variant="outline" className="text-green-600">
                      Saved{" "}
                      {(
                        (selectedFile.metadata.originalSize -
                          selectedFile.metadata.size) /
                        1024 /
                        1024
                      ).toFixed(2)}
                      MB
                    </Badge>
                  )}
                </div>
              </div>
              {selectedFile.type === "image" ? (
                <img
                  src={selectedFile.url}
                  alt={selectedFile.file.name}
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="bg-secondary p-8 rounded-lg text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Document preview will be generated during analysis
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
