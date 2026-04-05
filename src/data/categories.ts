// @ts-nocheck
// Categorías de ingredientes y sus estilos

// ── Spanish categories ────────────────────────────────────────────
const CATEGORIES = ['carnes','pescado','verduras','legumbres','lácteos','pasta y harinas','conservas','fruta','bebidas','congelados','bollería y dulces','snacks y aperitivos','especias y condimentos'];
const CAT_EMOJI  = {carnes:'🥩',pescado:'🐟',verduras:'🥦',legumbres:'🫘','lácteos':'🧀','pasta y harinas':'🍝',conservas:'🥫',fruta:'🍎',bebidas:'☕',congelados:'🧊','bollería y dulces':'🍪','snacks y aperitivos':'🥜','especias y condimentos':'🧂'};
const CAT_BG     = {carnes:'bg-red-100',pescado:'bg-sky-100',verduras:'bg-emerald-100',legumbres:'bg-amber-100','lácteos':'bg-yellow-100','pasta y harinas':'bg-orange-100',conservas:'bg-slate-100',fruta:'bg-orange-100',bebidas:'bg-stone-100',congelados:'bg-cyan-100','bollería y dulces':'bg-pink-100','snacks y aperitivos':'bg-lime-100','especias y condimentos':'bg-teal-100'};
const CAT_TEXT   = {carnes:'text-red-700',pescado:'text-sky-700',verduras:'text-emerald-700',legumbres:'text-amber-700','lácteos':'text-yellow-700','pasta y harinas':'text-orange-700',conservas:'text-slate-700',fruta:'text-orange-700',bebidas:'text-stone-700',congelados:'text-cyan-700','bollería y dulces':'text-pink-700','snacks y aperitivos':'text-lime-700','especias y condimentos':'text-teal-700'};

// ── US categories ─────────────────────────────────────────────────
const CATEGORIES_US = ['produce','meat','poultry','seafood','deli','dairy','bakery','pantry','condiments','snacks','beverages','frozen','breakfast','baking','health'];
const CAT_EMOJI_US  = {produce:'🥦',meat:'🥩',poultry:'🍗',seafood:'🐟',deli:'🥪',dairy:'🧀',bakery:'🍞',pantry:'🫘',condiments:'🧂',snacks:'🍿',beverages:'☕',frozen:'🧊',breakfast:'🥣',baking:'🌾',health:'💊'};
const CAT_BG_US     = {produce:'bg-emerald-100',meat:'bg-red-100',poultry:'bg-orange-100',seafood:'bg-sky-100',deli:'bg-pink-100',dairy:'bg-yellow-100',bakery:'bg-amber-100',pantry:'bg-slate-100',condiments:'bg-teal-100',snacks:'bg-lime-100',beverages:'bg-stone-100',frozen:'bg-cyan-100',breakfast:'bg-orange-50',baking:'bg-amber-50',health:'bg-green-100'};
const CAT_TEXT_US   = {produce:'text-emerald-700',meat:'text-red-700',poultry:'text-orange-700',seafood:'text-sky-700',deli:'text-pink-700',dairy:'text-yellow-700',bakery:'text-amber-700',pantry:'text-slate-700',condiments:'text-teal-700',snacks:'text-lime-700',beverages:'text-stone-700',frozen:'text-cyan-700',breakfast:'text-orange-600',baking:'text-amber-600',health:'text-green-700'};

const FREE_DISH_LIMIT          = 5;   // max saved dishes in free
const FREE_TICKET_LIMIT        = 3;   // max total tickets in free
const FREE_TICKET_PHOTO_LIMIT  = 1;   // max photo/OCR tickets in free
const FREE_SUGGESTION_LIMIT    = 5;   // max AI suggestions shown in free
const FREE_SCAN_HISTORY        = 5;   // scan history items shown in free
const FREE_PRICE_HISTORY_DAYS  = 30;  // days of price history in free

// ── Emoji lookup: Spanish ─────────────────────────────────────────
const ING_EMOJI={
  'pollo':'🍗','pechuga de pollo':'🍗','muslos de pollo':'🍗','pollo entero':'🍗',
  'ternera':'🥩','carne picada':'🥩','solomillo':'🥩','chuleta de ternera':'🥩',
  'cerdo':'🐷','lomo de cerdo':'🐷','costillas de cerdo':'🍖','chuleta de cerdo':'🍖','codillo de cerdo':'🍖',
  'jamón serrano':'🍖','jamón york':'🍖','chorizo':'🥩','salchichón':'🥩','mortadela':'🥩','fuet':'🥩','chistorra':'🥩','salami':'🥩','sobrasada':'🥩',
  'pavo':'🦃','pato':'🦆','conejo':'🐇',
  'salmón':'🐟','atún':'🐟','merluza':'🐟','bacalao':'🐟','sardinas':'🐟','boquerones':'🐟','gambas':'🦐','mejillones':'🦪',
  'huevos':'🥚','leche':'🥛','leche entera':'🥛','leche semidesnatada':'🥛','leche desnatada':'🥛',
  'yogur':'🫙','queso':'🧀','mantequilla':'🧈','nata':'🥛','kéfir':'🫙',
  'tomate':'🍅','lechuga':'🥬','cebolla':'🧅','cebolla morada':'🧅','ajo':'🧄','ajo puerro':'🧄','zanahoria':'🥕','patata':'🥔','boniato':'🥔','yuca':'🥔',
  'pimiento':'🫑','calabacín':'🫑','berenjena':'🍆','espinacas':'🥬','brócoli':'🥦',
  'coliflor':'🥦','pepino':'🥒','maíz dulce':'🌽','espárragos':'🌿','acelgas':'🥬',
  'aguacate':'🥑','limón':'🍋','naranja':'🍊','manzana':'🍎','plátano':'🍌',
  'fresas':'🍓','uvas':'🍇','pera':'🍐','sandía':'🍉','melón':'🍈','melocotón':'🍑','kiwi':'🥝','mango':'🥭',
  'pan':'🍞','baguette':'🥖','pan de molde':'🍞','tostadas':'🍞',
  'arroz':'🍚','pasta':'🍝','espaguetis':'🍝','macarrones':'🍝','fideos':'🍝',
  'harina':'🌾','avena':'🌾','quinoa':'🌾','lentejas':'🫘','garbanzos':'🫘','alubias':'🫘','judías':'🫘',
  'aceite de oliva':'🫙','aceite':'🫙','vinagre':'🫙','sal':'🧂','azúcar':'🍬','miel':'🍯',
  'café':'☕','té':'🍵','cacao en polvo':'☕',
  'agua':'💧','agua mineral':'💧','zumo de naranja':'🧃','zumo':'🧃',
  'leche de avena':'🥛','leche de almendra':'🥛','leche de soja':'🥛',
  'vino tinto':'🍷','vino blanco':'🍾','cerveza':'🍺',
  'tomate triturado':'🍅','tomate frito':'🍅','atún en lata':'🐟','sardinas en lata':'🐟',
  'chocolate':'🍫','galletas':'🍪','cereales':'🥣','granola':'🥣',
  'patatas fritas':'🥔','frutos secos':'🥜','almendras':'🥜','nueces':'🥜',
  'pizza congelada':'🍕','croquetas':'🍘','helado':'🍦',
  'pimentón':'🧂','pimentón dulce':'🧂','pimentón picante':'🌶️','comino':'🧂','orégano':'🌿','pimienta':'🧂','canela':'🧂','tomillo':'🌿','romero':'🌿','laurel':'🌿',
};

// ── Emoji lookup: US ──────────────────────────────────────────────
const ING_EMOJI_US: Record<string,string> = {
  'chicken breast':'🍗','chicken thighs':'🍗','chicken wings':'🍗','whole chicken':'🍗','rotisserie chicken':'🍗','ground chicken':'🍗',
  'ground beef':'🥩','ribeye steak':'🥩','sirloin steak':'🥩','chuck roast':'🥩','beef brisket':'🥩','pork chops':'🍖','baby back ribs':'🍖','bacon':'🥓','hot dogs':'🌭',
  'salmon fillet':'🐟','tuna steak':'🐟','shrimp':'🦐','lobster tail':'🦞','crab legs':'🦀','scallops':'🦪','canned tuna':'🐟',
  'eggs':'🥚','milk':'🥛','whole milk':'🥛','butter':'🧈','cream cheese':'🧀','cheddar cheese':'🧀','mozzarella':'🧀','parmesan':'🧀',
  'greek yogurt':'🫙','yogurt':'🫙','heavy whipping cream':'🥛','sour cream':'🫙','half-and-half':'🥛',
  'apple':'🍎','banana':'🍌','orange':'🍊','lemon':'🍋','avocado':'🥑','strawberry':'🍓','blueberry':'🫐','grape':'🍇','watermelon':'🍉','mango':'🥭','pineapple':'🍍',
  'tomato':'🍅','lettuce':'🥬','onion':'🧅','garlic':'🧄','carrot':'🥕','potato':'🥔','sweet potato':'🥔','broccoli':'🥦','spinach':'🥬','kale':'🥬',
  'avocado':'🥑','jalapeño':'🌶️','bell pepper':'🫑','mushrooms':'🍄','corn':'🌽','cucumber':'🥒','zucchini':'🫑','eggplant':'🍆',
  'white bread':'🍞','whole wheat bread':'🍞','tortillas':'🫓','bagels':'🥯','english muffins':'🫓','hamburger buns':'🍔','pita bread':'🫓',
  'pasta':'🍝','spaghetti':'🍝','rice':'🍚','brown rice':'🍚','quinoa':'🌾','oats':'🌾','black beans':'🫘','kidney beans':'🫘','chickpeas':'🫘',
  'olive oil':'🫙','ketchup':'🍅','mustard':'🌭','ranch dressing':'🫙','bbq sauce':'🍖','hot sauce':'🌶️','soy sauce':'🫙','honey':'🍯','maple syrup':'🍯','peanut butter':'🥜',
  'coffee':'☕','orange juice':'🧃','apple juice':'🧃','sparkling water':'💧','beer':'🍺','wine':'🍷','red wine':'🍷','white wine':'🍾','kombucha':'🫙',
  'frozen pizza':'🍕','ice cream':'🍦','frozen peas':'🧊','french fries':'🍟','chicken nuggets':'🍗',
  'cereal':'🥣','granola':'🥣','oatmeal':'🥣','pancake mix':'🥞','maple syrup':'🍯',
  'flour':'🌾','sugar':'🍬','baking powder':'🌾','vanilla extract':'🫙','chocolate chips':'🍫',
  'protein powder':'💊','almond milk':'🥛','oat milk':'🥛','tofu':'🫙','tempeh':'🫙','kombucha':'🫙',
};

export {
  CATEGORIES, CAT_EMOJI, CAT_BG, CAT_TEXT,
  CATEGORIES_US, CAT_EMOJI_US, CAT_BG_US, CAT_TEXT_US,
  ING_EMOJI, ING_EMOJI_US,
  FREE_DISH_LIMIT, FREE_TICKET_LIMIT, FREE_TICKET_PHOTO_LIMIT,
  FREE_SUGGESTION_LIMIT, FREE_SCAN_HISTORY, FREE_PRICE_HISTORY_DAYS,
};

/** Returns emoji for an ingredient name + category (ES or US) */
export function getIngEmoji(name: string, cat: string, isUS = false): string {
  const n = name.toLowerCase();
  const emoji = (isUS ? ING_EMOJI_US : ING_EMOJI) as Record<string, string>;
  const catEmoji = (isUS ? CAT_EMOJI_US : CAT_EMOJI) as Record<string, string>;
  if (emoji[n]) return emoji[n];
  for (const [k, v] of Object.entries(emoji)) {
    if (n.includes(k) || k.includes(n)) return v;
  }
  return catEmoji[cat] || '🛒';
}

// ── Calendar localization ─────────────────────────────────────────
export const MONTH_NAMES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const WEEK_DAYS      = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
export const WEEK_DAYS_EN   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── Store emojis: ES + US ─────────────────────────────────────────
export const STORE_EMOJI: Record<string,string> = {
  // Spain
  'Mercadona':'🟢','Consum':'🔵','Lidl':'🟡','Aldi':'🔴','Carrefour':'🔷','Dia':'🟠','El Corte Inglés':'🏬',
  // USA
  'Walmart':'🔵','Target':'🎯','Whole Foods':'🟩','Kroger':'🔶','Costco':'🟦','Trader Joe\'s':'🌸','Aldi':'🔴','Publix':'🟢','Safeway':'🟥','HEB':'🟧','Instacart':'🛒','Amazon Fresh':'📦','Sam\'s Club':'🔷','Meijer':'🟩','Sprouts':'🌿',
};
