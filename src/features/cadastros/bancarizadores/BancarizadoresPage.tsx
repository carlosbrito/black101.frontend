import { CadastroCrudPage } from '../CadastroCrudPage';
import type { Column } from '../../../shared/ui/DataTable';
import { sanitizeDocument } from '../cadastroCommon';
import { getErrorMessage, http } from '../../../shared/api/http';
import toast from 'react-hot-toast';

export const BancarizadoresPage = () => {
  const columns: Column<Record<string, unknown>>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'documento', label: 'Documento' },
    { key: 'email', label: 'Email' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'ativo', label: 'Ativo' },
    { key: 'createdAt', label: 'Cadastro' },
  ];

  const fields = [
    { name: 'nome', label: 'Nome' },
    { name: 'documento', label: 'CPF/CNPJ', mask: 'cpfCnpj' as const },
    { name: 'email', label: 'Email', type: 'email' as const, required: false },
    { name: 'telefone', label: 'Telefone', mask: 'phone' as const, required: false },
  ];

  const defaultValues = {
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    ativo: true,
  };

  const lookupDocumento = async (doc: string) => {
    const digits = sanitizeDocument(doc);
    if (digits.length !== 14) return null;
    try {
      const resp = await http.get('/cadastros/pessoas/receita', { params: { cnpj: digits } });
      const data = resp.data as Record<string, any>;
      return {
        nome: data.nome ?? '',
        email: data.email ?? '',
        telefone: data.telefone ?? '',
        documento: digits,
      };
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    }
  };

  return (
    <CadastroCrudPage
      title="Bancarizadores"
      subtitle="Cadastro e gestão de bancarizadores."
      endpoint="/cadastros/bancarizadores"
      columns={columns as Column<Record<string, unknown>>[]}
      fields={fields}
      defaultValues={defaultValues}
      onDocumentoLookup={lookupDocumento}
      withExtras
    />
  );
};
