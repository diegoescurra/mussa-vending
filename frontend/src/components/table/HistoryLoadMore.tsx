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
      <button
        type="button"
        disabled={isFetching}
        onClick={() => fetchNextPage()}
        className="rounded-2xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
      >
        {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
      </button>
      {isFetchNextPageError ? <p role="alert" className="text-sm text-red-700">No se pudo cargar la siguiente página.</p> : null}
    </div>
  );
};
