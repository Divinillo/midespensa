import { useTranslation } from 'react-i18next';
import type { Ingredient } from '../data/types';

/**
 * Returns the localized display name of an ingredient.
 * En inglés → nameEn (si existe), en español → name.
 */
export function useIngredientName() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  return (ing: Ingredient): string => {
    if (isEn && ing.nameEn) return capitalize(ing.nameEn);
    return capitalize(ing.name);
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
