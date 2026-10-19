/** Online orders (staff admin), the public customer shop, and online-shop settings/notifications. */
export const shop: Record<string, string> = {
  // Navigation and statuses
  "Online Orders": "Dalabaadka Onlaynka",
  NEW: "Cusub",
  CONFIRMED: "La xaqiijiyay",
  COMPLETED: "La dhammeeyay",

  // Online orders list
  "Orders customers placed on your public shop page": "Dalabaadka macaamiishu ka sameeyeen bogga dukaankaaga ee dadweynaha",
  "Open shop page": "Fur bogga dukaanka",
  "Search order no., name or phone": "Raadi lambarka dalabka, magaca ama taleefanka",
  "All statuses": "Dhammaan xaaladaha",
  "No online orders yet.": "Weli ma jiraan dalabaad onlayn ah.",

  // Online order detail
  "Online Order {number}": "Dalab Onlayn {number}",
  "Placed {date}": "La dalbaday {date}",
  "Customer record": "Diiwaanka macmiilka",
  "Existing customer with this phone: {name}": "Macmiil hore oo leh taleefankan: {name}",
  "Not linked to a customer record.": "Kuma xidhna diiwaan macmiil.",
  "Link to customer": "Ku xidh macmiilka",
  "Save as customer": "U kaydi macmiil ahaan",
  "Customer linked": "Macmiilka waa la xidhay",
  "Mark as new": "U calaamadee cusub",
  Confirm: "Xaqiiji",
  "Mark completed": "U calaamadee dhammaaday",
  "Cancel order": "Jooji dalabka",
  "Order marked {status}": "Dalabka waxaa loo calaamadeeyay {status}",
  "Cancel this order?": "Ma joojinaysaa dalabkan?",
  "Customer notes": "Qoraallada macmiilka",
  "In stock now": "Kaydka hadda",
  "(deleted)": "(la tirtiray)",
  "Delete order": "Tirtir dalabka",
  "Delete online order {number}? This cannot be undone.": "Ma tirtiraysaa dalabka onlaynka {number}? Tan dib looma celin karo.",
  "Online order deleted": "Dalabka onlaynka waa la tirtiray",
  "Online order not found": "Dalabka onlaynka lama helin",

  // Public shop
  "This shop is not accepting online orders right now. Please contact us directly.":
    "Dukaankani hadda ma aqbalayo dalabaad onlayn ah. Fadlan si toos ah noola soo xidhiidh.",
  "Search products": "Raadi alaabta",
  "All {count} in cart": "Dhammaan {count} waa ku jiraan dambiisha",
  "Add another ({count} in cart)": "Mid kale ku dar ({count} ayaa dambiisha ku jira)",
  "Add to cart": "Ku dar dambiisha",
  "Thank you, your order has been received.": "Mahadsanid, dalabkaaga waa la helay.",
  "Order number": "Lambarka dalabka",
  "We will contact you on the phone number you gave to confirm it.":
    "Waxaan kugala soo xidhiidhi doonnaa lambarka taleefanka aad bixisay si aan u xaqiijinno.",
  "Your cart ({count})": "Dambiishaada ({count})",
  "Your cart is empty. Add products to place an order.": "Dambiishaadu waa madhan. Ku dar alaab si aad dalab u samayso.",
  "Decrease quantity": "Yaree tirada",
  "Increase quantity": "Kordhi tirada",
  "Your details": "Xogtaada",
  "Full name *": "Magaca oo dhan *",
  "Phone number *": "Lambarka taleefanka *",
  "Email (optional)": "Iimaylka (ikhtiyaari)",
  "Delivery address (optional)": "Cinwaanka gaarsiinta (ikhtiyaari)",
  "Notes for the shop (optional)": "Qoraal dukaanka loogu talagalay (ikhtiyaari)",
  "Placing order...": "Dalabka waa la dirayaa...",
  "Place order · {total}": "Dalbo · {total}",
  "Could not place your order. Please check your connection and try again.":
    "Dalabkaaga lama dirin. Fadlan hubi xidhiidhkaaga internetka oo mar kale isku day.",

  // Public shop order errors (server action + validation)
  "Too many orders from this device. Please try again later.":
    "Dalabaad aad u badan ayaa qalabkan laga diray. Fadlan mar dambe isku day.",
  "This shop is not available.": "Dukaankan lama heli karo.",
  "This shop is not accepting online orders right now.": "Dukaankani hadda ma aqbalayo dalabaad onlayn ah.",
  "Invalid order details": "Xogta dalabku waa khalad",
  "Some products in your cart are no longer available and were removed. Please review your cart.":
    "Alaab ku jirtay dambiishaada lama heli karo hadda waana laga saaray. Fadlan dib u eeg dambiishaada.",
  'Only {count} of "{name}" left in stock.': 'Kaliya {count} ka mid ah "{name}" ayaa kaydka ku hadhay.',
  '"{name}" is out of stock.': '"{name}" kaydka kama jiro.',
  "Please enter your name": "Fadlan geli magacaaga",
  "Please enter a valid phone number": "Fadlan geli lambar taleefan oo sax ah",
  "Please enter a valid email": "Fadlan geli iimayl sax ah",
  "Your cart is empty": "Dambiishaadu waa madhan",

  // Settings and notifications
  "Online shop": "Dukaanka onlaynka",
  "A public page where customers browse your products and place orders without logging in. New orders appear under Online Orders.":
    "Bog dadweyne oo macaamiishu ku eegaan alaabtaada oo ay dalab ku sameeyaan iyagoon gelin. Dalabaadka cusub waxay ka muuqdaan Dalabaadka Onlaynka.",
  "Accept orders on the public shop page": "Ka aqbal dalabaad bogga dukaanka dadweynaha",
  "Shop link:": "Linkiga dukaanka:",
  "New online order": "Dalab onlayn oo cusub",
  "{order} from {customer} ({phone})": "{order} oo ka yimid {customer} ({phone})"
};
