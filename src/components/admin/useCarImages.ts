import React, { useState, useEffect, useCallback } from 'react';
import { FormImageItem } from './adminTypes';
import { 
  isSupabaseStorageUrl, 
  downloadExternalImageAsBlob, 
  uploadImageToSupabaseStorage,
  uploadThumbnailForImage 
} from '../../services/imageStorageService';
import { compressImage } from '../../utils/imageCompressor';

export const MSG_UNREADABLE_FILE = "Bu şəkil telefonda oxuna bilmədi. Şəkli qalereyadan (məs. Google Photos) əvvəlcə cihaza endirin və yenidən seçin.";
export const MSG_HEIC_NOT_SUPPORTED = "HEIC formatı dəstəklənmir. Şəkli JPEG kimi saxlayın və ya kamera ayarlarında 'Ən uyğun (JPEG)' formatı seçin.";

export function isHeicFile(file: File | { name?: string; type?: string }): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    type === 'image/heic' ||
    type === 'image/heif' ||
    type.includes('heic') ||
    type.includes('heif')
  );
}

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

      // Generate and upload thumbnail (~480px WebP) alongside full image
      uploadThumbnailForImage(fileToUpload, uploadRes.publicUrl).catch(thumbErr => {
        console.warn('Background thumbnail creation notice:', thumbErr);
      });

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
      const isHeic = isHeicFile(file);
      let blobUrl = '';
      if (!isHeic) {
        try {
          blobUrl = URL.createObjectURL(file);
        } catch (e) {
          blobUrl = '';
        }
      }

      return {
        id: `blob-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        url: blobUrl,
        file: isHeic ? undefined : file,
        fileName: file.name,
        isBlob: true,
        originalSize: file.size,
        isCompressing: !isHeic,
        isCompressed: false,
        error: isHeic ? MSG_HEIC_NOT_SUPPORTED : undefined,
        errorType: isHeic ? 'heic' : undefined
      };
    });

    setImagesList(prev => {
      const updated = [...prev, ...newItems];
      if (!primaryImage) {
        const firstValid = updated.find(it => !it.error && it.url);
        if (firstValid) setPrimaryImage(firstValid.url);
      }
      return updated;
    });

    showToast(`${newItems.length} ədəd şəkil seçildi. Brauzerdə WebP formatına (max 1200px) sıxılır...`);

    let failedCount = 0;
    let successCount = 0;

    // Asynchronously and sequentially verify readability and compress each file in background
    for (let i = 0; i < newItems.length; i++) {
      const currentItem = newItems[i];
      const origFile = filesArray[i];

      // If already flagged (e.g. HEIC), count as failed and proceed
      if (currentItem.error) {
        failedCount++;
        continue;
      }

      try {
        // 1. Read bytes immediately into memory to verify readability and detach from device storage
        // (throws NotReadableError if Android cloud photo reference or permission lapsed)
        const buffer = await origFile.arrayBuffer();
        if (!buffer || buffer.byteLength === 0) {
          throw new Error(MSG_UNREADABLE_FILE);
        }

        // 2. Wrap in an in-memory Blob with verified bytes
        const inMemoryBlob = new Blob([buffer], { type: origFile.type || 'image/jpeg' });

        // 3. Compress in-memory blob into WebP
        const compressed = await compressImage(inMemoryBlob, origFile.name, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.78
        });

        // Revoke the temporary raw blob URL
        if (currentItem.url && currentItem.url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(currentItem.url);
          } catch (err) {}
        }

        successCount++;
        setImagesList(prev => {
          const mapped = prev.map(p => {
            if (p.id === currentItem.id) {
              return {
                ...p,
                url: compressed.previewUrl,
                file: compressed.file, // holds ONLY the compressed in-memory File
                fileName: compressed.file.name,
                originalSize: origFile.size,
                compressedSize: compressed.compressedSize,
                savedPercent: compressed.savedPercent,
                mimeType: compressed.mimeType,
                isCompressed: true,
                isCompressing: false,
                error: undefined,
                errorType: undefined
              };
            }
            return p;
          });

          // Ensure primaryImage is updated if not yet set
          if (!primaryImage) {
            const firstValid = mapped.find(it => !it.error && it.url);
            if (firstValid) setPrimaryImage(firstValid.url);
          }
          return mapped;
        });
      } catch (cErr: unknown) {
        console.error('Image read/compress failure on select for file:', origFile.name, cErr);
        failedCount++;

        let errorMsg = MSG_UNREADABLE_FILE;
        let errorType: 'heic' | 'unreadable' | 'general' = 'unreadable';

        const errObj = cErr as Record<string, any>;
        const errName = errObj?.name || '';
        const errMsgStr = String(errObj?.message || '');

        if (isHeicFile(origFile)) {
          errorMsg = MSG_HEIC_NOT_SUPPORTED;
          errorType = 'heic';
        } else if (
          errName === 'NotReadableError' ||
          errName === 'NotFoundError' ||
          errName === 'SecurityError' ||
          errMsgStr.includes('NotReadable') ||
          errMsgStr.includes('oxun') ||
          errMsgStr.includes('deşifrə')
        ) {
          errorMsg = MSG_UNREADABLE_FILE;
          errorType = 'unreadable';
        } else if (cErr instanceof Error && cErr.message && !cErr.message.includes('Naməlum')) {
          errorMsg = cErr.message;
          errorType = 'general';
        }

        // Revoke temporary raw blob URL
        if (currentItem.url && currentItem.url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(currentItem.url);
          } catch (err) {}
        }

        setImagesList(prev => prev.map(p => {
          if (p.id === currentItem.id) {
            return {
              ...p,
              url: '', // Clear blob URL so broken image doesn't display
              file: undefined, // Drop raw File completely so save never attempts to upload it
              fileName: origFile.name,
              isCompressing: false,
              isCompressed: false,
              error: errorMsg,
              errorType
            };
          }
          return p;
        }));
      }
    }

    // Inform admin via toast about results at selection time
    if (failedCount > 0) {
      if (failedCount === 1) {
        showToast('Diqqət: 1 şəkil oxuna bilmədi və ya dəstəklənmir. Zəhmət olmasa xətalı şəkli silin və ya yenidən seçin.');
      } else {
        showToast(`Diqqət: ${failedCount} ədəd şəkil oxuna bilmədi və ya dəstəklənmir. Zəhmət olmasa xətalı şəkilləri silin və ya yenidən seçin.`);
      }
    } else if (successCount > 0) {
      showToast(`${successCount} ədəd şəkil uğurla sıxıldı və hazırlandı.`);
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
