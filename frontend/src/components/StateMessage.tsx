type StateMessageProps = {
  title: string;
  description: string;
};

export const StateMessage = ({ title, description }: StateMessageProps) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
};
