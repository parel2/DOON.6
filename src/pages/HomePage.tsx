import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingDown, Bell, History, ArrowRightLeft, Trash2, X } from 'lucide-react';
import { getBalances, getTransactions, type Balances, type Transaction, deleteTransaction, clearOldTransactions } from '../db';
import { useTheme } from '../components/ThemeEngine';
import JackpotTicker from '../components/JackpotTicker';
import StaggeredEntrance from '../components/StaggeredEntrance';
import LiquidBlob from '../components/LiquidBlob';
import HologramFoil from '../components/HologramFoil';
import AddBalanceModal from '../components/AddBalanceModal';
import ExpenseModal from '../components/ExpenseModal';
import IncomeModal from '../components/IncomeModal';
import TransferModal from '../components/TransferModal';
import MigrationModal from '../components/MigrationModal';
import { formatRupiah, formatDateTime, formatDate } from '../utils/format';

export default function HomePage({ onDBCleared }: { onDBCleared?: () => void }) {
  const { colors } = useTheme();
  const [balances, setBalances] = useState<Balances | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const refresh = useCallback(async () => {
    const b = await getBalances();
    if (b) setBalances(b);
    const txs = await getTransactions();
    setTransactions(txs.sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const total = (balances?.offline || 0) + (balances?.online || 0);

  const handlePlusClick = () => {
    setShowActionMenu(true);
  };

  return (
    <div className="px-4 pt-4" style={{ paddingBottom: '2cm' }}>
      <StaggeredEntrance index={0}>
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold" style={{ color: colors.text }}>DOON</h1>
            <motion.p
              className="text-[10px] tracking-wider"
              style={{ color: colors.textMuted }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              DOMPET ONLINE
            </motion.p>
          </motion.div>
          <motion.button
            onClick={() => setShowMigration(true)}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            className="p-2 rounded-lg border transition-all"
            style={{ background: colors.card, borderColor: colors.border, color: colors.textMuted }}
            title="Imigrasi Data"
          >
            <History size={18} />
          </motion.button>
        </div>
      </StaggeredEntrance>

      <StaggeredEntrance index={1} variant="scaleIn">
        <motion.div
          className="relative rounded-3xl p-5 mb-4 overflow-hidden"
          style={{
            background: colors.card,
            borderColor: `${colors.accent}1a`,
            borderWidth: 1,
            boxShadow: `0 0 40px ${colors.glow}20, 0 0 80px ${colors.glowSecondary}10`,
          }}
          whileHover={{ scale: 1.01, boxShadow: `0 0 50px ${colors.glow}30, 0 0 100px ${colors.glowSecondary}15` }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <LiquidBlob />
          <HologramFoil />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <motion.p
                className="text-xs mb-1"
                style={{ color: colors.textMuted }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                Total Saldo
              </motion.p>
              <JackpotTicker value={total} className="text-3xl font-bold" style={{ color: colors.text }} />
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setShowTransfer(true)}
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg border relative overflow-hidden"
                style={{ background: `${colors.accentSecondary}1a`, borderColor: `${colors.accentSecondary}33`, color: colors.accentSecondary }}
                title="Transfer Saldo"
              >
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ background: colors.accentSecondary }}
                />
                <ArrowRightLeft size={18} strokeWidth={2.5} className="relative z-10" />
              </motion.button>
              <motion.button
                onClick={handlePlusClick}
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden"
                style={{ background: colors.gradient, color: colors.bg }}
                title="Menu Tambah"
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                  animate={{ scale: [0, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
                <Plus size={20} strokeWidth={3} className="relative z-10" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </StaggeredEntrance>

      <StaggeredEntrance index={2} variant="slideRight">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div
            className="relative rounded-3xl p-4 overflow-hidden"
            style={{ background: colors.card, borderColor: colors.border, borderWidth: 1 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <LiquidBlob />
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>Tunai (Offline)</p>
              <JackpotTicker value={balances?.offline || 0} className="text-lg font-bold" style={{ color: colors.offline }} />
            </div>
          </motion.div>
          <motion.div
            className="relative rounded-3xl p-4 overflow-hidden"
            style={{ background: colors.card, borderColor: colors.border, borderWidth: 1 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <LiquidBlob />
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>E-Wallet (Online)</p>
              <JackpotTicker value={balances?.online || 0} className="text-lg font-bold" style={{ color: colors.online }} />
            </div>
          </motion.div>
        </div>
      </StaggeredEntrance>

      <StaggeredEntrance index={3} variant="flipUp">
        <div className="flex gap-3 mb-6">
          <motion.button
            onClick={() => setShowExpense(true)}
            whileTap={{ scale: 0.93 }}
            whileHover={{ scale: 1.03, y: -1 }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all relative overflow-hidden"
            style={{ background: `${colors.accentSecondary}1a`, borderColor: `${colors.accentSecondary}33`, borderWidth: 1, color: colors.accentSecondary }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: colors.accentSecondary }}
              animate={{ opacity: [0, 0.08, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
              <TrendingDown size={16} />
            </motion.div>
            <span className="relative z-10">Catat Pengeluaran</span>
          </motion.button>
          <motion.button
            onClick={() => setShowHistory(true)}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1, rotate: 15 }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all relative"
            style={{ background: colors.card, borderColor: colors.border, borderWidth: 1, color: colors.textMuted }}
          >
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5, repeat: transactions.length > 0 ? 0 : Infinity, repeatDelay: 2 }}>
              <Bell size={16} />
            </motion.div>
          </motion.button>
        </div>
      </StaggeredEntrance>

      <StaggeredEntrance index={4} variant="scaleIn">
        <motion.div
          className="rounded-3xl overflow-hidden"
          style={{ background: colors.card, borderColor: colors.border, borderWidth: 1 }}
          whileHover={{ y: -1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <h3 className="text-sm font-semibold" style={{ color: colors.text }}>Transaksi Terakhir</h3>
            <motion.button
              onClick={() => setShowHistory(true)}
              className="text-xs"
              style={{ color: colors.accent }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ x: 3 }}
            >
              Lihat Semua
            </motion.button>
          </div>
          {transactions.length === 0 ? (
            <motion.p
              className="p-4 text-sm text-center"
              style={{ color: colors.textMuted }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Belum ada transaksi
            </motion.p>
          ) : (
            <div>
              {transactions.slice(0, 5).map((tx, i) => (
                <TransactionRow key={tx.id} tx={tx} i={i} onDelete={() => refresh()} />
              ))}
            </div>
          )}
        </motion.div>
      </StaggeredEntrance>

      <AnimatePresence>
        {showActionMenu && <ActionMenu colors={colors} onAddBalance={() => { setShowAddBalance(true); setShowActionMenu(false); }} onAddIncome={() => { setShowIncome(true); setShowActionMenu(false); }} onClose={() => setShowActionMenu(false)} />}
        {showAddBalance && <AddBalanceModal onClose={() => setShowAddBalance(false)} onComplete={refresh} />}
        {showExpense && <ExpenseModal onClose={() => setShowExpense(false)} onComplete={refresh} />}
        {showIncome && <IncomeModal onClose={() => setShowIncome(false)} onComplete={refresh} />}
        {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} onComplete={refresh} />}
        {showMigration && <MigrationModal onClose={() => setShowMigration(false)} onImported={refresh} onCleared={() => { if (onDBCleared) onDBCleared(); }} />}
        {showHistory && <HistoryModal transactions={transactions} onClose={() => setShowHistory(false)} onDelete={refresh} />}
      </AnimatePresence>
    </div>
  );
}

interface ActionMenuProps {
  colors: any;
  onAddBalance: () => void;
  onAddIncome: () => void;
  onClose: () => void;
}

function ActionMenu({ colors, onAddBalance, onAddIncome, onClose }: ActionMenuProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 backdrop-blur-md"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center"
      >
        <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl backdrop-blur-xl p-6 max-h-[80vh] overflow-y-auto shadow-2xl" style={{ background: colors.cardAlpha, borderColor: colors.border, borderWidth: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <motion.h2 className="text-lg font-bold" style={{ color: colors.text }} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>Pilih Menu</motion.h2>
            <motion.button onClick={onClose} whileTap={{ scale: 0.85, rotate: 90 }} style={{ color: colors.textMuted }}><X size={20} /></motion.button>
          </div>

          <div className="space-y-3">
            <motion.button
              onClick={onAddBalance}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="w-full p-4 rounded-2xl text-left transition-all"
              style={{ background: `${colors.offline}22`, borderColor: colors.offline, borderWidth: 1 }}
            >
              <p className="font-semibold text-sm" style={{ color: colors.offline }}>Tambah Saldo</p>
              <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Masukkan uang baru ke dompet</p>
            </motion.button>

            <motion.button
              onClick={onAddIncome}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="w-full p-4 rounded-2xl text-left transition-all"
              style={{ background: `${colors.offline}22`, borderColor: colors.offline, borderWidth: 1 }}
            >
              <p className="font-semibold text-sm" style={{ color: colors.offline }}>Catat Pemasukan</p>
              <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Catat pemasukan dengan kategori</p>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function TransactionRow({ tx, i, onDelete }: { tx: Transaction; i: number; onDelete: () => void }) {
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tx.id) return;
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      onDelete();
    } catch (e) {
      console.error(e);
    }
    setDeleting(false);
  };

  return (
    <motion.div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.08, duration: 0.4 }}
      whileHover={{ x: 4, background: `${colors.accent}08` }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <div className="min-w-0 flex-1 mr-3">
        <p className="text-sm truncate" style={{ color: colors.text }}>{tx.category}</p>
        {tx.description && <p className="text-[10px] truncate" style={{ color: colors.textMuted }}>{tx.description}</p>}
        <p className="text-[10px]" style={{ color: colors.textMuted }}>{formatDateTime(tx.timestamp)} · {tx.source === 'offline' ? 'Tunai' : tx.source === 'online' ? 'Online' : 'Transfer'}</p>
        {(tx.balanceBefore !== undefined || tx.balanceAfter !== undefined) && (
          <p className="text-[10px] mt-1" style={{ color: colors.textMuted }}>
            {formatRupiah(tx.balanceBefore || 0)} - {formatRupiah(tx.amount)} = {formatRupiah(tx.balanceAfter || 0)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <motion.span
          className="text-sm font-medium"
          style={{ color: tx.type === 'income' ? colors.offline : '#f43f5e' }}
          whileHover={{ scale: 1.1 }}
        >
          {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
        </motion.span>
        <AnimatePresence>
          {isPressed && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={handleDelete}
              disabled={deleting}
              className="p-1"
              style={{ color: '#f43f5e', opacity: deleting ? 0.5 : 1 }}
            >
              <Trash2 size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

type FilterTab = 'semua' | 'online' | 'offline';

function HistoryModal({ transactions, onClose, onDelete }: { transactions: Transaction[]; onClose: () => void; onDelete: () => void }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<FilterTab>('semua');
  const [searchDate, setSearchDate] = useState('');
  const [clearing, setClearing] = useState(false);

  const filtered = filter === 'semua'
    ? transactions
    : transactions.filter((tx) => tx.source === filter);

  const dateFiltered = searchDate
    ? filtered.filter((tx) => {
        const d = new Date(tx.timestamp);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === searchDate;
      })
    : filtered;

  const totalExpense = dateFiltered
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const handleClearOldTransactions = async () => {
    setClearing(true);
    try {
      await clearOldTransactions(90);
      onDelete();
    } catch (e) {
      console.error(e);
    }
    setClearing(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 backdrop-blur-md"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center"
      >
        <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl backdrop-blur-xl p-6 max-h-[80vh] overflow-y-auto shadow-2xl" style={{ background: colors.cardAlpha, borderColor: colors.border, borderWidth: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <motion.h2
              className="text-lg font-bold"
              style={{ color: colors.text }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Riwayat Transaksi
            </motion.h2>
            <motion.button onClick={onClose} whileTap={{ scale: 0.85, rotate: 90 }} style={{ color: colors.textMuted }}><X size={20} /></motion.button>
          </div>

          <div className="flex gap-2 mb-4">
            {(['semua', 'online', 'offline'] as FilterTab[]).map((f, i) => (
              <motion.button
                key={f}
                onClick={() => setFilter(f)}
                whileTap={{ scale: 0.9 }}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  background: filter === f ? `${colors.accent}33` : 'transparent',
                  color: filter === f ? colors.accent : colors.textMuted,
                  borderColor: filter === f ? `${colors.accent}66` : colors.borderSubtle,
                  borderWidth: 1,
                }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 * i }}
              >
                {f}
              </motion.button>
            ))}
          </div>

          <motion.div className="mb-4" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}>
            <label className="text-xs mb-2 block" style={{ color: colors.textMuted }}>Cari tanggal</label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs border focus:outline-none"
              style={{ background: colors.inputBg, color: colors.text, borderColor: colors.borderSubtle }}
            />
          </motion.div>

          <motion.div
            className="rounded-2xl p-3 mb-4 flex items-center justify-between"
            style={{ background: colors.inputBg }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-xs" style={{ color: colors.textMuted }}>Total Pengeluaran{filter !== 'semua' ? ` (${filter})` : ''}</span>
            <span className="text-sm font-bold" style={{ color: '#f43f5e' }}>-{formatRupiah(totalExpense)}</span>
          </motion.div>

          {dateFiltered.length === 0 ? (
            <motion.p
              className="text-sm text-center py-8"
              style={{ color: colors.textMuted }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Belum ada transaksi
            </motion.p>
          ) : (
            <div className="space-y-2 mb-4">
              {dateFiltered.map((tx, i) => (
                <HistoryTransactionItem key={tx.id} tx={tx} i={i} onDelete={onDelete} />
              ))}
            </div>
          )}

          <motion.button
            onClick={handleClearOldTransactions}
            disabled={clearing}
            whileTap={{ scale: 0.95 }}
            className="w-full py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: `#f43f5e22`, color: '#f43f5e', borderWidth: 1, borderColor: '#f43f5e44' }}
          >
            {clearing ? 'Menghapus...' : 'Hapus Riwayat Lama (90+ hari)'}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

function HistoryTransactionItem({ tx, i, onDelete }: { tx: Transaction; i: number; onDelete: () => void }) {
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tx.id) return;
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      onDelete();
    } catch (e) {
      console.error(e);
    }
    setDeleting(false);
  };

  return (
    <motion.div
      className="p-3 rounded-2xl cursor-pointer"
      style={{ background: colors.inputBg }}
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: i * 0.05, duration: 0.4 }}
      whileHover={{ x: 4, scale: 1.01 }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 mr-3">
          <p className="text-sm truncate" style={{ color: colors.text }}>{tx.category}</p>
          {tx.description && <p className="text-[10px] truncate" style={{ color: colors.textMuted }}>{tx.description}</p>}
          <p className="text-[10px]" style={{ color: colors.textMuted }}>{formatDateTime(tx.timestamp)} · {tx.source === 'offline' ? 'Tunai' : tx.source === 'online' ? 'Online' : 'Transfer'}</p>
          {(tx.balanceBefore !== undefined || tx.balanceAfter !== undefined) && (
            <p className="text-[10px] mt-1 font-medium" style={{ color: colors.offline }}>
              {formatRupiah(tx.balanceBefore || 0)} - {formatRupiah(tx.amount)} = {formatRupiah(tx.balanceAfter || 0)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium flex-shrink-0" style={{ color: tx.type === 'income' ? colors.offline : '#f43f5e' }}>
            {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
          </span>
          <AnimatePresence>
            {isPressed && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={handleDelete}
                disabled={deleting}
                className="p-1"
                style={{ color: '#f43f5e', opacity: deleting ? 0.5 : 1 }}
              >
                <Trash2 size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
