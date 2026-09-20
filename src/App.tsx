import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  MOCK_COMICS, 
  Comic, 
  ComicChapter, 
  FAQ_LIST, 
  HistoryItem, 
  FavoriteItem,
  UserProfile
} from './typesAndData';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { 
  collection, 
  addDoc,
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
import { uploadCbzFromBrowser } from './cbzBrowserService';
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
  MessageSquare,
  ShieldCheck,
  LayoutDashboard,
  NotebookText,
  Users,
  BarChart3,
  Settings,
  Plus,
  Pencil,
  FileText,
  Layers3,
  FileArchive,
  CircleDashed
} from 'lucide-react';

type NavTab = 'home' | 'comics' | 'history' | 'favorites' | 'faq' | 'report' | 'admin';
type ComicSort = 'newest' | 'oldest' | 'popular' | 'az' | 'za';
type AdminSection = 'dashboard' | 'comics' | 'chapters' | 'users' | 'reports' | 'settings';

type AdminActivityType = 'comic_created' | 'comic_updated' | 'comic_deleted' | 'chapter_created' | 'chapter_updated' | 'chapter_deleted';

type AdminActivity = {
  id: string;
  type: AdminActivityType;
  message: string;
  timestamp: number;
};

type AdminComicDraft = {
  title: string;
  author: string;
  genre: string;
  description: string;
  coverImageUrl: string;
  bannerImageUrl: string;
  releaseYear: string;
  status: Comic['status'];
  category: Comic['category'];
};

type AdminChapterDraft = {
  chapterNumber: string;
  title: string;
  releaseDate: string;
};

type AdminChapterEditDraft = {
  title: string;
  releaseDate: string;
};

interface ResumeState {
  scrollY: number;
  progress: number;
  lastReadAt: number;
}

const normalizeResumeState = (value: Partial<ResumeState> | number | null | undefined): ResumeState => {
  const rawScrollY = typeof value === 'number' ? value : Number(value?.scrollY) || 0;
  const rawProgress = typeof value === 'number' ? 0 : Number(value?.progress) || 0;
  const progress = Math.min(100, Math.max(0, rawProgress));
  return {
    scrollY: progress === 0 ? 0 : Math.max(0, rawScrollY),
    progress,
    lastReadAt: typeof value === 'number' ? 0 : Number(value?.lastReadAt) || 0,
  };
};

const readLocalResumeState = (storageKey: string): ResumeState => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return normalizeResumeState(null);
    try {
      return normalizeResumeState(JSON.parse(raw) as Partial<ResumeState> | number);
    } catch {
      return normalizeResumeState(Number(raw) || 0);
    }
  } catch {
    return normalizeResumeState(null);
  }
};

export default function App() {
  const { currentUser, isLoggedIn, logout } = useAuth();

  // Navigation & Routing State
  const [currentTab, setCurrentTab] = useState<NavTab>(() => (
    window.location.pathname === '/admin' ? 'admin' : 'home'
  ));
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);
  const [selectedComicDetailId, setSelectedComicDetailId] = useState<string | null>(null);
  const [adminSection, setAdminSection] = useState<AdminSection>('dashboard');
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(1);
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light'>('dark');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [readerProgress, setReaderProgress] = useState<number>(0);
  const [readerControlsVisible, setReaderControlsVisible] = useState<boolean>(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  const continueResumeOverrideRef = useRef<ResumeState | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Semua');
  const [selectedStatus, setSelectedStatus] = useState<Comic['status'] | 'Semua'>('Semua');
  const [selectedSort, setSelectedSort] = useState<ComicSort>('newest');

  // Firestore reading history & favorites for current user
  const [readingHistory, setReadingHistory] = useState<HistoryItem[]>([]);
  const [userFavorites, setUserFavorites] = useState<FavoriteItem[]>([]);
  const [adminComics, setAdminComics] = useState<Comic[]>(MOCK_COMICS);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([
    {
      userId: 'admin',
      username: 'admin',
      displayName: 'Administrator',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
      createdAt: Date.now(),
      role: 'admin',
    },
  ]);
  const [adminActivity, setAdminActivity] = useState<AdminActivity[]>([]);
  const [adminComicSearch, setAdminComicSearch] = useState('');
  const [adminComicSort, setAdminComicSort] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');
  const [adminComicStatus, setAdminComicStatus] = useState<'Semua' | Comic['status']>('Semua');
  const [adminSelectedComicId, setAdminSelectedComicId] = useState<string>(adminComics[0]?.titleId || '');
  const [adminComicDraft, setAdminComicDraft] = useState<AdminComicDraft>({
    title: '',
    author: '',
    genre: '',
    description: '',
    coverImageUrl: '',
    bannerImageUrl: '',
    releaseYear: '2026',
    status: 'Sedang Rilis',
    category: 'newest',
  });
  const [adminEditingComicId, setAdminEditingComicId] = useState<string | null>(null);
  const [adminChapterDraft, setAdminChapterDraft] = useState<AdminChapterDraft>({
    chapterNumber: '',
    title: '',
    releaseDate: new Date().toISOString().slice(0, 10),
  });
  const [adminCbzFile, setAdminCbzFile] = useState<File | null>(null);
  const [adminCbzUploading, setAdminCbzUploading] = useState(false);
  const [adminChapterMessage, setAdminChapterMessage] = useState<string | null>(null);
  const [adminChapterEditDraft, setAdminChapterEditDraft] = useState<AdminChapterEditDraft>({
    title: '',
    releaseDate: '',
  });
  const [adminEditingChapterId, setAdminEditingChapterId] = useState<string | null>(null);
  const [adminDeleteChapterTarget, setAdminDeleteChapterTarget] = useState<{
    comicId: string;
    chapter: ComicChapter;
  } | null>(null);
  const [adminSelectedChapterId, setAdminSelectedChapterId] = useState<string | null>(null);
  const [adminDeleteTarget, setAdminDeleteTarget] = useState<Comic | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'comics'),
      (snapshot) => {
        const remoteComics = snapshot.docs.map((item) => item.data() as Comic);
        if (remoteComics.length === 0) {
          setAdminComics(MOCK_COMICS);
          return;
        }
        const remoteById = new Map(remoteComics.map((comic) => [comic.titleId, comic]));
        setAdminComics([
          ...MOCK_COMICS.filter((comic) => !remoteById.has(comic.titleId)),
          ...remoteComics,
        ]);
      },
      (error) => {
        console.warn('Comic catalog sync unavailable; using local catalog fallback:', error.message);
        setAdminComics(MOCK_COMICS);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      setAdminUsers((prev) => {
        const existing = prev.some((user) => user.userId === currentUser.userId);
        if (existing) return prev;
        return [
          {
            userId: currentUser.userId,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
            createdAt: currentUser.createdAt,
            role: 'admin',
          },
          ...prev,
        ];
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs
          .map((item) => item.data() as UserProfile)
          .filter((user) => user.userId && user.username);
        setAdminUsers(users);
      },
      (error) => console.warn('User management sync unavailable:', error.message)
    );
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(
      collection(db, 'admin_activity'),
      (snapshot) => {
        const activities = snapshot.docs
          .map((item) => ({ id: item.id, ...(item.data() as Omit<AdminActivity, 'id'>) }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 6);
        setAdminActivity(activities);
      },
      (error) => console.warn('Admin activity sync unavailable:', error.message)
    );
    return () => unsubscribe();
  }, [isAdmin]);

  // Local fallback untuk fitur Continue Reading tanpa login.
  const [localContinueReading, setLocalContinueReading] = useState<HistoryItem | null>(() => {
    try {
      const saved = localStorage.getItem('shiroko-continue-reading');
      if (!saved) return null;
      const parsed = JSON.parse(saved) as HistoryItem;
      const normalized = normalizeResumeState(parsed);
      return {
        ...parsed,
        scrollY: normalized.scrollY,
        progress: normalized.progress,
      };
    } catch {
      return null;
    }
  });

  const catalogComics = adminComics.length > 0 ? adminComics : MOCK_COMICS;

  // Collect unique genres
  const allGenres = ['Semua', ...Array.from(new Set(catalogComics.flatMap((c) => c.genre)))];

  // Currently selected comic object
  const activeComic = catalogComics.find((c) => c.titleId === selectedComicId) || null;
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

  // Reader UX: restore once per comic/chapter, then track the user's actual position.
  useEffect(() => {
    if (!selectedComicId) return;

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let cloudSaveTimer: ReturnType<typeof setTimeout> | undefined;
    let restoreTimer: number | undefined;
    let hasRestored = false;

    const storageKey = `shiroko-reader:${selectedComicId}:${selectedChapterNumber}`;
    const activeComicForResume = catalogComics.find((comic) => comic.titleId === selectedComicId);
    const cloudHistory = readingHistory.find(
      (item) => item.comicId === selectedComicId && item.chapterNumber === selectedChapterNumber
    );

    const localResume = readLocalResumeState(storageKey);
    const cloudResume: ResumeState | null = cloudHistory
      ? normalizeResumeState(cloudHistory)
      : null;
    const override = continueResumeOverrideRef.current;
    continueResumeOverrideRef.current = null;
    const candidates = [override, localResume, cloudResume].filter(
      (candidate): candidate is ResumeState => candidate !== null
    );
    const savedResume = candidates.reduce(
      (latest, candidate) => candidate.lastReadAt > latest.lastReadAt ? candidate : latest,
      { scrollY: 0, progress: 0, lastReadAt: 0 }
    );
    const savedScroll = savedResume.progress === 0 ? 0 : savedResume.scrollY;

    const saveCurrentPosition = () => {
      if (!hasRestored || !activeComicForResume) return;

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const progress = maxScroll === 0
        ? 0
        : Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100));
      const scrollY = Math.round(window.scrollY);
      const lastReadAt = Date.now();
      setReaderProgress(progress);

      const marker: HistoryItem = {
        comicId: activeComicForResume.titleId,
        userId: currentUser?.userId || 'guest',
        comicTitle: activeComicForResume.title,
        comicCover: activeComicForResume.coverImageUrl,
        chapterNumber: selectedChapterNumber,
        lastReadAt,
        scrollY,
        progress: Math.round(progress),
        totalPages: activeChapter?.pages.length || 0,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify({ scrollY, progress: Math.round(progress), lastReadAt }));
        localStorage.setItem('shiroko-continue-reading', JSON.stringify(marker));
        setLocalContinueReading(marker);
      } catch {
        // Ignore storage restrictions.
      }

      if (currentUser) {
        if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
        cloudSaveTimer = setTimeout(async () => {
          try {
            const historyId = `${currentUser.userId}_${activeComicForResume.titleId}`;
            await setDoc(doc(db, 'reading_history', historyId), {
              comicId: activeComicForResume.titleId,
              userId: currentUser.userId,
              comicTitle: activeComicForResume.title,
              comicCover: activeComicForResume.coverImageUrl,
              chapterNumber: selectedChapterNumber,
              lastReadAt,
              scrollY,
              progress: Math.round(progress),
              totalPages: activeChapter?.pages.length || 0,
            }, { merge: true });
          } catch (e) {
            console.warn('Could not sync reading progress:', e);
          }
        }, 1500);
      }

      setReaderControlsVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setReaderControlsVisible(false), 1800);
    };

    const handleReaderScroll = () => {
      // A non-zero scroll before the timer means the reader was manually moved.
      // Treat it as the session's initial position and never snap it back.
      if (!hasRestored && window.scrollY > 0) hasRestored = true;
      saveCurrentPosition();
    };

    const handleReaderPointerActivity = () => {
      saveCurrentPosition();
    };

    const restorePosition = () => {
      if (hasRestored) return;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (savedScroll === 0) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        hasRestored = true;
        requestAnimationFrame(saveCurrentPosition);
        return;
      }
      if (maxScroll >= savedScroll - 100) {
        window.scrollTo({ top: savedScroll, behavior: 'auto' });
        hasRestored = true;
        requestAnimationFrame(saveCurrentPosition);
        return;
      }
      restoreTimer = window.setTimeout(restorePosition, 250);
    };

    window.addEventListener('scroll', handleReaderScroll, { passive: true });
    window.addEventListener('touchstart', handleReaderScroll, { passive: true });
    window.addEventListener('mousemove', handleReaderPointerActivity, { passive: true });
    restoreTimer = window.setTimeout(restorePosition, 300);

    return () => {
      window.removeEventListener('scroll', handleReaderScroll);
      window.removeEventListener('touchstart', handleReaderScroll);
      window.removeEventListener('mousemove', handleReaderPointerActivity);
      if (hideTimer) clearTimeout(hideTimer);
      if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, [selectedComicId, selectedChapterNumber]);

  // Record reading history in Firestore
  const recordReadingSession = async (
    comic: Comic,
    chapterNum: number,
    resumeState?: ResumeState
  ) => {
    if (!currentUser) return;
    try {
      const historyId = `${currentUser.userId}_${comic.titleId}`;
      const existing = readingHistory.find(
        (item) => item.comicId === comic.titleId
      );
      const existingState = existing?.chapterNumber === chapterNum
        ? normalizeResumeState(existing)
        : normalizeResumeState(null);
      const state = resumeState || existingState;

      await setDoc(
        doc(db, 'reading_history', historyId),
        {
          comicId: comic.titleId,
          userId: currentUser.userId,
          comicTitle: comic.title,
          comicCover: comic.coverImageUrl,
          chapterNumber: chapterNum,
          lastReadAt: Date.now(),
          scrollY: state.scrollY,
          progress: state.progress,
          totalPages:
            comic.chapters.find(
              (chapter) => chapter.chapterNumber === chapterNum
            )?.pages.length || 0,
        },
        { merge: true }
      );
    } catch (e) {
      console.error('Error saving reading history:', e);
    }
  };

  const handleOpenReader = (
    comicId: string,
    chapterNum: number = 1,
    resumeOverride?: ResumeState
  ) => {
    const comic = catalogComics.find((c) => c.titleId === comicId);
    if (!comic) return;

    const existingHistory = readingHistory.find(
      (item) => item.comicId === comicId
    );

    const storageKey = `shiroko-reader:${comicId}:${chapterNum}`;
    const localResume = readLocalResumeState(storageKey);
    const cloudResume = existingHistory?.chapterNumber === chapterNum
      ? normalizeResumeState(existingHistory)
      : null;
    const resolvedResume = resumeOverride || [localResume, cloudResume]
      .filter((candidate): candidate is ResumeState => candidate !== null)
      .reduce(
        (latest, candidate) => candidate.lastReadAt > latest.lastReadAt ? candidate : latest,
        normalizeResumeState(null)
      );
    const savedScroll = resolvedResume.progress === 0 ? 0 : resolvedResume.scrollY;

    const marker: HistoryItem = {
      comicId: comic.titleId,
      userId: currentUser?.userId || 'guest',
      comicTitle: comic.title,
      comicCover: comic.coverImageUrl,
      chapterNumber: chapterNum,
      lastReadAt: Date.now(),
      scrollY: savedScroll,
      progress: resolvedResume.progress,
      totalPages:
        comic.chapters.find(
          (chapter) => chapter.chapterNumber === chapterNum
        )?.pages.length || 0,
    };

    try {
      localStorage.setItem(
        'shiroko-continue-reading',
        JSON.stringify(marker)
      );
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          scrollY: marker.scrollY,
          progress: marker.progress,
          lastReadAt: marker.lastReadAt,
        })
      );
      setLocalContinueReading(marker);
    } catch {
      // Ignore storage restrictions.
    }

    setSelectedComicId(comicId);
    setSelectedChapterNumber(chapterNum);

    recordReadingSession(comic, chapterNum, resolvedResume);

    // Jangan paksa kembali ke atas jika ada posisi baca yang tersimpan.
    // Reader effect akan melakukan restore ke posisi terakhir.
  };

  const handleOpenComicDetail = (comicId: string) => {
    if (!catalogComics.some((comic) => comic.titleId === comicId)) return;
    setSelectedComicId(null);
    setSelectedComicDetailId(comicId);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleOpenReaderFromDetail = (
    comicId: string,
    chapterNum: number = 1,
    resumeOverride?: ResumeState
  ) => {
    setSelectedComicDetailId(null);
    handleOpenReader(comicId, chapterNum, resumeOverride);
  };

  const handleToggleFavorite = async (comic: Comic) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    const isFavorite = userFavorites.some((favorite) => favorite.comicId === comic.titleId);
    const favoriteId = `${currentUser.userId}_${comic.titleId}`;

    try {
      if (isFavorite) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
      } else {
        await setDoc(doc(db, 'favorites', favoriteId), {
          comicId: comic.titleId,
          userId: currentUser.userId,
          comicTitle: comic.title,
          comicCover: comic.coverImageUrl,
          genre: comic.genre,
          addedAt: Date.now(),
        });
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
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

  // Continue Reading: prioritaskan data Firestore saat login,
  // lalu gunakan localStorage sebagai fallback untuk guest.
  const latestHistory = [...readingHistory].sort(
    (a, b) => b.lastReadAt - a.lastReadAt
  )[0];

  const continueItem = latestHistory || localContinueReading;

  const continueComic = continueItem
    ? catalogComics.find(
        (comic) => comic.titleId === continueItem.comicId
      )
    : null;

  const continueChapter = continueComic?.chapters.find(
    (chapter) =>
      chapter.chapterNumber === continueItem?.chapterNumber
  );

  const continueProgress = Math.min(
    100,
    Math.max(0, continueItem?.progress || 0)
  );

  const detailComic = catalogComics.find((comic) => comic.titleId === selectedComicDetailId) || null;
  const detailHistory = detailComic
    ? readingHistory.find((item) => item.comicId === detailComic.titleId) ||
      (localContinueReading?.comicId === detailComic.titleId ? localContinueReading : null)
    : null;
  const detailFavorite = detailComic
    ? userFavorites.some((favorite) => favorite.comicId === detailComic.titleId)
    : false;

  const normalizedSearchQuery = searchQuery.trim().replace(/\s+/g, ' ').toLowerCase();

  const filteredComics = useMemo(() => {
    const result = catalogComics.filter((comic) => {
      const searchableText = [comic.title, comic.author, ...comic.genre]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !normalizedSearchQuery || searchableText.includes(normalizedSearchQuery);
      const matchesGenre = selectedGenre === 'Semua' || comic.genre.includes(selectedGenre);
      const matchesStatus = selectedStatus === 'Semua' || comic.status === selectedStatus;
      return matchesQuery && matchesGenre && matchesStatus;
    });

    return [...result].sort((first, second) => {
      switch (selectedSort) {
        case 'oldest':
          return first.releaseYear - second.releaseYear;
        case 'popular':
          return second.views - first.views;
        case 'az':
          return first.title.localeCompare(second.title, 'id');
        case 'za':
          return second.title.localeCompare(first.title, 'id');
        case 'newest':
        default:
          return second.releaseYear - first.releaseYear;
      }
    });
  }, [normalizedSearchQuery, selectedGenre, selectedStatus, selectedSort]);

  const resetComicFilters = () => {
    setSearchQuery('');
    setSelectedGenre('Semua');
    setSelectedStatus('Semua');
    setSelectedSort('newest');
  };

  const adminList = useMemo(() => {
    const query = adminComicSearch.trim().toLowerCase();
    const next = adminComics.filter((comic) => {
      const matchesSearch = !query || [comic.title, comic.author, comic.genre.join(' '), comic.description].join(' ').toLowerCase().includes(query);
      const matchesStatus = adminComicStatus === 'Semua' || comic.status === adminComicStatus;
      return matchesSearch && matchesStatus;
    });

    return [...next].sort((a, b) => {
      switch (adminComicSort) {
        case 'oldest':
          return a.releaseYear - b.releaseYear;
        case 'popular':
          return b.views - a.views;
        case 'az':
          return a.title.localeCompare(b.title, 'id');
        case 'za':
          return b.title.localeCompare(a.title, 'id');
        case 'newest':
        default:
          return b.releaseYear - a.releaseYear;
      }
    });
  }, [adminComicSearch, adminComicSort, adminComicStatus, adminComics]);

  const selectedAdminComic = adminComics.find((comic) => comic.titleId === adminSelectedComicId) || adminComics[0] || null;

  const addAdminActivity = (type: AdminActivityType, message: string) => {
    const timestamp = Date.now();
    setAdminActivity((prev) => [{
      id: `${type}-${timestamp}-${Math.random().toString(16).slice(2)}`,
      type,
      message,
      timestamp,
    }, ...prev].slice(0, 6));
    if (isAdmin) {
      void addDoc(collection(db, 'admin_activity'), {
        type,
        message,
        timestamp,
        userId: currentUser?.userId,
      }).catch((error) => console.error('Admin activity log failed:', error));
    }
  };

  const handleAdminSubmitComic = () => {
    const title = adminComicDraft.title.trim();
    const author = adminComicDraft.author.trim();
    const description = adminComicDraft.description.trim();
    const genreList = adminComicDraft.genre.split(',').map((item) => item.trim()).filter(Boolean);
    const numericYear = Number(adminComicDraft.releaseYear);

    if (!title || !author || !description || !genreList.length || !Number.isFinite(numericYear) || numericYear < 1900 || numericYear > 2100) {
      return;
    }

    const normalizedTitleId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `comic-${Date.now()}`;

    if (adminEditingComicId) {
      setAdminComics((prev) => prev.map((comic) => {
        if (comic.titleId !== adminEditingComicId) return comic;
        return {
          ...comic,
          title,
          author,
          description,
          genre: genreList,
          coverImageUrl: adminComicDraft.coverImageUrl || comic.coverImageUrl,
          bannerImageUrl: adminComicDraft.bannerImageUrl || comic.bannerImageUrl,
          releaseYear: numericYear,
          status: adminComicDraft.status,
          category: adminComicDraft.category,
        };
      }));
      const updatedComic = adminComics.find((comic) => comic.titleId === adminEditingComicId);
      if (updatedComic) {
        void setDoc(doc(db, 'comics', adminEditingComicId), {
          ...updatedComic,
          title,
          author,
          description,
          genre: genreList,
          coverImageUrl: adminComicDraft.coverImageUrl || updatedComic.coverImageUrl,
          bannerImageUrl: adminComicDraft.bannerImageUrl || updatedComic.bannerImageUrl,
          releaseYear: numericYear,
          status: adminComicDraft.status,
          category: adminComicDraft.category,
        }).catch((error) => console.error('Comic update failed:', error));
      }
      addAdminActivity('comic_updated', `Komik "${title}" diperbarui.`);
    } else {
      const newComic: Comic = {
        titleId: normalizedTitleId,
        title,
        author,
        description,
        genre: genreList,
        coverImageUrl: adminComicDraft.coverImageUrl || '/comics/haikyu-vol-1/chapter-01/page-001.jpg',
        bannerImageUrl: adminComicDraft.bannerImageUrl || '/comics/haikyu-vol-1/chapter-01/page-001.jpg',
        releaseYear: numericYear,
        status: adminComicDraft.status,
        views: 0,
        category: adminComicDraft.category,
        chapters: [
          {
            id: `${normalizedTitleId}-chapter-01`,
            chapterNumber: 1,
            title: 'Chapter 1',
            releaseDate: new Date().toISOString().slice(0, 10),
            sourceType: 'images',
            pageCount: 0,
            storagePath: `comics/${normalizedTitleId}/chapters/chapter-01`,
            archiveName: '',
            pages: [],
          },
        ],
      };
      setAdminComics((prev) => [newComic, ...prev]);
      void setDoc(doc(db, 'comics', normalizedTitleId), newComic)
        .catch((error) => console.error('Comic create failed:', error));
      setAdminSelectedComicId(normalizedTitleId);
      addAdminActivity('comic_created', `Komik "${title}" ditambahkan.`);
    }

    setAdminComicDraft({
      title: '',
      author: '',
      genre: '',
      description: '',
      coverImageUrl: '',
      bannerImageUrl: '',
      releaseYear: '2026',
      status: 'Sedang Rilis',
      category: 'newest',
    });
    setAdminEditingComicId(null);
  };

  const handleAdminEditComic = (comic: Comic) => {
    setAdminEditingComicId(comic.titleId);
    setAdminComicDraft({
      title: comic.title,
      author: comic.author,
      genre: comic.genre.join(', '),
      description: comic.description,
      coverImageUrl: comic.coverImageUrl,
      bannerImageUrl: comic.bannerImageUrl,
      releaseYear: String(comic.releaseYear),
      status: comic.status,
      category: comic.category,
    });
  };

  const handleAdminDeleteComic = (comic: Comic) => {
    setAdminDeleteTarget(comic);
  };

  const confirmAdminDeleteComic = () => {
    if (!adminDeleteTarget) return;
    setAdminComics((prev) => prev.filter((comic) => comic.titleId !== adminDeleteTarget.titleId));
    void deleteDoc(doc(db, 'comics', adminDeleteTarget.titleId))
      .catch((error) => console.error('Comic delete failed:', error));
    if (adminSelectedComicId === adminDeleteTarget.titleId && adminComics.length > 1) {
      setAdminSelectedComicId(adminComics.find((comic) => comic.titleId !== adminDeleteTarget.titleId)?.titleId || '');
    }
    addAdminActivity('comic_deleted', `Komik "${adminDeleteTarget.title}" dihapus.`);
    setAdminDeleteTarget(null);
  };

  const handleAdminAddChapter = () => {
    if (!isAdmin || !selectedAdminComic) return;
    const chapterNumber = Number(adminChapterDraft.chapterNumber);
    const trimmedTitle = adminChapterDraft.title.trim();
    if (!trimmedTitle || !Number.isFinite(chapterNumber) || chapterNumber <= 0 || !adminChapterDraft.releaseDate || Number.isNaN(Date.parse(adminChapterDraft.releaseDate))) return;

    const exists = selectedAdminComic.chapters.some((chapter) => chapter.chapterNumber === chapterNumber);
    if (exists) return;

    const newChapter: ComicChapter = {
      id: `${selectedAdminComic.titleId}-chapter-${String(chapterNumber).padStart(2, '0')}`,
      chapterNumber,
      title: trimmedTitle,
      releaseDate: adminChapterDraft.releaseDate || new Date().toISOString().slice(0, 10),
      sourceType: 'images',
      pageCount: 0,
      storagePath: `comics/${selectedAdminComic.titleId}/chapters/chapter-${String(chapterNumber).padStart(2, '0')}`,
      archiveName: '',
      pages: [],
    };

    setAdminComics((prev) => prev.map((comic) => {
      if (comic.titleId !== selectedAdminComic.titleId) return comic;
      return {
        ...comic,
        chapters: [...comic.chapters, newChapter],
      };
    }));
    void setDoc(doc(db, 'comics', selectedAdminComic.titleId), {
      ...selectedAdminComic,
      chapters: [...selectedAdminComic.chapters, newChapter],
    }).catch((error) => console.error('Chapter create failed:', error));
    addAdminActivity('chapter_created', `Bab ${chapterNumber} ditambahkan ke ${selectedAdminComic.title}.`);
    setAdminChapterDraft({
      chapterNumber: '',
      title: '',
      releaseDate: new Date().toISOString().slice(0, 10),
    });
  };

  const handleAdminCbzUpload = async () => {
    if (!isAdmin || !selectedAdminComic || !adminCbzFile) return;
    const chapterNumber = Number(adminChapterDraft.chapterNumber);
    const title = adminChapterDraft.title.trim();
    const releaseDate = adminChapterDraft.releaseDate;
    if (!title || !Number.isInteger(chapterNumber) || chapterNumber < 1 || Number.isNaN(Date.parse(releaseDate))) {
      setAdminChapterMessage('Isi chapter number, judul, dan tanggal yang valid terlebih dahulu.');
      return;
    }
    if (selectedAdminComic.chapters.some((chapter) => chapter.chapterNumber === chapterNumber)) {
      setAdminChapterMessage('Nomor chapter tersebut sudah digunakan.');
      return;
    }
    setAdminCbzUploading(true);
    setAdminChapterMessage(null);
    try {
      const uploaded = await uploadCbzFromBrowser(adminCbzFile, selectedAdminComic.titleId, chapterNumber);
      const chapter: ComicChapter = {
        id: `${selectedAdminComic.titleId}-chapter-${String(chapterNumber).padStart(2, '0')}`,
        chapterNumber,
        title,
        releaseDate,
        ...uploaded,
      };
      persistAdminComic({ ...selectedAdminComic, chapters: [...selectedAdminComic.chapters, chapter] });
      addAdminActivity('chapter_created', `Chapter ${chapterNumber} dari CBZ ditambahkan ke ${selectedAdminComic.title}.`);
      setAdminCbzFile(null);
      setAdminChapterDraft({ chapterNumber: '', title: '', releaseDate: new Date().toISOString().slice(0, 10) });
      setAdminChapterMessage(`Berhasil upload ${uploaded.pageCount} halaman.`);
    } catch (error) {
      setAdminChapterMessage(error instanceof Error ? error.message : 'Upload CBZ gagal.');
    } finally {
      setAdminCbzUploading(false);
    }
  };

  const persistAdminComic = (comic: Comic) => {
    if (!isAdmin) return;
    setAdminComics((prev) => prev.map((item) => item.titleId === comic.titleId ? comic : item));
    void setDoc(doc(db, 'comics', comic.titleId), comic)
      .catch((error) => console.error('Chapter update failed:', error));
  };

  const handleAdminEditChapter = (comic: Comic, chapter: ComicChapter) => {
    if (!isAdmin) return;
    setAdminSelectedComicId(comic.titleId);
    setAdminEditingChapterId(chapter.id);
    setAdminChapterEditDraft({ title: chapter.title, releaseDate: chapter.releaseDate });
  };

  const handleAdminSaveChapterEdit = () => {
    if (!selectedAdminComic || !adminEditingChapterId) return;
    const title = adminChapterEditDraft.title.trim();
    const releaseDate = adminChapterEditDraft.releaseDate.trim();
    if (!title || !releaseDate || Number.isNaN(Date.parse(releaseDate))) return;
    const updatedComic: Comic = {
      ...selectedAdminComic,
      chapters: selectedAdminComic.chapters.map((chapter) => chapter.id === adminEditingChapterId
        ? { ...chapter, title, releaseDate }
        : chapter),
    };
    persistAdminComic(updatedComic);
    addAdminActivity('chapter_updated', `Chapter ${updatedComic.chapters.find((chapter) => chapter.id === adminEditingChapterId)?.chapterNumber || ''} diperbarui.`);
    setAdminEditingChapterId(null);
  };

  const confirmAdminDeleteChapter = () => {
    if (!isAdmin || !adminDeleteChapterTarget) return;
    const comic = adminComics.find((item) => item.titleId === adminDeleteChapterTarget.comicId);
    if (!comic) return;
    const updatedComic: Comic = {
      ...comic,
      chapters: comic.chapters.filter((chapter) => chapter.id !== adminDeleteChapterTarget.chapter.id),
    };
    persistAdminComic(updatedComic);
    addAdminActivity('chapter_deleted', `Chapter ${adminDeleteChapterTarget.chapter.chapterNumber} dihapus dari ${comic.title}.`);
    setAdminDeleteChapterTarget(null);
  };

  const handleAdminDeletePage = (comic: Comic, chapter: ComicChapter, panelNumber: number) => {
    if (!isAdmin) return;
    const updatedChapter: ComicChapter = {
      ...chapter,
      pages: chapter.pages
        .filter((page) => page.panelNumber !== panelNumber)
        .map((page, index) => ({ ...page, panelNumber: index + 1 })),
      pageCount: Math.max(0, chapter.pages.length - 1),
    };
    persistAdminComic({
      ...comic,
      chapters: comic.chapters.map((item) => item.id === chapter.id ? updatedChapter : item),
    });
  };

  const handleAdminMovePage = (comic: Comic, chapter: ComicChapter, panelNumber: number, direction: -1 | 1) => {
    const currentIndex = chapter.pages.findIndex((page) => page.panelNumber === panelNumber);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= chapter.pages.length) return;
    const pages = [...chapter.pages];
    [pages[currentIndex], pages[nextIndex]] = [pages[nextIndex], pages[currentIndex]];
    const updatedChapter: ComicChapter = {
      ...chapter,
      pages: pages.map((page, index) => ({ ...page, panelNumber: index + 1 })),
      pageCount: pages.length,
    };
    persistAdminComic({
      ...comic,
      chapters: comic.chapters.map((item) => item.id === chapter.id ? updatedChapter : item),
    });
  };

  const adminStats = useMemo(() => ({
    totalComics: adminComics.length,
    totalChapters: adminComics.reduce((count, comic) => count + comic.chapters.length, 0),
    totalUsers: adminUsers.length,
    totalViews: adminComics.reduce((count, comic) => count + comic.views, 0),
  }), [adminComics, adminUsers]);

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
              setSelectedComicDetailId(null);
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
                setSelectedComicDetailId(null);
                setCurrentTab('home');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'home' && !selectedComicId && !selectedComicDetailId
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
                setSelectedComicDetailId(null);
                setCurrentTab('comics');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'comics' && !selectedComicId && !selectedComicDetailId
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
                setSelectedComicDetailId(null);
                setCurrentTab('favorites');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'favorites' && !selectedComicId && !selectedComicDetailId
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
                setSelectedComicDetailId(null);
                setCurrentTab('history');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'history' && !selectedComicId && !selectedComicDetailId
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
                setSelectedComicDetailId(null);
                setCurrentTab('faq');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'faq' && !selectedComicId && !selectedComicDetailId
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
                setSelectedComicDetailId(null);
                setCurrentTab('report');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'report' && !selectedComicId && !selectedComicDetailId
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Lapor Bug
            </button>
            {isAdmin && (
              <button
                id="nav-tab-admin"
                onClick={() => {
                  setSelectedComicId(null);
                  setSelectedComicDetailId(null);
                  setCurrentTab('admin');
                  setAdminSection('dashboard');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'admin'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
            )}
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
              ...(isAdmin ? [{ id: 'admin', label: 'Admin Dashboard' }] : []),
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedComicId(null);
                  setSelectedComicDetailId(null);
                  setCurrentTab(item.id as NavTab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    currentTab === item.id && !selectedComicId && !selectedComicDetailId
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
          {/* VIEW DETAIL: COMIC DETAIL PAGE */}
          {selectedComicDetailId && detailComic ? (
            <motion.div
              key={`detail-${detailComic.titleId}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              id="comic-detail-view"
              className="min-h-screen bg-slate-950 text-slate-100"
            >
              <section className="relative overflow-hidden border-b border-slate-800">
                <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${detailComic.bannerImageUrl})` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/90 to-slate-950" />
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                  <button
                    type="button"
                    onClick={() => setSelectedComicDetailId(null)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                    aria-label="Kembali ke daftar komik"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                  </button>

                  <div className="mt-7 grid gap-6 md:grid-cols-[180px_1fr] md:items-end">
                    <img
                      src={detailComic.coverImageUrl}
                      alt={detailComic.title}
                      className="w-32 sm:w-40 md:w-44 aspect-[3/4] object-cover rounded-2xl border border-white/15 shadow-2xl shadow-blue-950/50"
                      onError={(event) => { event.currentTarget.src = detailComic.bannerImageUrl; }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold">
                          {detailComic.status}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                          <Eye className="w-3.5 h-3.5" /> {detailComic.views.toLocaleString('id-ID')} views
                        </span>
                      </div>
                      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">{detailComic.title}</h1>
                      <p className="mt-3 text-sm text-slate-300">{detailComic.author} <span className="text-slate-600 px-1">•</span> {detailComic.releaseYear}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {detailComic.genre.map((genre) => (
                          <span key={genre} className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs text-slate-200">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <section className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenReaderFromDetail(
                      detailComic.titleId,
                      detailHistory?.chapterNumber || 1,
                      detailHistory ? normalizeResumeState(detailHistory) : undefined
                    )}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/30 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    {detailHistory ? 'Lanjutkan Membaca' : 'Mulai Membaca'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(detailComic)}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${detailFavorite ? 'border-rose-500/50 bg-rose-500/15 text-rose-300' : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-rose-400/50 hover:text-rose-300'}`}
                    aria-pressed={detailFavorite}
                  >
                    <Heart className={`w-4 h-4 ${detailFavorite ? 'fill-current' : ''}`} />
                    {detailFavorite ? '♥ Favorit' : '♡ Favorit'}
                  </button>
                </section>

                {detailHistory && (
                  <section className="p-4 sm:p-5 rounded-2xl bg-blue-950/30 border border-blue-500/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-blue-300 font-black">Lanjutkan Membaca</p>
                        <h2 className="mt-1 text-base font-bold text-white">Bab {detailHistory.chapterNumber}</h2>
                        <p className="mt-1 text-xs text-slate-400">
                          {detailComic.chapters.find((chapter) => chapter.chapterNumber === detailHistory.chapterNumber)?.title || 'Chapter terakhir dibaca'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Progress</span><span>{Math.round(detailHistory.progress || 0)}%</span></div>
                          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, detailHistory.progress || 0))}%` }} /></div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenReaderFromDetail(
                            detailComic.titleId,
                            detailHistory.chapterNumber,
                            normalizeResumeState(detailHistory)
                          )}
                          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors cursor-pointer"
                        >
                          Lanjutkan
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                <section className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h2 className="text-lg font-bold text-white">Tentang Komik</h2>
                      <span className="text-xs text-slate-500">{detailComic.chapters.length} chapter</span>
                    </div>
                    <p className={`text-sm leading-7 text-slate-300 ${!isDescriptionExpanded ? 'line-clamp-4' : ''}`}>{detailComic.description}</p>
                    {detailComic.description.length > 220 && (
                      <button
                        type="button"
                        onClick={() => setIsDescriptionExpanded((expanded) => !expanded)}
                        className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        {isDescriptionExpanded ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya'}
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h2 className="text-lg font-bold text-white">Daftar Chapter</h2>
                      <span className="text-xs text-slate-500">Pilih chapter untuk membaca</span>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 divide-y divide-slate-800 overflow-hidden">
                      {detailComic.chapters.length === 0 ? (
                        <p className="p-6 text-sm text-slate-400 text-center">Belum ada chapter tersedia.</p>
                      ) : detailComic.chapters.map((chapter) => {
                        const isRead = detailHistory?.chapterNumber === chapter.chapterNumber;
                        const progress = isRead ? Math.min(100, Math.max(0, detailHistory?.progress || 0)) : 0;
                        return (
                          <div key={chapter.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${isRead ? 'bg-blue-950/25' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-blue-300">Chapter {chapter.chapterNumber}</span>
                                {isRead && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300"><BookMarked className="w-3 h-3" /> Dibaca</span>}
                              </div>
                              <h3 className="mt-1 text-sm font-semibold text-white truncate">{chapter.title}</h3>
                              <p className="mt-1 text-[11px] text-slate-500 inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {chapter.releaseDate}</p>
                              {isRead && <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden max-w-xs"><div className="h-full bg-blue-500" style={{ width: `${progress}%` }} /></div>}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenReaderFromDetail(detailComic.titleId, chapter.chapterNumber)}
                              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" /> Baca
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <SocialSection
                  comicId={detailComic.titleId}
                  comicTitle={detailComic.title}
                  comicCover={detailComic.coverImageUrl}
                  genre={detailComic.genre}
                  onRequireLogin={() => setIsLoginModalOpen(true)}
                />
              </div>
            </motion.div>
          ) : null}

          {/* VIEW ADMIN: DASHBOARD */}
          {!selectedComicId && !selectedComicDetailId && currentTab === 'admin' && (
            <motion.div
              key="tab-admin"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              id="admin-view"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
            >
              {!isAdmin ? (
                <div className="max-w-xl mx-auto rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center shadow-2xl">
                  <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
                  <h1 className="mt-5 text-2xl font-black text-white">Anda tidak memiliki akses ke halaman admin.</h1>
                  <p className="mt-3 text-sm text-slate-300">Akses admin terbatas untuk akun dengan role administrator. Silakan masuk dengan akun admin untuk melanjutkan.</p>
                </div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
                  <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-blue-950/10">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black">A</div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-blue-300 font-bold">Admin</p>
                        <h2 className="text-base font-bold text-white">Control Center</h2>
                      </div>
                    </div>

                    <nav className="space-y-2">
                      {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'comics', label: 'Komik', icon: NotebookText },
                        { id: 'chapters', label: 'Chapter', icon: FileText },
                        { id: 'users', label: 'User', icon: Users },
                        { id: 'reports', label: 'Laporan', icon: BarChart3 },
                        { id: 'settings', label: 'Settings', icon: Settings },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setAdminSection(item.id as AdminSection)}
                            className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-all cursor-pointer ${
                              adminSection === item.id
                                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </button>
                        );
                      })}
                    </nav>
                  </aside>

                  <div className="space-y-6">
                    {adminSection === 'dashboard' && (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-300 font-black">Overview</p>
                            <h1 className="text-3xl font-black text-white">Dashboard</h1>
                          </div>
                          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">System Online</div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          {[
                            { label: 'Total Komik', value: adminStats.totalComics, icon: NotebookText, tone: 'text-blue-300' },
                            { label: 'Total Chapter', value: adminStats.totalChapters, icon: FileText, tone: 'text-violet-300' },
                            { label: 'Total User', value: adminStats.totalUsers, icon: Users, tone: 'text-emerald-300' },
                            { label: 'Total Views', value: adminStats.totalViews.toLocaleString('id-ID'), icon: Eye, tone: 'text-amber-300' },
                          ].map((stat) => {
                            const Icon = stat.icon;
                            return (
                              <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-slate-400">{stat.label}</p>
                                  <Icon className={`w-4 h-4 ${stat.tone}`} />
                                </div>
                                <p className="mt-4 text-3xl font-black text-white">{stat.value}</p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-lg font-bold text-white">Komik Terbaru</h2>
                              <span className="text-[11px] text-slate-500">{adminComics.length} data</span>
                            </div>
                            <div className="space-y-3">
                              {adminComics.slice(0, 4).map((comic) => (
                                <div key={comic.titleId} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                                  <img src={comic.coverImageUrl} alt={comic.title} className="w-12 h-16 rounded-lg object-cover" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-white">{comic.title}</p>
                                    <p className="text-xs text-slate-400">{comic.author}</p>
                                  </div>
                                  <span className="text-[10px] rounded-full bg-blue-500/10 px-2 py-1 text-blue-300">{comic.chapters.length} Bab</span>
                                </div>
                              ))}
                              {adminComics.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">Belum ada data komik.</div>}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-lg font-bold text-white">Aktivitas Terbaru</h2>
                              <span className="text-[11px] text-slate-500">Log admin</span>
                            </div>
                            <div className="space-y-3">
                              {adminActivity.map((activity) => (
                                <div key={activity.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] uppercase tracking-[0.15em] text-blue-300 font-black">{activity.type}</span>
                                    <span className="text-[10px] text-slate-500">{new Date(activity.timestamp).toLocaleDateString('id-ID')}</span>
                                  </div>
                                  <p className="mt-2 text-sm text-slate-200">{activity.message}</p>
                                </div>
                              ))}
                              {adminActivity.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">Tidak ada aktivitas.</div>}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {adminSection === 'comics' && (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-300 font-black">Catalog</p>
                            <h1 className="text-3xl font-black text-white">Kelola Komik</h1>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminEditingComicId(null);
                              setAdminComicDraft({
                                title: '',
                                author: '',
                                genre: '',
                                description: '',
                                coverImageUrl: '',
                                bannerImageUrl: '',
                                releaseYear: '2026',
                                status: 'Sedang Rilis',
                                category: 'newest',
                              });
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            Tambah Komik
                          </button>
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="md:col-span-2 xl:col-span-2">
                              <label className="block text-xs font-semibold text-slate-400 mb-2">Cari komik</label>
                              <input
                                value={adminComicSearch}
                                onChange={(event) => setAdminComicSearch(event.target.value)}
                                placeholder="Cari judul, author, genre..."
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 mb-2">Status</label>
                              <select
                                value={adminComicStatus}
                                onChange={(event) => setAdminComicStatus(event.target.value as 'Semua' | Comic['status'])}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                              >
                                <option value="Semua">Semua</option>
                                <option value="Tamat">Tamat</option>
                                <option value="Sedang Rilis">Sedang Rilis</option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <span className="text-xs text-slate-400">Urutkan</span>
                            <select
                              value={adminComicSort}
                              onChange={(event) => setAdminComicSort(event.target.value as 'newest' | 'oldest' | 'az' | 'za')}
                              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                            >
                              <option value="newest">Terbaru</option>
                              <option value="oldest">Terlama</option>
                              <option value="az">A-Z</option>
                              <option value="za">Z-A</option>
                            </select>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                            <div className="space-y-3">
                              {adminList.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">Tidak ada komik yang cocok dengan filter saat ini.</div>
                              ) : (
                                <div className="space-y-3">
                                  {adminList.map((comic) => (
                                    <div key={comic.titleId} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                                      <img src={comic.coverImageUrl} alt={comic.title} className="w-16 h-20 rounded-lg object-cover" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="truncate font-bold text-white">{comic.title}</p>
                                            <p className="text-xs text-slate-400">{comic.author}</p>
                                          </div>
                                          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-300">{comic.status}</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                                          <span>{comic.genre.join(', ')}</span>
                                          <span>•</span>
                                          <span>{comic.releaseYear}</span>
                                          <span>•</span>
                                          <span>{comic.views.toLocaleString('id-ID')} views</span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          <button type="button" onClick={() => handleAdminEditComic(comic)} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10 cursor-pointer"><Pencil className="w-3 h-3 inline mr-1" />Edit</button>
                                          <button type="button" onClick={() => { setAdminSelectedComicId(comic.titleId); setAdminSection('chapters'); }} className="rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20 cursor-pointer">Manage Chapters</button>
                                          <button type="button" onClick={() => handleAdminDeleteComic(comic)} className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 cursor-pointer"><Trash2 className="w-3 h-3 inline mr-1" />Delete</button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-white">{adminEditingComicId ? 'Edit Komik' : 'Tambah Komik'}</h3>
                              </div>
                              <div className="grid gap-3">
                                <input value={adminComicDraft.title} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Judul" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                                <input value={adminComicDraft.author} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, author: event.target.value }))} placeholder="Author" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                                <input value={adminComicDraft.genre} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, genre: event.target.value }))} placeholder="Genre (pisahkan dengan koma)" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                                <textarea value={adminComicDraft.description} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, description: event.target.value }))} placeholder="Deskripsi" rows={4} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <input value={adminComicDraft.coverImageUrl} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, coverImageUrl: event.target.value }))} placeholder="Cover URL" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                                  <input value={adminComicDraft.bannerImageUrl} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, bannerImageUrl: event.target.value }))} placeholder="Banner URL" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <input value={adminComicDraft.releaseYear} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, releaseYear: event.target.value }))} placeholder="Tahun" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                                  <select value={adminComicDraft.status} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, status: event.target.value as Comic['status'] }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                                    <option value="Sedang Rilis">Sedang Rilis</option>
                                    <option value="Tamat">Tamat</option>
                                  </select>
                                  <select value={adminComicDraft.category} onChange={(event) => setAdminComicDraft((prev) => ({ ...prev, category: event.target.value as Comic['category'] }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                                    <option value="newest">Baru</option>
                                    <option value="oldest">Klasik</option>
                                    <option value="popular">Populer</option>
                                  </select>
                                </div>
                                <button type="button" onClick={handleAdminSubmitComic} className="mt-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white cursor-pointer">{adminEditingComicId ? 'Simpan Perubahan' : 'Simpan Komik'}</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {adminSection === 'chapters' && selectedAdminComic && (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-300 font-black">Management</p>
                            <h1 className="text-3xl font-black text-white">Kelola Chapter</h1>
                          </div>
                          <select value={adminSelectedComicId} onChange={(event) => setAdminSelectedComicId(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
                            {adminComics.map((comic) => (
                              <option key={comic.titleId} value={comic.titleId}>{comic.title}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                            <div className="mb-4 flex items-center justify-between">
                              <h2 className="text-lg font-bold text-white">{selectedAdminComic.title}</h2>
                              <span className="text-xs text-slate-400">{selectedAdminComic.chapters.length} chapter</span>
                            </div>
                            <div className="space-y-3">
                              {selectedAdminComic.chapters.map((chapter) => (
                                <div key={chapter.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-[11px] uppercase tracking-[0.15em] text-blue-300 font-black">Chapter {chapter.chapterNumber}</p>
                                      <h3 className="mt-1 text-base font-bold text-white">{chapter.title}</h3>
                                      <p className="mt-1 text-xs text-slate-400">{chapter.releaseDate}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[11px]">
                                      <span className="rounded-full bg-white/5 px-2 py-1 text-slate-300">{chapter.pageCount ?? chapter.pages.length} halaman</span>
                                      <span className="rounded-full bg-violet-500/10 px-2 py-1 text-violet-300">{chapter.pages.length > 0 ? 'Ready' : 'Empty'}</span>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => handleAdminEditChapter(selectedAdminComic, chapter)} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 cursor-pointer"><Pencil className="w-3 h-3 inline mr-1" />Edit</button>
                                    <button type="button" onClick={() => setAdminDeleteChapterTarget({ comicId: selectedAdminComic.titleId, chapter })} className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 cursor-pointer"><Trash2 className="w-3 h-3 inline mr-1" />Delete</button>
                                    <button type="button" onClick={() => setAdminSelectedChapterId(chapter.id)} className="rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 cursor-pointer"><Layers3 className="w-3 h-3 inline mr-1" />Manage Pages</button>
                                  </div>
                                </div>
                              ))}
                              {selectedAdminComic.chapters.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">Belum ada chapter untuk komik ini.</div>}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <h3 className="text-base font-bold text-white">Tambah Chapter</h3>
                            <div className="mt-4 space-y-3">
                              <input value={adminChapterDraft.chapterNumber} onChange={(event) => setAdminChapterDraft((prev) => ({ ...prev, chapterNumber: event.target.value }))} placeholder="Chapter Number" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                              <input value={adminChapterDraft.title} onChange={(event) => setAdminChapterDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Judul Chapter" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                              <input type="date" value={adminChapterDraft.releaseDate} onChange={(event) => setAdminChapterDraft((prev) => ({ ...prev, releaseDate: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                              <div className="rounded-2xl border border-dashed border-blue-500/30 bg-blue-500/5 p-3 text-xs text-slate-300">
                                <p className="font-bold text-blue-300">CBZ Upload — Supabase Storage</p>
                                <p className="mt-1">Upload CBZ akan diekstrak di browser, diurutkan natural, lalu gambar disimpan ke Supabase Storage.</p>
                                <p className="mt-2">Metadata kompatibel: <span className="font-semibold text-white">sourceType</span>, <span className="font-semibold text-white">pageCount</span>, <span className="font-semibold text-white">storagePath</span>, <span className="font-semibold text-white">archiveName</span>.</p>
                                <input type="file" accept=".cbz,application/zip" onChange={(event) => setAdminCbzFile(event.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
                                {adminCbzFile && <p className="mt-2 text-blue-200">File: {adminCbzFile.name}</p>}
                              </div>
                              <button type="button" onClick={handleAdminAddChapter} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white cursor-pointer">Simpan Chapter</button>
                              <button type="button" disabled={!adminCbzFile || adminCbzUploading} onClick={handleAdminCbzUpload} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">{adminCbzUploading ? 'Mengunggah CBZ...' : 'Upload CBZ dan Buat Chapter'}</button>
                              {adminChapterMessage && <p className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">{adminChapterMessage}</p>}
                            </div>
                          </div>
                        </div>

                        {adminSelectedChapterId && selectedAdminComic.chapters.some((chapter) => chapter.id === adminSelectedChapterId) && (
                          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                            {(() => {
                              const selectedChapter = selectedAdminComic.chapters.find((chapter) => chapter.id === adminSelectedChapterId)!;
                              return (
                                <>
                                  <div className="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                      <p className="text-[11px] uppercase tracking-[0.15em] text-blue-300 font-black">Manage Pages</p>
                                      <h2 className="text-lg font-bold text-white">Chapter {selectedChapter.chapterNumber} · {selectedChapter.title}</h2>
                                    </div>
                                    <button type="button" onClick={() => setAdminSelectedChapterId(null)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 cursor-pointer">Tutup</button>
                                  </div>
                                  {selectedChapter.pages.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">Belum ada halaman. Upload CBZ belum tersedia.</div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                                      {selectedChapter.pages.map((page) => (
                                        <div key={page.panelNumber} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                                          <img src={page.imageUrl || selectedAdminComic.coverImageUrl} alt={`Page ${page.panelNumber}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                                          <div className="mt-2 flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-slate-300">Page {page.panelNumber}</span>
                                            <div className="flex gap-1">
                                              <button type="button" disabled={page.panelNumber === 1} onClick={() => handleAdminMovePage(selectedAdminComic, selectedChapter, page.panelNumber, -1)} className="text-[10px] font-bold text-blue-300 disabled:opacity-30 cursor-pointer" aria-label={`Geser page ${page.panelNumber} ke atas`}>↑</button>
                                              <button type="button" disabled={page.panelNumber === selectedChapter.pages.length} onClick={() => handleAdminMovePage(selectedAdminComic, selectedChapter, page.panelNumber, 1)} className="text-[10px] font-bold text-blue-300 disabled:opacity-30 cursor-pointer" aria-label={`Geser page ${page.panelNumber} ke bawah`}>↓</button>
                                              <button type="button" onClick={() => handleAdminDeletePage(selectedAdminComic, selectedChapter, page.panelNumber)} className="text-[10px] font-bold text-rose-300 cursor-pointer">Hapus</button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {adminSection === 'users' && (
                      <div className="space-y-6">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-blue-300 font-black">User</p>
                          <h1 className="text-3xl font-black text-white">User Management</h1>
                        </div>
                        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                          <div className="space-y-3">
                            {adminUsers.map((user) => (
                              <div key={user.userId} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                                <div className="flex items-center gap-3">
                                  <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full border border-slate-700" />
                                  <div>
                                    <p className="font-bold text-white">{user.displayName}</p>
                                    <p className="text-xs text-slate-400">@{user.username}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${user.role === 'admin' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-blue-500/10 text-blue-300'}`}>{user.role || 'user'}</span>
                                  <p className="mt-1 text-[10px] text-slate-500">{new Date(user.createdAt).toLocaleDateString('id-ID')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {adminSection === 'reports' && (
                      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center">
                        <BarChart3 className="w-12 h-12 text-slate-500 mx-auto" />
                        <h1 className="mt-4 text-2xl font-black text-white">Laporan</h1>
                        <p className="mt-3 text-sm text-slate-300">Fitur laporan admin akan terus dikembangkan. Saat ini statusnya masih <span className="font-semibold text-blue-300">Coming Soon</span>.</p>
                      </div>
                    )}

                    {adminSection === 'settings' && (
                      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center">
                        <Settings className="w-12 h-12 text-slate-500 mx-auto" />
                        <h1 className="mt-4 text-2xl font-black text-white">Settings</h1>
                        <p className="mt-3 text-sm text-slate-300">Pengaturan admin dan keamanan akan ditambahkan di tahap berikutnya. Saat ini masih dalam status <span className="font-semibold text-blue-300">Coming Soon</span>.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {adminDeleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                  <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-rose-300 font-black">Konfirmasi Hapus</p>
                    <h3 className="mt-3 text-2xl font-black text-white">Hapus komik ini?</h3>
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="font-bold text-white">{adminDeleteTarget.title}</p>
                      <p className="mt-2 text-xs text-slate-400">Jumlah chapter: {adminDeleteTarget.chapters.length}</p>
                    </div>
                    <p className="mt-4 text-sm text-slate-300">Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="mt-6 flex justify-end gap-3">
                      <button type="button" onClick={() => setAdminDeleteTarget(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer">Batal</button>
                      <button type="button" onClick={confirmAdminDeleteComic} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500 cursor-pointer">Hapus</button>
                    </div>
                  </div>
                </div>
              )}

              {adminEditingChapterId && selectedAdminComic && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                  <div className="w-full max-w-md rounded-3xl border border-blue-500/30 bg-slate-900 p-6 shadow-2xl">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-blue-300 font-black">Edit Chapter</p>
                    <h3 className="mt-3 text-2xl font-black text-white">Perbarui metadata chapter</h3>
                    <div className="mt-5 grid gap-3">
                      <input value={adminChapterEditDraft.title} onChange={(event) => setAdminChapterEditDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Judul Chapter" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" />
                      <input type="date" value={adminChapterEditDraft.releaseDate} onChange={(event) => setAdminChapterEditDraft((prev) => ({ ...prev, releaseDate: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <button type="button" onClick={() => setAdminEditingChapterId(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 cursor-pointer">Batal</button>
                      <button type="button" onClick={handleAdminSaveChapterEdit} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white cursor-pointer">Simpan</button>
                    </div>
                  </div>
                </div>
              )}

              {adminDeleteChapterTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                  <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-rose-300 font-black">Konfirmasi Hapus</p>
                    <h3 className="mt-3 text-2xl font-black text-white">Hapus Chapter {adminDeleteChapterTarget.chapter.chapterNumber}?</h3>
                    <p className="mt-4 text-sm text-slate-300">Jumlah halaman: {adminDeleteChapterTarget.chapter.pageCount ?? adminDeleteChapterTarget.chapter.pages.length} halaman</p>
                    <p className="mt-3 text-sm text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="mt-6 flex justify-end gap-3">
                      <button type="button" onClick={() => setAdminDeleteChapterTarget(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 cursor-pointer">Batal</button>
                      <button type="button" onClick={confirmAdminDeleteChapter} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white cursor-pointer">Hapus</button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW A: DETAIL / WEBTOON READER */}
          {selectedComicId && activeComic ? (
            <motion.div
              key={`reader-${selectedComicId}-${selectedChapterNumber}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              id="comic-reader-view"
              className={`min-h-screen ${readerTheme === 'light' ? 'bg-stone-100 text-slate-950' : 'bg-black text-white'}`}
            >
              {/* Thin reading progress indicator */}
              <div className="fixed top-0 left-0 right-0 z-[70] h-0.5 bg-white/5 pointer-events-none">
                <div
                  className="h-full bg-blue-500 transition-[width] duration-150"
                  style={{ width: `${readerProgress}%` }}
                />
              </div>

              {/* Immersive reader controls. They fade while scrolling, like a dedicated reader. */}
              <div
                className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
                  readerControlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                }`}
              >
                <div className="bg-black/75 backdrop-blur-xl border-b border-white/10 shadow-2xl">
                  <div className="max-w-5xl mx-auto h-14 px-3 sm:px-5 flex items-center justify-between gap-3">
                    <button
                      id="btn-back-to-comics"
                      onClick={() => setSelectedComicId(null)}
                      className="inline-flex items-center gap-2 min-w-0 text-sm font-semibold text-white/90 hover:text-white px-2 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      <span className="truncate hidden sm:inline">{activeComic.title}</span>
                      <span className="truncate sm:hidden">Kembali</span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        id="btn-prev-chapter-top"
                        disabled={selectedChapterNumber <= 1}
                        onClick={() => {
                          const next = Math.max(1, selectedChapterNumber - 1);
                          setSelectedChapterNumber(next);
                          recordReadingSession(activeComic, next);
                        }}
                        className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Bab sebelumnya"
                        title="Bab sebelumnya"
                      >
                        ←
                      </button>

                      <button
                        id="btn-chapter-selector-reader"
                        onClick={() => document.getElementById('reader-chapter-menu')?.classList.toggle('hidden')}
                        className="max-w-[150px] sm:max-w-[220px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white truncate cursor-pointer"
                        title="Pilih bab"
                      >
                        Bab {selectedChapterNumber} · {activeChapter?.title || ''}
                      </button>

                      <button
                        id="btn-next-chapter-top"
                        disabled={selectedChapterNumber >= activeComic.chapters.length}
                        onClick={() => {
                          const next = Math.min(activeComic.chapters.length, selectedChapterNumber + 1);
                          setSelectedChapterNumber(next);
                          recordReadingSession(activeComic, next);
                        }}
                        className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Bab berikutnya"
                        title="Bab berikutnya"
                      >
                        →
                      </button>

                      <button
                        id="btn-reader-theme"
                        onClick={() => setReaderTheme(readerTheme === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                        aria-label="Ganti tema reader"
                        title="Ganti tema"
                      >
                        {readerTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div id="reader-chapter-menu" className="hidden border-t border-white/10 bg-black/90">
                    <div className="max-w-5xl mx-auto px-3 sm:px-5 py-3 flex gap-2 overflow-x-auto">
                      {activeComic.chapters.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            setSelectedChapterNumber(ch.chapterNumber);
                            recordReadingSession(activeComic, ch.chapterNumber);
                            document.getElementById('reader-chapter-menu')?.classList.add('hidden');
                          }}
                          className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                            selectedChapterNumber === ch.chapterNumber
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                          }`}
                        >
                          Bab {ch.chapterNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reader start / chapter info */}
              <section className="pt-20 pb-8 px-4 text-center">
                <div className="max-w-2xl mx-auto">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-blue-400 font-black mb-2">
                    Shiroko Comics · Vertical Reader
                  </p>
                  <h1 className="text-xl sm:text-3xl font-black tracking-tight">{activeChapter?.title || 'Bab Komik'}</h1>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400">
                    {activeComic.title} · {activeChapter?.pages.length || 0} panel
                  </p>
                  <div className="mt-5 mx-auto max-w-md h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>
              </section>

              {/* TRUE CONTINUOUS VERTICAL CANVAS */}
              <div
                id="webtoon-scroll-canvas"
                className="w-full max-w-[760px] mx-auto bg-black overflow-hidden shadow-2xl"
                onClick={() => setReaderControlsVisible((v) => !v)}
              >
                {activeChapter?.pages.map((page, index) => (
                  <figure
                    key={page.panelNumber}
                    id={`comic-panel-${page.panelNumber}`}
                    className="relative m-0 p-0 bg-black"
                  >
                    <img
                      src={page.imageUrl || activeComic.coverImageUrl}
                      alt={`Panel ${page.panelNumber} - ${activeComic.title}`}
                      className="block w-full h-auto max-w-full select-none"
                      loading={index < 2 ? "eager" : "lazy"}
                      fetchPriority={index < 2 ? "high" : "auto"}
                      decoding="async"
                      draggable={false}
                      referrerPolicy="no-referrer"
                    />
                  </figure>
                ))}
              </div>

              {/* Reader footer */}
              <section className="max-w-[760px] mx-auto px-4 py-10 text-center">
                <div className={`rounded-2xl border p-6 ${
                  readerTheme === 'light'
                    ? 'bg-white border-stone-200 text-slate-900'
                    : 'bg-slate-950 border-slate-800 text-white'
                }`}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tamat Bab {activeChapter?.chapterNumber}
                  </div>
                  <h2 className="mt-3 text-lg font-black">{activeChapter?.title}</h2>
                  <p className="mt-1 text-xs text-slate-400">Kamu sudah sampai di akhir bab ini.</p>

                  <div className="mt-5 flex items-center justify-center gap-2 sm:gap-3">
                    <button
                      id="btn-prev-chapter-bottom"
                      disabled={selectedChapterNumber <= 1}
                      onClick={() => {
                        const next = Math.max(1, selectedChapterNumber - 1);
                        setSelectedChapterNumber(next);
                        recordReadingSession(activeComic, next);
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
                    >
                      ← Sebelumnya
                    </button>
                    <button
                      id="btn-next-chapter-bottom"
                      disabled={selectedChapterNumber >= activeComic.chapters.length}
                      onClick={() => {
                        const next = Math.min(activeComic.chapters.length, selectedChapterNumber + 1);
                        setSelectedChapterNumber(next);
                        recordReadingSession(activeComic, next);
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-500 cursor-pointer shadow-lg shadow-blue-500/20"
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>
              </section>

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
        {!selectedComicId && !selectedComicDetailId && currentTab === 'home' && (
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

            {/* Continue Reading */}
            {continueItem && continueComic && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        Lanjutkan Membaca
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Lanjut dari tempat terakhir kamu membaca
                      </p>
                    </div>

                    <Clock className="w-5 h-5 text-blue-400 shrink-0" />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleOpenReader(
                        continueComic.titleId,
                        continueItem.chapterNumber,
                        normalizeResumeState(continueItem)
                      )
                    }
                    className="w-full text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-slate-950 shrink-0">
                        <img
                          src={continueComic.coverImageUrl}
                          alt={continueComic.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="text-[10px] font-semibold text-white bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-1">
                            Bab {continueItem.chapterNumber}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {continueComic.title}
                        </h3>

                        <p className="text-xs text-slate-400 mt-1">
                          {continueChapter?.title || `Bab ${continueItem.chapterNumber}`}
                        </p>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="text-slate-400">
                              Progress membaca
                            </span>
                            <span className="text-blue-400 font-semibold">
                              {Math.round(continueProgress)}%
                            </span>
                          </div>

                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{
                                width: `${continueProgress}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                          <BookOpen className="w-3.5 h-3.5" />
                          Lanjutkan
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            )}

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
                {catalogComics.map((comic) => (
                  <div
                    key={comic.titleId}
                    id={`home-card-${comic.titleId}`}
                    onClick={() => handleOpenComicDetail(comic.titleId)}
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
        {!selectedComicId && !selectedComicDetailId && currentTab === 'comics' && (
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

              {/* Search, filter, dan sort controls */}
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-comic-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari komik berdasarkan judul, author, atau genre..."
                    aria-label="Cari komik berdasarkan judul, author, atau genre"
                    className="w-full pl-10 pr-16 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="sr-only">Urutkan komik</span>
                    <select
                      id="sort-comic-select"
                      value={selectedSort}
                      onChange={(e) => setSelectedSort(e.target.value as ComicSort)}
                      className="w-full lg:w-auto min-w-40 px-3 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                      aria-label="Urutkan komik"
                    >
                      <option value="newest">Terbaru</option>
                      <option value="oldest">Terlama</option>
                      <option value="popular">Terpopuler</option>
                      <option value="az">A-Z</option>
                      <option value="za">Z-A</option>
                    </select>
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">Genre</span>
                  <div className="flex flex-wrap gap-1.5">
                  {allGenres.map((g) => (
                    <button
                      type="button"
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

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-400">Status</span>
                    {(['Semua', 'Tamat', 'Sedang Rilis'] as const).map((status) => (
                      <button
                        type="button"
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedStatus === status ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={resetComicFilters}
                    className="sm:ml-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 border border-slate-700 hover:border-blue-500 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Comic Grid */}
            <p className="text-xs text-slate-400">
              Menampilkan <span className="font-bold text-slate-200">{filteredComics.length}</span> dari {catalogComics.length} komik
            </p>
            {filteredComics.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
                <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-white">Tidak ada komik yang sesuai</p>
                <p className="text-xs text-slate-400">
                  Coba ubah kata kunci atau reset filter yang sedang aktif.
                </p>
                <button
                  onClick={() => {
                    resetComicFilters();
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
                    onClick={() => handleOpenComicDetail(comic.titleId)}
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
        {!selectedComicId && !selectedComicDetailId && currentTab === 'favorites' && (
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
        {!selectedComicId && !selectedComicDetailId && currentTab === 'history' && (
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
        {!selectedComicId && !selectedComicDetailId && currentTab === 'faq' && (
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
        {!selectedComicId && !selectedComicDetailId && currentTab === 'report' && (
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
                setSelectedComicDetailId(null);
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
                setSelectedComicDetailId(null);
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
