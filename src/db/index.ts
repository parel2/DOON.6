import Dexie, { type Table } from 'dexie';

export interface Balances {
  id?: number;
  offline: number;
  online: number;
}

export interface Transaction {
  id?: number;
  type: 'expense' | 'income' | 'transfer_fee' | 'withdrawal_direct' | 'withdrawal_to_balance';
  category: string;
  description: string;
  amount: number;
  timestamp: number;
  source: 'offline' | 'online' | 'transfer';
  reversedSavingsAmount?: number;
  reversedSavingsCategory?: string;
  balanceBefore?: number;
  balanceAfter?: number;
}

export interface Savings {
  id?: number;
  investasi: number;
  darurat: number;
  last_saved_timestamp: number;
}

export interface Target {
  id?: number;
  name: string;
  target_amount: number;
  current_amount: number;
}

class DoonDB extends Dexie {
  balances!: Table<Balances>;
  transactions!: Table<Transaction>;
  savings!: Table<Savings>;
  targets!: Table<Target>;

  constructor() {
    super('DoonDB');
    this.version(1).stores({
      balances: '++id',
      transactions: '++id, type, category, timestamp, source',
      savings: '++id',
      targets: '++id',
    });
    this.version(2).stores({
      balances: '++id',
      transactions: '++id, type, category, timestamp, source',
      savings: '++id',
      targets: '++id',
    }).upgrade((tx) => {
      return tx.table('transactions').toCollection().modify((t: Record<string, unknown>) => {
        if (!t.description) t.description = '';
      });
    });
    this.version(3).stores({
      balances: '++id',
      transactions: '++id, type, category, timestamp, source',
      savings: '++id',
      targets: '++id',
    });
  }
}

export const db = new DoonDB();

export async function isDBInitialized(): Promise<boolean> {
  const count = await db.balances.count();
  return count > 0;
}

export async function initializeDB(offline: number, online: number): Promise<void> {
  await db.balances.add({ offline, online });
  await db.savings.add({ investasi: 0, darurat: 0, last_saved_timestamp: Date.now() });
}

export async function getBalances(): Promise<Balances | undefined> {
  return await db.balances.toCollection().first();
}

export async function updateBalances(offline: number, online: number): Promise<void> {
  const existing = await db.balances.toCollection().first();
  if (existing && existing.id) {
    await db.balances.update(existing.id, { offline, online });
  }
}

export async function addTransaction(tx: Omit<Transaction, 'id'>): Promise<void> {
  await db.transactions.add(tx as Transaction);
}

export async function getTransactions(): Promise<Transaction[]> {
  return await db.transactions.toArray();
}

export async function getSavings(): Promise<Savings | undefined> {
  return await db.savings.toCollection().first();
}

export async function updateSavings(investasi: number, darurat: number): Promise<void> {
  const existing = await db.savings.toCollection().first();
  if (existing && existing.id) {
    await db.savings.update(existing.id, { investasi, darurat, last_saved_timestamp: Date.now() });
  }
}

export async function getTargets(): Promise<Target[]> {
  return await db.targets.toArray();
}

export async function addTarget(target: Omit<Target, 'id'>): Promise<void> {
  await db.targets.add(target as Target);
}

export async function updateTarget(id: number, current_amount: number): Promise<void> {
  await db.targets.update(id, { current_amount });
}

export async function deleteTarget(id: number): Promise<void> {
  await db.targets.delete(id);
}

export async function exportDB(): Promise<string> {
  const data = {
    balances: await db.balances.toArray(),
    transactions: await db.transactions.toArray(),
    savings: await db.savings.toArray(),
    targets: await db.targets.toArray(),
  };
  return btoa(JSON.stringify(data));
}

export async function importDB(encoded: string): Promise<void> {
  const data = JSON.parse(atob(encoded));
  await db.transaction('rw', db.balances, db.transactions, db.savings, db.targets, async () => {
    await db.balances.clear();
    await db.transactions.clear();
    await db.savings.clear();
    await db.targets.clear();
    if (data.balances?.length) await db.balances.bulkAdd(data.balances);
    if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
    if (data.savings?.length) await db.savings.bulkAdd(data.savings);
    if (data.targets?.length) await db.targets.bulkAdd(data.targets);
  });
}

export async function clearDB(): Promise<void> {
  await db.transaction('rw', db.balances, db.transactions, db.savings, db.targets, async () => {
    await db.balances.clear();
    await db.transactions.clear();
    await db.savings.clear();
    await db.targets.clear();
  });
}

// Tarik langsung dari tabungan - hanya mengurangi tabungan, dicatat sebagai withdrawal_direct
export async function withdrawSavingsDirect(
  savingsType: 'investasi' | 'darurat',
  amount: number
): Promise<void> {
  const savings = await db.savings.toCollection().first();
  if (!savings || !savings.id) return;
  const current = savingsType === 'investasi' ? savings.investasi : savings.darurat;
  if (current < amount) throw new Error('Saldo tabungan tidak mencukupi');
  const newInvestasi = savingsType === 'investasi' ? savings.investasi - amount : savings.investasi;
  const newDarurat = savingsType === 'darurat' ? savings.darurat - amount : savings.darurat;
  await db.savings.update(savings.id, { investasi: newInvestasi, darurat: newDarurat });
  await db.transactions.add({
    type: 'withdrawal_direct',
    category: `Tarik ${savingsType === 'investasi' ? 'Investasi' : 'Darurat'}`,
    description: 'Tarik langsung dari tabungan',
    amount,
    timestamp: Date.now(),
    source: 'transfer',
  } as Transaction);
}

// Tarik tabungan ke saldo - mengurangi tabungan, menambah saldo,
// dan membalikkan transaksi tabungan terbaru secara LIFO dari analytics
export async function withdrawSavingsToBalance(
  savingsType: 'investasi' | 'darurat',
  amount: number,
  destination: 'offline' | 'online'
): Promise<void> {
  const savings = await db.savings.toCollection().first();
  if (!savings || !savings.id) return;
  const current = savingsType === 'investasi' ? savings.investasi : savings.darurat;
  if (current < amount) throw new Error('Saldo tabungan tidak mencukupi');

  // Temukan transaksi tabungan yang relevan, diurutkan dari terbaru
  const categoryLabel = `Tabungan ${savingsType === 'investasi' ? 'Investasi' : 'Darurat'}`;
  const savingsTxs = await db.transactions
    .where('category')
    .equals(categoryLabel)
    .toArray();
  savingsTxs.sort((a, b) => b.timestamp - a.timestamp);

  // Hitung berapa yang perlu dibalik (LIFO)
  let remaining = amount;
  const reversals: { id: number; originalAmount: number; newAmount: number }[] = [];
  for (const tx of savingsTxs) {
    if (remaining <= 0) break;
    if (!tx.id) continue;
    if (tx.amount <= remaining) {
      reversals.push({ id: tx.id, originalAmount: tx.amount, newAmount: 0 });
      remaining -= tx.amount;
    } else {
      reversals.push({ id: tx.id, originalAmount: tx.amount, newAmount: tx.amount - remaining });
      remaining = 0;
    }
  }

  await db.transaction('rw', db.transactions, db.balances, db.savings, async () => {
    // Terapkan reversal: hapus atau update transaksi tabungan
    for (const rev of reversals) {
      if (rev.newAmount === 0) {
        await db.transactions.delete(rev.id);
      } else {
        await db.transactions.update(rev.id, { amount: rev.newAmount });
      }
    }

    // Tambah saldo
    const balances = await db.balances.toCollection().first();
    if (balances && balances.id) {
      if (destination === 'offline') {
        await db.balances.update(balances.id, { offline: balances.offline + amount });
      } else {
        await db.balances.update(balances.id, { online: balances.online + amount });
      }
    }

    // Kurangi tabungan
    const newInvestasi = savingsType === 'investasi' ? savings.investasi - amount : savings.investasi;
    const newDarurat = savingsType === 'darurat' ? savings.darurat - amount : savings.darurat;
    await db.savings.update(savings.id!, { investasi: newInvestasi, darurat: newDarurat });

    // Catat transaksi withdrawal_to_balance (untuk riwayat)
    await db.transactions.add({
      type: 'withdrawal_to_balance',
      category: `Tarik ${savingsType === 'investasi' ? 'Investasi' : 'Darurat'} ke Saldo`,
      description: `Ditambahkan ke saldo ${destination === 'offline' ? 'tunai' : 'e-wallet'}`,
      amount,
      timestamp: Date.now(),
      source: destination,
      reversedSavingsAmount: amount,
      reversedSavingsCategory: categoryLabel,
    } as Transaction);
  });
}

// Delete transaction dan reverse impact ke balance & savings
export async function deleteTransaction(txId: number): Promise<void> {
  const tx = await db.transactions.get(txId);
  if (!tx) return;

  await db.transaction('rw', db.transactions, db.balances, db.savings, async () => {
    // Reverse balance impact
    const balances = await db.balances.toCollection().first();
    if (balances && balances.id) {
      if (tx.type === 'expense') {
        // Expense: kembalikan uang ke balance
        if (tx.source === 'offline') {
          await db.balances.update(balances.id, { offline: balances.offline + tx.amount });
        } else if (tx.source === 'online') {
          await db.balances.update(balances.id, { online: balances.online + tx.amount });
        }
      } else if (tx.type === 'income') {
        // Income: kurangi balance
        if (tx.source === 'offline') {
          await db.balances.update(balances.id, { offline: balances.offline - tx.amount });
        } else if (tx.source === 'online') {
          await db.balances.update(balances.id, { online: balances.online - tx.amount });
        }
      } else if (tx.type === 'transfer_fee') {
        // Fee: kembalikan ke balance
        if (tx.source === 'offline') {
          await db.balances.update(balances.id, { offline: balances.offline + tx.amount });
        } else if (tx.source === 'online') {
          await db.balances.update(balances.id, { online: balances.online + tx.amount });
        }
      }
    }

    // Reverse savings impact jika kategori berisi Tabungan
    if (tx.category?.includes('Tabungan')) {
      const savings = await db.savings.toCollection().first();
      if (savings && savings.id) {
        const isInvestasi = tx.category.includes('Investasi');
        const newInvestasi = isInvestasi ? savings.investasi - tx.amount : savings.investasi;
        const newDarurat = !isInvestasi ? savings.darurat - tx.amount : savings.darurat;
        await db.savings.update(savings.id, { investasi: newInvestasi, darurat: newDarurat });
      }
    } else if (tx.category?.includes('Target:')) {
      // Target: kurasi target amount (reverse)
      const targetName = tx.category.replace('Target: ', '');
      const targets = await db.targets.toArray();
      const target = targets.find((t) => t.name === targetName);
      if (target && target.id) {
        await db.targets.update(target.id, { current_amount: Math.max(0, target.current_amount - tx.amount) });
      }
    }

    // Delete transaction
    await db.transactions.delete(txId);
  });
}

// Clear old transactions dan track jumlah yang dihapus per kategori
export async function clearOldTransactions(daysToKeep: number = 90): Promise<{ deleted: number; deletedByCategory: Record<string, number> }> {
  const cutoffTime = Date.now() - daysToKeep * 86400000;
  const toDelete = await db.transactions.where('timestamp').below(cutoffTime).toArray();
  const deletedByCategory: Record<string, number> = {};

  for (const tx of toDelete) {
    if (tx.id) {
      await db.transactions.delete(tx.id);
      deletedByCategory[tx.category] = (deletedByCategory[tx.category] || 0) + tx.amount;
    }
  }

  // Store deleted data summary di localStorage
  const existing = localStorage.getItem('deleted_data_summary') ? JSON.parse(localStorage.getItem('deleted_data_summary')!) : {};
  for (const [cat, amount] of Object.entries(deletedByCategory)) {
    existing[cat] = (existing[cat] || 0) + (amount as number);
  }
  localStorage.setItem('deleted_data_summary', JSON.stringify(existing));

  return { deleted: toDelete.length, deletedByCategory };
}

export function getDeletedDataSummary(): Record<string, number> {
  const data = localStorage.getItem('deleted_data_summary');
  return data ? JSON.parse(data) : {};
}
