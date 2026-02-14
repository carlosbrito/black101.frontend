import { useLocation } from 'react-router-dom';
import { PageFrame } from '../../shared/ui/PageFrame';

export const EmConstrucaoPage = () => {
  const location = useLocation();

  return (
    <PageFrame
      title="Módulo em construção"
      subtitle="A estrutura de navegação já espelha o legado. Este item será implementado nas próximas fases."
    >
      <p>Rota atual: {location.pathname}</p>
    </PageFrame>
  );
};
