export type MenuLeaf = {
  label: string;
  route: string;
};

export type MenuGroup = {
  label: string;
  route?: string;
  childrens: MenuLeaf[];
  complementaryItems?: Array<{ label: string; childrens: MenuLeaf[] }>;
};
