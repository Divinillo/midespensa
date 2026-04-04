// @ts-nocheck
// US recipe library — English recipes for the American market
export const RECIPE_DB_US = [
  // — CHICKEN & POULTRY —
  { id:'us01', name:'Grilled Chicken Breast',      cat:'meat',      kcal:280, prot:42, carbs:0,  fat:11, sugar:0, diets:['omnivore','healthy','paleo','keto'],
    when:'both', tiempo:'20 min', dificultad:'Easy',
    steps:['Season chicken breasts with salt, pepper, and garlic powder.','Heat grill or skillet over medium-high heat with a little oil.','Cook 6–7 min per side until internal temp reaches 165 °F.','Rest for 5 min before slicing to keep the juices in.'],
    consejo:'Pound the chicken to even thickness so it cooks evenly.',
    ings:['chicken breast','garlic','olive oil','pepper','salt'] },

  { id:'us02', name:'BBQ Chicken Thighs',          cat:'meat',      kcal:380, prot:32, carbs:12, fat:20, sugar:9, diets:['omnivore'],
    when:'both', tiempo:'35 min', dificultad:'Easy',
    steps:['Pat chicken thighs dry and season with salt and pepper.','Sear in an oven-safe skillet over medium-high heat, skin-side down, for 8 min.','Flip, brush generously with BBQ sauce, and transfer to a 400 °F oven.','Bake 20 min, brush again with sauce, and broil 3 min until caramelized.'],
    consejo:'Bone-in, skin-on thighs stay juiciest on the grill.',
    ings:['chicken thighs','olive oil','pepper','salt'] },

  { id:'us03', name:'Chicken Tacos',               cat:'meat',      kcal:420, prot:30, carbs:38, fat:14, sugar:3, diets:['omnivore','healthy'],
    when:'both', tiempo:'25 min', dificultad:'Easy',
    steps:['Season chicken with cumin, chili powder, garlic powder, salt, and pepper.','Cook in a skillet over medium-high heat until golden and cooked through.','Shred or slice the chicken and warm the tortillas.','Build tacos with your favorite toppings: salsa, avocado, shredded cheese, lime.'],
    consejo:'Use rotisserie chicken to cut prep time in half.',
    ings:['chicken breast','tortillas','onion','garlic','lime','olive oil'] },

  { id:'us04', name:'Buffalo Chicken Wings',       cat:'meat',      kcal:440, prot:35, carbs:4,  fat:30, sugar:1, diets:['omnivore'],
    when:'dinner', tiempo:'55 min', dificultad:'Medium',
    steps:['Pat wings dry and season with salt, pepper, and garlic powder.','Bake at 425 °F on a rack-lined sheet pan for 45 min, flipping halfway, until crispy.','Toss in melted butter mixed with hot sauce (2:1 ratio).','Serve immediately with celery and blue cheese or ranch dressing.'],
    consejo:'Dry the wings in the fridge uncovered overnight for extra crispy skin.',
    ings:['chicken wings','butter','garlic','pepper','salt'] },

  { id:'us05', name:'Chicken Caesar Salad',        cat:'poultry',   kcal:380, prot:35, carbs:12, fat:20, sugar:2, diets:['omnivore','healthy'],
    when:'lunch', tiempo:'20 min', dificultad:'Easy',
    steps:['Season and grill or pan-sear chicken breast until cooked through; rest then slice.','Chop romaine lettuce and place in a large bowl.','Add croutons and toss with Caesar dressing.','Top with sliced chicken and freshly grated Parmesan.'],
    consejo:'Make your own croutons by cubing day-old bread and toasting with olive oil and garlic.',
    ings:['chicken breast','romaine lettuce','parmesan','olive oil','garlic','pepper','salt'] },

  // — BEEF —
  { id:'us06', name:'Classic Cheeseburger',        cat:'meat',      kcal:620, prot:38, carbs:38, fat:32, sugar:6, diets:['omnivore'],
    when:'both', tiempo:'20 min', dificultad:'Easy',
    steps:['Form 80/20 ground beef into 1/2-inch patties, pressing a dimple in the center.','Season generously with salt and pepper just before cooking.','Cook on a hot grill or skillet 3–4 min per side for medium.','Add cheese in the last minute, cover to melt, then build your burger.'],
    consejo:'Don\'t press the patty down — you lose all the juices.',
    ings:['ground beef','cheese','onion','garlic','olive oil'] },

  { id:'us07', name:'Beef Tacos',                  cat:'meat',      kcal:450, prot:28, carbs:38, fat:18, sugar:3, diets:['omnivore','healthy'],
    when:'both', tiempo:'20 min', dificultad:'Easy',
    steps:['Brown ground beef in a skillet over medium-high heat, breaking it up.','Drain excess fat, add taco seasoning and 1/4 cup water; simmer 5 min.','Warm tortillas on a dry skillet or directly over a gas flame.','Fill with beef and your favorite toppings.'],
    consejo:'Add a can of drained black beans to stretch the meat and add fiber.',
    ings:['ground beef','tortillas','onion','garlic','tomato','olive oil'] },

  { id:'us08', name:'Beef Stir Fry',               cat:'meat',      kcal:380, prot:30, carbs:22, fat:16, sugar:5, diets:['omnivore','healthy'],
    when:'both', tiempo:'20 min', dificultad:'Easy',
    steps:['Slice steak thin against the grain; season with salt and pepper.','Heat oil in a wok or large skillet over very high heat.','Sear beef in batches 1–2 min; remove and set aside.','Stir-fry vegetables, return beef, add soy sauce, garlic, and ginger; toss to coat.'],
    consejo:'Freeze the steak for 20 min first — it\'s much easier to slice thin.',
    ings:['beef','garlic','onion','olive oil','pepper','salt'] },

  { id:'us09', name:'Meatloaf',                    cat:'meat',      kcal:420, prot:32, carbs:18, fat:22, sugar:4, diets:['omnivore'],
    when:'dinner', tiempo:'75 min', dificultad:'Easy',
    steps:['Preheat oven to 350 °F. Mix ground beef, egg, onion, breadcrumbs, salt, and pepper.','Shape into a loaf in a baking dish or line a loaf pan.','Mix ketchup with brown sugar and Worcestershire; spread half on top.','Bake 55–65 min, adding remaining glaze halfway through. Rest before slicing.'],
    consejo:'Use a mix of 80/20 beef and ground pork for a moister loaf.',
    ings:['ground beef','onion','garlic','eggs','olive oil','pepper','salt'] },

  // — PORK —
  { id:'us10', name:'BBQ Pulled Pork',             cat:'meat',      kcal:480, prot:38, carbs:16, fat:22, sugar:10, diets:['omnivore'],
    when:'dinner', tiempo:'240 min', dificultad:'Medium',
    steps:['Rub pork shoulder with salt, pepper, paprika, and brown sugar.','Slow cook in the oven at 300 °F for 4–5 hours until it pulls apart easily.','Shred with two forks and toss with BBQ sauce.','Serve on brioche buns with coleslaw.'],
    consejo:'A slow cooker on low for 8 hours gives the same results hands-free.',
    ings:['pork','garlic','olive oil','pepper','salt'] },

  { id:'us11', name:'Pork Chops with Apples',      cat:'meat',      kcal:420, prot:35, carbs:22, fat:18, sugar:14, diets:['omnivore','healthy'],
    when:'dinner', tiempo:'35 min', dificultad:'Medium',
    steps:['Season pork chops with salt, pepper, and thyme.','Sear in butter over medium-high heat 3–4 min per side; set aside.','In the same pan, sauté apple slices with a pinch of sugar and cinnamon until golden.','Deglaze with apple cider, reduce to a sauce, return chops to warm through.'],
    consejo:'Bone-in chops stay juicier — pull them at 145 °F internal temp.',
    ings:['pork','garlic','olive oil','pepper','salt'] },

  // — PASTA & GRAINS —
  { id:'us12', name:'Mac and Cheese',              cat:'pasta',     kcal:580, prot:22, carbs:58, fat:28, sugar:4, diets:['vegetarian'],
    when:'both', tiempo:'30 min', dificultad:'Easy',
    steps:['Cook macaroni al dente in salted water; reserve 1 cup pasta water.','Melt butter in a saucepan, whisk in flour to make a roux, then add milk gradually.','Stir in shredded cheddar (and gruyère if you like) until melted and smooth.','Toss with drained pasta, adding pasta water as needed for consistency.'],
    consejo:'Bake with breadcrumb topping under the broiler for a crispy crust.',
    ings:['pasta','cheese','eggs','butter','salt'] },

  { id:'us13', name:'Spaghetti with Meat Sauce',  cat:'pasta',     kcal:540, prot:32, carbs:52, fat:18, sugar:6, diets:['omnivore','healthy'],
    when:'lunch', tiempo:'40 min', dificultad:'Easy',
    steps:['Brown ground beef in a large skillet; drain fat. Add onion and garlic, cook 3 min.','Add canned crushed tomatoes, Italian seasoning, salt, and a pinch of sugar.','Simmer on low for 20–25 min until rich and thickened.','Cook spaghetti to al dente, drain, and toss with sauce.'],
    consejo:'Add a Parmesan rind to the sauce while it simmers for incredible depth.',
    ings:['pasta','ground beef','tomato','onion','garlic','olive oil','salt'] },

  { id:'us14', name:'Pasta Primavera',             cat:'pasta',     kcal:420, prot:14, carbs:58, fat:14, sugar:5, diets:['vegetarian','healthy'],
    when:'lunch', tiempo:'25 min', dificultad:'Easy',
    steps:['Cook pasta al dente; reserve some pasta water.','Sauté garlic and your choice of spring vegetables in olive oil until tender-crisp.','Add a splash of pasta water and toss with the drained pasta.','Finish with Parmesan, lemon zest, and fresh herbs.'],
    consejo:'Use whatever vegetables need using up — this is a great fridge-cleaner meal.',
    ings:['pasta','garlic','olive oil','parmesan','salt','pepper'] },

  // — SEAFOOD —
  { id:'us15', name:'Shrimp Tacos',               cat:'seafood',   kcal:360, prot:26, carbs:36, fat:12, sugar:3, diets:['omnivore','healthy'],
    when:'both', tiempo:'20 min', dificultad:'Easy',
    steps:['Season shrimp with cumin, chili powder, garlic powder, salt, and lime juice.','Cook in a hot oiled skillet 1–2 min per side until pink and curled.','Warm tortillas and build tacos with shrimp, shredded cabbage, and a lime crema.'],
    consejo:'Don\'t overcrowd the pan — cook in batches for a proper sear.',
    ings:['shrimp','tortillas','lime','garlic','olive oil','salt','pepper'] },

  { id:'us16', name:'Baked Salmon',               cat:'seafood',   kcal:360, prot:38, carbs:2,  fat:20, sugar:0, diets:['omnivore','healthy','paleo','keto'],
    when:'dinner', tiempo:'20 min', dificultad:'Easy',
    steps:['Preheat oven to 400 °F. Place salmon on a lined baking sheet.','Brush with olive oil; season with salt, pepper, garlic, and lemon zest.','Bake 12–15 min until the fish flakes easily with a fork.','Squeeze fresh lemon over the top before serving.'],
    consejo:'Start skin-side down for crispier skin, or wrap in foil for ultra-moist salmon.',
    ings:['salmon','lemon','garlic','olive oil','salt','pepper'] },

  { id:'us17', name:'Clam Chowder',               cat:'seafood',   kcal:380, prot:18, carbs:32, fat:20, sugar:3, diets:['omnivore'],
    when:'lunch', tiempo:'40 min', dificultad:'Medium',
    steps:['Cook bacon in a large pot until crisp; remove and set aside.','Sauté onion and celery in the drippings; add flour and cook 2 min.','Add clam juice, diced potatoes, and thyme; simmer 15 min until potatoes are tender.','Stir in cream and clams; heat gently. Season and top with bacon and oyster crackers.'],
    consejo:'Never boil after adding the cream — it will curdle.',
    ings:['onion','garlic','olive oil','salt','pepper'] },

  // — VEGETARIAN / SIDES —
  { id:'us18', name:'Mashed Potatoes',            cat:'produce',   kcal:280, prot:5,  carbs:40, fat:12, sugar:2, diets:['vegetarian','healthy'],
    when:'both', tiempo:'30 min', dificultad:'Easy',
    steps:['Peel and cube potatoes; boil in salted water until very tender, about 20 min.','Drain well and return to the hot pot to steam dry for 1 min.','Mash with warm butter and warm cream; season generously with salt and pepper.','Fold rather than stir — overmixing makes them gluey.'],
    consejo:'Yukon Gold potatoes give the creamiest, most buttery result.',
    ings:['potatoes','butter','garlic','salt','pepper'] },

  { id:'us19', name:'Caesar Salad',               cat:'produce',   kcal:300, prot:8,  carbs:18, fat:22, sugar:2, diets:['vegetarian','healthy'],
    when:'lunch', tiempo:'15 min', dificultad:'Easy',
    steps:['Whisk together garlic, lemon juice, Dijon, anchovy paste (optional), and Parmesan for the dressing.','Slowly drizzle in olive oil, whisking constantly, until emulsified.','Toss chopped romaine with dressing until well coated.','Top with croutons and extra Parmesan.'],
    consejo:'Rub the bowl with a cut garlic clove before adding the lettuce for a subtle background flavor.',
    ings:['romaine lettuce','parmesan','garlic','lemon','olive oil','salt','pepper'] },

  { id:'us20', name:'Black Bean Soup',            cat:'legumes',   kcal:320, prot:16, carbs:48, fat:6,  sugar:4, diets:['vegetarian','vegan','healthy'],
    when:'lunch', tiempo:'35 min', dificultad:'Easy',
    steps:['Sauté onion, garlic, and bell pepper in oil until softened.','Add cumin, chili powder, and oregano; toast 30 seconds.','Add black beans (drained and rinsed) and broth; simmer 20 min.','Blend half the soup for a thicker texture; season and serve with lime and sour cream.'],
    consejo:'Canned beans work great here — rinse them well to reduce sodium.',
    ings:['black beans','onion','garlic','tomato','olive oil','salt','pepper'] },

  { id:'us21', name:'Guacamole',                  cat:'produce',   kcal:180, prot:2,  carbs:10, fat:15, sugar:1, diets:['vegan','healthy','paleo','keto'],
    when:'both', tiempo:'10 min', dificultad:'Easy',
    steps:['Halve and pit ripe avocados; scoop flesh into a bowl.','Mash to your preferred texture with lime juice, salt, and a pinch of cumin.','Fold in diced onion, jalapeño, cilantro, and tomato.','Taste and adjust seasoning; press plastic wrap directly onto the surface to store.'],
    consejo:'Place an avocado pit in the bowl to help slow browning.',
    ings:['avocado','lime','onion','garlic','tomato','salt','pepper'] },

  { id:'us22', name:'Pancakes',                   cat:'dairy',     kcal:380, prot:10, carbs:58, fat:12, sugar:12, diets:['vegetarian'],
    when:'breakfast', tiempo:'20 min', dificultad:'Easy',
    steps:['Whisk together flour, baking powder, sugar, and salt in a bowl.','In another bowl, whisk egg, milk, and melted butter.','Combine wet and dry ingredients; stir until just combined — lumps are fine.','Cook on a buttered griddle over medium heat; flip when bubbles appear on the surface.'],
    consejo:'Let the batter rest for 5 min for fluffier pancakes.',
    ings:['eggs','butter','milk','salt'] },

  { id:'us23', name:'Breakfast Scramble',         cat:'dairy',     kcal:320, prot:20, carbs:8,  fat:22, sugar:1, diets:['vegetarian','healthy','keto'],
    when:'breakfast', tiempo:'15 min', dificultad:'Easy',
    steps:['Whisk eggs with a splash of milk, salt, and pepper.','Sauté your choice of vegetables (peppers, onion, spinach) in butter until soft.','Pour in eggs and stir gently over medium-low heat until just set.','Top with shredded cheese and serve immediately.'],
    consejo:'Low and slow is the key — overcooked eggs go rubbery.',
    ings:['eggs','butter','cheese','onion','salt','pepper'] },

  // — SOUPS & STEWS —
  { id:'us24', name:'Chicken Noodle Soup',        cat:'poultry',   kcal:280, prot:24, carbs:28, fat:7,  sugar:3, diets:['omnivore','healthy'],
    when:'lunch', tiempo:'45 min', dificultad:'Easy',
    steps:['Sauté onion, carrot, and celery in a large pot with oil until softened.','Add garlic, thyme, and bay leaf; cook 1 min.','Pour in chicken broth; bring to a boil and add chicken breast.','Cook 20 min, remove chicken, shred it, return to pot with egg noodles, and cook 8 min more.'],
    consejo:'Use the carcass of a rotisserie chicken for a richer broth.',
    ings:['chicken breast','onion','garlic','olive oil','salt','pepper'] },

  { id:'us25', name:'Beef Chili',                 cat:'meat',      kcal:420, prot:32, carbs:30, fat:16, sugar:5, diets:['omnivore','healthy'],
    when:'dinner', tiempo:'60 min', dificultad:'Easy',
    steps:['Brown ground beef in a large pot; drain fat. Add onion and garlic, cook 3 min.','Stir in chili powder, cumin, paprika, and tomato paste; cook 2 min.','Add crushed tomatoes, kidney beans, and beef broth; bring to a boil.','Simmer 35–40 min until thickened. Season and serve with toppings.'],
    consejo:'Chili tastes even better the next day — make it ahead.',
    ings:['ground beef','onion','garlic','tomato','beans','olive oil','salt','pepper'] },

  // — SANDWICHES / HANDHELD —
  { id:'us26', name:'Grilled Cheese Sandwich',    cat:'dairy',     kcal:420, prot:16, carbs:36, fat:24, sugar:2, diets:['vegetarian'],
    when:'both', tiempo:'10 min', dificultad:'Easy',
    steps:['Butter one side of each bread slice.','Place cheese between the unbuttered sides.','Cook butter-side down in a skillet over medium-low heat 3–4 min.','Flip carefully and cook another 3 min until golden and cheese is fully melted.'],
    consejo:'Low and slow is the secret — high heat burns the bread before the cheese melts.',
    ings:['cheese','butter','eggs','salt'] },

  { id:'us27', name:'BLT Sandwich',               cat:'meat',      kcal:480, prot:18, carbs:34, fat:28, sugar:3, diets:['omnivore'],
    when:'lunch', tiempo:'15 min', dificultad:'Easy',
    steps:['Cook bacon in a skillet or oven at 400 °F until crispy; drain on paper towels.','Toast the bread until golden.','Spread mayo on both slices; layer with lettuce, tomato slices, and bacon.','Season the tomato with salt and pepper; assemble and cut diagonally.'],
    consejo:'Heirloom tomatoes in season make this sandwich outstanding.',
    ings:['tomato','butter','salt','pepper'] },

  // — QUICK & EASY —
  { id:'us28', name:'Avocado Toast',              cat:'produce',   kcal:320, prot:8,  carbs:30, fat:18, sugar:1, diets:['vegetarian','vegan','healthy'],
    when:'breakfast', tiempo:'10 min', dificultad:'Easy',
    steps:['Toast your bread until golden and sturdy.','Halve the avocado, remove the pit, and scoop the flesh into a bowl.','Mash with lemon juice, salt, and red pepper flakes.','Spread on toast and top as you like — fried egg, everything bagel seasoning, microgreens.'],
    consejo:'Use sourdough or thick multigrain bread so it can hold the toppings.',
    ings:['avocado','lemon','eggs','butter','salt','pepper'] },

  { id:'us29', name:'Quesadillas',                cat:'dairy',     kcal:440, prot:20, carbs:40, fat:22, sugar:2, diets:['vegetarian'],
    when:'both', tiempo:'15 min', dificultad:'Easy',
    steps:['Lay a large tortilla flat in a dry skillet over medium heat.','Cover half with shredded cheese and your filling; fold in half.','Cook 2–3 min until golden, then flip carefully and cook 2 min more.','Cut into wedges and serve with salsa, sour cream, and guacamole.'],
    consejo:'Don\'t overfill — a thin layer of cheese seals the quesadilla shut.',
    ings:['tortillas','cheese','onion','garlic','olive oil','salt'] },

  { id:'us30', name:'Veggie Fried Rice',          cat:'produce',   kcal:380, prot:10, carbs:55, fat:12, sugar:3, diets:['vegetarian','healthy'],
    when:'both', tiempo:'20 min', dificultad:'Easy',
    steps:['Use cold, day-old rice for best results. Heat oil in a wok over very high heat.','Scramble eggs in the wok, push to the side.','Add vegetables and stir-fry 2–3 min; add rice and toss to combine.','Season with soy sauce, sesame oil, and green onions; stir-fry 2 min more.'],
    consejo:'Fresh hot rice turns mushy — always use leftovers from the day before.',
    ings:['rice','eggs','onion','garlic','olive oil','salt','pepper'] },
];
