export interface Traveler {
  id: string;
  name: string;
  avatar: string;
  upiId?: string;
  phone?: string;
  pledgedAmount: number; // acts as startingBudget
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  splitAmongIds: string[];
  category: "food" | "cab" | "stay" | "fuel" | "tickets" | "other";
  timestamp: string; // ISO string
  location?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface DirectSettlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  timestamp: string;
  upiTxnRef?: string;
  status: "completed" | "pending";
}

export interface MemberFinancials {
  travelerId: string;
  name: string;
  avatar: string;
  upiId: string;
  startingBudget: number; // initial budget set by member
  actualShare: number;    // sum of all splits/expenses consumed
  actualPaid: number;     // total money paid out of pocket for the group
  remainingBalance: number; // startingBudget - actualShare
  isOverBudget: boolean;
  overBudgetAmount: number; // Math.abs(remainingBalance) when negative
  net: number;            // actualPaid - actualShare (+ creditor, - debtor)
}

export interface NetBalance {
  travelerId: string;
  name: string;
  avatar: string;
  balance: number; // net cash position: actualPaid - actualShare
  totalPaid: number;
  totalShare: number;
  pledgedAmount: number;
}

export interface DirectPayment {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  toUpi: string;
  amount: number;
}

export interface SettlementTransaction {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  toName: string;
  toAvatar: string;
  toUpiId: string;
  toUpi: string; // alias for exact prompt specification
  amount: number;
  upiLink: string;
  note: string;
}

/**
 * Calculates per-member financial ledger with budget deduction and over-budget status.
 * startingBudget = initial budget set by member
 * actualShare = sum of all splits/expenses consumed
 * actualPaid = total money paid out of pocket for the group
 * remainingBalance = startingBudget - actualShare
 * net = actualPaid - actualShare (adjusted for completed settlements)
 */
export function calculateMemberFinancials(
  travelers: Traveler[],
  expenses: Expense[],
  settlements: DirectSettlement[] = []
): Map<string, MemberFinancials> {
  const result = new Map<string, MemberFinancials>();

  for (const t of travelers) {
    const upiId =
      t.upiId ||
      `${t.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`;

    result.set(t.id, {
      travelerId: t.id,
      name: t.name,
      avatar: t.avatar,
      upiId,
      startingBudget: t.pledgedAmount,
      actualShare: 0,
      actualPaid: 0,
      remainingBalance: t.pledgedAmount,
      isOverBudget: false,
      overBudgetAmount: 0,
      net: 0,
    });
  }

  // 1. Accumulate Expenses (Actual Paid & Actual Share consumed)
  for (const expense of expenses) {
    const payer = result.get(expense.paidById);
    if (payer) {
      payer.actualPaid += expense.amount;
    }

    const splitIds =
      expense.splitAmongIds && expense.splitAmongIds.length > 0
        ? expense.splitAmongIds
        : travelers.map((t) => t.id);

    const share = expense.amount / splitIds.length;

    for (const memberId of splitIds) {
      const member = result.get(memberId);
      if (member) {
        member.actualShare += share;
      }
    }
  }

  // 2. Direct Settlements Adjust Net Cash Flow
  const settlementAdjustments = new Map<string, number>();
  for (const s of settlements) {
    if (s.status !== "completed") continue;
    // Debtor paid creditor
    settlementAdjustments.set(
      s.fromId,
      (settlementAdjustments.get(s.fromId) || 0) + s.amount
    );
    settlementAdjustments.set(
      s.toId,
      (settlementAdjustments.get(s.toId) || 0) - s.amount
    );
  }

  // 3. Finalize Computations & Round cleanly with Math.round()
  for (const [, item] of result) {
    item.actualPaid = Math.round(item.actualPaid);
    item.actualShare = Math.round(item.actualShare);
    item.remainingBalance = Math.round(item.startingBudget - item.actualShare);

    item.isOverBudget = item.remainingBalance < 0;
    item.overBudgetAmount = item.isOverBudget ? Math.abs(item.remainingBalance) : 0;

    const settlementAdj = settlementAdjustments.get(item.travelerId) || 0;
    item.net = Math.round(item.actualPaid - item.actualShare + settlementAdj);
  }

  return result;
}

/**
 * Calculates net balances for every traveler (backward compatible wrapper).
 */
export function calculateNetBalances(
  travelers: Traveler[],
  expenses: Expense[],
  settlements: DirectSettlement[] = []
): Map<string, NetBalance> {
  const financials = calculateMemberFinancials(travelers, expenses, settlements);
  const balances = new Map<string, NetBalance>();

  for (const [id, fin] of financials) {
    balances.set(id, {
      travelerId: fin.travelerId,
      name: fin.name,
      avatar: fin.avatar,
      balance: fin.net,
      totalPaid: fin.actualPaid,
      totalShare: fin.actualShare,
      pledgedAmount: fin.startingBudget,
    });
  }

  return balances;
}

/**
 * Generates an official NPCI-compliant UPI Intent URI.
 */
export function generateUpiUrl(params: {
  payeeUpiId: string;
  payeeName: string;
  amount: number;
  note?: string;
  tripSlug?: string;
}): string {
  const { payeeUpiId, payeeName, amount, note, tripSlug } = params;
  const sanitizedUpi = payeeUpiId.trim();
  const sanitizedName = encodeURIComponent(payeeName.trim());
  const sanitizedAmount = amount.toFixed(2);
  const sanitizedNote = encodeURIComponent(
    note || `WanderLedger Settle ${tripSlug ? `(${tripSlug})` : ""}`
  );

  return `upi://pay?pa=${sanitizedUpi}&pn=${sanitizedName}&am=${sanitizedAmount}&cu=INR&tn=${sanitizedNote}`;
}

/**
 * Two-pointer greedy cash flow minimizer.
 * Members with negative net are Debtors; members with positive net are Creditors.
 * Matches Debtors to Creditors in minimum steps to eliminate circular debts.
 */
export function minimizeCashFlow(
  travelers: Traveler[],
  netBalances: Map<string, NetBalance> | Map<string, MemberFinancials>,
  tripSlug: string = "trip"
): SettlementTransaction[] {
  const travelerMap = new Map<string, Traveler>(travelers.map((t) => [t.id, t]));

  interface Party {
    id: string;
    name: string;
    avatar: string;
    upiId: string;
    amount: number; // positive magnitude
  }

  const debtors: Party[] = [];
  const creditors: Party[] = [];

  for (const [id, data] of netBalances) {
    const net = "balance" in data ? data.balance : data.net;
    const traveler = travelerMap.get(id);
    const upiId =
      traveler?.upiId ||
      `${(traveler?.name || "traveler").toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`;
    const avatar = traveler?.avatar || "🎒";

    if (net < -0.01) {
      debtors.push({
        id,
        name: data.name,
        avatar,
        upiId,
        amount: Math.abs(net),
      });
    } else if (net > 0.01) {
      creditors.push({
        id,
        name: data.name,
        avatar,
        upiId,
        amount: net,
      });
    }
  }

  // Sort descending by amount for optimal large-chunk settlement matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementTransaction[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount >= 1) {
      const roundedAmount = Math.round(settleAmount);
      const note = `WanderLedger: ${debtor.name} to ${creditor.name} (${tripSlug})`;

      transactions.push({
        id: `tx-${debtor.id}-${creditor.id}-${transactions.length}`,
        fromId: debtor.id,
        fromName: debtor.name,
        fromAvatar: debtor.avatar,
        toId: creditor.id,
        toName: creditor.name,
        toAvatar: creditor.avatar,
        toUpiId: creditor.upiId,
        toUpi: creditor.upiId,
        amount: roundedAmount,
        upiLink: generateUpiUrl({
          payeeUpiId: creditor.upiId,
          payeeName: creditor.name,
          amount: roundedAmount,
          note,
          tripSlug,
        }),
        note,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) d++;
    if (creditor.amount < 0.01) c++;
  }

  return transactions;
}

/**
 * Direct cash flow minimizer implementing the exact Phase 1 specification:
 * - For every member: net = actualPaid - totalShare
 * - Match negative debtors with positive creditors in minimum transactions.
 * - Output: Array of direct payments: { fromId, fromName, toId, toName, toUpi, amount }
 */
export function minimizeDebts(
  members: Array<{
    id: string;
    name: string;
    upiId?: string;
    actualPaid: number;
    totalShare: number;
  }>
): DirectPayment[] {
  interface Party {
    id: string;
    name: string;
    toUpi: string;
    amount: number;
  }

  const debtors: Party[] = [];
  const creditors: Party[] = [];

  for (const m of members) {
    const net = m.actualPaid - m.totalShare;
    const upi = m.upiId || `${m.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`;

    if (net < -0.01) {
      debtors.push({
        id: m.id,
        name: m.name,
        toUpi: upi,
        amount: Math.abs(net),
      });
    } else if (net > 0.01) {
      creditors.push({
        id: m.id,
        name: m.name,
        toUpi: upi,
        amount: net,
      });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const payments: DirectPayment[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount >= 1) {
      payments.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        toUpi: creditor.toUpi,
        amount: Math.round(settleAmount),
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) d++;
    if (creditor.amount < 0.01) c++;
  }

  return payments;
}

/**
 * Checks whether the viewer is authorized to trigger the UPI payment.
 * Role-locked: ONLY the verified debtor (payer) can initiate their UPI payment.
 */
export function isUpiUnlockedForViewer(
  transaction: SettlementTransaction,
  activeTravelerId: string
): boolean {
  return transaction.fromId === activeTravelerId;
}

/**
 * Formatted WhatsApp Settlement & Summary matching exact user specification:
 * 🌴 *WANDERLEDGER - TRIP SETTLEMENT & SUMMARY*
 * Total Trip Cost: ₹[Total]
 * Cost Per Head: ₹[PerHead]
 *
 * 💳 *INDIVIDUAL BUDGET TRACKER:*
 * • [Name]: Budget ₹[Starting] | Share ₹[Share] | Remaining: ₹[Remaining] (or ⚠️ OVER BUDGET by ₹[X])
 *
 * 🤝 *FINAL PAYMENTS (WHO PAYS WHOM):*
 * • [Payer] ➔ [Receiver]: ₹[Amount] (UPI: [ReceiverUPI])
 */
export function generateOfficialWhatsAppSummary(params: {
  totalTripCost: number;
  perHeadCost: number;
  financials: MemberFinancials[];
  transactions: SettlementTransaction[];
}): string {
  const { totalTripCost, perHeadCost, financials, transactions } = params;

  let msg = `🌴 *WANDERLEDGER - TRIP SETTLEMENT & SUMMARY*\n`;
  msg += `Total Trip Cost: ₹${totalTripCost.toLocaleString("en-IN")}\n`;
  msg += `Cost Per Head: ₹${perHeadCost.toLocaleString("en-IN")}\n\n`;

  msg += `💳 *INDIVIDUAL BUDGET TRACKER:*\n`;
  for (const m of financials) {
    if (m.isOverBudget) {
      msg += `• ${m.name}: Budget ₹${m.startingBudget.toLocaleString("en-IN")} | Share ₹${m.actualShare.toLocaleString("en-IN")} | ⚠️ OVER BUDGET by ₹${m.overBudgetAmount.toLocaleString("en-IN")}\n`;
    } else {
      msg += `• ${m.name}: Budget ₹${m.startingBudget.toLocaleString("en-IN")} | Share ₹${m.actualShare.toLocaleString("en-IN")} | Remaining: ₹${m.remainingBalance.toLocaleString("en-IN")}\n`;
    }
  }

  msg += `\n🤝 *FINAL PAYMENTS (WHO PAYS WHOM):*\n`;
  if (transactions.length === 0) {
    msg += `• All balances are settled! Zero pending dues.\n`;
  } else {
    for (const tx of transactions) {
      msg += `• ${tx.fromName} ➔ ${tx.toName}: ₹${tx.amount.toLocaleString("en-IN")} (UPI: ${tx.toUpiId})\n`;
    }
  }

  return msg;
}

/**
 * Backward compatibility alias.
 */
export function generateWhatsAppExport(params: {
  tripTitle: string;
  tripSlug: string;
  totalPledged: number;
  totalSpent: number;
  expensesCount: number;
  transactions: SettlementTransaction[];
  nextStopTitle?: string;
  nextStopEta?: string;
  financials?: MemberFinancials[];
}): string {
  if (params.financials && params.financials.length > 0) {
    const perHead = params.financials.length > 0 ? Math.round(params.totalSpent / params.financials.length) : 0;
    return generateOfficialWhatsAppSummary({
      totalTripCost: params.totalSpent,
      perHeadCost: perHead,
      financials: params.financials,
      transactions: params.transactions,
    });
  }

  const moneyLeft = Math.max(0, params.totalPledged - params.totalSpent);
  const percentLeft = params.totalPledged > 0 ? ((moneyLeft / params.totalPledged) * 100).toFixed(1) : "0";

  let msg = `🌴 *WANDERLEDGER - TRIP SETTLEMENT & SUMMARY*\n`;
  msg += `Total Trip Cost: ₹${params.totalSpent.toLocaleString("en-IN")}\n`;
  msg += `Total Initial Budget: ₹${params.totalPledged.toLocaleString("en-IN")}\n\n`;

  msg += `🤝 *FINAL PAYMENTS (WHO PAYS WHOM):*\n`;
  if (params.transactions.length === 0) {
    msg += `• All balances are settled! Zero pending dues.\n`;
  } else {
    params.transactions.forEach((tx) => {
      msg += `• ${tx.fromName} ➔ ${tx.toName}: ₹${tx.amount.toLocaleString("en-IN")} (UPI: ${tx.toUpiId})\n`;
    });
  }
  return msg;
}
