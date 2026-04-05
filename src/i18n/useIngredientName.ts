import { useTranslation } from 'react-i18next';
import type { Ingredient } from '../data/types';

/**
 * Returns the localized display name of an ingredient.
 *
 * For ES ingredients (name is Spanish):
 *   - EN user → nameEn (if exists), else name
 *   - ES user → name
 *
 * For US ingredients (name is English):
 *   - EN user → name
 *   - ES user → nameEs (if exists), else name
 */
export function useIngredientName() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  return (ing: Ingredient): string => {
    const isUSIngredient = ing.id?.startsWith('u');

    if (isUSIngredient) {
      // US ingredient: name is in English
      if (!isEn && ing.nameEs) return capitalize(ing.nameEs);
      return capitalize(ing.name);
    } else {
      // ES ingredient: name is in Spanish
      if (isEn && ing.nameEn) return capitalize(ing.nameEn);
      return capitalize(ing.name);
    }
  };
}

function capitalize(s: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
