/** Payments, payment history, receivables, receipts, customer ledger, and platform subscription payment forms. */
export const payments: Record<string, string> = {
  // Server action errors
  "Invalid payment data": "Xogta lacag-bixinta waa khalad",
  "Order not found": "Dalabka lama helin",
  "Overpayment is not allowed for this order": "Lacag ka badan inta lagu leeyahay looma oggola dalabkan",
  "Payment not found": "Lacag-bixinta lama helin",

  // Payments page
  "Installment-friendly payment tracking": "La socodka lacag-bixinnada, oo ay ku jiraan qaybo-qaybo",
  "Customer History / Print": "Taariikhda Macmiilka / Daabac",
  "Record New Payment": "Diiwaangeli Lacag-bixin Cusub",
  "Search by phone, customer name, order number, or reference…":
    "Ku raadi taleefan, magaca macmiilka, lambarka dalabka, ama tixraac…",
  "Clear": "Nadiifi",
  "{count} result for \"{q}\"": "{count} natiijo oo loogu talagalay \"{q}\"",
  "{count} results for \"{q}\"": "{count} natiijo oo loogu talagalay \"{q}\"",
  " · showing first 50, refine to narrow": " · waxaa la muujinayaa 50-ka ugu horreeya, raadintaada sii cayim",
  "Showing the 15 most recent payments — search above to find any payment.":
    "Waxaa la muujinayaa 15-ka lacag-bixin ee ugu dambeeyay — kor ka raadi si aad u hesho lacag-bixin kasta.",
  "No payments found.": "Lacag-bixin lama helin.",
  "Receipt": "Rasiid",
  "Delete this {amount} payment? This affects the order balance.":
    "Ma tirtiraysaa lacag-bixintan {amount}? Tani waxay saamaynaysaa haraaga dalabka.",
  "Payment deleted": "Lacag-bixinta waa la tirtiray",

  // Payment history
  "Payment History": "Taariikhda Lacag-bixinta",
  "Full payment record per customer — printable": "Diiwaanka lacag-bixinta oo dhan ee macmiil kasta — waa la daabici karaa",
  "Print History": "Daabac Taariikhda",
  "Printed:": "La daabacay:",
  "Total Ordered": "Wadarta la dalbaday",
  "Total Paid": "Wadarta la bixiyay",
  "Outstanding Balance": "Haraaga lagu leeyahay",
  "#": "#",
  "Cumulative Paid": "Wadarta la bixiyay ilaa hadda",
  "No payments recorded for this customer.": "Macmiilkan wax lacag-bixin ah looma diiwaangelin.",
  "Select a customer above to view their full payment history.":
    "Kor ka dooro macmiil si aad u aragto taariikhda lacag-bixintiisa oo dhan.",
  "Back to Payments": "Ku noqo Lacag-bixinnada",

  // Edit payment
  "Edit Payment": "Wax ka beddel Lacag-bixinta",
  "Payment updated": "Lacag-bixinta waa la cusboonaysiiyay",
  "Update failed": "Cusboonaysiintu way fashilantay",
  "Order:": "Dalab:",
  "Payment Method": "Habka Lacag-bixinta",
  "Select method…": "Dooro habka…",
  "Amount ($)": "Qaddarka ($)",
  "Reference Number": "Lambarka Tixraaca",
  "e.g. TXN-001": "tusaale TXN-001",
  "Optional notes…": "Qoraallo ikhtiyaari ah…",
  "Saving…": "Waa la kaydinayaa…",
  "Save Changes": "Kaydi Isbeddelada",

  // Record payment form (orders)
  "Payment recorded — redirecting to receipt…": "Lacag-bixinta waa la diiwaangeliyay — waxaa loo gudbinayaa rasiidka…",
  "Failed to record payment": "Diiwaangelinta lacag-bixinta way fashilantay",
  "Search order by phone, name, or number…": "Ku raadi dalab taleefan, magac, ama lambar…",
  "Payment method…": "Habka lacag-bixinta…",
  "Reference number": "Lambarka tixraaca",
  "Record Payment": "Diiwaangeli Lacag-bixinta",

  // Receivables
  "Customers with an outstanding balance": "Macaamiisha lagu leeyahay haraa",
  "All Time": "Waqtiga oo dhan",
  "This Month": "Bishan",
  "This Year": "Sannadkan",
  "Custom": "Gaar ah",
  "Search customer": "Raadi macmiil",
  "Name, phone, or customer number": "Magac, taleefan, ama lambarka macmiilka",
  "Customer #": "Lambarka macmiilka",
  "Last order": "Dalabkii ugu dambeeyay",
  "Billed": "La qaansheegay",
  "No customers with an outstanding balance for this period.": "Muddadan ma jiro macmiil lagu leeyahay haraa.",
  "Total outstanding": "Wadarta lagu leeyahay",
  "{count} customer": "{count} macmiil",
  "{count} customers": "{count} macaamiil",
  " (showing top {count})": " (waxaa la muujinayaa {count}-ka ugu sarreeya)",

  // Ledger
  "Customer Ledger": "Buugga Xisaabta Macmiilka",
  "Complete debit/credit statement per customer": "Bayaanka deynta/lacag-celinta oo dhamaystiran ee macmiil kasta",
  "Debit": "Deyn",
  "Credit": "Lacag-celin",
  "Order {number}": "Dalab {number}",
  "Payment": "Lacag-bixin",

  // Receipts
  "Search an order or customer, then print the receipt": "Raadi dalab ama macmiil, kadibna daabac rasiidka",
  "Print Receipt": "Daabac Rasiidka",
  "Search by customer name, phone, or order number…": "Ku raadi magaca macmiilka, taleefan, ama lambarka dalabka…",
  "No orders match “{q}”. Try a different name or number.": "Ma jiro dalab ku habboon “{q}”. Isku day magac ama lambar kale.",
  "{count} match": "{count} ku habboon",
  "{count} matches": "{count} ku habboon",
  "Recent orders": "Dalabaadkii ugu dambeeyay",
  " · showing first 40, refine to narrow": " · waxaa la muujinayaa 40-ka ugu horreeya, raadintaada sii cayim",
  "Receipt generated: {date}": "Rasiidka waxaa la sameeyay: {date}",
  "Receipt QR Code": "Koodka QR ee Rasiidka",
  "Due: {date}": "Waqtiga: {date}",
  "Items": "Alaabta",
  "Garment": "Dharka",
  "Qty": "Tirada",
  "Unit": "Halkii",
  "Subtotal": "Wadar-hoosaad",
  "Balance Due": "Haraaga la bixinayo",
  "This receipt was generated on {date}": "Rasiidkan waxaa la sameeyay {date}",
  "Select an order above to view its receipt.": "Kor ka dooro dalab si aad u aragto rasiidkiisa.",

  // Platform subscription payment form
  "Payment recorded": "Lacag-bixinta waa la diiwaangeliyay",
  "Record payment": "Diiwaangeli lacag-bixin",
  "Record subscription payment": "Diiwaangeli lacag-bixinta rukunka",
  "Amount ({currency})": "Qaddarka ({currency})",
  "Transaction reference *": "Tixraaca macaamilka *",
  "Transaction reference (optional)": "Tixraaca macaamilka (ikhtiyaari)",
  "e.g. ZAAD txn id": "tusaale aqoonsiga macaamilka ZAAD",
  "Notes (optional)": "Qoraallo (ikhtiyaari)",
  "Confirm payment": "Xaqiiji lacag-bixinta",

  // Platform finance filter bar
  "Plan": "Qorshaha",
  "All plans": "Dhammaan qorshayaasha",
  "Joined from": "Ku biiray laga bilaabo",
  "Joined to": "Ku biiray ilaa"
};
