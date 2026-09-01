type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export const isMissingSupabaseRelationError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const supabaseError = error as SupabaseLikeError;
  const text = [
    supabaseError.message,
    supabaseError.details,
    supabaseError.hint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    supabaseError.code === '42P01' ||
    supabaseError.code === 'PGRST205' ||
    text.includes('could not find the table') ||
    text.includes('schema cache') ||
    (text.includes('relation') && text.includes('does not exist'))
  );
};
