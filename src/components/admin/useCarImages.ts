import React, { useState, useEffect, useCallback } from 'react';
import { FormImageItem } from './adminTypes';
import { 
  isSupabaseStorageUrl, 
  downloadExternalImageAsBlob, 
  uploadImageToSupabaseStorage 
} from '../../services/imageStorageService';
import { compressImage } from '../../utils/imageCompressor';

export function useCarImages(showToast: (msg: string) => void) {
  const [imagesList, setImagesList] = useState<FormImageItem[]>([]);
  const [primaryImage, setPrimaryImage] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingFromUrl, setIsAddingFromUrl] = useState(false);
  const [draggedImgIndex, setDraggedImgIndex] = useState<number | null>(null);
  const [dragOverImgIndex, setDragOverImgIndex] = useState<number | null>(null);

  // Revoke any created blob URLs to prevent memory leaks and orphan references
  const cleanupBlobUrls = useCallback((items: FormImageItem[]) => {
    items.forEach(item => {
      if (item.isBlob && item.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(item.url);
        } catch (e) {}
      }
    });
  }, []);

  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setImagesList(prev => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setPrimaryImage(updated[0]?.url || '');
      return updated;
    });
  }, []);

  const moveImageLeft = useCallback((index: number) => {
    if (index > 0) moveImage(index, index - 1);
  }, [moveImage]);

  const moveImageRight = useCallback((index: number) => {
    setImagesList(prev => {
      if (index < prev.length - 1) {
        const updated = [...prev];
        const [moved] = updated.splice(index, 1);
        updated.splice(index + 1, 0, moved);
        setPrimaryImage(updated[0]?.url || '');
        return updated;
      }
      return prev;
    });
  }, []);

  const setAsPrimaryImage = useCallback((index: number) => {
    if (index > 0) moveImage(index, 0);
  }, [moveImage]);

  const removeImageAt = useCallback((index: number) => {
    setImagesList(prev => {
      const target = prev[index];
      if (target && target.isBlob && target.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.url);
        } catch (e) {}
      }
      const filtered = prev.filter((_, idx) => idx !== index);
      setPrimaryImage(filtered[0]?.url || '');
      return filtered;
    });
  }, []);

  const handleAddImageUrl = useCallback(async () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      alert("Zəhmət olmasa düzgün şəkil linki daxil edin (http:// və ya https:// ilə başlamalıdır)");
      return;
    }

    // Əgər daxil edilən link artıq bizim Supabase Storage-dədirsə
    if (isSupabaseStorageUrl(trimmed)) {
      const newItem: FormImageItem = {
        id: `supa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        url: trimmed,
        isBlob: false
      };
      setImagesList(prev => {
        const updated = [...prev, newItem];
        if (!primaryImage && updated[0]) setPrimaryImage(updated[0].url);
        return updated;
      });
      setNewImageUrl('');
      showToast("Supabase Storage şəkli əlavə edildi!");
      return;
    }

    // Xarici URL: Arxa fonda fetch edir, Blob kimi endirir, sıxır və birbaşa Supabase Storage 'car-images' / 'CAR-IMAGES' anbarına upload edir
    setIsAddingFromUrl(true);
    showToast("Şəkil linkdən endirilir və Supabase Storage anbarına yüklənir...");

    try {
      // 1. URL-dən şəkli Blob/File formatında endir
      const { blob, mimeType, extension } = await downloadExternalImageAsBlob(trimmed);

      // 2. Unik fayl adı tərtib et: car-[timestamp]-[random].[ext]
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 7);
      const uniqueFileName = `car-${timestamp}-${randomStr}.${extension}`;
      const origFile = new File([blob], uniqueFileName, { type: mimeType });

      // 3. Client-side WebP sıxılmasını təmin et
      let fileToUpload: File = origFile;
      let fileNameToUpload: string = uniqueFileName;
      let compSize = origFile.size;

      try {
        const compRes = await compressImage(origFile, uniqueFileName, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.78
        });
        fileToUpload = compRes.file;
        fileNameToUpload = compRes.file.name;
        compSize = compRes.compressedSize;
      } catch (cErr) {
        console.warn('URL image compression fallback:', cErr);
      }

      // 4. Supabase Storage-ə ('CAR-IMAGES' / 'car-images') birbaşa upload et
      const uploadRes = await uploadImageToSupabaseStorage(fileToUpload, fileNameToUpload);
      if (!uploadRes.success || !uploadRes.publicUrl) {
        throw new Error(uploadRes.error || "Şəkil Supabase Storage anbarına yazıla bilmədi");
      }

      // 5. Uğurlu upload-dan sonra Supabase Storage-in RƏSMİ PUBLIC URL-ni form siyahısına qeyd et
      const newItem: FormImageItem = {
        id: `supa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        url: uploadRes.publicUrl,
        isBlob: false,
        compressedSize: compSize,
        isCompressed: true
      };

      setImagesList(prev => {
        const updated = [...prev, newItem];
        if (!primaryImage && updated[0]) setPrimaryImage(updated[0].url);
        return updated;
      });

      setNewImageUrl('');
      showToast("Şəkil uğurla Supabase Storage ('CAR-IMAGES') anbarına yükləndi!");
    } catch (err: unknown) {
      console.error('URL image download/upload error:', err);
      const errMsg = err instanceof Error ? err.message : '';
      const userMessage = errMsg.includes("kompyuterinizdən yükləyin")
        ? errMsg
        : "Bu linkdən şəkli endirmək mümkün olmadı, zəhmət olmasa şəkli kompyuterinizdən yükləyin";
      alert(userMessage);
      showToast(userMessage);
    } finally {
      setIsAddingFromUrl(false);
    }
  }, [newImageUrl, primaryImage, showToast]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    e.target.value = '';

    // Create immediate placeholder items for fast UI preview
    const newItems: FormImageItem[] = filesArray.map((file, i) => {
      const blobUrl = URL.createObjectURL(file);
      return {
        id: `blob-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        url: blobUrl,
        file,
        isBlob: true,
        originalSize: file.size,
        isCompressing: true,
        isCompressed: false
      };
    });

    setImagesList(prev => {
      const updated = [...prev, ...newItems];
      if (!primaryImage && updated[0]) setPrimaryImage(updated[0].url);
      return updated;
    });

    showToast(`${newItems.length} ədəd şəkil seçildi. Brauzerdə WebP formatına (max 1200px) sıxılır...`);

    // Asynchronously compress each file in background
    for (let i = 0; i < newItems.length; i++) {
      const currentItem = newItems[i];
      const origFile = filesArray[i];

      try {
        const compressed = await compressImage(origFile, origFile.name, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.78
        });

        // Revoke the temporary raw blob URL
        try {
          URL.revokeObjectURL(currentItem.url);
        } catch (err) {}

        setImagesList(prev => prev.map(p => {
          if (p.id === currentItem.id) {
            return {
              ...p,
              url: compressed.previewUrl,
              file: compressed.file,
              originalSize: compressed.originalSize,
              compressedSize: compressed.compressedSize,
              savedPercent: compressed.savedPercent,
              mimeType: compressed.mimeType,
              isCompressed: true,
              isCompressing: false
            };
          }
          return p;
        }));
      } catch (cErr) {
        console.warn('Image compression fallback on select:', cErr);
        setImagesList(prev => prev.map(p => p.id === currentItem.id ? { ...p, isCompressing: false } : p));
      }
    }
  }, [primaryImage, showToast]);

  return {
    imagesList,
    setImagesList,
    primaryImage,
    setPrimaryImage,
    newImageUrl,
    setNewImageUrl,
    isAddingFromUrl,
    draggedImgIndex,
    setDraggedImgIndex,
    dragOverImgIndex,
    setDragOverImgIndex,
    cleanupBlobUrls,
    moveImage,
    moveImageLeft,
    moveImageRight,
    setAsPrimaryImage,
    removeImageAt,
    handleAddImageUrl,
    handleFileUpload
  };
}
