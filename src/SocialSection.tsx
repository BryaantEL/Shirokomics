import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { CommentItem, RatingItem } from './typesAndData';
import { Star, MessageSquare, Heart, CornerDownRight, Send, AlertCircle, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SocialSectionProps {
  comicId: string;
  comicTitle: string;
  comicCover: string;
  genre: string[];
  onRequireLogin: () => void;
}

export const SocialSection: React.FC<SocialSectionProps> = ({
  comicId,
  comicTitle,
  comicCover,
  genre,
  onRequireLogin,
}) => {
  const { currentUser, isLoggedIn } = useAuth();

  // Ratings state
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  // Favorites state
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [favCount, setFavCount] = useState<number>(0);

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 1. Subscribe to ratings for this comic
  useEffect(() => {
    const q = query(collection(db, 'ratings'), where('comicId', '==', comicId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: RatingItem[] = [];
        snapshot.forEach((d) => list.push(d.data() as RatingItem));
        setRatings(list);

        if (currentUser) {
          const found = list.find((r) => r.userId === currentUser.userId);
          setUserRating(found ? found.score : 0);
        }
      },
      (error) => {
        console.warn('Ratings sync (offline/cached mode):', error.message);
      }
    );
    return () => unsubscribe();
  }, [comicId, currentUser]);

  // 2. Subscribe to favorites for this comic & check if current user favorited
  useEffect(() => {
    const q = query(collection(db, 'favorites'), where('comicId', '==', comicId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFavCount(snapshot.size);
        if (currentUser) {
          const hasFav = snapshot.docs.some((doc) => doc.data().userId === currentUser.userId);
          setIsFavorite(hasFav);
        } else {
          setIsFavorite(false);
        }
      },
      (error) => {
        console.warn('Favorites count sync (offline/cached mode):', error.message);
      }
    );
    return () => unsubscribe();
  }, [comicId, currentUser]);

  // 3. Subscribe to comments for this comic
  useEffect(() => {
    const q = query(collection(db, 'comments'), where('comicId', '==', comicId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CommentItem[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<CommentItem, 'id'>) });
        });
        // Sort in-memory chronologically
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setComments(list);
      },
      (error) => {
        console.warn('Comments sync (offline/cached mode):', error.message);
      }
    );
    return () => unsubscribe();
  }, [comicId]);

  // Rating handlers
  const handleRate = async (score: number) => {
    if (!isLoggedIn || !currentUser) {
      onRequireLogin();
      return;
    }
    setUserRating(score);
    try {
      const ratingDocId = `${comicId}_${currentUser.userId}`;
      await setDoc(doc(db, 'ratings', ratingDocId), {
        comicId,
        userId: currentUser.userId,
        username: currentUser.username,
        score,
        updatedAt: Date.now(),
      });
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {
      console.error('Error rating:', e);
    }
  };

  // Favorite toggle handler
  const handleToggleFavorite = async () => {
    if (!isLoggedIn || !currentUser) {
      onRequireLogin();
      return;
    }
    const favDocId = `${currentUser.userId}_${comicId}`;
    try {
      if (isFavorite) {
        await deleteDoc(doc(db, 'favorites', favDocId));
      } else {
        await setDoc(doc(db, 'favorites', favDocId), {
          comicId,
          userId: currentUser.userId,
          comicTitle,
          comicCover,
          genre,
          addedAt: Date.now(),
        });
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.75 },
        });
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  // Add root comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !currentUser) {
      onRequireLogin();
      return;
    }
    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        comicId,
        userId: currentUser.userId,
        username: currentUser.username,
        content: newCommentText.trim(),
        parentId: null,
        createdAt: Date.now(),
      });
      setNewCommentText('');
    } catch (e) {
      console.error('Error posting comment:', e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Add reply
  const handleAddReply = async (parentId: string) => {
    if (!isLoggedIn || !currentUser) {
      onRequireLogin();
      return;
    }
    if (!replyText.trim()) return;

    try {
      await addDoc(collection(db, 'comments'), {
        comicId,
        userId: currentUser.userId,
        username: currentUser.username,
        content: replyText.trim(),
        parentId,
        createdAt: Date.now(),
      });
      setReplyText('');
      setReplyToId(null);
    } catch (e) {
      console.error('Error posting reply:', e);
    }
  };

  // Compute average rating
  const avgRating = ratings.length > 0 
    ? (ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length).toFixed(1)
    : '5.0';

  const rootComments = comments.filter((c) => !c.parentId);

  return (
    <div id="social-features-wrapper" className="space-y-8">
      {/* 1. Baris Aksi Sosial (Rating & Favorit) */}
      <div 
        id="comic-social-action-card"
        className="p-5 md:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        {/* Rating Section */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl font-extrabold text-blue-400">{avgRating}</span>
            <div>
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      Number(avgRating) >= star 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Rata-rata dari {ratings.length} penilaian pembaca
              </p>
            </div>
          </div>

          {/* Interactive Rating for Logged In User */}
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <p className="text-xs font-medium text-slate-300 mb-1.5">
              {isLoggedIn ? 'Beri Nilai Komik Ini (1 - 5 Bintang):' : 'Beri Nilai (Wajib Masuk Akun):'}
            </p>
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    id={`btn-rate-star-${star}`}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRate(star)}
                    className="p-1 rounded hover:scale-125 transition-transform cursor-pointer"
                    title={`Beri ${star} Bintang`}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        (hoverRating || userRating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600 hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
                {userRating > 0 && (
                  <span className="text-xs text-emerald-400 ml-2 font-medium">
                    (Pilihanmu: {userRating} ★)
                  </span>
                )}
              </div>
            ) : (
              <button
                id="btn-login-to-rate"
                type="button"
                onClick={onRequireLogin}
                className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 hover:underline mt-0.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-blue-400" />
                <span>Masuk dengan Username untuk memberi rating</span>
              </button>
            )}
          </div>
        </div>

        {/* Favorite Button */}
        <div className="w-full md:w-auto flex items-center gap-3">
          {isLoggedIn ? (
            <button
              id="btn-toggle-favorite"
              type="button"
              onClick={handleToggleFavorite}
              className={`w-full md:w-auto px-5 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg ${
                isFavorite
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-white text-white' : 'text-slate-300'}`} />
              <span>{isFavorite ? 'Tersimpan di Favorit' : 'Simpan / Favorit'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 font-semibold">
                {favCount}
              </span>
            </button>
          ) : (
            <button
              id="btn-login-to-favorite"
              type="button"
              onClick={onRequireLogin}
              className="w-full md:w-auto px-5 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            >
              <Heart className="w-5 h-5 text-slate-400" />
              <span>Masuk untuk Menyimpan Favorit</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Sistem Diskusi Komentar & Balasan */}
      <div 
        id="comments-section"
        className="p-5 md:p-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Diskusi & Komentar Pembaca ({comments.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Komunitas Aktif Shiroko</span>
        </div>

        {/* Form Tulis Komentar Utama */}
        {isLoggedIn && currentUser ? (
          <form onSubmit={handleAddComment} className="mb-8">
            <div className="flex gap-3">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-10 h-10 rounded-full border border-blue-500/40 shrink-0 bg-slate-800"
              />
              <div className="flex-1 space-y-2">
                <div className="text-xs text-slate-400 font-medium">
                  Komentar sebagai <span className="text-blue-400 font-semibold">@{currentUser.username}</span>
                </div>
                <textarea
                  id="textarea-comment"
                  rows={3}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Bagikan kesan, teori, atau pendapatmu tentang bab komik ini..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
                />
                <div className="flex justify-end">
                  <button
                    id="btn-submit-comment"
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Komentar</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-center flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-white">Ingin Bergabung dalam Diskusi?</p>
              <p className="text-xs text-slate-400 mt-1">
                Fitur komentar dan balasan diskusi memerlukan simulasi login cepat dengan Username.
              </p>
            </div>
            <button
              id="btn-login-to-comment"
              type="button"
              onClick={onRequireLogin}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Masuk Akun Sekarang
            </button>
          </div>
        )}

        {/* Daftar Komentar */}
        <div className="space-y-4">
          {rootComments.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              Belum ada komentar untuk komik ini. Jadilah yang pertama berkomentar!
            </p>
          ) : (
            rootComments.map((root) => {
              const replies = comments.filter((c) => c.parentId === root.id);
              const isReplying = replyToId === root.id;

              return (
                <div 
                  key={root.id}
                  id={`comment-${root.id}`}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-300">
                        {root.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white">@{root.username}</span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          {new Date(root.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-slate-200 pl-10 leading-relaxed">
                    {root.content}
                  </p>

                  <div className="pl-10 flex items-center gap-4">
                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyToId(isReplying ? null : (root.id || null));
                          setReplyText('');
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>{isReplying ? 'Batal Balas' : 'Balas Komentar'}</span>
                      </button>
                    )}
                  </div>

                  {/* Form Balasan */}
                  {isReplying && (
                    <div className="mt-2 pl-10">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Balas @${root.username}...`}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => root.id && handleAddReply(root.id)}
                          disabled={!replyText.trim()}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          Kirim
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies List */}
                  {replies.length > 0 && (
                    <div className="mt-3 pl-10 space-y-2.5 border-l-2 border-slate-800 ml-4">
                      {replies.map((reply) => (
                        <div 
                          key={reply.id} 
                          id={`reply-${reply.id}`}
                          className="pl-3 py-1 bg-slate-900/40 rounded-lg p-2.5 border border-slate-800/50"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-300">@{reply.username}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(reply.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
