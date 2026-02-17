import { CadastroCrudPage } from '../CadastroCrudPage';
import type { Column } from '../../../shared/ui/DataTable';

export const BancarizadoresPage = () => {
  const columns: Column<Record<string, unknown>>[] = [
    { header: 'Nome', accessor: 'nome' },
    { header: 'Documento', accessor: 'documento' },
    { header: 'Email', accessor: 'email' },
    { header: 'Telefone', accessor: 'telefone' },
    { header: 'Ativo', accessor: 'ativo', type: 'boolean' },
    { header: 'Cadastro', accessor: 'createdAt', type: 'datetime' },
  ];

  const fields = [
    { name: 'nome', label: 'Nome' },
    { name: 'documento', label: 'CPF/CNPJ', mask: 'cpfCnpj' },
    { name: 'email', label: 'Email', type: 'email', required: false },
    { name: 'telefone', label: 'Telefone', mask: 'phone', required: false },
  ];

  const defaultValues = {
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    ativo: true,
  };

  return (
    <CadastroCrudPage
      title="Bancarizadores"
      subtitle="Cadastro e gestão de bancarizadores."
      endpoint="/cadastros/bancarizadores"
      columns={columns as Column<Record<string, unknown>>[]}
      fields={fields}
      defaultValues={defaultValues}
    />
  );
};
