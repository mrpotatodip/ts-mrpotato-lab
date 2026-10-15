// -----
// Dev stand-in: La Sorella's real menu (#327);
// tags, sizes and Christmas are guesses.
// -----

export type Variant = { name: string; price: string };
export type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price: string;
  variants: Variant[] | null;
  isAvailable: boolean;
  dietaryTags: string[];
};
export type Category = { name: string; note: string | null };

const sizes = (s: string, l: string): Variant[] => [
  { name: "Small", price: s },
  { name: "Large", price: l },
];


export const businessProfile = {
  description: "Café in Fishkill, NY serving breakfast, sandwiches, salads, soups, pastries, coffee, cocktails and wine.",
  websiteUrl: "https://www.lasorellafishkill.com",
  phone: "845-871-2010",
  email: "lasorellafishkill@gmail.com",
  address: "992 Main Street, Suite 22, Fishkill, NY 12524",
};

// 0 = Sunday
export const businessHours = [
  { dayOfWeek: 0, opensAt: "08:00", closesAt: "14:00", isClosed: false },
  { dayOfWeek: 1, opensAt: null, closesAt: null, isClosed: true },
  { dayOfWeek: 2, opensAt: "08:00", closesAt: "16:00", isClosed: false },
  { dayOfWeek: 3, opensAt: "08:00", closesAt: "16:00", isClosed: false },
  { dayOfWeek: 4, opensAt: "08:00", closesAt: "16:00", isClosed: false },
  { dayOfWeek: 5, opensAt: "08:00", closesAt: "16:00", isClosed: false },
  { dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00", isClosed: false },
];

export const hoursOverrides = [
  { date: "2026-12-25", opensAt: null, closesAt: null, isClosed: true, note: "Closed for Christmas" },
];

export const faqCategories = ["Ordering & gift cards", "About us"];

export const faqs = [
  {
    category: "Ordering & gift cards",
    question: "Can I order online?",
    answer: "Yes, order online through the 'Online ordering' link on lasorellafishkill.com.",
    country: "US",
  },
  {
    category: "Ordering & gift cards",
    question: "Do you sell gift cards?",
    answer: "Yes, gift cards are sold through the 'Gift Cards' page on lasorellafishkill.com.",
    country: "US",
  },
  {
    category: "About us",
    question: "Do you have a sister restaurant?",
    answer: "Yes, our sister restaurant is Il Figlio Enoteca.",
  },
];

export const categories: Category[] = [
  { name: "Breakfast", note: null },
  { name: "Sandwiches", note: "Served alongside a petite green salad. Substitute gluten-free bread +2." },
  { name: "Salads", note: null },
  { name: "Soups", note: null },
  { name: "Pastries, Breads, Sweet & Savory", note: null },
  { name: "Coffee", note: null },
  { name: "Seasonal Drinks", note: "All syrups are made in house using natural ingredients only." },
  { name: "Cocktails", note: null },
  { name: "Wine", note: "Price is per glass." },
];

let n = 0;
const item = (
  category: string,
  name: string,
  description: string | null,
  price: string,
  extra: Partial<Pick<MenuItem, "variants" | "dietaryTags" | "isAvailable">> = {},
): MenuItem => ({
  id: `item_${++n}`,
  category,
  name,
  description,
  price,
  variants: extra.variants ?? null,
  isAvailable: extra.isAvailable ?? true,
  dietaryTags: extra.dietaryTags ?? [],
});

const V = ["vegetarian"];

export const menuItems: MenuItem[] = [
  item("Breakfast", "Quiche", "prosciutto, spinach, ricotta, wild mushrooms", "10"),
  item("Breakfast", "Egg Sandwich", "bacon, basil pesto, melted fontina, focaccia roll", "8.50"),
  item("Breakfast", "Smoked Salmon Toast", "whipped cream cheese, capers, red onion, toasted heritage wheat", "15"),
  item("Breakfast", "Nutella Stuffed Croissant", "bananas, strawberries, whipped cream", "10", { dietaryTags: V }),
  item("Breakfast", "Egg White Sandwich", "egg white, tuscan kale, sun-dried tomato pesto, whole grain pullman toast", "9", { dietaryTags: V }),
  item("Breakfast", "Avocado Toast", "toasted heritage wheat, burrata, olio verde", "11", { dietaryTags: V }),

  item("Sandwiches", "Roasted Turkey", "avocado, bacon, tomato, romaine, dill mayonnaise, toasted schiacciata toscana (thin focaccia)", "15"),
  item("Sandwiches", "Prosciutto di Parma", "mozzarella, basil pesto, campari tomatoes, toasted ciabatta", "15"),
  item("Sandwiches", "Fried Chicken Milanese", "roasted mushrooms, artichoke spread, fontina, arugula, pressed focaccia", "16"),
  item("Sandwiches", "Tuna Salad", "lemon, celery, red onion, romaine, tomato, toasted multigrain", "15"),
  item("Sandwiches", "Grilled Eggplant Caprese", "mozzarella, tomato, grilled eggplant, basil pesto, baby arugula, aceto balsamico, pressed ciabatta", "14", { dietaryTags: V }),
  item("Sandwiches", "Chicken Salad", "romaine, campari tomatoes, tarragon, toasted croissant", "15"),
  item("Sandwiches", "B.L.A.T.", "applewood smoked bacon, tomato, gem lettuce, herb mayo avocado, toasted multigrain", "15"),

  item("Salads", "Greek Salad", "hearts of romaine, peppers, kalamata olives, grilled shrimp, stuffed grape leaves, feta cheese, red wine vinaigrette & cucumber tzatziki", "17"),
  item("Salads", "Italian Chop Chop", "romaine, cherry tomatoes, chickpeas, sopresatta, red onion, olives, banana peppers, red wine vinaigrette, parmigiano reggiano", "16"),
  item("Salads", "Grilled Chicken Kale Caesar", "tuscan kale, romaine, crispy chickpeas, creamy caesar dressing, parmesan, ciabatta croutons, grilled chicken", "17"),
  item("Salads", "Classic Cobb", "avocado, bacon, pulled chicken, fontina, hard boiled egg, baby tomatoes, red wine vinaigrette", "17"),
  item("Salads", "Warm Grain Bowl", "farro, arugula & quinoa, roasted sweet potato, brussel sprouts, crumbled goat cheese, grilled shrimp, gala apple, balsamic-honey vinaigrette", "18"),
  item("Salads", "Chinese Chicken Salad", "napa cabbage, lo mein noodles, shredded chicken, roasted peanuts, scallions, red bell pepper, peanut-soy dressing", "17"),

  item("Soups", "Doris's Chicken Soup", null, "8"),
  item("Soups", "Creamy Tomato Soup", null, "8"),

  item("Pastries, Breads, Sweet & Savory", "Croissant", null, "5", { dietaryTags: V }),
  item("Pastries, Breads, Sweet & Savory", "Almond Croissant", null, "6", { dietaryTags: V }),
  item("Pastries, Breads, Sweet & Savory", "Pain au Chocolat", null, "6", { dietaryTags: V }),
  item("Pastries, Breads, Sweet & Savory", "Cheese Puff Danish", null, "6", { dietaryTags: V }),
  item("Pastries, Breads, Sweet & Savory", "Scone", null, "5", { dietaryTags: V }),
  item("Pastries, Breads, Sweet & Savory", "Muffin", null, "4", { dietaryTags: V }),
  item("Pastries, Breads, Sweet & Savory", "Gluten-Free Muffin", null, "5", { dietaryTags: ["vegetarian", "gluten-free"] }),
  item("Pastries, Breads, Sweet & Savory", "Cinnamon Monkey Bread", null, "6", { dietaryTags: V }),
  item("Pastries, Breads, Sweet & Savory", "Everything Cookie", null, "4", { dietaryTags: V }),

  item("Coffee", "La Sorella House Blend Drip Coffee", "Strongtree Coffee Roasters", "2.75", { variants: sizes("2.75", "4.50") }),
  item("Coffee", "Espresso", null, "3"),
  item("Coffee", "Double Espresso", null, "4.50"),
  item("Coffee", "Cappuccino", null, "4.50", { variants: sizes("4.50", "6") }),
  item("Coffee", "Americano", null, "4"),
  item("Coffee", "Latte", null, "4.75", { variants: sizes("4.75", "6.25") }),
  item("Coffee", "Matcha Lavender Latte", null, "5", { variants: sizes("5", "6.50") }),
  item("Coffee", "Cafe Mocha", null, "5", { variants: sizes("5", "6.50") }),
  item("Coffee", "Pistachio Latte", null, "5", { variants: sizes("5", "6.50") }),
  item("Coffee", "Cold Brew", null, "4", { variants: sizes("4", "6") }),
  item("Coffee", "Hot Tea", null, "3.50"),
  item("Coffee", "Fresh Brewed Blood Orange Iced Tea", "unsweetened", "3", { variants: sizes("3", "5") }),

  item("Seasonal Drinks", "Tiramisu Latte", "whipped mascarpone cream, cocoa powder, chocolate dipped lady finger biscuit", "9"),
  item("Seasonal Drinks", "Honey Vanilla Latte", null, "6.50", { variants: sizes("6.50", "8") }),
  item("Seasonal Drinks", "Spiced Pumpkin Latte", null, "6.50", { variants: sizes("6.50", "8") }),

  ...["Bloody Mary", "Martini", "Negroni", "Margarita", "Manhattan", "Aperol Spritz", "Bellini", "Old Fashioned"].map((c) =>
    item("Cocktails", c, null, "12"),
  ),
  item("Cocktails", "Espresso Martini", null, "14"),

  ...[
    ["Pinot Grigio", "white"],
    ["Sauvignon Blanc", "white"],
    ["Chardonnay", "white"],
    ["Rosé", "sparkling & rosé"],
    ["Prosecco", "sparkling & rosé"],
    ["Pinot Noir", "red"],
    ["Cabernet Sauvignon", "red"],
    ["Cotes du Rhone", "red"],
  ].map(([w, kind]) => item("Wine", w, kind, "12")),
];
