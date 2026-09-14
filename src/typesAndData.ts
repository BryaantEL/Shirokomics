export interface ComicChapter {
  id: string;
  chapterNumber: number;
  title: string;
  releaseDate: string;
  pages: {
    panelNumber: number;
    dialogue: string;
    actionDescription: string;
    bgColor: string;
    accentColor: string;
    imageUrl?: string;
    characterName?: string;
  }[];
}

export interface Comic {
  titleId: string;
  title: string;
  genre: string[];
  description: string;
  coverImageUrl: string;
  bannerImageUrl: string;
  author: string;
  releaseYear: number;
  status: "Tamat" | "Sedang Rilis";
  views: number;
  category: "oldest" | "newest" | "popular";
  chapters: ComicChapter[];
}

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  createdAt: number;
}

export interface CommentItem {
  id?: string;
  comicId: string;
  userId: string;
  username: string;
  content: string;
  parentId?: string | null;
  createdAt: number;
  likes?: number;
}

export interface RatingItem {
  comicId: string;
  userId: string;
  username: string;
  score: number; // 1 - 5
  updatedAt: number;
}

export interface FavoriteItem {
  comicId: string;
  userId: string;
  comicTitle: string;
  comicCover: string;
  genre: string[];
  addedAt: number;
}

export interface HistoryItem {
  comicId: string;
  userId: string;
  comicTitle: string;
  comicCover: string;
  chapterNumber: number;
  lastReadAt: number;
  scrollY?: number;
  progress?: number;
  totalPages?: number;
}

export interface BugReportItem {
  id?: string;
  category: "Bug Teknis" | "Saran Fitur" | "Laporan Konten" | "Lainnya";
  title: string;
  description: string;
  userId?: string;
  username?: string;
  createdAt: number;
  status: "Menunggu" | "Ditinjau" | "Selesai";
}

const makeHaikyuPages = (startScanPage: number, endScanPage: number) =>
  Array.from({ length: endScanPage - startScanPage + 1 }, (_, index) => {
    const scanPageNumber = startScanPage + index;
    const pageFile = String(scanPageNumber).padStart(3, "0");

    return {
      panelNumber: index + 1,
      dialogue: "",
      actionDescription: "",
      bgColor: "#000000",
      accentColor: "#f97316",
      imageUrl: `/comics/haikyu-vol-1/chapter-01/page-${pageFile}.jpg`,
    };
  });

export const MOCK_COMICS: Comic[] = [
  {
    titleId: "the-cursed-face",
    title: "THE CURSED FACE",
    genre: ["Horror"],
    description:
      "THE CURSED FACE adalah komik bergenre Horror dengan satu chapter yang terdiri dari 148 halaman.",
    coverImageUrl: "/comics/the-cursed-face/chapter-01/page-001.jpg",
    bannerImageUrl: "/comics/the-cursed-face/chapter-01/page-001.jpg",
    author: "Unknown",
    releaseYear: 2026,
    status: "Sedang Rilis",
    views: 0,
    category: "newest",
    chapters: [
      {
        id: "the-cursed-face-chapter-01",
        chapterNumber: 1,
        title: "THE CURSED FACE",
        releaseDate: "13 Sep 2026",
        pages: Array.from({ length: 148 }, (_, index) => {
          const pageNumber = index + 1;
          const pageFile = String(pageNumber).padStart(3, "0");

          return {
            panelNumber: pageNumber,
            dialogue: "",
            actionDescription: "",
            bgColor: "#000000",
            accentColor: "#7f1d1d",
            imageUrl: `/comics/the-cursed-face/chapter-01/page-${pageFile}.jpg`,
          };
        }),
      },
    ],
  },
  {
    titleId: "haikyu-vol-1",
    title: "Haikyu Vol.1",
    genre: ["Sports"],
    description:
      "Haikyu Vol.1 — volume pertama yang dibagi menjadi 7 chapter dengan navigasi chapter dan nomor halaman.",
    coverImageUrl: "/comics/haikyu-vol-1/chapter-01/page-001.jpg",
    bannerImageUrl: "/comics/haikyu-vol-1/chapter-01/page-001.jpg",
    author: "Haruichi Furudate",
    releaseYear: 2012,
    status: "Sedang Rilis",
    views: 0,
    category: "newest",

    chapters: [
      {
        id: "haikyu-vol-1-chapter-01",
        chapterNumber: 1,
        title: "Akhir dan Awal",
        releaseDate: "15 Sep 2026",
        pages: makeHaikyuPages(5, 47),
      },
      {
        id: "haikyu-vol-1-chapter-02",
        chapterNumber: 2,
        title: "Klub Bola Voli SMA Karasuno",
        releaseDate: "15 Sep 2026",
        pages: makeHaikyuPages(52, 97),
      },
      {
        id: "haikyu-vol-1-chapter-03",
        chapterNumber: 3,
        title: "Organisme Bersel Satu",
        releaseDate: "15 Sep 2026",
        pages: makeHaikyuPages(100, 123),
      },
      {
        id: "haikyu-vol-1-chapter-04",
        chapterNumber: 4,
        title: "Rekan Terkuat",
        releaseDate: "15 Sep 2026",
        pages: makeHaikyuPages(125, 143),
      },
      {
        id: "haikyu-vol-1-chapter-05",
        chapterNumber: 5,
        title: "Raja di Lapangan",
        releaseDate: "15 Sep 2026",
        pages: makeHaikyuPages(145, 162),
      },
      {
        id: "haikyu-vol-1-chapter-06",
        chapterNumber: 6,
        title: "Kisah Masa SMP",
        releaseDate: "15 Sep 2026",
        pages: makeHaikyuPages(164, 182),
      },
      {
        id: "haikyu-vol-1-chapter-07",
        chapterNumber: 7,
        title: "Kata-Kata dari Mereka yang Tak Memiliki",
        releaseDate: "15 Sep 2026",
        pages: makeHaikyuPages(184, 202),
      },
    ],
  },
];

export const FAQ_LIST = [
  {
    pertanyaan: "Apa itu Shiroko Comics?",
    jawaban:
      "Shiroko Comics adalah platform digital modern pembaca anime dan manga berkecepatan tinggi, dioptimalkan secara khusus untuk pengalaman membaca nyaman di perangkat seluler dan desktop dengan grafis elegan.",
  },
  {
    pertanyaan: "Bagaimana cara membaca komik secara gratis?",
    jawaban:
      "Semua judul komik di Shiroko Comics dapat langsung dibaca tanpa biaya langganan. Cukup buka halaman Daftar Komik, pilih judul favoritmu, dan pilih bab yang ingin dinikmati.",
  },
  {
    pertanyaan: "Mengapa saya perlu melakukan login simulasi?",
    jawaban:
      "Login dengan Username dan Password memudahkan Anda mengakses fitur sosial: memberikan rating bintang 1-5, menyimpan ke daftar Favorit, menulis komentar & balasan diskusi, serta memantau Riwayat Baca Anda secara permanen di cloud.",
  },
  {
    pertanyaan: "Apakah data saya aman?",
    jawaban:
      "Ya, Shiroko Comics menggunakan integrasi Google Firebase Firestore yang aman dan terenkripsi. Kami tidak meminta email atau nomor telepon Anda untuk sistem login sederhana ini.",
  },
  {
    pertanyaan: "Bagaimana cara melaporkan bab yang rusak atau memberi saran?",
    jawaban:
      'Anda dapat menggunakan menu "Lapor Bug / Saran" di navigasi atas atau bawah. Tim kurator Shiroko Comics memantau setiap laporan secara langsung.',
  },
];
