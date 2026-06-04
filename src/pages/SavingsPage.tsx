import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiggyBank, Target, Plus, Trash2, Bell, X, ArrowDownToLine, Wallet } from 'lucide-react';
import {
  getSavings, getTargets, updateSavings, addTarget, updateTarget, deleteTarget,
  addTransaction, getBalances, updateBalances,
  withdrawSavingsDirect, withdrawSavingsToBalance,
  type Savings as SavingsType, type Target as TargetType
} from '../db';
import { useTheme } from '../components/ThemeEngine';
import JackpotTicker from '../components/JackpotTicker';
import StaggeredEntrance from '../components/StaggeredEntrance';
import LiquidBlob from '../components/LiquidBlob';
import { formatRupiah } from '../utils/format';

export default function SavingsPage() {
  const { colors } = useTheme();
  const [savings, setSavings] = useState<SavingsType | null>(null);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [shakeBell, setShakeBell] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<'investasi' | 'darurat' | null>(null);

  const refresh = useCallback(async () => {
    const s = await getSavings();
    if (s) setSavings(s);
    const t = await getTargets();
    setTargets(t);
  }, []);

  useEffect(() => {
    refresh();
    const checkNabung = async () => {
      const s = await getSavings();
      if (s && (Date.now() - s.last_saved_timestamp > 86400000)) setShakeBell(true);
    };
    checkNabung();
    const interval = setInterval(checkNabung, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAddSavings = async (type: 'investasi' | 'darurat', amount: number, source: 'offline' | 'online') => {
    if (!savings) return;
    if (type === 'investasi' && amount < 10000) return;
    if (type === 'darurat' && amount < 5000) return;
    const balances = await getBalances();
    if (!balances) return;
    const currentBalance = source === 'online' ? balances.online : balances.offline;
    if (currentBalance < amount) return;
    const balanceBefore = currentBalance;
    const balanceAfter = currentBalance - amount;
    if (source === 'online') await updateBalances(balances.offline, balances.online - amount);
    else await updateBalances(balances.offline - amount, balances.online);
    const newInvestasi = type === 'investasi' ? savings.investasi + amount : savings.investasi;
    const newDarurat = type === 'darurat' ? savings.darurat + amount : savings.darurat;
    await updateSavings(newInvestasi, newDarurat);
    await addTransaction({ type: 'expense', category: `Tabungan ${type === 'investasi' ? 'Investasi' : 'Darurat'}`, description: '', amount, timestamp: Date.now(), source, balanceBefore, balanceAfter });
    setShowAddSavings(false);
    setShakeBell(false);
    refresh();
  };

  const handleWithdrawDirect = async (type: 'investasi' | 'darurat', amount: number) => {
    await withdrawSavingsDirect(type, amount);
    setWithdrawTarget(null);
    refresh();
  };

  const handleWithdrawToBalance = async (type: 'investasi' | 'darurat', amount: number, dest: 'offline' | 'online') => {
    await withdrawSavingsToBalance(type, amount, dest);
    setWithdrawTarget(null);
    refresh();
  };

  const handleAddToTarget = async (targetId: number, newCurrentAmount: number, addedAmount: number, source: 'offline' | 'online') => {
    const balances = await getBalances();
    if (!balances) return;
    const currentBalance = source === 'online' ? balances.online : balances.offline;
    if (currentBalance < addedAmount) return;
    if (source === 'online') await updateBalances(balances.offline, balances.online - addedAmount);
    else await updateBalances(balances.offline - addedAmount, balances.online);
    await updateTarget(targetId, newCurrentAmount);
    const target = targets.find((t) => t.id === targetId);
    await addTransaction({ type: 'expense', category: `Target: ${target?.name || 'Unknown'}`, description: '', amount: addedAmount, timestamp: Date.now(), source });
    refresh();
  };

  const handleDeleteTarget = async (id: number) => { await deleteTarget(id); refresh(); };

  const currentWithdrawMax = withdrawTarget === 'investasi'
    ? (savings?.investasi || 0)
    : (savings?.darurat || 0);

  return (
    <div className="px-4 pt-4" style={{ paddingBottom: '2cm' }}>
      <StaggeredEntrance index={0}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.h1
              className="text-2xl font-bold"
              style={{ color: colors.text }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              Tabungan
            </motion.h1>
            <motion.div className={`relative ${shakeBell ? 'animate-shake' : ''}`}>
              <motion.div
                animate={shakeBell ? { rotate: [0, 15, -15, 0] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Bell size={18} style={{ color: colors.accentSecondary }} />
              </motion.div>
              {shakeBell && (
                <motion.span
                  className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>
          </div>
          {shakeBell && (
            <motion.span
              className="text-xs font-medium"
              style={{ color: colors.accentSecondary }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Wajib Nabung!
            </motion.span>
          )}
        </div>
      </StaggeredEntrance>

      <StaggeredEntrance index={1} variant="scaleIn">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Investasi card */}
          <motion.div
            className="relative rounded-3xl p-4 overflow-hidden border cursor-pointer"
            style={{ background: colors.card, borderColor: `${colors.offline}1a` }}
            whileHover={{ scale: 1.03, y: -3, borderColor: `${colors.offline}55` }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setWithdrawTarget('investasi')}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <LiquidBlob />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                  <PiggyBank size={14} style={{ color: colors.offline }} />
                </motion.div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.textMuted }}>Investasi</p>
              </div>
              <JackpotTicker value={savings?.investasi || 0} className="text-lg font-bold" style={{ color: colors.offline }} />
              <motion.p
                className="text-[10px] mt-1.5 font-medium"
                style={{ color: colors.offline }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Ketuk untuk tarik
              </motion.p>
            </div>
          </motion.div>

          {/* Darurat card */}
          <motion.div
            className="relative rounded-3xl p-4 overflow-hidden border cursor-pointer"
            style={{ background: colors.card, borderColor: `${colors.accentSecondary}1a` }}
            whileHover={{ scale: 1.03, y: -3, borderColor: `${colors.accentSecondary}55` }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setWithdrawTarget('darurat')}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <LiquidBlob />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <PiggyBank size={14} style={{ color: colors.accentSecondary }} />
                </motion.div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.textMuted }}>Darurat</p>
              </div>
              <JackpotTicker value={savings?.darurat || 0} className="text-lg font-bold" style={{ color: colors.accentSecondary }} />
              <motion.p
                className="text-[10px] mt-1.5 font-medium"
                style={{ color: colors.accentSecondary }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Ketuk untuk tarik
              </motion.p>
            </div>
          </motion.div>
        </div>
      </StaggeredEntrance>

      <StaggeredEntrance index={2} variant="flipUp">
        <motion.button
          onClick={() => setShowAddSavings(true)}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02, y: -1 }}
          className="w-full py-3 rounded-2xl text-sm font-medium transition-all mb-6 border relative overflow-hidden"
          style={{ background: `${colors.offline}1a`, borderColor: `${colors.offline}4d`, color: colors.offline }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: colors.offline }}
            animate={{ opacity: [0, 0.08, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="relative z-10">Nabung Sekarang</span>
        </motion.button>
      </StaggeredEntrance>

      <StaggeredEntrance index={3} variant="slideRight">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
              <Target size={18} style={{ color: colors.accent }} />
            </motion.div>
            Target
          </h2>
          <motion.button
            onClick={() => setShowAddTarget(true)}
            whileTap={{ scale: 0.85, rotate: 90 }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            className="p-2 rounded-lg border transition-all"
            style={{ background: `${colors.accent}1a`, borderColor: `${colors.accent}33`, color: colors.accent }}
          >
            <Plus size={16} />
          </motion.button>
        </div>
      </StaggeredEntrance>

      {targets.length === 0 ? (
        <StaggeredEntrance index={4} variant="scaleIn">
          <motion.div
            className="rounded-3xl p-8 border text-center"
            style={{ background: colors.card, borderColor: colors.border }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}>
              <Target size={32} className="mx-auto mb-2" style={{ color: colors.textMuted }} />
            </motion.div>
            <p className="text-sm" style={{ color: colors.textMuted }}>Belum ada target. Tambahkan target pertamamu!</p>
          </motion.div>
        </StaggeredEntrance>
      ) : (
        <div className="space-y-3">
          {targets.map((target, i) => (
            <StaggeredEntrance key={target.id} index={4 + i} variant="fadeUp">
              <TargetCard target={target} onAdd={handleAddToTarget} onDelete={handleDeleteTarget} />
            </StaggeredEntrance>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAddSavings && <AddSavingsModal onAdd={handleAddSavings} onClose={() => setShowAddSavings(false)} />}
        {showAddTarget && (
          <AddTargetModal
            onAdd={async (name, amount) => {
              await addTarget({ name, target_amount: amount, current_amount: 0 });
              setShowAddTarget(false);
              refresh();
            }}
            onClose={() => setShowAddTarget(false)}
          />
        )}
        {withdrawTarget && (
          <WithdrawSavingsModal
            type={withdrawTarget}
            maxAmount={currentWithdrawMax}
            onDirect={handleWithdrawDirect}
            onToBalance={handleWithdrawToBalance}
            onClose={() => setWithdrawTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WithdrawSavingsModal({
  type,
  maxAmount,
  onDirect,
  onToBalance,
  onClose,
}: {
  type: 'investasi' | 'darurat';
  maxAmount: number;
  onDirect: (type: 'investasi' | 'darurat', amount: number) => void;
  onToBalance: (type: 'investasi' | 'darurat', amount: number, dest: 'offline' | 'online') => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'direct' | 'to_balance'>('direct');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState<'offline' | 'online'>('offline');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const accentColor = type === 'investasi' ? colors.offline : colors.accentSecondary;
  const label = type === 'investasi' ? 'Investasi' : 'Darurat';
  const amt = Number(amount) || 0;
  const isValid = amt > 0 && amt <= maxAmount;

  const handleSubmit = async () => {
    if (!isValid) { setError(`Maksimal ${formatRupiah(maxAmount)}`); return; }
    setLoading(true);
    setError('');
    try {
      if (mode === 'direct') {
        await onDirect(type, amt);
      } else {
        await onToBalance(type, amt, destination);
      }
    } catch (e) {
      setError((e as Error).message || 'Terjadi kesalahan');
    }
    setLoading(false);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center"
      >
        <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl backdrop-blur-xl p-6 shadow-2xl" style={{ background: colors.cardAlpha, borderWidth: 1, borderColor: colors.border }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <motion.h2
                className="text-lg font-bold"
                style={{ color: accentColor }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                Tarik Tabungan {label}
              </motion.h2>
              <motion.p className="text-xs mt-0.5" style={{ color: colors.textMuted }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                Tersedia: {formatRupiah(maxAmount)}
              </motion.p>
            </div>
            <motion.button onClick={onClose} whileTap={{ scale: 0.85, rotate: 90 }} style={{ color: colors.textMuted }}>
              <X size={20} />
            </motion.button>
          </div>

          {/* Mode selector */}
          <motion.div
            className="grid grid-cols-2 gap-2 mb-5 rounded-xl p-1"
            style={{ background: colors.inputBg }}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <motion.button
              onClick={() => setMode('direct')}
              whileTap={{ scale: 0.95 }}
              className="relative flex flex-col items-center py-3 px-2 rounded-lg text-xs font-medium transition-all"
              style={mode === 'direct'
                ? { background: `${accentColor}22`, color: accentColor, borderWidth: 1, borderColor: `${accentColor}44` }
                : { color: colors.textMuted }
              }
            >
              <ArrowDownToLine size={16} className="mb-1" />
              <span>Tarik Langsung</span>
              <span className="text-[9px] mt-0.5 opacity-70">tidak masuk saldo</span>
            </motion.button>
            <motion.button
              onClick={() => setMode('to_balance')}
              whileTap={{ scale: 0.95 }}
              className="relative flex flex-col items-center py-3 px-2 rounded-lg text-xs font-medium transition-all"
              style={mode === 'to_balance'
                ? { background: `${accentColor}22`, color: accentColor, borderWidth: 1, borderColor: `${accentColor}44` }
                : { color: colors.textMuted }
              }
            >
              <Wallet size={16} className="mb-1" />
              <span>Tambah ke Saldo</span>
              <span className="text-[9px] mt-0.5 opacity-70">masuk dompet</span>
            </motion.button>
          </motion.div>

          {/* Info card per mode */}
          <AnimatePresence mode="wait">
            {mode === 'direct' ? (
              <motion.div
                key="direct-info"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl p-3 mb-4 text-xs"
                style={{ background: `${accentColor}12`, borderWidth: 1, borderColor: `${accentColor}22`, color: colors.textMuted }}
              >
                Jumlah ditarik langsung dari tabungan. Tercatat di riwayat sebagai penarikan, tidak masuk ke saldo dompet maupun perhitungan pengeluaran.
              </motion.div>
            ) : (
              <motion.div
                key="balance-info"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl p-3 mb-4 text-xs"
                style={{ background: `${accentColor}12`, borderWidth: 1, borderColor: `${accentColor}22`, color: colors.textMuted }}
              >
                Jumlah masuk ke saldo dompet. Transaksi tabungan sebelumnya akan dibalik dari analytics (pengeluaran, burn rate). Heatmap tetap tercatat.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Destination selector (only for to_balance) */}
          <AnimatePresence>
            {mode === 'to_balance' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-4"
              >
                <label className="block text-xs mb-2" style={{ color: colors.textSecondary }}>Masukkan ke</label>
                <div className="flex gap-2">
                  {(['offline', 'online'] as const).map((d) => (
                    <motion.button
                      key={d}
                      onClick={() => setDestination(d)}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border"
                      style={destination === d
                        ? { background: `${d === 'offline' ? colors.offline : colors.accent}33`, color: d === 'offline' ? colors.offline : colors.accent, borderColor: `${d === 'offline' ? colors.offline : colors.accent}66` }
                        : { color: colors.textMuted, borderColor: colors.borderSubtle }
                      }
                    >
                      {d === 'offline' ? 'Tunai (Offline)' : 'E-Wallet (Online)'}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Amount input */}
          <motion.div className="relative mb-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textMuted }}>Rp</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              placeholder="0"
              className="w-full rounded-lg pl-10 pr-4 py-3 text-sm border focus:outline-none transition-colors"
              style={{ background: colors.inputBg, color: colors.text, borderColor: error ? '#f43f5e66' : colors.borderSubtle }}
            />
          </motion.div>

          {/* Quick amount buttons */}
          <div className="flex gap-2 mb-4">
            {[25, 50, 100].map((pct) => {
              const val = Math.floor(maxAmount * pct / 100);
              return (
                <motion.button
                  key={pct}
                  onClick={() => { setAmount(String(val)); setError(''); }}
                  whileTap={{ scale: 0.9 }}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all"
                  style={{ background: colors.inputBg, color: colors.textMuted, borderColor: colors.borderSubtle }}
                >
                  {pct}%
                </motion.button>
              );
            })}
            <motion.button
              onClick={() => { setAmount(String(maxAmount)); setError(''); }}
              whileTap={{ scale: 0.9 }}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all"
              style={{ background: colors.inputBg, color: colors.textMuted, borderColor: colors.borderSubtle }}
            >
              Semua
            </motion.button>
          </div>

          {error && (
            <motion.p className="text-xs mb-3 text-center" style={{ color: '#f43f5e' }} initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {error}
            </motion.p>
          )}

          <motion.button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            whileTap={!loading && isValid ? { scale: 0.95 } : undefined}
            className="w-full py-3 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
            style={{ background: `linear-gradient(to right, ${accentColor}, ${mode === 'direct' ? colors.accent : colors.accentSecondary})`, color: colors.bg }}
          >
            <motion.div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.15)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }} />
            <span className="relative z-10">
              {loading ? 'Memproses...' : mode === 'direct' ? 'Tarik Langsung' : 'Masukkan ke Saldo'}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

function TargetCard({ target, onAdd, onDelete }: { target: TargetType; onAdd: (id: number, newCurrentAmount: number, addedAmount: number, source: 'offline' | 'online') => void; onDelete: (id: number) => void }) {
  const { colors } = useTheme();
  const [addAmount, setAddAmount] = useState('');
  const [source, setSource] = useState<'offline' | 'online'>('offline');
  const progress = target.target_amount > 0 ? (target.current_amount / target.target_amount) * 100 : 0;

  return (
    <motion.div
      className="relative rounded-3xl p-4 overflow-hidden border"
      style={{ background: colors.card, borderColor: colors.border }}
      whileHover={{ scale: 1.01, y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <LiquidBlob />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-medium" style={{ color: colors.text }}>{target.name}</p>
            <p className="text-xs" style={{ color: colors.textMuted }}>{formatRupiah(target.current_amount)} / {formatRupiah(target.target_amount)}</p>
          </div>
          <motion.button onClick={() => onDelete(target.id!)} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.2, rotate: 15 }} style={{ color: colors.textMuted }}>
            <Trash2 size={14} />
          </motion.button>
        </div>
        <div className="w-full h-2.5 rounded-full mb-3 overflow-hidden" style={{ background: colors.inputBg }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: `linear-gradient(to right, ${colors.accent}, ${colors.accentSecondary})`, boxShadow: `0 0 8px ${colors.glow}` }}
          />
        </div>
        {progress < 100 ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              {(['offline', 'online'] as const).map((s) => (
                <motion.button
                  key={s}
                  onClick={() => setSource(s)}
                  whileTap={{ scale: 0.93 }}
                  className="flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all border"
                  style={source === s
                    ? { background: `${s === 'offline' ? colors.offline : colors.accent}33`, color: s === 'offline' ? colors.offline : colors.accent, borderColor: `${s === 'offline' ? colors.offline : colors.accent}66` }
                    : { color: colors.textMuted, borderColor: colors.borderSubtle }
                  }
                >
                  {s === 'offline' ? 'Tunai' : 'E-Wallet'}
                </motion.button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: colors.textMuted }}>Rp</span>
                <input type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="0"
                  className="w-full rounded-lg pl-8 pr-2 py-2 text-xs border focus:outline-none transition-colors"
                  style={{ background: colors.inputBg, color: colors.text, borderColor: colors.borderSubtle }}
                />
              </div>
              <motion.button
                onClick={() => { const amt = Number(addAmount) || 0; if (amt > 0) { onAdd(target.id!, target.current_amount + amt, amt, source); setAddAmount(''); } }}
                disabled={(Number(addAmount) || 0) <= 0}
                whileTap={(Number(addAmount) || 0) > 0 ? { scale: 0.93 } : undefined}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                style={{ background: `${colors.accent}33`, color: colors.accent }}
              >
                Tambah
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.p
            className="text-xs font-medium"
            style={{ color: colors.offline }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Target tercapai!
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

function AddSavingsModal({ onAdd, onClose }: { onAdd: (type: 'investasi' | 'darurat', amount: number, source: 'offline' | 'online') => void; onClose?: () => void }) {
  const { colors } = useTheme();
  const [type, setType] = useState<'investasi' | 'darurat'>('investasi');
  const [source, setSource] = useState<'offline' | 'online'>('offline');
  const [amount, setAmount] = useState('');

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center"
      >
        <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl backdrop-blur-xl p-6" style={{ background: colors.cardAlpha, borderWidth: 1, borderColor: colors.border }}>
          <div className="flex items-center justify-between mb-4">
            <motion.h2 className="text-lg font-bold" style={{ color: colors.offline }} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>Nabung</motion.h2>
            {onClose && <motion.button onClick={onClose} whileTap={{ scale: 0.85, rotate: 90 }} style={{ color: colors.textMuted }}><X size={20} /></motion.button>}
          </div>
          <div className="flex gap-2 mb-4">
            {(['investasi', 'darurat'] as const).map((t, i) => (
              <motion.button key={t} onClick={() => setType(t)} whileTap={{ scale: 0.95 }}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border"
                style={type === t ? { background: `${t === 'investasi' ? colors.offline : colors.accentSecondary}33`, color: t === 'investasi' ? colors.offline : colors.accentSecondary, borderColor: `${t === 'investasi' ? colors.offline : colors.accentSecondary}66` } : { color: colors.textMuted, borderColor: colors.borderSubtle }}
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 * i }}
              >
                {t === 'investasi' ? 'Investasi (min 10k)' : 'Darurat (min 5k)'}
              </motion.button>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            {(['offline', 'online'] as const).map((s, i) => (
              <motion.button key={s} onClick={() => setSource(s)} whileTap={{ scale: 0.95 }}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border"
                style={source === s ? { background: `${s === 'offline' ? colors.offline : colors.accent}33`, color: s === 'offline' ? colors.offline : colors.accent, borderColor: `${s === 'offline' ? colors.offline : colors.accent}66` } : { color: colors.textMuted, borderColor: colors.borderSubtle }}
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + 0.05 * i }}
              >
                {s === 'offline' ? 'Tunai (Offline)' : 'E-Wallet (Online)'}
              </motion.button>
            ))}
          </div>
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textMuted }}>Rp</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              className="w-full rounded-lg pl-10 pr-4 py-3 text-sm border focus:outline-none transition-colors"
              style={{ background: colors.inputBg, color: colors.text, borderColor: colors.borderSubtle }}
            />
          </div>
          <motion.button
            onClick={() => onAdd(type, Number(amount) || 0, source)}
            disabled={(Number(amount) || 0) < (type === 'investasi' ? 10000 : 5000)}
            whileTap={(Number(amount) || 0) >= (type === 'investasi' ? 10000 : 5000) ? { scale: 0.95 } : undefined}
            className="w-full py-3 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(to right, ${colors.offline}, ${colors.accentSecondary})`, color: colors.bg }}
          >
            Nabung
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

function AddTargetModal({ onAdd, onClose }: { onAdd: (name: string, amount: number) => void; onClose?: () => void }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center"
      >
        <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl backdrop-blur-xl p-6" style={{ background: colors.cardAlpha, borderWidth: 1, borderColor: colors.border }}>
          <div className="flex items-center justify-between mb-4">
            <motion.h2 className="text-lg font-bold" style={{ color: colors.accent }} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>Target Baru</motion.h2>
            {onClose && <motion.button onClick={onClose} whileTap={{ scale: 0.85, rotate: 90 }} style={{ color: colors.textMuted }}><X size={20} /></motion.button>}
          </div>
          <motion.input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama target"
            className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors mb-3"
            style={{ background: colors.inputBg, color: colors.text, borderColor: colors.borderSubtle }}
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          />
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textMuted }}>Rp</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Target jumlah"
              className="w-full rounded-lg pl-10 pr-4 py-3 text-sm border focus:outline-none transition-colors"
              style={{ background: colors.inputBg, color: colors.text, borderColor: colors.borderSubtle }}
            />
          </div>
          <motion.button
            onClick={() => onAdd(name, Number(amount) || 0)}
            disabled={!name || (Number(amount) || 0) <= 0}
            whileTap={name && (Number(amount) || 0) > 0 ? { scale: 0.95 } : undefined}
            className="w-full py-3 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(to right, ${colors.accent}, ${colors.accentSecondary})`, color: colors.bg }}
          >
            Buat Target
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
