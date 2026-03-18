export const MovimentacoesToolbar = ({
  onRefresh,
  onCreate,
}: {
  onRefresh: () => void;
  onCreate: () => void;
}) => {
  return (
    <div className="toolbar">
      <button className="btn-main" onClick={onCreate}>Nova movimentação</button>
      <button className="btn-muted" onClick={onRefresh}>Atualizar</button>
    </div>
  );
};
