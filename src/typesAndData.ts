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
  status: 'Tamat' | 'Sedang Rilis';
  views: number;
  category: 'oldest' | 'newest' | 'popular';
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
}

export interface BugReportItem {
  id?: string;
  category: 'Bug Teknis' | 'Saran Fitur' | 'Laporan Konten' | 'Lainnya';
  title: string;
  description: string;
  userId?: string;
  username?: string;
  createdAt: number;
  status: 'Menunggu' | 'Ditinjau' | 'Selesai';
}

export const MOCK_COMICS: Comic[] = [
  {
    titleId: 'shiroko-blue-archive-chronicles',
    title: 'Shiroko: Jejak Pasir Abydos',
    genre: ['Aksi', 'Sci-Fi', 'Sekolah'],
    description: 'Kisah keberanian Shiroko dan Komite Penyelamat Sekolah Abydos melawan korporasi hitam Kaiser Corporation di tengah gurun pasir misterius Kivotos.',
    coverImageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    author: 'Studio Blue Kivotos',
    releaseYear: 2024,
    status: 'Sedang Rilis',
    views: 45200,
    category: 'newest',
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'Bab 1: Suara Senapan di Fajar Gurun',
        releaseDate: '12 Sep 2024',
        pages: [
          {
            panelNumber: 1,
            characterName: 'Sunaookami Shiroko',
            dialogue: '"Guru... Angin gurun hari ini membawa aroma mesiu yang tidak biasa."',
            actionDescription: 'Shiroko merapatkan masker dan memeriksa laras senapan serbu SIG556 miliknya di atas atap sekolah Abydos yang runtuh.',
            bgColor: '#0f172a',
            accentColor: '#38bdf8',
            imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 2,
            characterName: 'Sunaookami Shiroko',
            dialogue: '"Hoshino-senpai masih tertidur pulas. Nonomi sudah menyiapkan perbekalan dan amunisi kita."',
            actionDescription: 'Drone pengintai Kaiser terdeteksi pada radar perimeter 300 meter di sektor barat melintasi bukit pasir.',
            bgColor: '#1e293b',
            accentColor: '#60a5fa',
            imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 3,
            characterName: 'Sunaookami Shiroko',
            dialogue: '"Jangan biarkan satu pun armada lapis baja mereka menyentuh aula Abydos! Bank Kaiser harus bertanggung jawab!"',
            actionDescription: 'Shiroko melompat turun dengan kelincahan sempurna, memicu drone pengalih perhatian dan membuka tembakan penekan.',
            bgColor: '#0284c7',
            accentColor: '#bae6fd',
            imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 4,
            characterName: 'Sunaookami Shiroko',
            dialogue: '"Target terkunci. Drone tempur dikerahkan. Menembak sekarang!"',
            actionDescription: 'Kilatan cahaya biru menyambar di antara badai pasir bergemuruh, meremukkan perisai medan elektromagnetik musuh.',
            bgColor: '#0c4a6e',
            accentColor: '#38bdf8',
            imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'
          }
        ]
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'Bab 2: Kontrak Tersembunyi Oasis',
        releaseDate: '20 Sep 2024',
        pages: [
          {
            panelNumber: 1,
            characterName: 'Okusora Ayane',
            dialogue: '"Dokumen ini membuktikan tanah Abydos tidak pernah sah dijual oleh dewan kota."',
            actionDescription: 'Ayane memindai brankas rahasia di bunker bawah tanah stasiun kereta tua yang tertimbun pasir berabad-abad.',
            bgColor: '#0f172a',
            accentColor: '#38bdf8',
            imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 2,
            characterName: 'Sunaookami Shiroko',
            dialogue: '"Kalau begitu, langkah berikutnya sudah jelas. Kita datangi markas besar mereka!"',
            actionDescription: 'Shiroko mengayuh sepedanya menerobos badai debu dengan tekad membara diiringi deru drone pendukung.',
            bgColor: '#1e293b',
            accentColor: '#38bdf8',
            imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80'
          }
        ]
      }
    ]
  },
  {
    titleId: 'pedang-legenda-astral',
    title: 'Pedang Legenda Astral',
    genre: ['Fantasi', 'Petualangan', 'Sihir'],
    description: 'Karya klasik tahun 1998 yang melegenda bergaya webtoon epik. Pemuda desa menemukan serpihan pedang meteor kuno yang mampu membelah dimensi waktu dan kutukan iblis langit.',
    coverImageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    author: 'Kenji Arisawa',
    releaseYear: 1998,
    status: 'Tamat',
    views: 89300,
    category: 'oldest',
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'Bab 1: Cahaya Meteor di Bukit Sunyi',
        releaseDate: '15 Jan 1998',
        pages: [
          {
            panelNumber: 1,
            characterName: 'Reyhan',
            dialogue: '"Kakek selalu melarangku mendaki tebing terlarang saat gerhana..."',
            actionDescription: 'Reyhan menyibak semak belukar yang berpendar kebiruan di kaki tebing terlarang.',
            bgColor: '#1e1b4b',
            accentColor: '#818cf8',
            imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 2,
            characterName: 'Pedang Roh Astral',
            dialogue: '"Hah?! Bilah pedang yang tertancap di batu ini... mengapa bersuara memanggil namaku?"',
            actionDescription: 'Getaran resonansi kuat mengguncang lereng gunung saat batu meteorit mulai retak keemasan.',
            bgColor: '#312e81',
            accentColor: '#a5b4fc',
            imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 3,
            characterName: 'Reyhan',
            dialogue: '"Bangkitlah pewaris fajar! Segel naga bintang telah retak!"',
            actionDescription: 'Kilau perak membubung ke angkasa malam, membelah langit dan membakar awan pekat kegelapan.',
            bgColor: '#172554',
            accentColor: '#93c5fd',
            imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80'
          }
        ]
      }
    ]
  },
  {
    titleId: 'cyber-neo-jakarta-2088',
    title: 'Cyber Neo Nusantara 2088',
    genre: ['Sci-Fi', 'Misteri', 'Aksi'],
    description: 'Metropolis berhias neon holografik dan jaringan siber bawah tanah ala webtoon cyberpunk modern. Seorang peretas jalanan menyelidiki sindikat rekayasa memori artifisial elit korporasi.',
    coverImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    author: 'Rian Dewantoro',
    releaseYear: 2025,
    status: 'Sedang Rilis',
    views: 31200,
    category: 'newest',
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'Bab 1: Protokol Memori Hantu',
        releaseDate: '01 Feb 2025',
        pages: [
          {
            panelNumber: 1,
            characterName: 'Arka the Hacker',
            dialogue: '"Koneksi neural terpasang. firewall tingkat 5 milik GigaCorp berhasil kutembus."',
            actionDescription: 'Layar implan mata kiri Arka menyala dengan ribuan baris kode biner yang mengalir cepat.',
            bgColor: '#030712',
            accentColor: '#06b6d4',
            imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 2,
            characterName: 'Arka the Hacker',
            dialogue: '"Tunggu sebentar... data ini bukan keuangan! Ini rekaman kesadaran manusia hidup!"',
            actionDescription: 'Alarm merah menyala di gang Glodok Cyber District saat sinyal pelacak musuh terkoneksi.',
            bgColor: '#082f49',
            accentColor: '#38bdf8',
            imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 3,
            characterName: 'Arka the Hacker',
            dialogue: '"Drone eksekutor mendekat dalam 10 detik! Aku harus melompat ke jalur monorel!"',
            actionDescription: 'Sepatu kinetik Arka melontarkannya melintasi billboard hologram raksasa di atas jalanan kota berkabut.',
            bgColor: '#0f172a',
            accentColor: '#38bdf8',
            imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80'
          }
        ]
      }
    ]
  },
  {
    titleId: 'detektif-angin-selatan',
    title: 'Detektif Angin Selatan: Kasus Jam Gadang',
    genre: ['Misteri', 'Drama', 'Detektif'],
    description: 'Seri misteri klasik era 1995 bernuansa webtoon detektif noir. Detektif legendaris Bramantyo memecahkan teka-teki pembunuhan berantai dengan petunjuk ukiran wayang dan sandi kuno.',
    coverImageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=1600&q=80',
    author: 'S. Wardhana',
    releaseYear: 1995,
    status: 'Tamat',
    views: 74600,
    category: 'oldest',
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'Bab 1: Dentang Tengah Malam',
        releaseDate: '10 Agu 1995',
        pages: [
          {
            panelNumber: 1,
            characterName: 'Detektif Bramantyo',
            dialogue: '"Hujan lebat tak mampu menghapus aroma tembakau di beranda museum."',
            actionDescription: 'Detektif Bram menyalakan pipa cangklong sambil menatap jejak lumpur ganjil yang mengarah ke brankas.',
            bgColor: '#1c1917',
            accentColor: '#f59e0b',
            imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 2,
            characterName: 'Pak Sukardi (Penjaga)',
            dialogue: '"Tuan Bram! Jam dinding kuno berhenti tepat pukul 00:03... dan kuncinya raib!"',
            actionDescription: 'Penjaga gedung terengah-engah menunjukkan pintu ruang pameran pusaka yang terbuka paksa.',
            bgColor: '#292524',
            accentColor: '#d97706',
            imageUrl: 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 3,
            characterName: 'Detektif Bramantyo',
            dialogue: '"Pelakunya bukan pencuri biasa. Mereka meninggalkan sehelai bulu burung hantu putih."',
            actionDescription: 'Kaca pembesar menampakkan simbol tersembunyi berukir huruf sansekerta pada engsel tembaga.',
            bgColor: '#0f172a',
            accentColor: '#38bdf8',
            imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80'
          }
        ]
      }
    ]
  },
  {
    titleId: 'valkyrie-langit-biru',
    title: 'Valkyrie Langit Biru: Sayap Terakhir',
    genre: ['Romansa', 'Fantasi', 'Aksi'],
    description: 'Di dunia terapung di atas awan berformat webtoon romantis fantasi berkecepatan tinggi. Ksatria pelindung kubah kristal bersumpah melindungi putri pengembara yang membawa benih pohon kehidupan.',
    coverImageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
    author: 'Maya Lin & Hanabi',
    releaseYear: 2023,
    status: 'Sedang Rilis',
    views: 62800,
    category: 'popular',
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'Bab 1: Angin dari Benua Terapung',
        releaseDate: '14 Feb 2023',
        pages: [
          {
            panelNumber: 1,
            characterName: 'Putri Celestia',
            dialogue: '"Kubah langit kita mulai retak... Apakah ramalan seribu tahun itu benar?"',
            actionDescription: 'Putri Celestia menatap pecahan kaca kristal yang melayang perlahan di langit senja keemasan.',
            bgColor: '#0c2340',
            accentColor: '#67e8f9',
            imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 2,
            characterName: 'Kaelen Sang Ksatria',
            dialogue: '"Selama tombak biruku masih tegak, takkan kubiarkan badai kehampaan menyentuhmu."',
            actionDescription: 'Kaelen membentangkan sepasang sayap mekanik berwarna biru safir bercahaya menentang badai.',
            bgColor: '#1e3a8a',
            accentColor: '#93c5fd',
            imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80'
          },
          {
            panelNumber: 3,
            characterName: 'Kaelen & Celestia',
            dialogue: '"Pegang erat tanganku. Hari ini kita terbang melintasi jurang kabut abadi!"',
            actionDescription: 'Keduanya meluncur menembus awan badai menuju dunia bawah tanah baru yang belum terjamah manusia.',
            bgColor: '#0284c7',
            accentColor: '#e0f2fe',
            imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80'
          }
        ]
      }
    ]
  },
    {
    titleId: 'the-cursed-face',
    title: 'THE CURSED FACE',
    genre: ['Horror'],
    description: 'THE CURSED FACE adalah komik bergenre Horror dengan satu chapter yang terdiri dari 148 halaman.',
    coverImageUrl: '/comics/the-cursed-face/chapter-01/page-001.jpg',
    bannerImageUrl: '/comics/the-cursed-face/chapter-01/page-001.jpg',
    author: 'Unknown',
    releaseYear: 2026,
    status: 'Sedang Rilis',
    views: 0,
    category: 'newest',
    chapters: [
      {
        id: 'the-cursed-face-chapter-01',
        chapterNumber: 1,
        title: 'THE CURSED FACE',
        releaseDate: '13 Sep 2026',
        pages: Array.from({ length: 148 }, (_, index) => {
          const pageNumber = index + 1;
          const pageFile = String(pageNumber).padStart(3, '0');

          return {
            panelNumber: pageNumber,
            dialogue: '',
            actionDescription: '',
            bgColor: '#000000',
            accentColor: '#7f1d1d',
            imageUrl: `/comics/the-cursed-face/chapter-01/page-${pageFile}.jpg`
          };
        })
      }
    ]
  }
];

export const FAQ_LIST = [
  {
    pertanyaan: 'Apa itu Shiroko Comics?',
    jawaban: 'Shiroko Comics adalah platform digital modern pembaca anime dan manga berkecepatan tinggi, dioptimalkan secara khusus untuk pengalaman membaca nyaman di perangkat seluler dan desktop dengan grafis elegan.'
  },
  {
    pertanyaan: 'Bagaimana cara membaca komik secara gratis?',
    jawaban: 'Semua judul komik di Shiroko Comics dapat langsung dibaca tanpa biaya langganan. Cukup buka halaman Daftar Komik, pilih judul favoritmu, dan pilih bab yang ingin dinikmati.'
  },
  {
    pertanyaan: 'Mengapa saya perlu melakukan login simulasi?',
    jawaban: 'Login dengan Username dan Password memudahkan Anda mengakses fitur sosial: memberikan rating bintang 1-5, menyimpan ke daftar Favorit, menulis komentar & balasan diskusi, serta memantau Riwayat Baca Anda secara permanen di cloud.'
  },
  {
    pertanyaan: 'Apakah data saya aman?',
    jawaban: 'Ya, Shiroko Comics menggunakan integrasi Google Firebase Firestore yang aman dan terenkripsi. Kami tidak meminta email atau nomor telepon Anda untuk sistem login sederhana ini.'
  },
  {
    pertanyaan: 'Bagaimana cara melaporkan bab yang rusak atau memberi saran?',
    jawaban: 'Anda dapat menggunakan menu "Lapor Bug / Saran" di navigasi atas atau bawah. Tim kurator Shiroko Comics memantau setiap laporan secara langsung.'
  }
];
