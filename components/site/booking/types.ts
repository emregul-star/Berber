/** Randevu sihirbazının sunucudan aldığı veriler (sadece müşteriye gösterilebilir alanlar). */
export type WizardService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
};

export type WizardBarber = {
  id: string;
  name: string;
  title: string | null;
  photo_url: string | null;
  serviceIds: string[];
};

export type WizardDay = {
  date: string;
  weekdayLabel: string;
  dayLabel: string;
  fullLabel: string;
};

export type WizardSlot = { startsAt: string; label: string };

export type WizardShop = {
  slug: string;
  name: string;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  isDemo: boolean;
  allowAnyBarber: boolean;
};
