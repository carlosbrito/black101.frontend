import { formatDateTime } from '../../cadastros/cadastroCommon';
import type { ImportacaoDetails } from '../importacoes/importacoes.shared';
import { statusClass } from '../importacoes/importacoes.shared';

type ImportacaoDetailsDrawerProps = {
  selected: ImportacaoDetails;
  selectedLoading: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onCopy: (value: string | null | undefined, label: string) => Promise<void>;
  onReprocess: (id: string) => Promise<void>;
  cedenteLabelById: (id: string) => string;
};

const formatDateOrDash = (value?: string | null) => (value ? formatDateTime(value) : '-');

export const ImportacaoDetailsDrawer = ({
  selected,
  selectedLoading,
  onClose,
  onRefresh,
  onCopy,
  onReprocess,
  cedenteLabelById,
}: ImportacaoDetailsDrawerProps) => {
  return (
    <div className="modal-backdrop import-details-modal-backdrop" onClick={onClose}>
      <div className="modal-card import-details-modal-card" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h3>Detalhes da importação</h3>
            <p>ID: {selected.id}</p>
          </div>
          <button className="btn-muted" onClick={onClose}>
            Fechar
          </button>
        </header>

        {selectedLoading ? <div className="drawer-loading">Atualizando detalhes...</div> : null}

        <div className="grid-2">
          <div>
            <div className={statusClass(selected.status)}>{selected.status}</div>
            <p><strong>Arquivo:</strong> {selected.fileName ?? selected.fileKey ?? '-'}</p>
            <p><strong>Tipo:</strong> {selected.tipoArquivo ?? '-'}</p>
            <p><strong>Origem:</strong> {selected.origem ?? '-'}</p>
            <p><strong>Cedente:</strong> {selected.cedenteId ? cedenteLabelById(selected.cedenteId) : '-'}</p>
            <p><strong>Modalidade:</strong> {selected.modalidade ?? '-'}</p>
            <p><strong>Tipo Banco:</strong> {selected.tipoBanco ?? '-'}</p>
            <p><strong>Tipo CNAB:</strong> {selected.tipoCnab ?? '-'}</p>
            <p><strong>Tentativas:</strong> {selected.tentativas ?? 0}</p>
            <p><strong>Última tentativa:</strong> {formatDateOrDash(selected.ultimaTentativaEm)}</p>
          </div>
          <div>
            <p><strong>FIDC:</strong> {selected.fidcId ?? '-'}</p>
            <p><strong>Usuário:</strong> {selected.userEmail ?? '-'}</p>
            <p><strong>Criado:</strong> {formatDateOrDash(selected.createdAt)}</p>
            <p><strong>Concluído:</strong> {formatDateOrDash(selected.completedAt)}</p>
            <p><strong>Hash:</strong> {selected.fileHash ?? '-'}</p>
            <p><strong>Código falha:</strong> {selected.ultimoCodigoFalha ?? '-'}</p>
            <p><strong>CorrelationId:</strong> {selected.correlationId ?? '-'}</p>
            <p><strong>MessageId:</strong> {selected.ultimoMessageId ?? '-'}</p>
          </div>
        </div>

        {selected.errorSummary ? (
          <div className="error-box">
            <strong>Erro:</strong> {selected.errorSummary}
          </div>
        ) : null}

        <div className="events-block">
          <h4>Eventos</h4>
          <ul className="events">
            {selected.eventos.length > 0
              ? selected.eventos.map((evento) => (
                <li key={evento.id}>
                  <span className={statusClass(evento.status)}>{evento.status}</span>
                  <div>{evento.message ?? '-'}</div>
                  <small>{formatDateOrDash(evento.createdAt)}</small>
                </li>
              ))
              : <li>Nenhum evento retornado.</li>}
          </ul>
        </div>

        <div className="drawer-actions">
          <button className="btn-muted" onClick={() => void onRefresh()}>
            Atualizar agora
          </button>
          <button className="btn-muted" onClick={() => void onCopy(selected.id, 'ID')}>
            Copiar ID
          </button>
          <button className="btn-muted" onClick={() => void onCopy(selected.correlationId, 'CorrelationId')}>
            Copiar CorrelationId
          </button>
          {selected.status === 'FINALIZADO_FALHA' ? (
            <button className="btn-main" onClick={() => void onReprocess(selected.id)}>
              Reprocessar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
