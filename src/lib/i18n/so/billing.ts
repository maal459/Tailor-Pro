/** Shop owner's subscription & billing portal (/billing), its invoice/receipt pages and subscription forms */
export const billing: Record<string, string> = {
  // Server action messages
  "Invalid payment details": "Faahfaahinta lacag-bixinta ma saxna",
  "Invoice not found.": "Qaansheegga lama helin.",

  // Layout / billing page
  "Subscription & Billing": "Rukunka & Biilasha",
  "Billing": "Biilasha",
  "Your account is suspended for non-payment.": "Akoonkaaga waa la hakiyay lacag la'aan awgeed.",
  "Settle the outstanding invoice below to restore access to your dashboard immediately.":
    "Bixi qaansheegga hoose ee lagu leeyahay si aad isla markiiba dib ugu hesho Dashboard-kaaga.",
  "Current plan": "Qorshaha hadda",
  "Free": "Bilaash",
  "per year": "sannadkii",
  "per month": "bishii",
  "Paid through:": "La bixiyay ilaa:",
  "Outstanding invoice": "Qaansheegga lagu leeyahay",
  "{number} · due {date}": "{number} · waqtiga bixinta {date}",
  "View / print invoice": "Eeg / daabac qaansheegga",
  "You're all paid up. Thank you!": "Wax lagugu leeyahay ma jiraan. Mahadsanid!",
  "Billing history": "Taariikhda biilasha",
  "Invoice": "Qaansheeg",
  "Receipt": "Rasiid",
  "Period": "Muddada",
  "Documents": "Dukumentiyada",
  "No invoices yet.": "Weli qaansheeg ma jiro.",

  // Plan names & taglines (from lib/billing/plans)
  "Free Trial": "Tijaabo bilaash ah",
  "Basic": "Aasaasi",
  "Pro": "Pro",
  "Enterprise": "Shirkad",
  "Evaluate Tailor Pro with real data": "Ku tijaabi Tailor Pro xog dhab ah",
  "For a single tailoring shop": "Dukaan harqaan oo keliya",
  "For a growing tailoring business": "Ganacsi harqaan oo koraya",
  "For multi-branch operations": "Ganacsiyo laamo badan leh",

  // Invoice page
  "Print / Save PDF": "Daabac / Kaydi PDF",
  "Billed to": "Loo diray",
  "Issued": "La soo saaray",
  "Due": "Waqtiga bixinta",
  "{plan} plan — annual subscription": "Qorshaha {plan} — rukun sannadle ah",
  "{plan} plan — monthly subscription": "Qorshaha {plan} — rukun bille ah",
  "Service period {start} – {end}": "Muddada adeegga {start} – {end}",
  "Balance due": "Haraaga la bixinayo",
  "How to pay": "Sida loo bixiyo",
  "Pay online with ZAAD or eDahab at {url}, or contact {platform}{support} to arrange payment.":
    "Ku bixi online ZAAD ama eDahab {url}, ama la xiriir {platform}{support} si lacag-bixinta loo diyaariyo.",
  "Pay online with ZAAD or eDahab from your billing page, or contact {platform}{support} to arrange payment.":
    "Ku bixi online ZAAD ama eDahab boggaaga biilasha, ama la xiriir {platform}{support} si lacag-bixinta loo diyaariyo.",
  "Generated {date}": "La sameeyay {date}",

  // Receipt page
  "Amount paid": "Qaddarka la bixiyay",
  "Received from": "Laga helay",
  "Payment method": "Habka lacag-bixinta",
  "Ref: {ref}": "Tixraac: {ref}",
  "For": "Loogu talagalay",
  "{plan} plan subscription": "Rukunka qorshaha {plan}",
  "Subscription payment": "Lacag-bixinta rukunka",
  "Invoice {number} · period {start} – {end}": "Qaansheeg {number} · muddada {start} – {end}",
  "Thank you for your payment.": "Waad ku mahadsantahay lacag-bixintaada.",
  "Cash": "Lacag caddaan ah",
  "Bank transfer": "Xawilaad bangi",
  "Card": "Kaar",
  "Manual": "Gacan",
  "Other": "Kale",

  // Pay subscription form
  "Online payment isn't enabled yet. Please pay using the details on your invoice or contact support, and it will be recorded for you.":
    "Lacag-bixinta online weli lama shidin. Fadlan ku bixi faahfaahinta qaansheeggaaga ku qoran ama la xiriir taageerada, waana laguu diiwaangelin doonaa.",
  "Payment successful — thank you!": "Lacag-bixintu way guulaysatay — mahadsanid!",
  "Approve the request on your phone": "Ku oggolow codsiga taleefankaaga",
  "Pay with": "Ku bixi",
  "Wallet / phone number": "Jeebka / lambarka taleefanka",
  "e.g. 63xxxxxxx": "tusaale 63xxxxxxx",
  "Requesting…": "Waa la codsanayaa…",
  "Pay {amount} with {provider}": "Ku bixi {amount} adoo adeegsanaya {provider}",
  "Approve the payment request on your phone. This page will update once it's confirmed — refresh in a moment.":
    "Ku oggolow codsiga lacag-bixinta taleefankaaga. Boggani wuu cusboonaan doonaa marka la xaqiijiyo — dib u cusboonaysii wax yar kadib.",
  "Payment received. Thank you!": "Lacagta waa la helay. Mahadsanid!",

  // Subscription panel (tenant edit page)
  "Billing settings saved": "Dejinta biilasha waa la kaydiyay",
  "Failed to save": "Kaydintu way guuldarraysatay",
  "Invoice generated": "Qaansheegga waa la sameeyay",
  "Failed to generate invoice": "Samaynta qaansheeggu way guuldarraysatay",
  "Billing cycle": "Wareegga biilka",
  "Monthly": "Bille",
  "Yearly (2 months free)": "Sanadle (2 bilood oo bilaash ah)",
  "Payment gateway (for auto-collect)": "Albaabka lacag-bixinta (ururin toos ah)",
  "None (manual)": "Midna (gacan)",
  "Payer wallet / phone": "Jeebka / taleefanka bixiyaha",
  "Auto-collect on renewal": "Si toos ah u ururi marka la cusboonaysiinayo",
  "Saving…": "Waa la kaydinayaa…",
  "Save billing settings": "Kaydi dejinta biilasha",
  "Free-plan tenants are not billed": "Macaamiisha qorshaha bilaashka ah lama biileeyo",
  "Generating…": "Waa la samaynayaa…",
  "Generate invoice now": "Hadda samee qaansheeg",

  // Charge gateway button
  "Send an online payment request via {provider} to this tenant's wallet?":
    "Ma u dirtaa codsi lacag-bixin online ah {provider} jeebka macmiilkan?",
  "Charged — invoice paid": "Lacagta waa la qaaday — qaansheegga waa la bixiyay",
  "Request sent — awaiting tenant approval": "Codsiga waa la diray — waxaa la sugayaa oggolaanshaha macmiilka",
  "Charge {provider}": "Ka qaad {provider}"
};
