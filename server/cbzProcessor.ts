import { unzipSync } from 'fflate';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_IMAGES = 500;

export interface CbzPage {
  panelNumber: number;
  dialogue: string;
  actionDescription: string;
  bgColor: string;
  accentColor: string;
  imageUrl: string;
}

export interface CbzProcessingResult {
  archiveName: string;
  sourceType: 'cbz';
  pageCount: number;
  storagePath: string;
  pages: CbzPage[];
}

export interface CbzStorageAdapter {
  uploadImage(path: string, data: Uint8Array, contentType: string): Promise<string>;
}

const getExtension = (name: string) => {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : '';
};

const isHiddenEntry = (name: string) => {
  const normalized = name.replaceAll('\\', '/');
  return normalized.split('/').some((part) => part.startsWith('.') || part === '__MACOSX');
};

const naturalCompare = (left: string, right: string) => {
  const leftParts = left.toLowerCase().split(/(\d+)/);
  const rightParts = right.toLowerCase().split(/(\d+)/);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] || '';
    const rightPart = rightParts[index] || '';
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null;

    if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
    if (leftPart !== rightPart) return leftPart.localeCompare(rightPart);
  }

  return 0;
};

const detectImageType = (data: Uint8Array, extension: string) => {
  const isJpeg = data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isPng = data.length >= 8 && data.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  const isWebp = data.length >= 12 && new TextDecoder().decode(data.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(data.slice(8, 12)) === 'WEBP';

  if (isJpeg && (extension === '.jpg' || extension === '.jpeg')) return 'image/jpeg';
  if (isPng && extension === '.png') return 'image/png';
  if (isWebp && extension === '.webp') return 'image/webp';
  return null;
};

export const processCbzArchive = async (
  archive: Uint8Array,
  comicId: string,
  chapterNumber: number,
  archiveName: string,
  storage: CbzStorageAdapter,
): Promise<CbzProcessingResult> => {
  if (!archive.length) throw new Error('CBZ archive kosong.');
  if (!comicId.trim()) throw new Error('comicId wajib diisi.');
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) throw new Error('chapterNumber tidak valid.');
  if (!archiveName.toLowerCase().endsWith('.cbz')) throw new Error('File harus berekstensi .cbz.');

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(archive);
  } catch {
    throw new Error('CBZ tidak dapat dibuka sebagai ZIP archive yang valid.');
  }

  const imageEntries = Object.entries(entries)
    .filter(([name, data]) => data.length > 0 && !isHiddenEntry(name) && !name.endsWith('/'))
    .filter(([name]) => IMAGE_EXTENSIONS.has(getExtension(name)))
    .sort(([left], [right]) => naturalCompare(left, right));

  if (imageEntries.length === 0) throw new Error('CBZ tidak memiliki image jpg, jpeg, png, atau webp.');
  if (imageEntries.length > MAX_IMAGES) throw new Error(`CBZ melebihi batas ${MAX_IMAGES} halaman.`);

  const storagePath = `comics/${comicId}/chapters/chapter-${String(chapterNumber).padStart(2, '0')}`;
  const pages: CbzPage[] = [];

  for (const [index, [name, data]] of imageEntries.entries()) {
    const extension = getExtension(name);
    const contentType = detectImageType(data, extension);
    if (!contentType) throw new Error(`File image tidak valid atau extension tidak cocok: ${name}`);

    const fileName = `page-${String(index + 1).padStart(3, '0')}${extension === '.jpeg' ? '.jpg' : extension}`;
    const imagePath = `${storagePath}/${fileName}`;
    const imageUrl = await storage.uploadImage(imagePath, data, contentType);

    pages.push({
      panelNumber: index + 1,
      dialogue: '',
      actionDescription: '',
      bgColor: '#000000',
      accentColor: '#f97316',
      imageUrl,
    });
  }

  return {
    archiveName,
    sourceType: 'cbz',
    pageCount: pages.length,
    storagePath,
    pages,
  };
};
