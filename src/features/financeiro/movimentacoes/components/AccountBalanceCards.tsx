import type { MovimentacaoAccountBalanceCard } from '../types';

export const AccountBalanceCards = ({
  cards,
  loading,
}: {
  cards: MovimentacaoAccountBalanceCard[];
  loading: boolean;
}) => {
  if (loading) {
    return <p>Carregando saldos...</p>;
  }

  if (cards.length === 0) {
    return <p>Nenhum saldo encontrado para o período informado.</p>;
  }

  return (
    <section className="movimentacoes-balance-grid">
      {cards.map((card) => (
        <article key={card.id} className="movimentacoes-balance-card">
          <strong>{card.title}</strong>
          <span>{card.subtitle}</span>
          <b>{card.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
        </article>
      ))}
    </section>
  );
};
