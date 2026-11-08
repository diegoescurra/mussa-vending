import { SessionActions } from '@/components/auth/SessionActions';
import { ReposicionSteps } from './ReposicionSteps';
import { useReposicion } from './useReposicion';

export const ReposicionPage = () => {
  const reposicion = useReposicion();
  const {
    visibleStep,
    locked,
    pendingPayload,
    canFinish,
    hasConflict,
    saveMutation,
    goBack,
    goNext,
    canGoNext,
    finishReposicion,
    reloadInventory,
    newReposicion,
  } = reposicion;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <SessionActions />
        </div>
        <header className="mb-5 rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Reposición</p>
          <h1 className="mt-3 text-2xl font-bold">Formulario de reposición</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Pensado para celular o tablet. Avanza paso a paso y confirma el resumen antes de guardar.
          </p>
        </header>

        <div className="mb-4 grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className={`h-2 rounded-full ${item <= visibleStep ? 'bg-blue-600' : 'bg-slate-300'}`}
            />
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <fieldset disabled={locked || Boolean(pendingPayload)} className="min-w-0">
            <ReposicionSteps flow={reposicion} />
          </fieldset>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={visibleStep === 1 || locked || Boolean(pendingPayload)}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Atrás
            </button>
            {visibleStep < 6 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext()}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={finishReposicion}
                disabled={!canFinish}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {saveMutation.isPending
                  ? 'Guardando...'
                  : pendingPayload && saveMutation.isError
                    ? 'Reintentar envío'
                    : 'Finalizar reposición'}
              </button>
            )}
          </div>
          {hasConflict && !pendingPayload ? (
            <button
              type="button"
              onClick={reloadInventory}
              className="mt-3 w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700"
            >
              Recargar inventario y empezar de nuevo
            </button>
          ) : null}
          {saveMutation.isSuccess ? (
            <button
              type="button"
              onClick={newReposicion}
              className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Nueva reposición
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
};
