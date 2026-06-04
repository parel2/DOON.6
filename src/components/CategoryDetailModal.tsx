import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { useTheme } from './ThemeEngine';
import { formatRupiah, formatDateTime } from '../utils/format';
import type { Transaction } from '../db';
import { deleteTransaction } from '../db';

interface CategoryDetailModalProps {
  category: string;
  transactions: Transaction[];
  deletedAmount: number;
  onClose: () => void;
  onDelete: () => void;
}

export default function CategoryDetailModal({ category, transactions, deletedAmount, onClose, onDelete }: CategoryDetailModalProps) {
  const { colors } = useTheme();
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDeleteTransaction = async (txId: number | undefined) => {
    if (!txId) return;
    setDeleting(txId);
    try {
      await deleteTransaction(txId);
      onDelete();
    } catch (e) {
      console.error(e);
    }
    setDeleting(null);
  };

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

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
        <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl backdrop-blur-xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl" style={{ background: colors.cardAlpha, borderColor: colors.border, borderWidth: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <motion.h2 className="text-lg font-bold" style={{ color: colors.text }} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              {category}
            </motion.h2>
            <motion.button onClick={onClose} whileTap={{ scale: 0.85, rotate: 90 }} style={{ color: colors.textMuted }}>
              <X size={20} />
            </motion.button>
          </div>

          <motion.div className="rounded-2xl p-3 mb-4 flex items-center justify-between" style={{ background: colors.inputBg }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
            <span className="text-xs" style={{ color: colors.textMuted }}>Total Pengeluaran</span>
            <span className="text-sm font-bold" style={{ color: '#f43f5e' }}>
              {formatRupiah(totalAmount + deletedAmount)}
            </span>
          </motion.div>

          {transactions.length === 0 && deletedAmount === 0 ? (
            <motion.p className="text-sm text-center py-8" style={{ color: colors.textMuted }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }}>
              Belum ada transaksi
            </motion.p>
          ) : (
            <div className="space-y-2">
              {deletedAmount > 0 && (
                <motion.div
                  className="rounded-2xl p-3 flex items-center justify-between border-2"
                  style={{ background: `#f43f5e11`, borderColor: '#f43f5e33' }}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  <span className="text-xs font-medium" style={{ color: '#f43f5e' }}>
                    Data sebelumnya (dihapus)
                  </span>
                  <span className="text-sm font-bold" style={{ color: '#f43f5e' }}>
                    {formatRupiah(deletedAmount)}
                  </span>
                </motion.div>
              )}

              {transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-opacity-50 group relative overflow-hidden"
                  style={{ background: `${colors.accent}08`, borderColor: colors.borderSubtle, borderWidth: 1 }}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * (i + 1) }}
                  whileHover={{ x: 4 }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: colors.text }}>
                      {tx.description || 'Tanpa deskripsi'}
                    </p>
                    <p className="text-[10px]" style={{ color: colors.textMuted }}>
                      {formatDateTime(tx.timestamp)} · {tx.source === 'offline' ? 'Tunai' : tx.source === 'online' ? 'E-Wallet' : 'Transfer'}
                    </p>
                    {(tx.balanceBefore !== undefined || tx.balanceAfter !== undefined) && (
                      <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                        {formatRupiah(tx.balanceBefore || 0)} - {formatRupiah(tx.amount)} = {formatRupiah(tx.balanceAfter || 0)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-sm font-bold" style={{ color: '#f43f5e' }}>
                      -{formatRupiah(tx.amount)}
                    </span>
                    <AnimatePresence>
                      {deleting !== tx.id && (
                        <motion.button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/20"
                          style={{ color: '#f43f5e' }}
                          initial={{ opacity: 0, scale: 0 }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ duration: 0.15 }}
                          whileTap={{ scale: 0.8 }}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      )}
                      {deleting === tx.id && (
                        <motion.div
                          className="text-[10px]"
                          style={{ color: colors.textMuted }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Hapus...
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
