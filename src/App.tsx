import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  MOCK_COMICS, 
  Comic, 
  ComicChapter, 
  FAQ_LIST, 
  HistoryItem, 
  FavoriteItem 
} from './typesAndData';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { LoginModal } from './LoginModal';
import { SocialSection } from './SocialSection';
import { BugReportForm } from './BugReportForm';
import {
  BookOpen,
  Search,
  SlidersHorizontal,
  Star,
  Clock,
  Heart,
  HelpCircle,
  Bug,
  ChevronRight,
  LogOut,
  LogIn,
  User,
  Compass,
  ArrowLeft,
  Calendar,
  Eye,
  Menu,
  X,
  Sparkles,
  BookMarked,
  ShieldAlert,
  ChevronDown,
  Trash2,
  Moon,
  Sun,
  ScrollText,
  MessageSquare
} from 'lucide-react';

type NavTab = 'home' | 'comics' | 'history' | 'favorites' | 'faq' | 'report';

export default function App() {
  const { currentUser, isLoggedIn, logout } = useAuth();

  // Navigation & Routing State
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(1);
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light'>('dark');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Semua');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'newest' | 'oldest' | 'popular'>('all');

  // Firestore reading history & favorites for current user
  const [readingHistory, setReadingHistory] = useState<HistoryItem[]>([]);
  const [userFavorites, setUserFavorites] = useState<FavoriteItem[]>([]);

  // Collect unique genres
  const allGenres = ['Semua', ...Array.from(new Set(MOCK_COMICS.flatMap((c) => c.genre)))];

  // Currently selected comic object
  const activeComic = MOCK_COMICS.find((c) => c.titleId === selectedComicId) || null;
  const activeChapter = activeComic?.chapters.find((ch) => ch.chapterNumber === selectedChapterNumber) || activeComic?.chapters[0];

  // Listen to reading history in Firestore when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setReadingHistory([]);
      return;
    }
    const q = query(collection(db, 'reading_history'), where('userId', '==', currentUser.userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: HistoryItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as HistoryItem));
        items.sort((a, b) => b.lastReadAt - a.lastReadAt);
        setReadingHistory(items);
      },
      (error) => {
        console.warn('Reading history sync (offline/cached mode):', error.message);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Listen to user favorites in Firestore
  useEffect(() => {
    if (!currentUser) {
      setUserFavorites([]);
      return;
    }
    const q = query(collection(db, 'favorites'), where('userId', '==', currentUser.userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: FavoriteItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as FavoriteItem));
        items.sort((a, b) => b.addedAt - a.addedAt);
        setUserFavorites(items);
      },
      (error) => {
        console.warn('Favorites sync (offline/cached mode):', error.message);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Record reading history in Firestore
  const recordReadingSession = async (comic: Comic, chapterNum: number) => {
    if (!currentUser) return;
    try {
      const historyId = `${currentUser.userId}_${comic.titleId}`;
      await setDoc(doc(db, 'reading_history', historyId), {
        comicId: comic.titleId,
        userId: currentUser.userId,
        comicTitle: comic.title,
        comicCover: comic.coverImageUrl,
        chapterNumber: chapterNum,
        lastReadAt: Date.now(),
      });
    } catch (e) {
      console.error('Error saving reading history:', e);
    }
  };

  const handleOpenReader = (comicId: string, chapterNum: number = 1) => {
    setSelectedComicId(comicId);
    setSelectedChapterNumber(chapterNum);
    const comic = MOCK_COMICS.find((c) => c.titleId === comicId);
    if (comic) {
      recordReadingSession(comic, chapterNum);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistoryItem = async (comicId: string) => {
    if (!currentUser) return;
    try {
      const historyId = `${currentUser.userId}_${comicId}`;
      await deleteDoc(doc(db, 'reading_history', historyId));
    } catch (e) {
      console.error('Error deleting history:', e);
    }
  };

  // Filtered comics
  const filteredComics = MOCK_COMICS.filter((comic) => {
    const matchesQuery = comic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comic.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'Semua' || comic.genre.includes(selectedGenre);
    const matchesCat = selectedCategory === 'all' || comic.category === selectedCategory;
    return matchesQuery && matchesGenre && matchesCat;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header & Navigasi Utama */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <button
            id="brand-logo-btn"
            onClick={() => {
              setSelectedComicId(null);
              setCurrentTab('home');
            }}
            className="flex items-center gap-3 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  S
                </span>
              </div>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Shiroko <span className="text-blue-400 font-semibold">Comics</span>
              </span>
              <span className="text-[10px] text-slate-400 block tracking-widest uppercase">
                Anime & Manga Reader
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-tab-home"
              onClick={() => {
                setSelectedComicId(null);
                setCurrentTab('home');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'home' && !selectedComicId
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Beranda
            </button>
            <button
              id="nav-tab-comics"
              onClick={() => {
                setSelectedComicId(null);
                setCurrentTab('comics');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'comics' && !selectedComicId
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Daftar Komik
            </button>
            <button
              id="nav-tab-favorites"
              onClick={() => {
                setSelectedComicId(null);
                setCurrentTab('favorites');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'favorites' && !selectedComicId
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Favorit</span>
              {userFavorites.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 text-[10px] font-bold">
                  {userFavorites.length}
                </span>
              )}
            </button>
            <button
              id="nav-tab-history"
              onClick={() => {
                setSelectedComicId(null);
                setCurrentTab('history');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'history' && !selectedComicId
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Riwayat Baca</span>
            </button>
            <button
              id="nav-tab-faq"
              onClick={() => {
                setSelectedComicId(null);
                setCurrentTab('faq');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'faq' && !selectedComicId
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Tanya Jawab
            </button>
            <button
              id="nav-tab-report"
              onClick={() => {
                setSelectedComicId(null);
                setCurrentTab('report');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'report' && !selectedComicId
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Lapor Bug
            </button>
          </nav>

          {/* User Auth Section */}
          <div className="flex items-center gap-3">
            {isLoggedIn && currentUser ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white">@{currentUser.username}</span>
                  <span className="text-[10px] text-emerald-400 font-medium">● Terhubung</span>
                </div>
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.username}
                  className="w-9 h-9 rounded-full border border-blue-500 bg-slate-800"
                />
                <button
                  id="btn-logout"
                  onClick={logout}
                  title="Keluar Akun"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                  aria-label="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-open-login"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Akun</span>
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              id="btn-toggle-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Menu Navigasi"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-5 bg-slate-950 border-b border-slate-800 space-y-1.5 animate-in slide-in-from-top-3">
            {[
              { id: 'home', label: 'Beranda' },
              { id: 'comics', label: 'Daftar Komik' },
              { id: 'favorites', label: `Favorit (${userFavorites.length})` },
              { id: 'history', label: 'Riwayat Baca' },
              { id: 'faq', label: 'Tanya Jawab' },
              { id: 'report', label: 'Lapor Bug / Saran' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedComicId(null);
                  setCurrentTab(item.id as NavTab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  currentTab === item.id && !selectedComicId
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 2. Main Content Area with Fade-In & Slide-Up Motion Transitions */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {/* VIEW A: DETAIL / READER PAGE */}
          {selectedComicId && activeComic ? (
            <motion.div
              key={`reader-${selectedComicId}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              id="comic-reader-view"
              className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8"
            >
              {/* Navigasi Kembali & Switch Mode Baca */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  id="btn-back-to-comics"
                  onClick={() => setSelectedComicId(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Daftar Komik</span>
                </button>

                <div className="flex items-center gap-3">
                  {/* Switch Mode Baca (Terang / Gelap) */}
                  <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
                    <button
                      id="btn-reader-mode-dark"
                      onClick={() => setReaderTheme('dark')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        readerTheme === 'dark'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Mode Malam / Gelap (Nyaman di mata saat redup)"
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Gelap</span>
                    </button>
                    <button
                      id="btn-reader-mode-light"
                      onClick={() => setReaderTheme('light')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        readerTheme === 'light'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Mode Siang / Terang (Jelas dan kontras)"
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Terang</span>
                    </button>
                  </div>

                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Tahun Rilis: <strong className="text-slate-200">{activeComic.releaseYear}</strong>
                  </span>
                </div>
              </div>

            {/* Comic Header Banner & Info */}
            <div 
              id="comic-detail-card"
              className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="relative h-44 sm:h-60 w-full overflow-hidden bg-slate-950">
                <img
                  src={activeComic.bannerImageUrl}
                  alt={activeComic.title}
                  className="w-full h-full object-cover opacity-35 filter blur-[1px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
              </div>

              <div className="relative px-6 sm:px-8 pb-8 -mt-20 sm:-mt-24 flex flex-col sm:flex-row gap-6">
                <img
                  src={activeComic.coverImageUrl}
                  alt={activeComic.title}
                  className="w-32 sm:w-44 h-48 sm:h-64 object-cover rounded-2xl border-2 border-blue-500/50 shadow-2xl mx-auto sm:mx-0 shrink-0"
                />

                <div className="flex-1 space-y-3 pt-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {activeComic.genre.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-950 border border-blue-800/60 text-blue-300"
                      >
                        {g}
                      </span>
                    ))}
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                      {activeComic.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                      Kategori: {activeComic.category === 'oldest' ? 'Klasik (Oldest)' : activeComic.category === 'newest' ? 'Terbaru (Newest)' : 'Populer'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {activeComic.title}
                  </h1>

                  <p className="text-xs text-slate-400">
                    Karya:{' '}
                    <strong className="text-slate-200">{activeComic.author}</strong> •{' '}
                    {activeComic.views.toLocaleString('id-ID')} Pembaca
                  </p>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                    {activeComic.description}
                  </p>

                  {/* Chapter Selector Buttons */}
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-slate-400 block mb-2">Pilih Bab:</span>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {activeComic.chapters.map((ch) => (
                        <button
                          key={ch.id}
                          id={`btn-chapter-${ch.chapterNumber}`}
                          onClick={() => {
                            setSelectedChapterNumber(ch.chapterNumber);
                            recordReadingSession(activeComic, ch.chapterNumber);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            selectedChapterNumber === ch.chapterNumber
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          Bab {ch.chapterNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COMIC READING AREA (Webtoon Vertical Continuous Scroll Strip) */}
            <div 
              id="comic-reader-panel-area"
              className={`rounded-3xl p-3 sm:p-6 md:p-8 space-y-6 shadow-2xl transition-colors duration-300 border ${
                readerTheme === 'light'
                  ? 'bg-amber-50/95 border-amber-200/90 text-slate-900 shadow-amber-900/10'
                  : 'bg-slate-950 border-slate-800 text-white shadow-black/60'
              }`}
            >
              <div className={`flex flex-wrap items-center justify-between border-b pb-4 gap-3 ${
                readerTheme === 'light' ? 'border-amber-200' : 'border-slate-800'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      readerTheme === 'light' ? 'text-amber-700' : 'text-blue-400'
                    }`}>
                      <ScrollText className="w-3.5 h-3.5" />
                      Format Webtoon Scroll Vertikal
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                      Auto-Flow
                    </span>
                  </div>
                  <h2 className={`text-lg sm:text-2xl font-black ${
                    readerTheme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>
                    {activeChapter?.title || 'Bab Komik'}
                  </h2>
                  <p className={`text-xs mt-0.5 ${
                    readerTheme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    Gulir (scroll) ke bawah untuk membaca alur cerita gambar & dialog layaknya webtoon resmi.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Quick Toggle Mode Baca di Panel Reader */}
                  <button
                    id="btn-quick-theme-toggle"
                    onClick={() => setReaderTheme(readerTheme === 'dark' ? 'light' : 'dark')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                      readerTheme === 'light'
                        ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  >
                    {readerTheme === 'light' ? (
                      <>
                        <Moon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Mode Malam</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Mode Terang</span>
                      </>
                    )}
                  </button>

                  <div className={`text-xs px-3 py-1.5 rounded-xl border font-medium ${
                    readerTheme === 'light'
                      ? 'bg-amber-100/80 text-amber-900 border-amber-300/80'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    {activeChapter?.pages.length || 0} Panel Strip
                  </div>
                </div>
              </div>

              {/* Webtoon Infinite Scroll Container - Seamless Vertical Strip */}
              <div 
                id="webtoon-scroll-canvas"
                className={`max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl transition-colors duration-300 border ${
                  readerTheme === 'light' 
                    ? 'bg-white border-amber-200 shadow-amber-900/10' 
                    : 'bg-black border-slate-800 shadow-blue-950/20'
                }`}
              >
                {activeChapter?.pages.map((page, index) => (
                  <div
                    key={page.panelNumber}
                    id={`comic-panel-${page.panelNumber}`}
                    className={`relative group transition-colors duration-300 ${
                      index > 0 
                        ? readerTheme === 'light' ? 'border-t border-amber-100' : 'border-t border-slate-900/80' 
                        : ''
                    }`}
                  >
                    {/* Header Panel Indicator */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-md ${
                        readerTheme === 'light'
                          ? 'bg-white/90 text-amber-950 border border-amber-200'
                          : 'bg-black/70 text-slate-200 border border-white/10'
                      }`}>
                        Ep.{activeChapter.chapterNumber} • #{page.panelNumber}
                      </span>
                      {page.characterName && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-md hidden sm:inline-block ${
                          readerTheme === 'light'
                            ? 'bg-amber-100/90 text-amber-900 border border-amber-300/60'
                            : 'bg-blue-950/80 text-blue-300 border border-blue-700/40'
                        }`}>
                          {page.characterName}
                        </span>
                      )}
                    </div>

                    {/* Webtoon Illustration Image Frame */}
                    <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-slate-900">
                      <img
                        src={page.imageUrl || activeComic.coverImageUrl}
                        alt={`Panel ${page.panelNumber} - ${activeComic.title}`}
                        className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t ${
                        readerTheme === 'light'
                          ? 'from-white via-transparent to-black/20'
                          : 'from-black via-transparent to-black/40'
                      }`} />
                    </div>

                    {/* Webtoon Scene Action Caption & Dialogue */}
                    <div className={`p-4 sm:p-6 space-y-4 ${
                      readerTheme === 'light' ? 'bg-white' : 'bg-slate-950'
                    }`}>
                      {/* Action Description */}
                      <div className={`p-3 rounded-xl text-xs sm:text-sm italic leading-relaxed border ${
                        readerTheme === 'light'
                          ? 'bg-amber-50/80 border-amber-200/80 text-slate-700'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1 not-italic font-bold text-[11px] uppercase tracking-wider text-blue-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Deskripsi Adegan
                        </div>
                        {page.actionDescription}
                      </div>

                      {/* Webtoon Speech Bubble (Dialog Teks) */}
                      <div className={`relative rounded-2xl p-4 sm:p-5 shadow-lg border-2 max-w-xl mx-auto transition-transform duration-200 hover:scale-[1.01] ${
                        readerTheme === 'light'
                          ? 'bg-amber-50/40 border-amber-300 text-slate-950 shadow-amber-900/5'
                          : 'bg-slate-900 border-blue-500/60 text-white shadow-blue-900/10'
                      }`}>
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-inherit/20">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span className={`text-[11px] font-black uppercase tracking-wider ${
                            readerTheme === 'light' ? 'text-amber-800' : 'text-blue-300'
                          }`}>
                            {page.characterName || 'Karakter'}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-center tracking-wide leading-relaxed">
                          {page.dialogue}
                        </p>
                      </div>
                    </div>

                    {/* Subtle panel bottom divider spacer (layaknya webtoon) */}
                    <div className={`h-4 sm:h-6 ${
                      readerTheme === 'light' ? 'bg-amber-50/50' : 'bg-black'
                    }`} />
                  </div>
                ))}
              </div>

              {/* End of Chapter notice & Quick chapter switcher */}
              <div className={`text-center py-6 px-4 rounded-2xl border space-y-3 ${
                readerTheme === 'light' 
                  ? 'border-amber-200 bg-amber-100/50 text-slate-800' 
                  : 'border-slate-800 bg-slate-900/50 text-slate-300'
              }`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Selesai Membaca {activeChapter?.title}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  Kamu telah menyelesaikan seluruh panel strip bab ini. Lanjutkan ke bab berikutnya atau bagikan pendapatmu di kolom komentar di bawah!
                </p>

                {/* Quick Chapter Navigation at bottom */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    id="btn-prev-chapter-bottom"
                    disabled={selectedChapterNumber <= 1}
                    onClick={() => {
                      setSelectedChapterNumber(prev => Math.max(1, prev - 1));
                      const el = document.getElementById('comic-reader-panel-area');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 cursor-pointer"
                  >
                    ← Bab Sebelumnya
                  </button>
                  <button
                    id="btn-next-chapter-bottom"
                    disabled={selectedChapterNumber >= activeComic.chapters.length}
                    onClick={() => {
                      setSelectedChapterNumber(prev => Math.min(activeComic.chapters.length, prev + 1));
                      const el = document.getElementById('comic-reader-panel-area');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-blue-500 bg-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-500 cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    Bab Selanjutnya →
                  </button>
                </div>
              </div>
            </div>

            {/* SOCIAL FEATURES (Ratings, Favorites, Comments) */}
            <SocialSection
              comicId={activeComic.titleId}
              comicTitle={activeComic.title}
              comicCover={activeComic.coverImageUrl}
              genre={activeComic.genre}
              onRequireLogin={() => setIsLoginModalOpen(true)}
            />
          </motion.div>
        ) : null}

        {/* VIEW B: BERANDA (HOME PAGE) */}
        {!selectedComicId && currentTab === 'home' && (
          <motion.div
            key="tab-home"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            id="home-view"
            className="space-y-12 pb-16"
          >
            {/* Hero Section dengan Tema Biru Elegan */}
            <section 
              id="hero-section"
              className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-blue-950/60 to-slate-950 border-b border-blue-900/30 py-16 sm:py-24 px-4 sm:px-6 lg:px-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.18),transparent_60%)]" />
              <div className="relative max-w-4xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/40 text-blue-300 text-xs font-semibold shadow-inner">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>Platform Pembaca Anime & Manga Mobile Modern</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                  Nikmati Petualangan Komik Tanpa Batas di{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300">
                    Shiroko Comics
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  Shiroko Comics adalah destinasi terdepan untuk membaca serial anime dan komik manga pilihan dalam Bahasa Indonesia. Dirancang khusus dengan navigasi responsif, sinkronisasi cloud Firestore, dan fitur komunitas interaktif.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    id="btn-hero-explore-comics"
                    onClick={() => setCurrentTab('comics')}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-xl shadow-blue-700/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Jelajahi Koleksi Komik</span>
                  </button>

                  <button
                    id="btn-hero-faq"
                    onClick={() => setCurrentTab('faq')}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Pelajari Shiroko
                  </button>
                </div>
              </div>
            </section>

            {/* Cuplikan Komik Populer / Sorotan */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Komik Rekomendasi Utama
                  </h2>
                  <p className="text-xs text-slate-400">
                    Pilihan terbaik dari era klasik hingga rilis mingguan terbaru
                  </p>
                </div>
                <button
                  onClick={() => setCurrentTab('comics')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                {MOCK_COMICS.map((comic) => (
                  <div
                    key={comic.titleId}
                    id={`home-card-${comic.titleId}`}
                    onClick={() => handleOpenReader(comic.titleId)}
                    className="group bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden hover:border-blue-500/60 transition-all duration-200 cursor-pointer flex flex-col shadow-lg"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-slate-950">
                      <img
                        src={comic.coverImageUrl}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          comic.category === 'newest' ? 'bg-emerald-600 text-white' :
                          comic.category === 'oldest' ? 'bg-amber-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {comic.category === 'newest' ? 'Baru' : comic.category === 'oldest' ? 'Klasik' : 'Populer'}
                        </span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent flex items-center justify-between text-[11px] text-slate-300">
                        <span>{comic.releaseYear}</span>
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" /> 4.9
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {comic.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          {comic.genre.join(', ')}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Baca Sekarang</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* VIEW C: DAFTAR KOMIK (COMIC LIST PAGE & SEARCH / FILTER) */}
        {!selectedComicId && currentTab === 'comics' && (
          <motion.div
            key="tab-comics"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            id="comics-view"
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
          >
            {/* Header Judul & Search / Filter Controls */}
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Koleksi Komik Shiroko
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Temukan judul manga favorit dari berbagai genre dan era rilis
                </p>
              </div>

              {/* Baris Pencarian & Kategori */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Bar (Indonesian: "Cari Komik") */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-comic-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Komik berdasarkan judul atau kata kunci..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Filter Kategori (Terbaru / Klasik / Semua) */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: 'Semua Era' },
                    { id: 'newest', label: 'Terbaru' },
                    { id: 'oldest', label: 'Klasik' },
                    { id: 'popular', label: 'Populer' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Filter Pills (Indonesian: "Filter Genre") */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">Filter Genre:</span>
                <div className="flex flex-wrap gap-1.5">
                  {allGenres.map((g) => (
                    <button
                      key={g}
                      id={`btn-filter-genre-${g}`}
                      onClick={() => setSelectedGenre(g)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        selectedGenre === g
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Comic Grid */}
            {filteredComics.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
                <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-white">Tidak ada komik yang sesuai</p>
                <p className="text-xs text-slate-400">
                  Coba ubah kata kunci pencarian atau reset filter genre.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenre('Semua');
                    setSelectedCategory('all');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredComics.map((comic) => (
                  <div
                    key={comic.titleId}
                    id={`comic-card-${comic.titleId}`}
                    onClick={() => handleOpenReader(comic.titleId)}
                    className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/60 transition-all duration-200 cursor-pointer flex flex-col shadow-xl"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-slate-950">
                      <img
                        src={comic.coverImageUrl}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-slate-200 text-[10px] font-bold">
                          {comic.releaseYear}
                        </span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                        <div className="flex flex-wrap gap-1">
                          {comic.genre.map((g) => (
                            <span key={g} className="text-[10px] bg-blue-900/70 text-blue-200 px-1.5 py-0.2 rounded font-medium">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {comic.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {comic.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">
                          {comic.chapters.length} Bab
                        </span>
                        <span className="text-blue-400 font-bold group-hover:underline flex items-center gap-0.5">
                          Buka <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW D: FAVORIT SAYA (FAVORITES PAGE) */}
        {!selectedComicId && currentTab === 'favorites' && (
          <motion.div
            key="tab-favorites"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            id="favorites-view"
            className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                  <span>Daftar Favorit Saya</span>
                </h1>
                <p className="text-xs text-slate-400">Komik yang disimpan untuk dibaca kembali</p>
              </div>
            </div>

            {!isLoggedIn ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
                <h2 className="text-base font-bold text-white">Masuk untuk Melihat Favorit</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Fitur favorit tersinkronisasi di Firestore khusus untuk pengguna yang sudah melakukan login simulasi.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Masuk Akun Sekarang
                </button>
              </div>
            ) : userFavorites.length === 0 ? (
              <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <Heart className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-white">Belum Ada Komik Favorit</p>
                <p className="text-xs text-slate-400">
                  Buka komik pilihanmu dan klik tombol "Simpan / Favorit" untuk menyimpannya di sini.
                </p>
                <button
                  onClick={() => setCurrentTab('comics')}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Jelajahi Komik
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userFavorites.map((fav) => (
                  <div
                    key={fav.comicId}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex gap-3.5 items-center hover:border-blue-500/50 transition-colors"
                  >
                    <img
                      src={fav.comicCover}
                      alt={fav.comicTitle}
                      className="w-16 h-20 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                        {fav.comicTitle}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {fav.genre?.join(', ')}
                      </p>
                      <button
                        onClick={() => handleOpenReader(fav.comicId)}
                        className="mt-2 text-xs font-semibold text-blue-400 hover:underline cursor-pointer"
                      >
                        Lanjut Membaca →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW E: RIWAYAT BACA (READING HISTORY PAGE) */}
        {!selectedComicId && currentTab === 'history' && (
          <motion.div
            key="tab-history"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            id="history-view"
            className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-400" />
                  <span>Riwayat Baca Pengguna</span>
                </h1>
                <p className="text-xs text-slate-400">
                  Daftar komik yang pernah Anda buka dan baca, tersimpan di Firestore
                </p>
              </div>
            </div>

            {!isLoggedIn ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
                <h2 className="text-base font-bold text-white">Masuk untuk Melihat Riwayat Baca</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Riwayat baca tersimpan aman di cloud Firebase Firestore saat Anda membaca dalam keadaan masuk akun.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Masuk Akun Sekarang
                </button>
              </div>
            ) : readingHistory.length === 0 ? (
              <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <BookMarked className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-white">Belum Ada Riwayat Baca</p>
                <p className="text-xs text-slate-400">
                  Setiap kali Anda membuka bab komik, catatan baca otomatis disimpan di sini.
                </p>
                <button
                  onClick={() => setCurrentTab('comics')}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Mulai Membaca Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {readingHistory.map((item) => (
                  <div
                    key={item.comicId}
                    id={`history-item-${item.comicId}`}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={item.comicCover}
                        alt={item.comicTitle}
                        className="w-12 h-16 object-cover rounded-lg shrink-0 border border-slate-800"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">
                          {item.comicTitle}
                        </h3>
                        <p className="text-xs text-blue-400 font-medium">
                          Terakhir dibuka: Bab {item.chapterNumber}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.lastReadAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenReader(item.comicId, item.chapterNumber)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                      >
                        Lanjut
                      </button>
                      <button
                        onClick={() => handleClearHistoryItem(item.comicId)}
                        title="Hapus dari riwayat"
                        className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW F: TANYA JAWAB (FAQ PAGE) */}
        {!selectedComicId && currentTab === 'faq' && (
          <motion.div
            key="tab-faq"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            id="faq-view"
            className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6"
          >
            <div className="text-center space-y-2 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Tanya Jawab (FAQ)
              </h1>
              <p className="text-xs text-slate-400">
                Pertanyaan umum seputar penggunaan platform Shiroko Comics
              </p>
            </div>

            <div className="space-y-4">
              {FAQ_LIST.map((faq, idx) => (
                <div
                  key={idx}
                  id={`faq-item-${idx}`}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-lg"
                >
                  <h3 className="text-sm font-bold text-blue-300 flex items-start gap-2">
                    <span className="text-blue-500 font-mono">Q{idx + 1}.</span>
                    <span>{faq.pertanyaan}</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6">
                    {faq.jawaban}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW G: LAPOR BUG / SARAN (REPORT FORM PAGE) */}
        {!selectedComicId && currentTab === 'report' && (
          <motion.div
            key="tab-report"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            id="report-view"
            className="px-4 sm:px-6 py-8"
          >
            <BugReportForm />
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* 3. Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              S
            </div>
            <span className="text-xs font-bold text-slate-200">
              Shiroko Comics • Platform Komik Anime Indonesia
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => {
                setSelectedComicId(null);
                setCurrentTab('faq');
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Tanya Jawab
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setSelectedComicId(null);
                setCurrentTab('report');
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Lapor Bug / Saran
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            © 2026 Shiroko Comics. Terintegrasi dengan Firebase Firestore.
          </p>
        </div>
      </footer>

      {/* 4. Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
