import type { ReactNode } from 'react';

export const LoginTwoFactorFlow = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) => (
  <div className="twofa-stack">
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    {children}
  </div>
);
