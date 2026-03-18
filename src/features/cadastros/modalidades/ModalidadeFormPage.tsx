import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageFrame } from '../../../shared/ui/PageFrame';
import '../cadastro.css';
import '../administradoras/entity-form.css';

export const ModalidadeFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const modalidadeId = params.id;

  const currentTitle = useMemo(
    () => (modalidadeId ? `Modalidade: ${modalidadeId}` : 'Modalidades'),
    [modalidadeId],
  );

  return (
    <PageFrame
      title={currentTitle}
      subtitle="No backend atual, as modalidades são mantidas por parametrização de cedente e não por CRUD dedicado."
      actions={<button className="btn-muted" onClick={() => navigate('/cadastro/modalidades')}>Voltar para listagem</button>}
    >
      <section className="entity-card">
        <header>
          <h3>CRUD indisponível para Modalidades</h3>
          <p>Use a listagem de modalidades por cedente em Cadastro Modalidades.</p>
        </header>
        <div className="entity-loading">
          Endpoint de cadastro/edição dedicado não encontrado no backend C# atual.
        </div>
      </section>
    </PageFrame>
  );
};
