export interface CbzProcessingResult {
  pages: {
    imageUrl: string;
    panelNumber: number;
  }[];
  archiveName: string;
  storagePath: string;
}

export const isCbzProcessingAvailable = false;

export const processCbzArchive = async (_file: File, _comicId: string, _chapterNumber: number): Promise<CbzProcessingResult> => {
  throw new Error('CBZ upload belum dikonfigurasi: server-side archive processing dan Firebase Storage belum tersedia.');
};
