export function HighlightedText({ text, keyword }: { text: string; keyword?: string }) {
  const trimmedKeyword = keyword?.trim();
  if (!trimmedKeyword) return <>{text}</>;

  const pattern = new RegExp(`(${escapeRegExp(trimmedKeyword)})`, 'gi');
  const parts = text.split(pattern);

  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmedKeyword.toLowerCase() ? <mark key={`${part}-${index}`}>{part}</mark> : part
      )}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
