import { unzipSync } from 'fflate';
import { isSupabaseStorageConfigured, supabase, SUPABASE_STORAGE_BUCKET } from './supabase';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export interface UploadedCbzChapter {
  sourceType: 'cbz';
  archiveName: string;
  pageCount: number;
  storagePath: string;
  pages: {
    panelNumber: number;
    dialogue: string;
    actionDescription: string;
    bgColor: string;
    accentColor: string;
    imageUrl: string;
  }[];
}

const extensionOf = (name: string) => name.slice(name.lastIndexOf('.')).toLowerCase();
const hiddenEntry = (name: string) => name.replaceAll('\\', '/').split('/').some((part) => part.startsWith('.') || part === '__MACOSX');
const naturalCompare = (left: string, right: string) => left.toLowerCase().split(/(\d+)/).reduce((result, part, index) => {
  if (result !== 0) return result;
  const rightPart = right.toLowerCase().split(/(\d+)/)[index] || '';
  const numericLeft = /^\d+$/.test(part) ? Number(part) : null;
  const numericRight = /^\d+$/.test(rightPart) ? Number(rightPart) : null;
  return numericLeft !== null && numericRight !== null ? numericLeft - numericRight : part.localeCompare(rightPart);
}, 0);

export const uploadCbzFromBrowser = async (file: File, comicId: string, chapterNumber: number): Promise<UploadedCbzChapter> => {
  if (!isSupabaseStorageConfigured || !supabase) {
    throw new Error('Supabase Storage belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY terlebih dahulu.');
  }
  if (!file.name.toLowerCase().endsWith('.cbz')) throw new Error('File harus berekstensi .cbz.');

  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const entries = Object.entries(archive)
    .filter(([name, data]) => data.length > 0 && !hiddenEntry(name) && IMAGE_EXTENSIONS.has(extensionOf(name)))
    .sort(([left], [right]) => naturalCompare(left, right));
  if (!entries.length) throw new Error('CBZ tidak berisi gambar JPG, JPEG, PNG, atau WebP.');

  const folder = `comics/${comicId}/chapters/chapter-${String(chapterNumber).padStart(2, '0')}`;
  const pages: UploadedCbzChapter['pages'] = [];
  for (const [index, [name, data]] of entries.entries()) {
    const extension = extensionOf(name) === '.jpeg' ? '.jpg' : extensionOf(name);
    const path = `${folder}/page-${String(index + 1).padStart(3, '0')}${extension}`;
    const contentType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
    const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, data, { contentType, upsert: true });
    if (error) throw new Error(`Upload halaman ${index + 1} gagal: ${error.message}`);
    const { data: publicUrl } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
    pages.push({ panelNumber: index + 1, dialogue: '', actionDescription: '', bgColor: '#000000', accentColor: '#f97316', imageUrl: publicUrl.publicUrl });
  }

  return { sourceType: 'cbz', archiveName: file.name, pageCount: pages.length, storagePath: folder, pages };
};
