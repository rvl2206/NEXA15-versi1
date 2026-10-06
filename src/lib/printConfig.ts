export type CardSizeOption = 'CR80' | 'B2' | 'B1';

export const CARD_SIZE_CONFIGS: Record<CardSizeOption, {
  name: string;
  badge: string;
  widthMM: number;
  heightMM: number;
  qrSize: number;
  logoSize: string;
  headerTitleClass: string;
  headerSubClass: string;
  nameClass: string;
  badgeClass: string;
  paddingClass: string;
}> = {
  CR80: {
    name: 'CR80 Standar KTP/ATM (53.98 x 85.60 mm)',
    badge: 'UKURAN CR80 (53.98 x 85.60 MM)',
    widthMM: 53.98,
    heightMM: 85.60,
    qrSize: 85,
    logoSize: 'w-6 h-6',
    headerTitleClass: 'text-[8.5px]',
    headerSubClass: 'text-[6.5px]',
    nameClass: 'text-[10px]',
    badgeClass: 'text-[8.5px]',
    paddingClass: 'p-2',
  },
  B2: {
    name: 'B2 Plastik (70 x 100 mm / 7 x 10 cm)',
    badge: 'UKURAN B2 (7 x 10 CM)',
    widthMM: 70,
    heightMM: 100,
    qrSize: 110,
    logoSize: 'w-8 h-8',
    headerTitleClass: 'text-[10px]',
    headerSubClass: 'text-[7.5px]',
    nameClass: 'text-xs',
    badgeClass: 'text-[9.5px]',
    paddingClass: 'p-3',
  },
  B1: {
    name: 'B1 Plastik (55 x 90 mm / 5.5 x 9 cm)',
    badge: 'UKURAN B1 (5.5 x 9 CM)',
    widthMM: 55,
    heightMM: 90,
    qrSize: 90,
    logoSize: 'w-6.5 h-6.5',
    headerTitleClass: 'text-[9px]',
    headerSubClass: 'text-[7px]',
    nameClass: 'text-[10.5px]',
    badgeClass: 'text-[9px]',
    paddingClass: 'p-2.5',
  },
};
