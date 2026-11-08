import { Button } from '@/components/ui/button';
type HistoryQuery = {
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
};

export const HistoryLoadMore = ({ query }: { query: HistoryQuery }) => {
  const { hasNextPage, isFetching, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;
  if (!hasNextPage) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button type="button" disabled={isFetching} onClick={() => fetchNextPage()} variant="outline">
        {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
      </Button>
      {isFetchNextPageError ? (
        <p role="alert" className="text-sm text-red-700">
          No se pudo cargar la siguiente página.
        </p>
      ) : null}
    </div>
  );
};
