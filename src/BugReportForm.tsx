import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { Bug, Send, CheckCircle2, MessageSquareText, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const BugReportForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [category, setCategory] = useState<'Bug Teknis' | 'Saran Fitur' | 'Laporan Konten' | 'Lainnya'>('Bug Teknis');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'bug_reports'), {
        category,
        title: title.trim(),
        description: description.trim(),
        userId: currentUser?.userId || 'guest',
        username: currentUser?.username || 'Anonim',
        createdAt: Date.now(),
        status: 'Menunggu',
      });
      setIsSuccess(true);
      setTitle('');
      setDescription('');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      console.error('Error submitting bug report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="bug-report-container" className="max-w-2xl mx-auto p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
          <Bug className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Lapor Bug / Saran Pengguna</h2>
          <p className="text-xs text-slate-400">Bantu kami menyempurnakan pengalaman membaca di Shiroko Comics</p>
        </div>
      </div>

      {isSuccess ? (
        <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Laporan Berhasil Terkirim!</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Terima kasih atas kontribusi Anda. Data telah tersimpan secara publik di Firestore dan tim kami akan segera mengeceknya.
          </p>
          <button
            type="button"
            onClick={() => setIsSuccess(false)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Kirim Laporan Lain
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kategori Laporan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Bug Teknis', 'Saran Fitur', 'Laporan Konten', 'Lainnya'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 text-xs rounded-xl font-medium border transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Judul Masalah / Topik Saran
            </label>
            <input
              id="input-bug-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: Panel komik chapter 2 tidak muncul di browser HP"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Deskripsi Detail
            </label>
            <textarea
              id="textarea-bug-desc"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan kronologi kejadian, perangkat yang digunakan, atau saran peningkatan yang Anda harapkan..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Pelapor:</span>
            <span className="text-blue-400 font-semibold">
              {currentUser ? `@${currentUser.username}` : 'Pengguna Tamu (Anonim)'}
            </span>
          </div>

          <button
            id="btn-submit-bug-report"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Mengirim ke Firestore...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Laporan Sekarang</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
