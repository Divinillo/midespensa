// @ts-nocheck
// Categorías de ingredientes y sus estilos
const CATEGORIES = ['carnes','pescado','verduras','legumbres','lácteos','pasta y harinas','conservas','fruta','bebidas','congelados','bollería y dulces','snacks y aperitivos','especias y condimentos'];
const CAT_EMOJI  = {carnes:'🥩',pescado:'🐟',verduras:'🥦',legumbres:'🫘','lácteos':'🧀','pasta y harinas':'🍝',conservas:'🥫',fruta:'🍎',bebidas:'☕',congelados:'🧊','bollería y dulces':'🍪','snacks y aperitivos':'🥜','especias y condimentos':'🧂'};
const CAT_BG     = {carnes:'bg-red-100',pescado:'bg-sky-100',verduras:'bg-emerald-100',legumbres:'bg-amber-100','lácteos':'bg-purple-100','pasta y harinas':'bg-orange-100',conservas:'bg-slate-100',fruta:'bg-rose-100',bebidas:'bg-stone-100',congelados:'bg-cyan-100','bollería y dulces':'bg-yellow-100','snacks y aperitivos':'bg-lime-100','especias y condimentos':'bg-teal-100'};
const CAT_TEXT   = {carnes:'text-red-700',pescado:'text-sky-700',verduras:'text-emerald-700',legumbres:'text-amber-700','lácteos':'text-purple-700','pasta y harinas':'text-orange-700',conservas:'text-slate-700',fruta:'text-rose-700',bebidas:'text-stone-700',congelados:'text-cyan-700','bollería y dulces':'text-yellow-700','snacks y aperitivos':'text-lime-700','especias y condimentos':'text-teal-700'};

const FREE_DISH_LIMIT   = 2;
const FREE_TICKET_LIMIT = 1;

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

export { CATEGORIES, CAT_EMOJI, CAT_BG, CAT_TEXT, ING_EMOJI, FREE_DISH_LIMIT, FREE_TICKET_LIMIT };

export function getIngEmoji(name: string, cat: string): string {
  const n = name.toLowerCase();
  const emoji = ING_EMOJI as Record<string, string>;
  if (emoji[n]) return emoji[n];
  for (const [k, v] of Object.entries(emoji)) {
    if (n.includes(k) || k.includes(n)) return v;
  }
  return (CAT_EMOJI as Record<string, string>)[cat] || '🛒';
}

export const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const WEEK_DAYS   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
export const STORE_EMOJI: Record<string,string> = {'Mercadona':'🟢','Consum':'🔵','Lidl':'🟡','Aldi':'🔴','Carrefour':'🔷','Dia':'🟠','El Corte Inglés':'🏬'};
