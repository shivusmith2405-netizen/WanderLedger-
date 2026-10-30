/**
 * WanderLedger NPCI-Compliant UPI URI Formatter
 * Standard Format:
 * upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(tripTitle)}
 */

export interface UpiPaymentParams {
  upiId: string;
  name: string;
  amount: number | string;
  tripTitle?: string;
  note?: string;
}

/**
 * Formats a UPI payment intent URL matching the exact user specification:
 * upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(tripTitle)}
 */
export function formatUpiUrl(params: UpiPaymentParams): string {
  const { upiId, name, amount, tripTitle = "WanderLedger Settlement", note } = params;
  
  const cleanUpi = (upiId || "").trim();
  const cleanName = encodeURIComponent((name || "Friend").trim());
  
  // Format amount as fixed 2 decimal places if number, or clean string
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const cleanAmount = isNaN(numAmount) ? "0.00" : (Math.round(numAmount * 100) / 100).toFixed(2);
  
  const transactionNote = encodeURIComponent(note || tripTitle || "WanderLedger Settle");

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${transactionNote}`;
}

/**
 * Convenience helper accepting positional arguments.
 */
export function createUpiIntent(
  upiId: string,
  name: string,
  amount: number,
  tripTitle: string = "WanderLedger Settle"
): string {
  return formatUpiUrl({ upiId, name, amount, tripTitle });
}
